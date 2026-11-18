import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, History, Moon, Plus, RefreshCw, Sun } from 'lucide-react';
import { AuditDashboard } from './components/AuditDashboard';
import { AUDIT_STEPS, AuditProgress } from './components/AuditProgress';
import { HistoryPanel } from './components/HistoryPanel';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { UrlForm } from './components/UrlForm';
import { createSampleAuditReport } from './data/sampleAudit';
import type { AuditHistoryEntry, AuditInputContext, AuditReport } from './types/audit';
import {
  clearAuditHistory,
  deleteHistoryEntry,
  findPreviousAuditScore,
  loadAuditHistory,
  saveAuditToHistory,
  updateHistoryReport,
} from './utils/auditHelpers';

const THEME_STORAGE_KEY = 'dap_theme_v1';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  const [view, setView] = useState<'landing' | 'loading' | 'dashboard'>('landing');
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [lastInput, setLastInput] = useState<AuditInputContext | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntry[]>(() => loadAuditHistory());
  const [historyOpen, setHistoryOpen] = useState(false);

  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(AUDIT_STEPS[0]);
  const [auditError, setAuditError] = useState<{ code?: string; message: string } | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDark]);

  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const runAudit = useCallback(
    async (input: AuditInputContext) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLastInput(input);
      setAuditError(null);
      setLoadingStep(0);
      setLoadingMsg(AUDIT_STEPS[0]);
      setView('loading');

      try {
        const response = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errMsg = `Server error (${response.status}). Please retry.`;
          try {
            const errJson = await response.json();
            if (errJson?.error) errMsg = errJson.error;
          } catch {
            // Keep generic error
          }
          setAuditError({ code: 'REQUEST_FAILED', message: errMsg });
          setView('landing');
          return;
        }

        if (!response.body) {
          throw new Error('Streaming response body unavailable.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completedReport: AuditReport | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const rawEvent of events) {
            const line = rawEvent
              .split('\n')
              .find((l) => l.startsWith('data: '));
            if (!line) continue;

            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'progress') {
              const idx = Math.max(0, Math.min(AUDIT_STEPS.length - 1, Number(payload.step || 1) - 1));
              setLoadingStep(idx);
              setLoadingMsg(payload.message || AUDIT_STEPS[idx]);
            } else if (payload.type === 'error') {
              setAuditError({
                code: payload.code,
                message: payload.message || 'Audit failed. Please retry.',
              });
              setView('landing');
              return;
            } else if (payload.type === 'complete' && payload.report) {
              completedReport = payload.report as AuditReport;
            }
          }
        }

        if (completedReport) {
          setActiveReport(completedReport);
          setHistory(saveAuditToHistory(completedReport));
          setView('dashboard');
          notify('success', 'Website marketing audit complete.');
        } else {
          setAuditError({
            code: 'INCOMPLETE_STREAM',
            message: 'The audit finished unexpectedly without a complete report. Please retry.',
          });
          setView('landing');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setView('landing');
          return;
        }
        setAuditError({
          code: 'NETWORK_ERROR',
          message:
            err instanceof Error
              ? err.message
              : 'Network connection interrupted during audit.',
        });
        setView('landing');
      }
    },
    [notify]
  );

  const handleLoadSample = useCallback(
    (customUrl?: string) => {
      const sample = createSampleAuditReport(customUrl || lastInput?.url || 'https://nordiccraftstudio.com');
      setActiveReport(sample);
      setHistory(saveAuditToHistory(sample));
      setAuditError(null);
      setView('dashboard');
      notify('info', 'Loaded interactive sample audit report.');
    },
    [lastInput?.url, notify]
  );

  const handleCancelAudit = useCallback(() => {
    abortControllerRef.current?.abort();
    setView('landing');
    notify('info', 'Audit cancelled.');
  }, [notify]);

  const handleToggleChecklistItem = useCallback((itemId: string) => {
    setActiveReport((prev) => {
      if (!prev) return prev;
      const updated: AuditReport = {
        ...prev,
        technicalSeoChecklist: prev.technicalSeoChecklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      };
      setHistory(updateHistoryReport(updated));
      return updated;
    });
  }, []);

  const handleRerunAudit = useCallback(() => {
    if (!activeReport) return;
    runAudit({
      url: activeReport.url,
      targetCountry: activeReport.context.targetCountry,
      industry: activeReport.context.industry,
      competitorUrl: activeReport.context.competitorUrl,
      goal: activeReport.context.goal,
    });
  }, [activeReport, runAudit]);

  const previousScore = activeReport
    ? findPreviousAuditScore(history, activeReport.url, activeReport.id)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Bar Contract: 3 clean single-line zones */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setView('landing');
            }}
            className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            Digital Audit Pulse
          </a>

          {/* Zone 2: Concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setView('landing')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
            >
              Audit Tool
            </button>
            {view === 'landing' && (
              <>
                <a
                  href="#capabilities"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
                >
                  Capabilities
                </a>
                <a
                  href="#how-it-works"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
                >
                  How It Works
                </a>
              </>
            )}
            {activeReport && view !== 'dashboard' && (
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
              >
                Current Report
              </button>
            )}
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              <span>History ({history.length})</span>
            </button>
          </nav>

          {/* Zone 3: Theme Toggle + 1 Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label={`Open audit history (${history.length})`}
              className="md:hidden inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200"
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span className="tabular-nums">{history.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors shrink-0"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {view === 'dashboard' ? (
              <button
                type="button"
                onClick={() => setView('landing')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                New Audit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleLoadSample()}
                className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors whitespace-nowrap shrink-0"
              >
                Sample Report
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6">
        {/* Error Recovery Banner */}
        {auditError && view === 'landing' && (
          <div
            role="alert"
            className="mx-auto mb-6 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                    Unable to complete live audit
                  </h2>
                  <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300">
                    {auditError.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {lastInput && (
                  <button
                    type="button"
                    onClick={() => runAudit(lastInput)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleLoadSample(lastInput?.url)}
                  className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 transition-colors whitespace-nowrap"
                >
                  Load Sample Report
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'landing' && (
          <UrlForm
            onSubmit={runAudit}
            onLoadSample={() => handleLoadSample()}
            initialValues={lastInput || undefined}
          />
        )}

        {view === 'loading' && (
          <AuditProgress
            targetUrl={lastInput?.url || 'website'}
            currentStepIndex={loadingStep}
            currentMessage={loadingMsg}
            onCancel={handleCancelAudit}
          />
        )}

        {view === 'dashboard' && activeReport && (
          <AuditDashboard
            report={activeReport}
            previousScore={previousScore}
            onRerunAudit={handleRerunAudit}
            onToggleChecklistItem={handleToggleChecklistItem}
            onNotify={notify}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Disclaimer: Audit scores, keyword estimates, and AI visibility findings are AI-generated and should be verified with Google Search Console and PageSpeed Insights.
          </p>
          <p className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
            Built with Gemini
          </p>
        </div>
      </footer>

      {/* Audit History Drawer */}
      <HistoryPanel
        isOpen={historyOpen}
        entries={history}
        activeReportId={activeReport?.id}
        onClose={() => setHistoryOpen(false)}
        onSelectEntry={(entry) => {
          setActiveReport(entry.report);
          setView('dashboard');
          notify('info', `Loaded audit for ${entry.url}`);
        }}
        onDeleteEntry={(id) => {
          setHistory(deleteHistoryEntry(id));
          notify('info', 'Audit entry removed from history.');
        }}
        onClearAll={() => {
          setHistory(clearAuditHistory());
          notify('info', 'Audit history cleared.');
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
