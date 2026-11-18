import { useMemo, useState } from 'react';
import { ArrowUpDown, Check, Copy, Download, Info, Search } from 'lucide-react';
import type { KeywordGroup, KeywordSuggestion, PriorityLevel } from '../types/audit';

interface KeywordTableProps {
  keywords: KeywordSuggestion[];
  onCopySuccess: (msg: string) => void;
  onExportCsv: () => void;
}

type SortKey = 'keyword' | 'group' | 'searchIntent' | 'difficulty' | 'opportunity';

const PRIORITY_RANK: Record<PriorityLevel, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const GROUPS: Array<'All' | KeywordGroup> = [
  'All',
  'Primary',
  'Secondary',
  'Long-tail',
  'Question-based',
];

export function KeywordTable({
  keywords,
  onCopySuccess,
  onExportCsv,
}: KeywordTableProps) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'All' | KeywordGroup>('All');
  const [sortKey, setSortKey] = useState<SortKey>('group');
  const [sortAsc, setSortAsc] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedAndFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = keywords.filter((kw) => {
      if (groupFilter !== 'All' && kw.group !== groupFilter) return false;
      if (
        q &&
        !kw.keyword.toLowerCase().includes(q) &&
        !kw.rationale.toLowerCase().includes(q) &&
        !kw.searchIntent.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'difficulty' || sortKey === 'opportunity') {
        cmp = PRIORITY_RANK[a[sortKey]] - PRIORITY_RANK[b[sortKey]];
      } else {
        cmp = a[sortKey].localeCompare(b[sortKey]);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [keywords, search, groupFilter, sortKey, sortAsc]);

  const copyKeyword = async (kw: KeywordSuggestion) => {
    try {
      await navigator.clipboard.writeText(kw.keyword);
      setCopiedId(kw.id);
      onCopySuccess(`Copied "${kw.keyword}"`);
      setTimeout(() => setCopiedId((prev) => (prev === kw.id ? null : prev)), 1500);
    } catch {
      onCopySuccess('Unable to access clipboard');
    }
  };

  const copyAllVisible = async () => {
    const text = sortedAndFiltered.map((k) => k.keyword).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onCopySuccess(`Copied ${sortedAndFiltered.length} keywords to clipboard`);
    } catch {
      onCopySuccess('Unable to access clipboard');
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Estimate Disclosure */}
      <div className="flex items-start gap-2.5 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-xs text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        <p>
          <strong>AI Estimate Notice:</strong> Search volumes, difficulty tiers, and opportunity scores below are AI-generated strategic estimates based on topical competitiveness—not exact historical Google Keyword Planner or Ahrefs data.
        </p>
      </div>

      {/* Toolbar */}
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter keywords..."
              aria-label="Filter keywords"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div
            role="group"
            aria-label="Filter by keyword group"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            {GROUPS.map((grp) => (
              <button
                key={grp}
                type="button"
                onClick={() => setGroupFilter(grp)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  groupFilter === grp
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyAllVisible}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy Keywords
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {sortedAndFiltered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No keywords match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('keyword')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Keyword
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('group')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Group
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('searchIntent')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Intent
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('difficulty')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Difficulty (Est.)
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('opportunity')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Opportunity
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Monthly Volume (AI Est.)</th>
                  <th className="no-print w-16 px-4 py-3 text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedAndFiltered.map((kw) => {
                  const diffTone =
                    kw.difficulty === 'Low'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : kw.difficulty === 'Medium'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-700 dark:text-rose-400';

                  const oppTone =
                    kw.opportunity === 'High'
                      ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                      : kw.opportunity === 'Medium'
                      ? 'text-indigo-700 dark:text-indigo-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400';

                  return (
                    <tr
                      key={kw.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {kw.keyword}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                          {kw.rationale}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {kw.group}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {kw.searchIntent}
                      </td>
                      <td className={`px-4 py-3 align-top text-xs font-medium whitespace-nowrap ${diffTone}`}>
                        {kw.difficulty}
                      </td>
                      <td className={`px-4 py-3 align-top text-xs whitespace-nowrap ${oppTone}`}>
                        {kw.opportunity}
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {kw.estimatedMonthlySearches}
                      </td>
                      <td className="no-print px-4 py-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => copyKeyword(kw)}
                          aria-label={`Copy keyword ${kw.keyword}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
                        >
                          {copiedId === kw.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
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
