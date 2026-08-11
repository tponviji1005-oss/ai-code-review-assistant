# AI Code Review Assistant

An AI-powered code review tool that analyzes git diffs for bugs, security vulnerabilities, performance issues, and style problems — with confidence scoring, noise reduction, and competitive benchmarking.

## Problem Statement

AI code review tools like CodeRabbit and GitHub Copilot generate large volumes of suggestions, many of which are low-confidence false positives. This "noise" causes developers to ignore or distrust AI reviews entirely. This tool addresses that problem by assigning confidence scores to every issue, allowing users to filter noise via a sensitivity slider, learning from feedback over time, and providing transparent benchmarking against competitors.

## Features

### Phase 1 — Authentication & Core Review
- Email/password signup and login via Supabase Auth
- Paste a git diff or code snippet, receive AI-powered review via Google Gemini
- Issues returned with file, line number, category, severity, and confidence score

### Phase 2 — Confidence Filtering & Feedback
- Sensitivity slider to filter out low-confidence issues
- Thumbs up/down feedback on every issue
- Feedback persisted to Supabase for personalization

### Phase 3 — Supabase Persistence
- Reviews, issues, and feedback stored in Supabase
- Row Level Security (RLS) — users only see their own data
- Dashboard with review history

### Phase 4 — Feedback-Driven Personalization & Root Cause Detection
- After 5+ feedback entries, the AI personalizes future reviews based on your preferences
- Root cause detection groups related issues and surfaces systemic problems
- Analytics dashboard with category breakdown, confidence trend, and feedback stats

### Phase 5 — Analytics Dashboard
- Pie chart of issue categories
- Bar chart of helpful vs. unhelpful feedback
- Confidence trend line chart over time
- Noise reduction metric

### Phase 6 — Benchmark Comparison
- Manually enter CodeRabbit and Copilot results for the same test diffs
- Comparison table showing bugs found, false positives, and time per tool
- Bar chart comparing average performance across all three tools
- Signal-to-Noise Ratio calculation per tool

### Phase 7 — Business Impact, Export & Polish
- Every issue includes business impact assessment: risk level, estimated fix time, priority rank
- Sort issues by Priority, Severity, or Confidence
- Export reviews as PDF or Markdown
- Friendly error messages throughout
- Consistent loading states and empty states

## AI Code Review

This project includes an AI-powered code review workflow that:

- Fetches open pull requests from GitHub.
- Reads the files changed in each pull request.
- Sends the code changes to an AI model for analysis.
- Generates review comments with suggestions for code quality, readability, and best practices.
- Can be extended to automatically post review comments back to GitHub pull requests.

> This feature is currently under development.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| AI | Google Gemini 2.5 Flash |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Export | jsPDF (PDF), native Blob (Markdown) |

## Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### 1. Database

Run the SQL files in your Supabase SQL Editor in order:

1. `supabase-schema.sql` — creates reviews, issues, feedback tables + RLS
2. `supabase-migration-phase5.sql` — adds root_cause_summary column
3. `supabase-migration-phase6.sql` — creates benchmarks table + RLS
4. `supabase-migration-phase7.sql` — adds business impact columns to issues

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

```bash
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env` with your values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to the backend at `http://localhost:3001`.

## Known Limitations

- **No cross-file or repo-wide context analysis** — reviews are limited to the diff provided; the AI cannot see the full codebase, call graphs, or import chains.
- **Benchmark data is manually entered** — there is no live API integration with CodeRabbit or Copilot (no public free API exists for this). You must run the same diff through each tool yourself and enter the results.
- **Gemini free tier rate limits** — the free tier allows ~15 requests per minute. Under heavy use, reviews may be delayed or fail. The app includes automatic retry logic with exponential backoff.
- **Single-diff reviews only** — each review analyzes one diff at a time; there is no multi-commit or PR-level batching.
- **Business impact estimates are AI-generated** — fix times and priority ranks are approximations, not measured data.

## Future Improvements

- GitHub webhook integration for automatic PR reviews
- Automated benchmarking via API (if CodeRabbit/Copilot ever expose public APIs)
- Multi-language, repo-wide static analysis
- PDF/Markdown export with custom branding
- Team collaboration features (shared reviews, shared benchmarks)
- VS Code extension for inline reviews
- Support for reviewing entire files (not just diffs)
- Cost tracking per review (Gemini API usage)

## Project Structure

```
ai-code-review-assistant/
├── backend/
│   └── src/
│       ├── index.js              # Express server entry
│       ├── supabase.js           # Supabase admin client
│       ├── geminiReviewer.js     # Gemini AI integration + prompt
│       ├── parseDiff.js          # Git diff parser
│       ├── middleware/
│       │   └── auth.js           # JWT auth middleware
│       └── routes/
│           ├── review.js         # POST /api/review, /api/feedback
│           └── benchmark.js      # POST /api/benchmark
├── frontend/
│   └── src/
│       ├── App.jsx               # Router setup
│       ├── context/
│       │   └── AuthContext.jsx   # Supabase auth context
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Signup.jsx
│       │   ├── NewReview.jsx     # Submit diff + see results
│       │   ├── Dashboard.jsx     # Analytics overview
│       │   ├── ReviewView.jsx    # Single review detail + export
│       │   └── Benchmark.jsx     # Competitor comparison
│       └── components/
│           ├── Navbar.jsx
│           ├── ProtectedRoute.jsx
│           ├── IssueCard.jsx
│           ├── SensitivitySlider.jsx
│           └── LoadingSpinner.jsx
├── supabase-schema.sql
├── supabase-migration-phase5.sql
├── supabase-migration-phase6.sql
└── supabase-migration-phase7.sql
```
