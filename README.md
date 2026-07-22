# Assignment Feedback Loop (AFL)

**IPS Academy, Indore**

A web platform that digitizes handwritten engineering assignments,
uses AI to read and evaluate them, and gives students structured
feedback in hours instead of weeks — while keeping faculty firmly in
control of the final grade.

Students upload photos of handwritten work. Gemini reads the
handwriting, checks it against the assignment's rubric, and generates
step-by-step feedback with a suggested mark. Faculty review that
feedback, annotate the pages directly, adjust marks, and publish —
at which point the student is notified instantly.

---

## What It Does

### For Students
- Submit handwritten assignments as photos or PDFs (multiple pages)
- Track submission status in real time (Submitted → AI Processing → Graded)
- View AI-generated feedback plus faculty annotations on their own pages
- See a personal performance dashboard — marks trend per subject,
  compared against an anonymized section average
- Get notified in-app the moment an assignment is graded, or a new one is posted

### For Faculty
- Create assignments per subject/section, with an optional reference
  answer key for the AI to cross-check against
- Review AI-generated feedback alongside the student's original pages
- Annotate pages directly (highlight, comment, draw) before publishing
- Override AI marks and add personal remarks
- View section-level analytics — average marks per assignment, most
  common AI-flagged errors, a student-wise marks table, and a
  section-average trend over time
- Get notified in-app the moment a submission is ready to evaluate

### For Admins
- Manage every student and faculty account — search, filter, activate/deactivate
- Manage the branch → sub-branch → section structure, with independent
  enable/disable toggles and live student/faculty counts at every level
- Run a comparison against the institute's own records to catch drift
  (new accounts not yet onboarded, data mismatches, orphaned records)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM v7 |
| Database | PostgreSQL via Supabase (Row Level Security enabled) |
| AI Engine | Gemini 3.5 Flash (`@google/genai`) — multimodal vision + text |
| File Storage | Cloudinary — private/authenticated, served via signed URLs (1-hour expiry) |
| Background Jobs | BullMQ + Upstash Redis, drained on a schedule by Upstash QStash |
| Auth | JWT sessions (`jose`), HttpOnly cookies |
| Charts | Recharts |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (PostgreSQL)
- API keys for: Gemini, Cloudinary, Upstash Redis, Upstash QStash

### Installation

```bash
git clone https://github.com/Arroh-Yadav/Assignment-feedback-loop.git
cd Assignment-feedback-loop
npm install
```

### Environment Variables

Copy `.env.example` (or see `Docs/Setup-Guide.md` for the full,
annotated list) into `.env.local` and fill in every value:

```env
JWT_SECRET=
MOCK_DB_URL=
INSTITUTE_DB_API_KEY=
GEMINI_API_KEY=
DATABASE_URL=
DIRECT_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
REDIS_URL=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
NEXT_PUBLIC_APP_URL=
```

### Database Setup

This project's schema changes go through `db push`, not `migrate` —
there is no migration history for this database.

```bash
npx prisma generate
npx prisma db push
```

### Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Project Structure

```
/app          → Pages (student/faculty/admin) + API routes
/lib          → Core logic: Gemini pipeline, auth, Cloudinary, queue, rate limiting
/worker       → Serverless-safe background job processor
/prisma       → Database schema
/components   → Shared UI components (e.g. notification bell)
/mock         → Mock institute database (students.json, faculty.json)
/Docs         → Full technical documentation (see below)
```

---

## Documentation

Deeper technical detail lives in `/Docs`:

| Doc | Covers |
|---|---|
| `PRD.md` | Product requirements and what's actually delivered vs. planned |
| `TRD.md` | Full technical architecture, code patterns, dependencies |
| `Backend-Schema.md` | Every database table, field by field |
| `App-Flow.md` | Step-by-step user flows for each role |
| `UI-UX-Brief.md` | Design system, colors, component standards |
| `Setup-Guide.md` | Detailed explanation of every external service used |
| `Implementation-Plan.md` | Build history — what was built, when, and why, including deviations from the original plan |

---

## Status

Core assignment loop, AI evaluation pipeline, student/faculty/admin
experiences, in-app notifications, and production hardening (auth
audit, signed file URLs, rate limiting, Row Level Security) are all
complete and live. See `Docs/PRD.md` for the full list of what's
shipped versus what's intentionally out of scope for now.
