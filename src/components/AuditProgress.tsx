import { CheckCircle2, Loader2, X } from 'lucide-react';

export const AUDIT_STEPS = [
  'Fetching website...',
  'Analyzing on-page SEO...',
  'Checking technical health...',
  'Researching keywords...',
  'Evaluating AI-search readiness...',
  'Generating report...',
];

interface AuditProgressProps {
  targetUrl: string;
  currentStepIndex: number; // 0 to 5
  currentMessage: string;
  onCancel: () => void;
}

export function AuditProgress({
  targetUrl,
  currentStepIndex,
  currentMessage,
  onCancel,
}: AuditProgressProps) {
  const progressPct = Math.min(100, Math.max(12, Math.round(((currentStepIndex + 1) / AUDIT_STEPS.length) * 100)));

  return (
    <div className="mx-auto max-w-3xl py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              Live Diagnostics Running
            </p>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">
              Auditing {targetUrl}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancel
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-200">{currentMessage}</span>
            <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {progressPct}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Status List */}
        <ul className="mt-6 space-y-2.5" aria-label="Audit progress steps">
          {AUDIT_STEPS.map((label, idx) => {
            const isDone = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50/70 font-medium text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : isDone
                    ? 'text-slate-600 dark:text-slate-400'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                ) : isActive ? (
                  <Loader2
                    className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Skeleton Dashboard Preview */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 h-7 w-12 rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
