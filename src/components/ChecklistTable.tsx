import { useMemo, useState } from 'react';
import { Check, Download, Search } from 'lucide-react';
import type { AuditStatus, PriorityLevel, TechnicalChecklistItem } from '../types/audit';
import { PriorityTag, StatusBadge } from './StatusBadge';

interface ChecklistTableProps {
  items: TechnicalChecklistItem[];
  onToggleItem: (id: string) => void;
  onExportCsv: () => void;
}

export function ChecklistTable({ items, onToggleItem, onExportCsv }: ChecklistTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AuditStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');

  const completedCount = useMemo(
    () => items.filter((item) => Boolean(item.completed)).length,
    [items]
  );
  const completionPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (
        q &&
        !item.item.toLowerCase().includes(q) &&
        !item.area.toLowerCase().includes(q) &&
        !item.howToFix.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, search, statusFilter, priorityFilter]);

  return (
    <div className="space-y-4">
      {/* Live Completion Progress Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">
              Remediation Progress
            </span>
            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {completedCount}/{items.length} completed ({completionPct}%)
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Technical checklist completion percentage"
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onExportCsv}
          className="no-print inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export Checklist CSV
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technical checks, areas, or fixes..."
            aria-label="Search technical checklist"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter by status"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            {(['all', 'fail', 'warning', 'pass'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | PriorityLevel)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No technical checks match your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <th className="w-12 px-4 py-3 text-center">Done</th>
                  <th className="px-4 py-3">Check &amp; Area</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">How to Fix / Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((row) => {
                  const checked = Boolean(row.completed);
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        checked ? 'opacity-65' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center align-top">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`Mark "${row.item}" as ${checked ? 'incomplete' : 'completed'}`}
                          onClick={() => onToggleItem(row.id)}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                            checked
                              ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-500 dark:bg-teal-500'
                              : 'border-slate-300 bg-white hover:border-indigo-500 dark:border-slate-600 dark:bg-slate-950'
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 align-top min-w-[210px]">
                        <div
                          className={`font-medium text-slate-900 dark:text-white ${
                            checked ? 'line-through' : ''
                          }`}
                        >
                          {row.item}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {row.area}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <PriorityTag priority={row.priority} />
                      </td>
                      <td className="px-4 py-3.5 align-top text-xs leading-relaxed text-slate-600 dark:text-slate-300 min-w-[260px]">
                        {row.howToFix}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
