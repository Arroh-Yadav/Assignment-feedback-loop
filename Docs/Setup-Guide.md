# Setup Guide — Assignment Feedback Loop

## IPS Academy, Indore

---

## Services Used in This Project

This project depends on 5 external services. Each one handles a specific
responsibility in the AFL platform. All credentials go in `.env.local`
at the root of the project — never commit this file to GitHub.

---

## 1. Supabase — Database

**Used for:** Storing all structured data for the platform.

This includes every user profile, branch and section configuration,
assignment details, student submissions, AI feedback results,
faculty evaluations, and annotation data across all 12 database tables.

Prisma ORM connects to Supabase using a single `DATABASE_URL`
connection string. All reads and writes from Next.js API routes
go through Prisma into this PostgreSQL database.

```env
DATABASE_URL=
```

---

## 2. Gemini API — AI Engine

**Used for:** Reading handwritten assignment pages and generating evaluation feedback.

Every time a student submits an assignment, the pages are sent to
Gemini 3.5 Flash via the `@google/genai` SDK (Google's current
multimodal GA model — `gemini-1.5-pro` and its old `@google/generative-ai`
SDK are both fully discontinued as of mid-2026). Gemini reads the handwriting,
extracts text and formulas, checks the solution structure against
the assignment rubric, generates step-by-step feedback items
(correct / error / warning), and suggests a mark out of the total.

The result is saved to the `ai_feedback` table and displayed
to faculty in the evaluation screen.

```env
GEMINI_API_KEY=
```

---

## 3. Cloudinary — File Storage

**Used for:** Storing and serving student submission files (images and PDFs).

When a student uploads handwritten pages, each file is sent to
Cloudinary and stored under `afl/submissions/{submissionId}/`.
Cloudinary returns a permanent URL for each page which is saved
in the `submissions.file_urls` array in Supabase.

These URLs are used in three places:

- Faculty evaluation screen (to display the pages)
- Gemini processing (to read the handwriting)
- Student feedback view (to show annotated pages)

All URLs are signed and expire after 1 hour for security.

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 4. Upstash Redis — Background Job Queue

**Used for:** Running Gemini AI processing in the background without blocking the user.

When a student submits an assignment, the app immediately returns
a success response and adds a job to the Redis queue via BullMQ.
A background worker picks up the job, runs Gemini processing
(which takes 5–15 seconds), and updates the submission status
through the pipeline: `submitted → ai_processing → ai_done`.

This ensures students never wait for AI processing to complete
and Vercel serverless function timeouts are never hit.

```env
REDIS_URL=
```

---

## 5. Vercel — Hosting & Deployment

**Used for:** Hosting the Next.js application and managing deployments.

The project is connected to the GitHub repository. Every push to
the `main` branch triggers an automatic production deployment.
All environment variables are stored securely in the Vercel
project dashboard and injected at build time.

Vercel also handles:

- HTTPS on the custom domain `afl.ipsacademy.org`
- Serverless execution of all `/api` routes
- Preview deployments for every pull request

```env
NEXT_PUBLIC_APP_URL=
```

---

## Complete `.env.local` Template

```env
# ── Auth ──────────────────────────────────────
JWT_SECRET=

# ── IPS Academy Institute DB (read-only) ──────
INSTITUTE_DB_API_URL=
INSTITUTE_DB_API_KEY=

# ── Gemini AI ─────────────────────────────────
GEMINI_API_KEY=

# ── Database (Supabase PostgreSQL) ────────────
DATABASE_URL=

# ── File Storage (Cloudinary) ─────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Redis Queue (Upstash) ─────────────────────
REDIS_URL=

# ── App ───────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://afl.ipsacademy.org
NODE_ENV=development
```

> Never commit `.env.local` to GitHub.
> It is already excluded via `.gitignore`.
