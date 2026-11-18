import type { AuditHistoryEntry, AuditReport, PriorityLevel } from '../types/audit';

const HISTORY_STORAGE_KEY = 'dap_audit_history_v1';

export function normalizeUrlInput(raw: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a website URL to audit.' };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only http:// and https:// URLs are supported.' };
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || !host.includes('.') || host.startsWith('.') || host.endsWith('.')) {
      return {
        valid: false,
        error: 'Please enter a valid domain name (for example, acme.com).',
      };
    }
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return {
        valid: false,
        error: 'Local or private network URLs cannot be audited remotely.',
      };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return {
      valid: false,
      error: 'That does not look like a valid website URL. Try something like https://example.com.',
    };
  }
}

export function getScoreTone(score: number): {
  label: string;
  hex: string;
  textClass: string;
  bgSoftClass: string;
  borderClass: string;
} {
  if (score >= 80) {
    return {
      label: 'Strong',
      hex: '#10B981',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      bgSoftClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderClass: 'border-emerald-200 dark:border-emerald-900/60',
    };
  }
  if (score >= 50) {
    return {
      label: 'Needs Work',
      hex: '#F59E0B',
      textClass: 'text-amber-700 dark:text-amber-400',
      bgSoftClass: 'bg-amber-50 dark:bg-amber-950/40',
      borderClass: 'border-amber-200 dark:border-amber-900/60',
    };
  }
  return {
    label: 'Critical',
    hex: '#EF4444',
    textClass: 'text-rose-700 dark:text-rose-400',
    bgSoftClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderClass: 'border-rose-200 dark:border-rose-900/60',
  };
}

export function getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 78) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function countAllStatuses(report: AuditReport): {
  pass: number;
  warning: number;
  fail: number;
  total: number;
} {
  const allItems = [
    ...report.seoAudit,
    ...report.technicalSeoChecklist,
    ...report.aiSearchOptimization.recommendations,
  ];
  let pass = 0;
  let warning = 0;
  let fail = 0;
  for (const item of allItems) {
    if (item.status === 'pass') pass += 1;
    else if (item.status === 'warning') warning += 1;
    else fail += 1;
  }
  return { pass, warning, fail, total: allItems.length };
}

export function countIssuesByPriority(report: AuditReport): {
  priority: PriorityLevel;
  fail: number;
  warning: number;
}[] {
  const allItems = [
    ...report.seoAudit,
    ...report.technicalSeoChecklist,
    ...report.aiSearchOptimization.recommendations,
  ];
  const priorities: PriorityLevel[] = ['High', 'Medium', 'Low'];
  return priorities.map((priority) => {
    let fail = 0;
    let warning = 0;
    for (const item of allItems) {
      if (item.priority === priority) {
        if (item.status === 'fail') fail += 1;
        else if (item.status === 'warning') warning += 1;
      }
    }
    return { priority, fail, warning };
  });
}

export function formatDisplayDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function loadAuditHistory(): AuditHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditToHistory(report: AuditReport): AuditHistoryEntry[] {
  const existing = loadAuditHistory().filter((entry) => entry.id !== report.id);
  const newEntry: AuditHistoryEntry = {
    id: report.id,
    url: report.url,
    auditedAt: report.auditedAt,
    overallScore: report.overallScore,
    grade: report.grade,
    isDemo: report.isDemo,
    report,
  };
  const updated = [newEntry, ...existing].slice(0, 25);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage quota errors
  }
  return updated;
}

export function updateHistoryReport(report: AuditReport): AuditHistoryEntry[] {
  const existing = loadAuditHistory();
  const updated = existing.map((entry) =>
    entry.id === report.id
      ? { ...entry, report, overallScore: report.overallScore, grade: report.grade }
      : entry
  );
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage quota errors
  }
  return updated;
}

export function deleteHistoryEntry(id: string): AuditHistoryEntry[] {
  const updated = loadAuditHistory().filter((entry) => entry.id !== id);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage quota errors
  }
  return updated;
}

export function clearAuditHistory(): AuditHistoryEntry[] {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Ignore
  }
  return [];
}

export function findPreviousAuditScore(
  history: AuditHistoryEntry[],
  url: string,
  currentId: string
): number | null {
  const targetDomain = formatDomain(url);
  const match = history.find(
    (entry) => entry.id !== currentId && formatDomain(entry.url) === targetDomain
  );
  return match ? match.overallScore : null;
}

export function buildTextSummary(report: AuditReport): string {
  const counts = countAllStatuses(report);
  const lines = [
    `Digital Audit Pulse Report — ${report.url}`,
    `Date: ${formatDisplayDate(report.auditedAt)}`,
    `Overall Score: ${report.overallScore}/100 (Grade ${report.grade})`,
    `Verdict: ${report.verdict}`,
    '',
    'Category Scores:',
    `- SEO: ${report.categoryScores.seo}/100`,
    `- Content: ${report.categoryScores.content}/100`,
    `- Keywords: ${report.categoryScores.keywords}/100`,
    `- Technical: ${report.categoryScores.technical}/100`,
    `- AI-Search Readiness: ${report.categoryScores.aiSearch}/100 (AI Visibility: ${report.aiSearchOptimization.aiVisibilityScore}/100)`,
    '',
    `Audit Checks: ${counts.pass} Passed · ${counts.warning} Warnings · ${counts.fail} Failed`,
    '',
    'Top 5 Quick Wins (< 1 Week):',
    ...report.quickWins.map((qw, idx) => `${idx + 1}. ${qw.title} (${qw.impact} Impact · ${qw.effort})`),
    '',
    'Note: Findings are AI-generated and should be verified with Google Search Console and PageSpeed Insights.',
  ];
  return lines.join('\n');
}
