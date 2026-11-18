import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { AuditStatus, PriorityLevel } from '../types/audit';

export function StatusBadge({ status }: { status: AuditStatus }) {
  if (status === 'pass') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Pass
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 whitespace-nowrap shrink-0">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 whitespace-nowrap shrink-0">
      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Fail
    </span>
  );
}

export function PriorityTag({ priority }: { priority: PriorityLevel }) {
  const styles: Record<PriorityLevel, string> = {
    High: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40',
    Medium: 'text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40',
    Low: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}
