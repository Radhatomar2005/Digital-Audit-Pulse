import { useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  KeyRound,
  Search,
  Settings2,
  Wrench,
} from 'lucide-react';
import type { AuditGoal, AuditInputContext } from '../types/audit';
import { normalizeUrlInput } from '../utils/auditHelpers';

interface UrlFormProps {
  onSubmit: (input: AuditInputContext) => void;
  onLoadSample: () => void;
  initialValues?: Partial<AuditInputContext>;
  isLoading?: boolean;
}

const FEATURES = [
  {
    icon: Search,
    title: 'SEO Audit',
    description:
      'Inspects title tags, meta descriptions, H1–H3 hierarchy, internal linking, image alt coverage, JSON-LD schema, E-E-A-T, and mobile usability.',
  },
  {
    icon: FileText,
    title: 'Content Recommendations',
    description:
      'Identifies high-value content gaps, evaluates readability and CTA strength, and proposes 10 prioritized blog and landing page topics.',
  },
  {
    icon: KeyRound,
    title: 'Keyword Suggestions',
    description:
      'Delivers 20 AI-estimated keywords grouped across Primary, Secondary, Long-tail, and Question-based search intents with difficulty ratings.',
  },
  {
    icon: Wrench,
    title: 'Technical SEO Checklist',
    description:
      'Tracks 22+ interactive technical checks spanning HTTPS, robots.txt, sitemaps, Core Web Vitals, canonicals, crawlability, and security headers.',
  },
  {
    icon: Bot,
    title: 'AI-Search Optimization',
    description:
      'Scores readiness for Google AI Overviews, ChatGPT, Perplexity, and Gemini—covering answer-first structure, FAQ schema, and llms.txt.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Enter your website URL',
    description:
      'Paste any public domain and optionally specify your target country, industry niche, business goal, or primary competitor.',
  },
  {
    step: '02',
    title: 'Live site crawl + AI synthesis',
    description:
      'Digital Audit Pulse inspects live HTML headers, metadata, robots/sitemap signals, and grounds findings with live web search.',
  },
  {
    step: '03',
    title: 'Prioritized roadmap & exports',
    description:
      'Explore interactive charts, track technical fixes in real time, and export branded PDF, CSV, JSON, or print-ready reports.',
  },
];

export function UrlForm({
  onSubmit,
  onLoadSample,
  initialValues,
  isLoading = false,
}: UrlFormProps) {
  const [url, setUrl] = useState(initialValues?.url || '');
  const [targetCountry, setTargetCountry] = useState(initialValues?.targetCountry || '');
  const [industry, setIndustry] = useState(initialValues?.industry || '');
  const [competitorUrl, setCompetitorUrl] = useState(initialValues?.competitorUrl || '');
  const [goal, setGoal] = useState<AuditGoal | ''>(initialValues?.goal || '');
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initialValues?.targetCountry ||
        initialValues?.industry ||
        initialValues?.competitorUrl ||
        initialValues?.goal
    )
  );
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const check = normalizeUrlInput(url);
    if (!check.valid || !check.normalized) {
      setError(check.error || 'Please enter a valid website URL.');
      return;
    }

    let normalizedCompetitor: string | undefined;
    if (competitorUrl.trim()) {
      const compCheck = normalizeUrlInput(competitorUrl);
      if (!compCheck.valid || !compCheck.normalized) {
        setError(`Competitor URL error: ${compCheck.error}`);
        return;
      }
      normalizedCompetitor = compCheck.normalized;
    }

    setError(null);
    setUrl(check.normalized);
    onSubmit({
      url: check.normalized,
      targetCountry: targetCountry.trim() || undefined,
      industry: industry.trim() || undefined,
      competitorUrl: normalizedCompetitor,
      goal: goal || undefined,
    });
  };

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="pt-8 sm:pt-14">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 text-xs font-medium tracking-wide text-indigo-700 dark:text-teal-400">
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span>Check your website&apos;s pulse</span>
            <span aria-hidden="true">·</span>
            <span>SEO, Technical &amp; AI-Search Diagnostics</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
            Complete marketing clarity for any live website in seconds.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
            Enter a URL to run a live on-page, technical, keyword, and AI-search readiness audit—complete with interactive scorecards, 30-60-90 day roadmaps, and client-ready PDF exports.
          </p>

          {/* Main URL Input Card */}
          <form
            onSubmit={handleFormSubmit}
            noValidate
            className="mx-auto mt-9 max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="relative flex-1">
                <label htmlFor="audit-url-input" className="sr-only">
                  Website URL to audit
                </label>
                <Globe
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="audit-url-input"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="Enter website URL (e.g., stripe.com or https://yourbrand.com)"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'url-error-message' : undefined}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus-visible:ring-offset-slate-900 whitespace-nowrap shrink-0"
              >
                <span>Analyze Website</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {error && (
              <p
                id="url-error-message"
                role="alert"
                className="mt-3 text-left text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                {error}
              </p>
            )}

            {/* Toggle Optional Context + Sample Trigger */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Optional audit context (country, niche, competitor, goal)</span>
                {showAdvanced ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={onLoadSample}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 transition-colors underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                Preview sample audit report
              </button>
            </div>

            {/* Optional Context Fields */}
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="audit-country"
                    className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Target Country
                  </label>
                  <input
                    id="audit-country"
                    type="text"
                    placeholder="e.g., United States, UK"
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="audit-industry"
                    className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Industry / Niche
                  </label>
                  <input
                    id="audit-industry"
                    type="text"
                    placeholder="e.g., B2B SaaS, Dental Clinic"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="audit-competitor"
                    className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Primary Competitor URL
                  </label>
                  <input
                    id="audit-competitor"
                    type="url"
                    placeholder="e.g., competitor.com"
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="audit-goal"
                    className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Main Goal
                  </label>
                  <select
                    id="audit-goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as AuditGoal | '')}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">Balanced Growth</option>
                    <option value="leads">Leads &amp; Pipeline</option>
                    <option value="sales">Direct Sales &amp; Revenue</option>
                    <option value="traffic">Organic Search Traffic</option>
                    <option value="brand_awareness">Brand Awareness</option>
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* 5 Feature Cards */}
      <section id="capabilities" className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Five diagnostic pillars in every report
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Built for marketing leads, founders, and technical SEO specialists.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works (3 steps) */}
      <section id="how-it-works" className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              How Digital Audit Pulse works
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              Three transparent steps from raw URL to an executive marketing playbook.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="space-y-2.5">
                <div className="font-mono text-xs font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                  Step {item.step}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
