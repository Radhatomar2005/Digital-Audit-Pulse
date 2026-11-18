import { useState } from 'react';
import {
  Copy,
  FileDown,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Printer,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { AuditReport } from '../types/audit';
import {
  buildTextSummary,
  countAllStatuses,
  formatDisplayDate,
  formatDomain,
} from '../utils/auditHelpers';

interface ReportExporterProps {
  report: AuditReport;
  chartsElementId?: string;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

function escapeCsvCell(val: string | number | boolean | undefined): string {
  const str = String(val ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportKeywordsCsv(report: AuditReport) {
  const headers = [
    'Keyword',
    'Group',
    'Search Intent',
    'Difficulty (AI Est.)',
    'Opportunity',
    'Monthly Searches (AI Est.)',
    'Rationale',
  ];
  const rows = report.keywordSuggestions.map((k) =>
    [
      k.keyword,
      k.group,
      k.searchIntent,
      k.difficulty,
      k.opportunity,
      k.estimatedMonthlySearches,
      k.rationale,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(`${formatDomain(report.url)}-keywords.csv`, csv, 'text/csv;charset=utf-8;');
}

export function exportChecklistCsv(report: AuditReport) {
  const headers = ['Completed', 'Item', 'Area', 'Status', 'Priority', 'How to Fix'];
  const rows = report.technicalSeoChecklist.map((c) =>
    [
      c.completed ? 'Yes' : 'No',
      c.item,
      c.area,
      c.status,
      c.priority,
      c.howToFix,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(
    `${formatDomain(report.url)}-technical-checklist.csv`,
    csv,
    'text/csv;charset=utf-8;'
  );
}

export function ReportExporter({
  report,
  chartsElementId,
  onNotify,
}: ReportExporterProps) {
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleDownloadJson = () => {
    const json = JSON.stringify(report, null, 2);
    triggerDownload(
      `${formatDomain(report.url)}-audit.json`,
      json,
      'application/json;charset=utf-8;'
    );
    onNotify('success', 'Raw JSON audit report downloaded.');
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildTextSummary(report));
      onNotify('success', 'Executive summary copied to clipboard.');
    } catch {
      onNotify('error', 'Could not access clipboard.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      const domain = formatDomain(report.url);
      const counts = countAllStatuses(report);

      // --- COVER PAGE ---
      pdf.setFillColor(79, 70, 229); // #4F46E5 Indigo
      pdf.rect(0, 0, pageWidth, 68, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Digital Audit Pulse', margin, 26);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text("Check your website's pulse. — Comprehensive Digital Marketing Audit", margin, 35);

      pdf.setFontSize(10);
      pdf.text(`Target Website: ${report.url}`, margin, 50);
      pdf.text(`Generated: ${formatDisplayDate(report.auditedAt)}`, margin, 57);

      // Overall Score Box
      let y = 84;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, 42, 3, 3, 'FD');

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.text(`${report.overallScore}/100`, margin + 8, y + 18);

      pdf.setFontSize(12);
      pdf.setTextColor(20, 184, 166); // #14B8A6 Teal
      pdf.text(`Grade ${report.grade}`, margin + 8, y + 27);

      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const verdictLines = pdf.splitTextToSize(report.verdict, contentWidth - 62);
      pdf.text(verdictLines, margin + 52, y + 14);

      y += 52;

      // Category Scores Table
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Category Score Summary', margin, y);
      y += 7;

      const cats = [
        ['On-Page SEO', `${report.categoryScores.seo}/100`],
        ['Content Strategy', `${report.categoryScores.content}/100`],
        ['Keyword Opportunity', `${report.categoryScores.keywords}/100`],
        ['Technical Health', `${report.categoryScores.technical}/100`],
        ['AI-Search Readiness', `${report.categoryScores.aiSearch}/100 (AI Visibility: ${report.aiSearchOptimization.aiVisibilityScore}/100)`],
      ];

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      for (const [name, val] of cats) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, contentWidth, 8, 'F');
        pdf.setTextColor(30, 41, 59);
        pdf.text(name, margin + 3, y + 5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text(val, margin + contentWidth - 3, y + 5.5, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        y += 9.5;
      }

      y += 4;
      pdf.setFontSize(9.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(
        `Check Totals: ${counts.pass} Passed · ${counts.warning} Warnings · ${counts.fail} Failed`,
        margin,
        y
      );
      y += 8;

      // Capture visual charts snapshot if visible in DOM
      if (chartsElementId) {
        const el = document.getElementById(chartsElementId);
        if (el) {
          try {
            const canvas = await html2canvas(el, {
              scale: 1.5,
              backgroundColor: '#ffffff',
              useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * contentWidth) / canvas.width;
            if (y + imgHeight < pageHeight - 20) {
              pdf.addImage(imgData, 'PNG', margin, y, contentWidth, imgHeight);
            }
          } catch {
            // Skip screenshot if canvas capture encounters restricted styles
          }
        }
      }

      // Disclaimer at bottom of cover
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        'Disclaimer: Findings are AI-generated and should be verified with Google Search Console and PageSpeed Insights.',
        margin,
        pageHeight - 12
      );

      // Helper for paginated text sections
      const addSectionPage = (title: string) => {
        pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(79, 70, 229);
        pdf.text(title, margin, 20);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, 23, pageWidth - margin, 23);
        return 30;
      };

      const ensureSpace = (needed: number, currentY: number, continuationTitle: string) => {
        if (currentY + needed > pageHeight - 16) {
          return addSectionPage(`${continuationTitle} (cont.)`);
        }
        return currentY;
      };

      // --- QUICK WINS & SEO AUDIT ---
      y = addSectionPage('Top 5 Quick Wins (< 1 Week)');
      pdf.setFontSize(9.5);
      for (const qw of report.quickWins) {
        y = ensureSpace(16, y, 'Quick Wins');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(`• ${qw.title} [${qw.impact} Impact · ${qw.effort}]`, margin, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        const lines = pdf.splitTextToSize(qw.steps, contentWidth - 4);
        pdf.text(lines, margin + 4, y);
        y += lines.length * 4.5 + 3;
      }

      y = addSectionPage('On-Page SEO Audit');
      for (const item of report.seoAudit) {
        y = ensureSpace(20, y, 'On-Page SEO Audit');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(
          `${item.check} [${item.status.toUpperCase()} · ${item.priority} Priority]`,
          margin,
          y
        );
        y += 4.5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        const fLines = pdf.splitTextToSize(`Finding: ${item.finding}`, contentWidth);
        pdf.text(fLines, margin, y);
        y += fLines.length * 4.2 + 1;
        const fixLines = pdf.splitTextToSize(`Fix: ${item.fix}`, contentWidth);
        pdf.text(fixLines, margin, y);
        y += fixLines.length * 4.2 + 4;
      }

      // --- CONTENT & KEYWORDS ---
      y = addSectionPage('Content Recommendations & Topic Ideas');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Identified Content Gaps:', margin, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      for (const gap of report.contentRecommendations.contentGaps) {
        y = ensureSpace(10, y, 'Content Recommendations');
        const lines = pdf.splitTextToSize(`- ${gap}`, contentWidth);
        pdf.text(lines, margin, y);
        y += lines.length * 4.5 + 1.5;
      }
      y += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Recommended Blog & Page Topics:', margin, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      for (const topic of report.contentRecommendations.topicIdeas) {
        y = ensureSpace(12, y, 'Topic Ideas');
        const lines = pdf.splitTextToSize(
          `• ${topic.title} (${topic.searchIntent} · ${topic.priority}) — ${topic.targetAngle}`,
          contentWidth
        );
        pdf.text(lines, margin, y);
        y += lines.length * 4.4 + 2;
      }

      y = addSectionPage('Keyword Suggestions (AI Estimates)');
      pdf.setFontSize(9);
      for (const kw of report.keywordSuggestions) {
        y = ensureSpace(11, y, 'Keyword Suggestions');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(
          `${kw.keyword}  [${kw.group} · ${kw.searchIntent} · Diff: ${kw.difficulty} · ${kw.estimatedMonthlySearches}]`,
          margin,
          y
        );
        y += 4.2;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        const rLines = pdf.splitTextToSize(kw.rationale, contentWidth);
        pdf.text(rLines, margin, y);
        y += rLines.length * 4 + 2.5;
      }

      // --- TECHNICAL & AI SEARCH ---
      y = addSectionPage('Technical SEO Checklist');
      pdf.setFontSize(9);
      for (const tech of report.technicalSeoChecklist) {
        y = ensureSpace(14, y, 'Technical SEO Checklist');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(
          `[${tech.completed ? 'DONE' : tech.status.toUpperCase()}] ${tech.item} (${tech.area} · ${tech.priority})`,
          margin,
          y
        );
        y += 4.2;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        const hLines = pdf.splitTextToSize(tech.howToFix, contentWidth);
        pdf.text(hLines, margin, y);
        y += hLines.length * 4 + 2.5;
      }

      y = addSectionPage('AI-Search Readiness & 30-60-90 Day Action Plan');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text(
        `AI Visibility Score: ${report.aiSearchOptimization.aiVisibilityScore}/100`,
        margin,
        y
      );
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      for (const rec of report.aiSearchOptimization.recommendations) {
        y = ensureSpace(14, y, 'AI-Search Readiness');
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${rec.area} [${rec.status.toUpperCase()}]`, margin, y);
        y += 4.2;
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(`${rec.finding} Fix: ${rec.recommendation}`, contentWidth);
        pdf.text(lines, margin, y);
        y += lines.length * 4 + 2.5;
      }

      y += 4;
      const phases: [string, string[]][] = [
        ['Days 1–30: Foundation & Quick Fixes', report.actionPlan.days30],
        ['Days 31–60: Content & Authority', report.actionPlan.days60],
        ['Days 61–90: Scale & AI Citations', report.actionPlan.days90],
      ];
      for (const [phaseTitle, tasks] of phases) {
        y = ensureSpace(16, y, 'Action Plan');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(79, 70, 229);
        pdf.text(phaseTitle, margin, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(30, 41, 59);
        for (const task of tasks) {
          y = ensureSpace(10, y, 'Action Plan');
          const lines = pdf.splitTextToSize(`• ${task}`, contentWidth);
          pdf.text(lines, margin, y);
          y += lines.length * 4.2 + 1.5;
        }
        y += 3;
      }

      pdf.save(`${domain}-digital-audit-pulse.pdf`);
      onNotify('success', 'Branded PDF report downloaded.');
    } catch {
      onNotify('error', 'Failed to generate PDF report. Please try Print instead.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={generatingPdf}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors whitespace-nowrap shrink-0"
      >
        {generatingPdf ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Download PDF Report
      </button>

      <button
        type="button"
        onClick={() => {
          exportKeywordsCsv(report);
          onNotify('success', 'Keywords CSV downloaded.');
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
        Keywords CSV
      </button>

      <button
        type="button"
        onClick={() => {
          exportChecklistCsv(report);
          onNotify('success', 'Technical Checklist CSV downloaded.');
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
        Checklist CSV
      </button>

      <button
        type="button"
        onClick={handleDownloadJson}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
      >
        <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
        Export JSON
      </button>

      <button
        type="button"
        onClick={handleCopySummary}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        Copy Summary
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
      >
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        Print
      </button>
    </div>
  );
}
