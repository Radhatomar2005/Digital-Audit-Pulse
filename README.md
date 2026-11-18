# Digital Audit Pulse

> **Check your website's pulse.** — An AI-powered digital marketing, SEO, content, keyword, technical health, and AI-search readiness audit tool.

## Features

- **Live Website Inspection + AI Grounding**: Fetches live HTML metadata, HTTP security headers, `robots.txt`, and `sitemap.xml`, combined with Gemini API (`gemini-4-hydrogen`), URL Context, and Google Search grounding to return a structured JSON audit.
- **Interactive Results Dashboard**:
  - Overall score gauge (`0–100`, Grade `A–F`) with previous-audit comparison delta.
  - Five category radial score rings (`SEO`, `Content`, `Keywords`, `Technical`, `AI Search`), Radar chart, and Issues-by-Priority bar chart via Recharts.
  - Seven organized tabs (`Overview`, `SEO Audit`, `Content`, `Keywords`, `Technical Checklist`, `AI Search`, `Action Plan`) with search and status/priority filters.
  - Tickable Technical SEO Checklist with live completion tracking persisted in `localStorage`.
  - Sortable 20-keyword table with AI-estimate labeling and one-click copy.
  - Optional competitor benchmark comparison when a competitor URL is supplied.
- **Exports & Reporting**: Branded multi-page PDF export (`jsPDF` + `html2canvas`), CSV exports (keywords and checklist), raw JSON export, clipboard summary, and print-ready stylesheet.
- **Sample Benchmark Fallback**: Built-in interactive sample audit report so the full dashboard can be previewed immediately or if an external site blocks crawling.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (`.env` or AI Studio **Settings > Secrets**):
   - `GEMINI_API_KEY`: Your Gemini API key (accessed strictly server-side in `server.ts`).
3. Start the development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Build and start for production:
   ```bash
   npm run build
   npm start
   ```
