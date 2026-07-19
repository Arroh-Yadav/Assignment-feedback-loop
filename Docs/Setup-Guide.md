# Setup Guide — Assignment Feedback Loop

## IPS Academy, Indore

---

## Services Used in This Project

This project depends on 6 external services. Each one handles a specific
responsibility in the AFL platform. All credentials go in `.env.local`
at the root of the project — never commit this file to GitHub.

---

## 1. Supabase — Database

**Used for:** Storing all structured data for the platform.

This includes every user profile, branch and section configuration,
assignment details, student submissions, AI feedback results,
faculty evaluations, annotation data, sync logs, and notifications —
across all 14 database tables.

Prisma ORM (v7) connects to Supabase using **two** separate connection
strings — this is a Prisma v7 requirement, not optional:

- `DATABASE_URL` — pooled connection (port 6543), used at runtime via
  the `PrismaPg` adapter in `lib/supabase.ts`
- `DIRECT_URL` — direct connection (port 5432), used only by
  `prisma.config.ts` for schema operations (`db push`, `generate`)

```env
DATABASE_URL=
DIRECT_URL=
```

> This project has never used `prisma migrate` — schema changes go
> through `npx prisma db push` only. See Implementation-Plan.md for why
> `migrate dev` / `migrate reset` are unsafe to run against this database.

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

When a student uploads handwritten pages, each file is uploaded to
Cloudinary as an **authenticated** (private) resource under
`afl/submissions/{submissionId}/`. Cloudinary's response is stored as a
compact reference string (`resourceType|format|publicId`) rather than a
plain public URL — access is only ever granted through a freshly
generated **signed URL, valid for 1 hour**, created on demand via
`getSignedFileUrl()` in `lib/cloudinary.ts`.

These signed URLs are generated in three places:

- Faculty evaluation screen (to display the pages)
- Gemini processing (to read the handwriting)
- Student feedback view (to show annotated pages)

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

## 5. Upstash QStash — Scheduled Queue Trigger

**Used for:** Triggering the AI processing queue on a schedule.

Vercel's Hobby plan limits native cron jobs to once per day — far too
infrequent for near-real-time grading. QStash calls
`/api/cron/process-queue` every minute instead. That route verifies
each incoming request is genuinely from QStash using cryptographic
signature verification, not just a shared secret.

```env
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
```

---

## 6. Vercel — Hosting & Deployment

**Used for:** Hosting the Next.js application and managing deployments.

The project is connected to the GitHub repository. Every push to
the `main` branch triggers an automatic production deployment.
All environment variables are stored securely in the Vercel
project dashboard and injected at build time.

Vercel also handles:

- HTTPS on the live deployment URL
- Serverless execution of all `/api` routes
- Preview deployments for every pull request

> The project currently runs on its default Vercel deployment URL.
> A custom institute subdomain is not yet configured.

```env
NEXT_PUBLIC_APP_URL=
```

---

## Complete `.env.local` Template

```env
# ── Auth ──────────────────────────────────────
JWT_SECRET=

# ── IPS Academy Institute DB (read-only) ──────
MOCK_DB_URL=
INSTITUTE_DB_API_KEY=

# ── Gemini AI ─────────────────────────────────
GEMINI_API_KEY=

# ── Database (Supabase PostgreSQL, Prisma v7) ─
DATABASE_URL=
DIRECT_URL=

# ── File Storage (Cloudinary) ─────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Redis Queue (Upstash) ─────────────────────
REDIS_URL=

# ── Scheduled Queue Trigger (Upstash QStash) ──
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# ── App ───────────────────────────────────────
NEXT_PUBLIC_APP_URL=
NODE_ENV=development
```

> Never commit `.env.local` to GitHub.
> It is already excluded via `.gitignore`.
