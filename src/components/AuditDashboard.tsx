import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  RefreshCw,
  Search,
  Share2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AuditReport,
  AuditStatus,
  DashboardTab,
  SearchIntent,
} from '../types/audit';
import {
  buildTextSummary,
  countAllStatuses,
  countIssuesByPriority,
  formatDisplayDate,
  formatDomain,
  getScoreTone,
} from '../utils/auditHelpers';
import { CategoryCard } from './CategoryCard';
import { ChecklistTable } from './ChecklistTable';
import { KeywordTable } from './KeywordTable';
import {
  exportChecklistCsv,
  exportKeywordsCsv,
  ReportExporter,
} from './ReportExporter';
import { ScoreGauge } from './ScoreGauge';
import { PriorityTag, StatusBadge } from './StatusBadge';

interface AuditDashboardProps {
  report: AuditReport;
  previousScore?: number | null;
  onRerunAudit: () => void;
  onToggleChecklistItem: (itemId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'seo', label: 'SEO Audit' },
  { id: 'content', label: 'Content' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'technical', label: 'Technical Checklist' },
  { id: 'ai-search', label: 'AI Search' },
  { id: 'action-plan', label: 'Action Plan' },
];

export function AuditDashboard({
  report,
  previousScore,
  onRerunAudit,
  onToggleChecklistItem,
  onNotify,
}: AuditDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [showShareModal, setShowShareModal] = useState(false);

  // SEO tab filters
  const [seoSearch, setSeoSearch] = useState('');
  const [seoStatus, setSeoStatus] = useState<'all' | AuditStatus>('all');

  // Content tab filters
  const [contentSearch, setContentSearch] = useState('');
  const [intentFilter, setIntentFilter] = useState<'all' | SearchIntent>('all');

  // AI Search tab filters
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiStatusFilter, setAiStatusFilter] = useState<'all' | AuditStatus>('all');

  const statusCounts = useMemo(() => countAllStatuses(report), [report]);
  const priorityBars = useMemo(() => countIssuesByPriority(report), [report]);

  const checklistCompleted = useMemo(
    () => report.technicalSeoChecklist.filter((i) => Boolean(i.completed)).length,
    [report.technicalSeoChecklist]
  );
  const checklistPct =
    report.technicalSeoChecklist.length > 0
      ? Math.round((checklistCompleted / report.technicalSeoChecklist.length) * 100)
      : 0;

  const radarData = useMemo(
    () => [
      { category: 'SEO', score: report.categoryScores.seo, fullMark: 100 },
      { category: 'Content', score: report.categoryScores.content, fullMark: 100 },
      { category: 'Keywords', score: report.categoryScores.keywords, fullMark: 100 },
      { category: 'Technical', score: report.categoryScores.technical, fullMark: 100 },
      { category: 'AI Search', score: report.categoryScores.aiSearch, fullMark: 100 },
    ],
    [report.categoryScores]
  );

  const filteredSeo = useMemo(() => {
    const q = seoSearch.trim().toLowerCase();
    return report.seoAudit.filter((item) => {
      if (seoStatus !== 'all' && item.status !== seoStatus) return false;
      if (
        q &&
        !item.check.toLowerCase().includes(q) &&
        !item.finding.toLowerCase().includes(q) &&
        !item.fix.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.seoAudit, seoSearch, seoStatus]);

  const filteredTopics = useMemo(() => {
    const q = contentSearch.trim().toLowerCase();
    return report.contentRecommendations.topicIdeas.filter((topic) => {
      if (intentFilter !== 'all' && topic.searchIntent !== intentFilter) return false;
      if (
        q &&
        !topic.title.toLowerCase().includes(q) &&
        !topic.targetAngle.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.contentRecommendations.topicIdeas, contentSearch, intentFilter]);

  const filteredAiRecs = useMemo(() => {
    const q = aiSearchQuery.trim().toLowerCase();
    return report.aiSearchOptimization.recommendations.filter((rec) => {
      if (aiStatusFilter !== 'all' && rec.status !== aiStatusFilter) return false;
      if (
        q &&
        !rec.area.toLowerCase().includes(q) &&
        !rec.finding.toLowerCase().includes(q) &&
        !rec.recommendation.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.aiSearchOptimization.recommendations, aiSearchQuery, aiStatusFilter]);

  const aiTone = getScoreTone(report.aiSearchOptimization.aiVisibilityScore);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Executive Summary Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Unboxed Metadata Line */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{report.isDemo ? 'Sample Benchmark Audit' : 'Live Website Audit'}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatDisplayDate(report.auditedAt)}</span>
              {report.context.targetCountry && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{report.context.targetCountry}</span>
                </>
              )}
              {report.context.industry && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{report.context.industry}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {formatDomain(report.url)}
              </h1>
              <a
                href={report.url}
                target="_blank"
                rel="noopener noreferrer"
                className="no-print inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Visit site
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {report.verdict}
            </p>

            {/* Primary Actions & Exporters */}
            <div className="no-print flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onRerunAudit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Re-run Audit
              </button>

              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                Share Card
              </button>

              <ReportExporter
                report={report}
                chartsElementId="audit-charts-snapshot"
                onNotify={onNotify}
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 pt-4 dark:border-slate-800 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <ScoreGauge
              score={report.overallScore}
              grade={report.grade}
              previousScore={previousScore}
            />
          </div>
        </div>
      </section>

      {/* 5 Category Score Cards */}
      <section aria-label="Category scores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CategoryCard
          title="On-Page SEO"
          subtitle="Meta, headings, schema"
          score={report.categoryScores.seo}
          onClick={() => setActiveTab('seo')}
        />
        <CategoryCard
          title="Content"
          subtitle="Depth, gaps, CTAs"
          score={report.categoryScores.content}
          onClick={() => setActiveTab('content')}
        />
        <CategoryCard
          title="Keywords"
          subtitle="Intent & opportunities"
          score={report.categoryScores.keywords}
          onClick={() => setActiveTab('keywords')}
        />
        <CategoryCard
          title="Technical"
          subtitle="CWV, security, crawl"
          score={report.categoryScores.technical}
          onClick={() => setActiveTab('technical')}
        />
        <CategoryCard
          title="AI Search"
          subtitle="LLMs & AI Overviews"
          score={report.categoryScores.aiSearch}
          onClick={() => setActiveTab('ai-search')}
        />
      </section>

      {/* Summary Counters Strip */}
      <section
        aria-label="Check summary counters"
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Passed Checks</span>
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {statusCounts.pass}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>Warnings</span>
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {statusCounts.warning}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <span>Failed Checks</span>
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {statusCounts.fail}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Checklist Progress</span>
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {checklistPct}%
          </div>
        </div>
      </section>

      {/* Visual Charts Row: Radar + Issues by Priority */}
      <section
        id="audit-charts-snapshot"
        className="grid grid-cols-1 gap-5 lg:grid-cols-2"
      >
        <div className="print-break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Category Balance Radar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparing all five audit pillars on a 0–100 scale
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="rgba(148, 163, 184, 0.28)" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.22}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="print-break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Issues by Priority
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Failed and warning checks segmented by remediation urgency
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityBars} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                <XAxis dataKey="priority" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="fail" name="Failed" fill="#EF4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="warning" name="Warnings" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Optional Competitor Comparison Panel */}
      {report.competitorComparison && (
        <section className="print-break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Competitor Benchmark: vs. {formatDomain(report.competitorComparison.competitorUrl)}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {report.competitorComparison.summary}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-60 lg:col-span-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={report.competitorComparison.metrics}
                  margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="siteScore"
                    name={formatDomain(report.url)}
                    fill="#4F46E5"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="competitorEstimate"
                    name={`${formatDomain(report.competitorComparison.competitorUrl)} (Est.)`}
                    fill="#14B8A6"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-6">
              <div>
                <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Your Advantages
                </h3>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {report.competitorComparison.strengthsOverCompetitor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Gaps to Close
                </h3>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {report.competitorComparison.gapsToClose.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tabbed Navigation */}
      <nav aria-label="Audit report sections" className="no-print border-b border-slate-200 dark:border-slate-800">
        <div
          role="tablist"
          className="flex items-center gap-1 overflow-x-auto pb-px"
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                  isSelected
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Wins Highlighted Box */}
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/25 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Zap className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Top 5 Quick Wins (Executable in Under a Week)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Highest immediate ROI before committing to multi-month initiatives
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {report.quickWins.map((qw, idx) => (
                <div
                  key={qw.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        0{idx + 1}. {qw.category}
                      </span>
                      <span className="font-medium">{qw.effort}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                      {qw.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {qw.steps}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-teal-700 dark:text-teal-400">
                    {qw.impact} Impact
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Inspected Site Telemetry + Grounding Sources */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {report.siteSnapshot && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Inspected Site Snapshot
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {report.siteSnapshot.crawlNote ||
                    'Live HTTP response and HTML metadata observed during crawl.'}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">HTTPS</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {report.siteSnapshot.hasHttps ? 'Enabled' : 'Not Detected'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">robots.txt</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {report.siteSnapshot.hasRobotsTxt ? 'Found' : 'Missing'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">XML Sitemap</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {report.siteSnapshot.hasSitemap ? 'Found' : 'Not Found at Root'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">JSON-LD Blocks</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {report.siteSnapshot.schemaCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">H1 Headings</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {report.siteSnapshot.h1Count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Images Missing Alt</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {report.siteSnapshot.imagesWithoutAlt}
                    </dd>
                  </div>
                </dl>

                {(report.siteSnapshot.title || report.siteSnapshot.metaDescription) && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    {report.siteSnapshot.title && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Observed Title:{' '}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {report.siteSnapshot.title}
                        </span>
                      </div>
                    )}
                    {report.siteSnapshot.metaDescription && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Observed Meta Description:{' '}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {report.siteSnapshot.metaDescription}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Verification &amp; Grounding
              </h2>
              <div className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <Info className="mt-0.5 h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <p>
                  These findings and score estimates are AI-generated from live page inspection and search context. Always verify Core Web Vitals, crawl errors, and keyword metrics using{' '}
                  <strong>Google Search Console</strong> and{' '}
                  <strong>PageSpeed Insights</strong>.
                </p>
              </div>

              {report.groundingSources && report.groundingSources.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Search Grounding References
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {report.groundingSources.map((src) => (
                      <li key={src.uri}>
                        <a
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline dark:text-indigo-400 break-all"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>{src.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: SEO AUDIT */}
      {activeTab === 'seo' && (
        <div className="space-y-4">
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={seoSearch}
                onChange={(e) => setSeoSearch(e.target.value)}
                placeholder="Search SEO checks, findings, or fixes..."
                aria-label="Search SEO checks"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div
              role="group"
              aria-label="Filter SEO checks by status"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
            >
              {(['all', 'fail', 'warning', 'pass'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSeoStatus(status)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    seoStatus === status
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredSeo.length === 0 ? (
              <div className="col-span-full rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                No SEO checks match your filter.
              </div>
            ) : (
              filteredSeo.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {item.category}
                        </div>
                        <h3 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">
                          {item.check}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={item.status} />
                        <PriorityTag priority={item.priority} />
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-800 dark:text-slate-100">Finding: </strong>
                      {item.finding}
                    </p>
                  </div>

                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:text-slate-300">
                    <strong className="text-indigo-700 dark:text-indigo-400">Recommended Fix: </strong>
                    {item.fix}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONTENT */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Quality Notes & Gaps */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Content Quality Assessment
              </h2>
              <dl className="mt-4 space-y-3 text-xs leading-relaxed">
                <div>
                  <dt className="font-semibold text-slate-900 dark:text-white">Readability</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
                    {report.contentRecommendations.qualityNotes.readability}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900 dark:text-white">Content Depth</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
                    {report.contentRecommendations.qualityNotes.depth}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900 dark:text-white">Freshness</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
                    {report.contentRecommendations.qualityNotes.freshness}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900 dark:text-white">Calls to Action (CTAs)</dt>
                  <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
                    {report.contentRecommendations.qualityNotes.ctas}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Identified Content Gaps
              </h2>
              <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {report.contentRecommendations.contentGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      0{i + 1}
                    </span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 10 Topic Ideas */}
          <section className="space-y-4">
            <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                10 Recommended Page &amp; Blog Topics
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    placeholder="Filter topics..."
                    aria-label="Filter topic ideas"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <select
                  aria-label="Filter topics by search intent"
                  value={intentFilter}
                  onChange={(e) => setIntentFilter(e.target.value as 'all' | SearchIntent)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="all">All Intents</option>
                  <option value="Informational">Informational</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Transactional">Transactional</option>
                  <option value="Navigational">Navigational</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                      <th className="px-4 py-3">Suggested Title &amp; Angle</th>
                      <th className="px-4 py-3">Search Intent</th>
                      <th className="px-4 py-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTopics.map((topic) => (
                      <tr
                        key={topic.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {topic.title}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {topic.targetAngle}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {topic.searchIntent}
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <PriorityTag priority={topic.priority} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: KEYWORDS */}
      {activeTab === 'keywords' && (
        <KeywordTable
          keywords={report.keywordSuggestions}
          onCopySuccess={(msg) => onNotify('success', msg)}
          onExportCsv={() => {
            exportKeywordsCsv(report);
            onNotify('success', 'Keywords CSV downloaded.');
          }}
        />
      )}

      {/* TAB 5: TECHNICAL CHECKLIST */}
      {activeTab === 'technical' && (
        <ChecklistTable
          items={report.technicalSeoChecklist}
          onToggleItem={onToggleChecklistItem}
          onExportCsv={() => {
            exportChecklistCsv(report);
            onNotify('success', 'Technical Checklist CSV downloaded.');
          }}
        />
      )}

      {/* TAB 6: AI SEARCH */}
      {activeTab === 'ai-search' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2 max-w-2xl">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  AI-Search Readiness (Google AI Overviews, ChatGPT, Perplexity, Gemini)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evaluates how easily generative answer engines can parse, trust, and cite your brand.
                </p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {report.aiSearchOptimization.scoreReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-center dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  AI Visibility Score
                </div>
                <div className={`mt-1 font-mono text-4xl font-bold tabular-nums ${aiTone.textClass}`}>
                  {report.aiSearchOptimization.aiVisibilityScore}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">out of 100</div>
              </div>
            </div>
          </section>

          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                placeholder="Search AI-search recommendations..."
                aria-label="Search AI search recommendations"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div
              role="group"
              aria-label="Filter AI search checks by status"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
            >
              {(['all', 'fail', 'warning', 'pass'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAiStatusFilter(status)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    aiStatusFilter === status
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredAiRecs.map((rec) => (
              <article
                key={rec.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {rec.area}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={rec.status} />
                      <PriorityTag priority={rec.priority} />
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {rec.finding}
                  </p>
                </div>

                <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  <strong className="text-teal-700 dark:text-teal-400">Action: </strong>
                  {rec.recommendation}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: ACTION PLAN */}
      {activeTab === 'action-plan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {[
              {
                title: 'Days 1–30',
                subtitle: 'Foundation, Quick Fixes & Schema',
                items: report.actionPlan.days30,
              },
              {
                title: 'Days 31–60',
                subtitle: 'Commercial Content & Topical Depth',
                items: report.actionPlan.days60,
              },
              {
                title: 'Days 61–90',
                subtitle: 'Authority, AI Citations & Iteration',
                items: report.actionPlan.days90,
              },
            ].map((phase) => (
              <section
                key={phase.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {phase.title}
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {phase.subtitle}
                </p>
                <ul className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {phase.items.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-mono font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                        {i + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Share-Ready Summary Card Modal */}
      {showShareModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shareable Audit Summary Card"
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Shareable Summary Card
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                aria-label="Close share summary modal"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Clean Visual Share Card */}
            <div className="mt-4 rounded-xl bg-slate-900 p-5 text-white">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-teal-400">Digital Audit Pulse</span>
                <span className="tabular-nums">{formatDisplayDate(report.auditedAt)}</span>
              </div>
              <div className="mt-2 text-lg font-bold truncate">{formatDomain(report.url)}</div>
              <p className="mt-1 text-xs text-slate-300 line-clamp-2">{report.verdict}</p>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-800 pt-4 text-center">
                <div>
                  <div className="font-mono text-2xl font-bold tabular-nums">
                    {report.overallScore}
                  </div>
                  <div className="text-[11px] text-slate-400">Overall ({report.grade})</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-bold text-teal-400 tabular-nums">
                    {report.aiSearchOptimization.aiVisibilityScore}
                  </div>
                  <div className="text-[11px] text-slate-400">AI Visibility</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-bold text-indigo-400 tabular-nums">
                    {statusCounts.pass}/{statusCounts.total}
                  </div>
                  <div className="text-[11px] text-slate-400">Checks Passed</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(buildTextSummary(report));
                    onNotify('success', 'Executive summary copied to clipboard.');
                    setShowShareModal(false);
                  } catch {
                    onNotify('error', 'Failed to copy summary.');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy Text Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
