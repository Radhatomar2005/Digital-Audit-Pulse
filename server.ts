import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

interface AuditRequestBody {
  url?: string;
  targetCountry?: string;
  industry?: string;
  competitorUrl?: string;
  goal?: string;
}

interface SiteSnapshot {
  title?: string;
  metaDescription?: string;
  statusCode?: number;
  loadTimeMs?: number;
  hasHttps: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  schemaCount: number;
  h1Count: number;
  imagesWithoutAlt: number;
  crawlNote?: string;
  htmlExcerpt?: string;
  headersSummary?: string;
  headingsPreview?: string[];
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error('Gemini API key is not configured on the server.');
    (err as Error & { code?: string }).code = 'API_KEY_MISSING';
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) {
      return true;
    }
  }
  return false;
}

function normalizeAndValidateUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Please enter a website URL.');
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error('Invalid website URL format. Example: https://example.com');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http:// and https:// URLs are supported.');
  }
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    throw new Error('Please enter a valid domain name (e.g., example.com).');
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('Local or private network addresses cannot be audited.');
  }
  return parsed;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; DigitalAuditPulseBot/1.0; +https://digitalauditpulse.app)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function inspectWebsite(target: URL): Promise<SiteSnapshot> {
  const start = Date.now();
  let res: Response;
  try {
    res = await fetchWithTimeout(target.toString(), 9000);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = new Error(
      message.includes('abort')
        ? `Timed out trying to reach ${target.hostname}. The server did not respond within 9 seconds.`
        : `Could not connect to ${target.hostname}. Check that the domain is spelled correctly and publicly reachable.`
    );
    (error as Error & { code?: string }).code = 'FETCH_FAILED';
    throw error;
  }

  const loadTimeMs = Date.now() - start;
  const finalUrl = res.url ? new URL(res.url) : target;
  const hasHttps = finalUrl.protocol === 'https:';

  const [robotsRes, sitemapRes] = await Promise.allSettled([
    fetchWithTimeout(`${finalUrl.origin}/robots.txt`, 4000),
    fetchWithTimeout(`${finalUrl.origin}/sitemap.xml`, 4000),
  ]);

  const hasRobotsTxt =
    robotsRes.status === 'fulfilled' && robotsRes.value.ok;
  const hasSitemap =
    sitemapRes.status === 'fulfilled' && sitemapRes.value.ok;

  const hsts = res.headers.get('strict-transport-security') ? 'present' : 'missing';
  const csp = res.headers.get('content-security-policy') ? 'present' : 'missing';
  const xfo = res.headers.get('x-frame-options') ? 'present' : 'missing';
  const xcto = res.headers.get('x-content-type-options') ? 'present' : 'missing';
  const encoding = res.headers.get('content-encoding') || 'none';
  const headersSummary = `Status=${res.status}, LoadTime=${loadTimeMs}ms, HSTS=${hsts}, CSP=${csp}, X-Frame-Options=${xfo}, X-Content-Type-Options=${xcto}, Encoding=${encoding}`;

  if (res.status >= 400) {
    return {
      statusCode: res.status,
      loadTimeMs,
      hasHttps,
      hasRobotsTxt,
      hasSitemap,
      schemaCount: 0,
      h1Count: 0,
      imagesWithoutAlt: 0,
      headersSummary,
      crawlNote: `Direct HTML fetch returned HTTP ${res.status}. Analysis supplemented with live search & URL context grounding.`,
    };
  }

  const html = (await res.text()).slice(0, 250000);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 180) : undefined;

  const metaDescMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim().slice(0, 300) : undefined;

  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  const headingsPreview = [
    ...h1Matches.slice(0, 3).map((m) => `H1: ${stripTags(m[1]).slice(0, 90)}`),
    ...h2Matches.slice(0, 6).map((m) => `H2: ${stripTags(m[1]).slice(0, 90)}`),
  ].filter(Boolean);

  const schemaMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi);
  const schemaCount = schemaMatches ? schemaMatches.length : 0;

  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  let imagesWithoutAlt = 0;
  for (const img of imgTags) {
    const tag = img[0];
    const hasNonEmptyAlt = /\balt=["'][^"']+["']/i.test(tag);
    if (!hasNonEmptyAlt) {
      imagesWithoutAlt += 1;
    }
  }

  const canonicalPresent = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);
  const viewportPresent = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
  const ogPresent = /<meta[^>]*property=["']og:title["'][^>]*>/i.test(html);

  const htmlExcerpt = stripTags(html).slice(0, 3800);

  return {
    title,
    metaDescription,
    statusCode: res.status,
    loadTimeMs,
    hasHttps,
    hasRobotsTxt,
    hasSitemap,
    schemaCount,
    h1Count: h1Matches.length,
    imagesWithoutAlt,
    headersSummary: `${headersSummary}, Canonical=${canonicalPresent}, Viewport=${viewportPresent}, OpenGraph=${ogPresent}, ImgTotal=${imgTags.length}, ImgMissingAlt=${imagesWithoutAlt}`,
    headingsPreview,
    htmlExcerpt,
  };
}

function classifyGeminiError(err: unknown): { code: string; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if ((err as Error & { code?: string })?.code === 'API_KEY_MISSING') {
    return {
      code: 'API_KEY_MISSING',
      message: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
    };
  }
  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      code: 'API_KEY_INVALID',
      message: 'The Gemini API key appears invalid or lacks permission. Check Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      code: 'RATE_LIMIT',
      message: 'AI analysis rate limit or quota reached. Please wait a moment and retry.',
    };
  }
  if (lower.includes('timeout') || lower.includes('abort')) {
    return {
      code: 'TIMEOUT',
      message: 'The AI audit timed out while analyzing the website. Please retry.',
    };
  }
  return {
    code: 'AI_ERROR',
    message: `Could not complete AI analysis (${raw.slice(0, 140)}). You can retry or load the sample audit.`,
  };
}

function computeGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 78) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

const AUDIT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER, description: 'Overall marketing audit score from 0 to 100.' },
    verdict: { type: Type.STRING, description: 'Concise one-line executive verdict.' },
    categoryScores: {
      type: Type.OBJECT,
      properties: {
        seo: { type: Type.INTEGER },
        content: { type: Type.INTEGER },
        keywords: { type: Type.INTEGER },
        technical: { type: Type.INTEGER },
        aiSearch: { type: Type.INTEGER },
      },
      required: ['seo', 'content', 'keywords', 'technical', 'aiSearch'],
    },
    seoAudit: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          check: { type: Type.STRING },
          category: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['pass', 'warning', 'fail'] },
          priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          finding: { type: Type.STRING },
          fix: { type: Type.STRING },
        },
        required: ['id', 'check', 'category', 'status', 'priority', 'finding', 'fix'],
      },
    },
    contentRecommendations: {
      type: Type.OBJECT,
      properties: {
        contentGaps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        topicIdeas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              searchIntent: {
                type: Type.STRING,
                enum: ['Informational', 'Commercial', 'Transactional', 'Navigational'],
              },
              priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
              targetAngle: { type: Type.STRING },
            },
            required: ['id', 'title', 'searchIntent', 'priority', 'targetAngle'],
          },
        },
        qualityNotes: {
          type: Type.OBJECT,
          properties: {
            readability: { type: Type.STRING },
            depth: { type: Type.STRING },
            freshness: { type: Type.STRING },
            ctas: { type: Type.STRING },
          },
          required: ['readability', 'depth', 'freshness', 'ctas'],
        },
      },
      required: ['contentGaps', 'topicIdeas', 'qualityNotes'],
    },
    keywordSuggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          keyword: { type: Type.STRING },
          group: {
            type: Type.STRING,
            enum: ['Primary', 'Secondary', 'Long-tail', 'Question-based'],
          },
          searchIntent: {
            type: Type.STRING,
            enum: ['Informational', 'Commercial', 'Transactional', 'Navigational'],
          },
          difficulty: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
          opportunity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          estimatedMonthlySearches: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: [
          'id',
          'keyword',
          'group',
          'searchIntent',
          'difficulty',
          'opportunity',
          'estimatedMonthlySearches',
          'rationale',
        ],
      },
    },
    technicalSeoChecklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          item: { type: Type.STRING },
          area: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['pass', 'warning', 'fail'] },
          priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          howToFix: { type: Type.STRING },
        },
        required: ['id', 'item', 'area', 'status', 'priority', 'howToFix'],
      },
    },
    aiSearchOptimization: {
      type: Type.OBJECT,
      properties: {
        aiVisibilityScore: { type: Type.INTEGER },
        scoreReasons: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              area: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['pass', 'warning', 'fail'] },
              priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
              finding: { type: Type.STRING },
              recommendation: { type: Type.STRING },
            },
            required: ['id', 'area', 'status', 'priority', 'finding', 'recommendation'],
          },
        },
      },
      required: ['aiVisibilityScore', 'scoreReasons', 'recommendations'],
    },
    quickWins: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['High', 'Medium'] },
          effort: { type: Type.STRING },
          category: { type: Type.STRING },
          steps: { type: Type.STRING },
        },
        required: ['id', 'title', 'impact', 'effort', 'category', 'steps'],
      },
    },
    actionPlan: {
      type: Type.OBJECT,
      properties: {
        days30: { type: Type.ARRAY, items: { type: Type.STRING } },
        days60: { type: Type.ARRAY, items: { type: Type.STRING } },
        days90: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['days30', 'days60', 'days90'],
    },
    competitorComparison: {
      type: Type.OBJECT,
      properties: {
        competitorUrl: { type: Type.STRING },
        summary: { type: Type.STRING },
        strengthsOverCompetitor: { type: Type.ARRAY, items: { type: Type.STRING } },
        gapsToClose: { type: Type.ARRAY, items: { type: Type.STRING } },
        metrics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              siteScore: { type: Type.INTEGER },
              competitorEstimate: { type: Type.INTEGER },
            },
            required: ['category', 'siteScore', 'competitorEstimate'],
          },
        },
      },
      required: ['competitorUrl', 'summary', 'strengthsOverCompetitor', 'gapsToClose', 'metrics'],
    },
  },
  required: [
    'overallScore',
    'verdict',
    'categoryScores',
    'seoAudit',
    'contentRecommendations',
    'keywordSuggestions',
    'technicalSeoChecklist',
    'aiSearchOptimization',
    'quickWins',
    'actionPlan',
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Digital Audit Pulse' });
  });

  app.post('/api/audit', async (req, res) => {
    const body = (req.body || {}) as AuditRequestBody;

    let targetUrl: URL;
    let competitorUrl: URL | undefined;
    try {
      targetUrl = normalizeAndValidateUrl(body.url || '');
      if (body.competitorUrl && body.competitorUrl.trim()) {
        competitorUrl = normalizeAndValidateUrl(body.competitorUrl);
      }
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid URL provided.',
        code: 'INVALID_URL',
      });
      return;
    }

    // Stream Server-Sent Events for real-time step progress
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      sendEvent({ type: 'progress', step: 1, message: 'Fetching website...' });
      const snapshot = await inspectWebsite(targetUrl);

      const ai = getAiClient();

      sendEvent({ type: 'progress', step: 2, message: 'Analyzing on-page SEO...' });

      // Stage 1: Live grounded research via URL Context + Google Search
      let groundedResearch = '';
      const groundingSources: { title: string; uri: string }[] = [];
      try {
        const researchPrompt = [
          `Inspect the live website ${targetUrl.toString()}`,
          competitorUrl ? `and compare briefly against competitor ${competitorUrl.toString()}` : '',
          body.industry ? `in the ${body.industry} industry` : '',
          body.targetCountry ? `targeting ${body.targetCountry}` : '',
          '. Summarize its core value proposition, target audience, visible content depth, technical/structured-data posture, competitive positioning, and visibility across search and AI answer engines.',
        ]
          .filter(Boolean)
          .join(' ');

        const researchRes = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: researchPrompt,
          config: {
            tools: [{ urlContext: {} }, { googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        groundedResearch = (researchRes.text || '').slice(0, 6000);
        const chunks = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        for (const chunk of chunks) {
          const web = (chunk as { web?: { uri?: string; title?: string } }).web;
          if (web?.uri && groundingSources.length < 6) {
            if (!groundingSources.some((s) => s.uri === web.uri)) {
              groundingSources.push({
                title: web.title || web.uri,
                uri: web.uri,
              });
            }
          }
        }
      } catch (researchErr) {
        const classified = classifyGeminiError(researchErr);
        if (
          classified.code === 'API_KEY_INVALID' ||
          classified.code === 'API_KEY_MISSING' ||
          classified.code === 'RATE_LIMIT'
        ) {
          throw researchErr;
        }
        // If URL context / search tool fails transiently, continue with direct HTML snapshot
        groundedResearch = 'Live search grounding unavailable for this request; rely on inspected HTML and headers.';
      }

      sendEvent({ type: 'progress', step: 3, message: 'Checking technical health...' });
      await new Promise((r) => setTimeout(r, 250));
      sendEvent({ type: 'progress', step: 4, message: 'Researching keywords...' });

      const systemInstruction = `You are a senior SEO and digital marketing strategist producing an authoritative, accurate, actionable audit for Digital Audit Pulse.
Ground every finding in the inspected website telemetry and live research provided. Never fabricate fake exact search volume numbers—label estimated monthly searches clearly as AI estimates (e.g., "800 - 1,600 (AI est.)").
Include:
- seoAudit: 9 checks covering Title Tag, Meta Description, Headings (H1-H3 structure), URL Structure, Internal/External Linking, Image Alt Text, Schema Markup, E-E-A-T Signals, Mobile Friendliness.
- contentRecommendations: 4 concrete content gaps, 10 blog/page topic ideas (suggested title, searchIntent, priority, targetAngle), and qualityNotes covering readability, depth, freshness, and CTAs.
- keywordSuggestions: exactly 20 keywords (5 Primary, 5 Secondary, 5 Long-tail, 5 Question-based), each with searchIntent, difficulty (Low/Medium/High), opportunity (High/Medium/Low), estimatedMonthlySearches marked "(AI est.)", and rationale.
- technicalSeoChecklist: 22 items covering HTTPS, robots.txt, XML sitemap, canonical tags, LCP, INP, CLS, mobile usability, broken links, redirects, structured data, crawlability, indexability, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, compression, caching, next-gen images, Open Graph, JS rendering.
- aiSearchOptimization: aiVisibilityScore (0-100), 3 scoreReasons, and 8 recommendations covering Answer-First Content Structure, FAQ & Schema Usage, Entity & Brand Clarity, Citation-Worthy Content (Stats/Original Data), llms.txt Suggestion, Topical Authority, Author Credibility, Conversational & Question Queries.
- quickWins: top 5 high-ROI actions executable in under a week.
- actionPlan: 30-60-90 day roadmap (4 concrete bullets per phase).
${competitorUrl ? `- competitorComparison: compare against ${competitorUrl.toString()} across SEO, Content, Keywords, Technical, AI Search.` : '- Omit competitorComparison when no competitor URL was provided.'}`;

      const synthesisPrompt = `Audit Target URL: ${targetUrl.toString()}
Target Country: ${body.targetCountry || 'Global / Not specified'}
Industry / Niche: ${body.industry || 'Infer from website'}
Primary Business Goal: ${body.goal || 'Overall organic growth & conversions'}
Primary Competitor URL: ${competitorUrl ? competitorUrl.toString() : 'None provided'}

=== LIVE CRAWL TELEMETRY ===
Title Tag: ${snapshot.title || 'Not detected'}
Meta Description: ${snapshot.metaDescription || 'Not detected'}
HTTPS: ${snapshot.hasHttps}
robots.txt present: ${snapshot.hasRobotsTxt}
sitemap.xml present: ${snapshot.hasSitemap}
JSON-LD Schema blocks count: ${snapshot.schemaCount}
H1 count: ${snapshot.h1Count}
Images missing alt text: ${snapshot.imagesWithoutAlt}
Headers & Meta Summary: ${snapshot.headersSummary || 'N/A'}
Headings Preview: ${(snapshot.headingsPreview || []).join(' | ') || 'None extracted'}
Crawl Note: ${snapshot.crawlNote || 'Direct HTML fetch succeeded'}

Visible Copy Excerpt:
${snapshot.htmlExcerpt || 'No body text extracted (bot protection or SPA shell).'}

=== GROUNDED WEB RESEARCH ===
${groundedResearch}

Generate the complete structured JSON marketing audit report.`;

      sendEvent({ type: 'progress', step: 5, message: 'Evaluating AI-search readiness...' });

      const structuredRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: synthesisPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: AUDIT_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      sendEvent({ type: 'progress', step: 6, message: 'Generating report...' });

      const rawJson = (structuredRes.text || '{}').trim();
      const parsed = JSON.parse(rawJson);

      const overallScore = Math.max(0, Math.min(100, Number(parsed.overallScore) || 70));
      const report = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: targetUrl.toString(),
        auditedAt: new Date().toISOString(),
        isDemo: false,
        context: {
          targetCountry: body.targetCountry?.trim() || undefined,
          industry: body.industry?.trim() || undefined,
          competitorUrl: competitorUrl?.toString(),
          goal: body.goal || undefined,
        },
        overallScore,
        grade: computeGrade(overallScore),
        verdict: parsed.verdict || 'Audit completed.',
        categoryScores: {
          seo: Math.max(0, Math.min(100, Number(parsed.categoryScores?.seo) || 70)),
          content: Math.max(0, Math.min(100, Number(parsed.categoryScores?.content) || 70)),
          keywords: Math.max(0, Math.min(100, Number(parsed.categoryScores?.keywords) || 70)),
          technical: Math.max(0, Math.min(100, Number(parsed.categoryScores?.technical) || 70)),
          aiSearch: Math.max(0, Math.min(100, Number(parsed.categoryScores?.aiSearch) || 65)),
        },
        siteSnapshot: {
          title: snapshot.title,
          metaDescription: snapshot.metaDescription,
          statusCode: snapshot.statusCode,
          loadTimeMs: snapshot.loadTimeMs,
          hasHttps: snapshot.hasHttps,
          hasRobotsTxt: snapshot.hasRobotsTxt,
          hasSitemap: snapshot.hasSitemap,
          schemaCount: snapshot.schemaCount,
          h1Count: snapshot.h1Count,
          imagesWithoutAlt: snapshot.imagesWithoutAlt,
          crawlNote: snapshot.crawlNote,
        },
        groundingSources,
        seoAudit: Array.isArray(parsed.seoAudit) ? parsed.seoAudit : [],
        contentRecommendations: parsed.contentRecommendations || {
          contentGaps: [],
          topicIdeas: [],
          qualityNotes: { readability: '', depth: '', freshness: '', ctas: '' },
        },
        keywordSuggestions: Array.isArray(parsed.keywordSuggestions) ? parsed.keywordSuggestions : [],
        technicalSeoChecklist: Array.isArray(parsed.technicalSeoChecklist)
          ? parsed.technicalSeoChecklist.map((t: Record<string, unknown>) => ({ ...t, completed: false }))
          : [],
        aiSearchOptimization: parsed.aiSearchOptimization || {
          aiVisibilityScore: 60,
          scoreReasons: [],
          recommendations: [],
        },
        quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins : [],
        actionPlan: parsed.actionPlan || { days30: [], days60: [], days90: [] },
        competitorComparison: competitorUrl ? parsed.competitorComparison : undefined,
      };

      sendEvent({ type: 'complete', report });
      res.end();
    } catch (err) {
      const errCode = (err as Error & { code?: string })?.code;
      if (errCode === 'FETCH_FAILED') {
        sendEvent({
          type: 'error',
          code: 'FETCH_FAILED',
          message: err instanceof Error ? err.message : 'Unable to reach website.',
        });
      } else {
        const classified = classifyGeminiError(err);
        sendEvent({
          type: 'error',
          code: classified.code,
          message: classified.message,
        });
      }
      res.end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Digital Audit Pulse listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
