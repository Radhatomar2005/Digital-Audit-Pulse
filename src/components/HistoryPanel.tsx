import { Clock, ExternalLink, Trash2, X } from 'lucide-react';
import type { AuditHistoryEntry } from '../types/audit';
import { formatDisplayDate, formatDomain, getScoreTone } from '../utils/auditHelpers';

interface HistoryPanelProps {
  isOpen: boolean;
  entries: AuditHistoryEntry[];
  activeReportId?: string;
  onClose: () => void;
  onSelectEntry: (entry: AuditHistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryPanel({
  isOpen,
  entries,
  activeReportId,
  onClose,
  onSelectEntry,
  onDeleteEntry,
  onClearAll,
}: HistoryPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Audit History"
      className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Audit History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saved locally in your browser ({entries.length})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit history"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No saved audits yet
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                Run an audit on any website or preview the sample report to save results here for quick comparison.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {entries.map((entry) => {
                const tone = getScoreTone(entry.overallScore);
                const isActive = entry.id === activeReportId;
                return (
                  <li
                    key={entry.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500/70 dark:bg-indigo-950/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEntry(entry);
                          onClose();
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {formatDomain(entry.url)}
                          </span>
                          {entry.isDemo && (
                            <span className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                              Sample
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatDisplayDate(entry.auditedAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-mono font-semibold tabular-nums ${tone.textClass}`}>
                            {entry.overallScore}/100 ({entry.grade})
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectEntry(entry);
                            onClose();
                          }}
                          aria-label={`Open audit for ${formatDomain(entry.url)}`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry.id)}
                          aria-label={`Delete audit for ${formatDomain(entry.url)}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {entries.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            <button
              type="button"
              onClick={onClearAll}
              className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
            >
              Clear All Saved History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
