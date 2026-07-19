# Technical Requirements Document (TRD)
## Assignment Feedback Loop — IPS Academy, Indore

---

## 1. Tech Stack Overview

```
Frontend          Backend / API        AI Engine         Database & Storage
──────────        ─────────────        ─────────         ──────────────────
Next.js 14        Next.js API Routes   Gemini API        PostgreSQL
App Router        Middleware Auth      gemini-3.5-flash  Supabase (host, Prisma v7)
Tailwind CSS      Prisma ORM (v7)      Google AI SDK     Cloudinary (files, signed URLs)
React 18          BullMQ + Redis                          Upstash Redis (queue)
                   Upstash QStash                          Upstash QStash (scheduler)
```

---

## 2. Frontend — Next.js 14 App Router

### Why Next.js
- Built-in file-based routing — no extra router library needed
- API routes live in the same project (no separate backend server)
- Server-side rendering for fast initial loads
- Middleware handles auth protection per route group

### Folder Structure

```
/app
  /login                          → Login page (all roles, tab switcher)

  /student
    /dashboard                    → Student home
    /setup                        → One-time profile setup
    /assignment/[id]              → View assignment + submit
    /feedback/[id]                → View graded feedback
    /performance                  → Personal trend charts

  /faculty
    /dashboard                    → Faculty home (Active / Draft tabs +
                                     Analytics tab with section selector)
    /setup                        → First-time branch/section config
    /assignments
      /create                     → New assignment form
      /[id]                       → Assignment detail + submissions list
    /evaluate/[id]                → Annotation + AI feedback + marks

  /admin
    /dashboard                    → Quick stats + nav to Users/Branches/Sync
    /users                        → Manage students & faculty (search, filter, toggle)
    /branches                     → Branch → Sub-Branch → Section tree (toggle, counts)
    /sync                         → Institute DB comparison + mismatch review
    /analytics                    → Scaffolded but never built out; not linked
                                     from anywhere in the app (orphaned route)

  /api
    /auth
      /login                      → Credential verify + JWT session (rate limited)
      /logout                     → Clear session cookie (rate limited)
    /mock-institute-db            → Mock institute DB credential lookup
                                     (x-api-key protected, used during login)
    /student
      /assignments                → List + fetch single assignment for student
      /submit                     → Upload submission files, enqueue AI job
      /feedback/[id]               → Fetch feedback for student
      /performance                → Graded history, class averages, semester progress
      /setup                      → One-time profile setup
    /faculty
      /assignments                → Create + list assignments
      /dashboard                  → Faculty profile, sections, assignments
      /submissions/[id]           → Fetch a single submission
      /evaluate                   → Save + publish evaluation, marks
      /annotate                   → Save/delete annotations
      /analytics                  → Section analytics (avg marks, top errors, trend)
      /setup                      → First-time branch/section/subject config
    /admin
      /users                      → List + PATCH toggle active/inactive
      /branches                   → Tree fetch + PATCH toggle per node
      /sync                       → Run + fetch institute DB comparison
    /notifications                → Fetch unread notifications for current user
      /[id]/read                  → Mark a notification as read
    /ai
      /feedback/[submissionId]    → Fetch AI feedback result for a submission
    /cron
      /process-queue              → QStash-triggered, signature-verified;
                                     drains the BullMQ queue once per invocation

/middleware.ts                    → Page-route protection by role (does NOT
                                     cover /api routes — every API route does
                                     its own getSession() + role check)
/prisma
  /schema.prisma                  → Full DB schema (14 tables)
/prisma.config.ts                 → Prisma v7 config; loads DIRECT_URL
/lib
  /gemini.ts                      → Gemini API client + evaluation pipeline
  /supabase.ts                    → Prisma client (PrismaPg adapter)
  /cloudinary.ts                  → Upload + signed URL generation
  /auth.ts                        → JWT session helpers (jose)
  /queue.ts                       → BullMQ queue (enqueue side)
  /rateLimit.ts                   → In-memory rate limiter (auth routes)
/worker
  /process.ts                     → runQueueOnce() — serverless-safe queue
                                     drain, called by /api/cron/process-queue
/components
  /NotificationBell.tsx           → Shared notification bell, used across
                                     all three dashboard headers
```

---

## 3. Authentication System

### Flow
```
User enters credentials
        ↓
Next.js API Route /api/auth/login (rate limited: 10 req/min per IP)
        ↓
Check against mock institute DB (/api/mock-institute-db, x-api-key protected)
        ↓
If match → create JWT session token
        ↓
Store token in HttpOnly cookie (afl_session)
        ↓
Middleware reads cookie on every PAGE request (not API routes)
        ↓
Redirect to correct dashboard by role
```

> **Important distinction:** `middleware.ts` only protects page routes
> (`/student/*`, `/faculty/*`, `/admin/*`). Every `/api/*` route
> independently calls `getSession()` and checks `session.role` itself —
> there is no API-level middleware. This was confirmed correct across
> all 26 API routes during the Phase 4.5 security audit (every route
> either enforces a session + role check, or has a documented alternate
> auth mechanism — QStash signature verification for the cron route,
> `x-api-key` for the mock institute DB route).

### Middleware — Route Protection (page routes only)

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('afl_session')
  const { pathname } = request.nextUrl

  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = decodeRole(token)

  if (pathname.startsWith('/student') && role !== 'student')
    return NextResponse.redirect(new URL('/login', request.url))

  if (pathname.startsWith('/faculty') && role !== 'faculty')
    return NextResponse.redirect(new URL('/login', request.url))

  if (pathname.startsWith('/admin') && role !== 'admin')
    return NextResponse.redirect(new URL('/login', request.url))
}
```

### Session Properties

| Property | Value |
|---|---|
| Token type | JWT (JSON Web Token), verified via `jose` |
| Storage | HttpOnly cookie — not localStorage |
| Cookie name | `afl_session` |
| Expiry | 8 hours (one college day) |
| Refresh | Auto-refresh on activity |

### Admin Authentication

There is no separate admin credential system. An admin account is a
`faculty.json` mock-institute-DB entry with `designation: "Admin"` —
it goes through the exact same login/verification path as faculty,
just checked for that designation during login.

---

## 4. AI Engine — Gemini API

### Model
`gemini-3.5-flash` — current GA multimodal model, supports vision (images) +
text in one call. (`gemini-1.5-pro` is fully discontinued as of mid-2026 —
see Implementation-Plan.md Phase 3 deviations note.)

### Client Setup

```typescript
// lib/gemini.ts
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// used per-call as: ai.models.generateContent({ model: 'gemini-3.5-flash', ... })
```

### AI Processing Pipeline

```
Student submits pages (images/PDF)
          ↓
Files uploaded to Cloudinary as authenticated resources
→ reference strings (resourceType|format|publicId) saved to DB
          ↓
Job pushed to Redis queue (BullMQ)
          ↓
QStash calls /api/cron/process-queue every minute
          ↓
runQueueOnce() drains the queue for this invocation, then closes
  ┌─────────────────────────────────┐
  │         Gemini API Call         │
  │  Input: page images (base64,    │
  │  fetched via freshly signed     │
  │  Cloudinary URLs)                │
  │       + assignment rubric       │
  │       + subject context         │
  │       + reference file (optional)│
  │                                 │
  │  Step 1: Extract text           │
  │  Step 2: Parse structure        │
  │  Step 3: Check method           │
  │  Step 4: Generate feedback      │
  │  Step 5: Suggest marks          │
  └─────────────────────────────────┘
          ↓
Save result to ai_feedback table
          ↓
Update submissions.status → 'ai_done'
          ↓
In-app notification created for the faculty who owns the assignment
```

### Evaluation Prompt Template

```typescript
const prompt = `
You are an engineering assignment evaluator for IPS Academy, Indore.

Assignment: ${assignment.title}
Subject: ${assignment.subject_name}
Max Marks: ${assignment.max_marks}
Evaluation Criteria: ${assignment.description}

The student has submitted handwritten pages. Analyze each page and:
1. Extract all written text, formulas, and diagram labels
2. Check if the solution follows the correct method/structure
3. Identify correct steps, errors, and missing parts
4. Generate step-by-step feedback for the student
5. Suggest a mark out of ${assignment.max_marks}

Respond ONLY in this JSON format with no extra text:
{
  "extracted_text": "full extracted text here",
  "structural_analysis": ["step 1 observation", "step 2 observation"],
  "feedback_items": [
    { "type": "correct", "message": "..." },
    { "type": "error",   "message": "..." },
    { "type": "warning", "message": "..." }
  ],
  "suggested_marks": 0
}
`
```

---

## 5. Database — PostgreSQL via Supabase (Prisma v7)

### Why Supabase
- Managed PostgreSQL — no server setup needed
- Row Level Security (RLS) enabled on all 14 tables (locks down
  Supabase's auto-generated REST/GraphQL API; Prisma's direct
  connection uses the `postgres` owner role, which bypasses RLS by
  design, so the app itself is unaffected)
- Scales with the institute's growth
- Free tier sufficient for single-institute use

### ORM — Prisma v7 (dual connection string, adapter-based)

Prisma v7 requires **no URLs directly in `schema.prisma`**. Instead:
- `DATABASE_URL` (pooled, port 6543) is used at runtime via the
  `PrismaPg` adapter
- `DIRECT_URL` (direct, port 5432) is used only by `prisma.config.ts`
  for schema commands (`db push`, `generate`)

```typescript
// lib/supabase.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

```typescript
// prisma.config.ts
import path from "path";
import { defineConfig } from "prisma/config";

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: { url: process.env.DIRECT_URL! },
});
```

> This project has never used `prisma migrate` — there is no migration
> history. Schema changes go through `npx prisma db push` only.
> `migrate dev` would detect the existing schema as unexplained "drift"
> (since no migrations were ever recorded) and could prompt a full
> database reset. Do not run `migrate dev` or `migrate reset` against
> this database.

---

## 6. File Storage — Cloudinary (Authenticated, Signed URLs)

### Why Cloudinary
- Handles image + PDF uploads simply
- Auto-converts PDF pages to images for Gemini
- CDN delivery for fast loading of submitted sheets
- Files uploaded as `type: "authenticated"` — not publicly accessible
  by a plain URL; every read generates a fresh signed URL, expiring
  1 hour after generation

### Upload + Signed URL Utility

```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Uploads store "<resourceType>|<format>|<publicId>" in the DB, not a
// URL -- a signed URL is only valid for a fixed window from the moment
// it's generated, so the URL itself can never be the stored value.

export async function uploadSubmissionFile(
  buffer: Buffer,
  submissionId: string,
  pageNumber: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `afl/submissions/${submissionId}`,
          public_id: `page_${pageNumber}`,
          resource_type: "image",
          type: "authenticated",
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(`${result.resource_type}|${result.format ?? ""}|${result.public_id}`);
        },
      )
      .end(buffer);
  });
}

// Converts a stored reference string into a fresh signed URL, valid
// for 1 hour from the moment it's called. Backward-compatible with
// pre-existing plain URLs from before this system was introduced.
export function getSignedFileUrl(stored: string, expirySeconds = 3600): string {
  if (!stored) return stored;
  if (stored.startsWith("http")) return stored; // legacy public URL

  const [resourceType, format, publicId] = stored.split("|");
  if (!resourceType || !publicId) return stored;

  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
  return cloudinary.utils.private_download_url(publicId, format || "", {
    resource_type: resourceType as "image" | "video" | "raw",
    type: "authenticated",
    expires_at: expiresAt,
    attachment: false,
  });
}
```

> **Bandwidth note:** `private_download_url` bypasses Cloudinary's CDN
> cache — each call is a fresh authenticated fetch, roughly doubling
> bandwidth cost for that asset per Cloudinary's own guidance.
> Acceptable here since these are private exam submissions viewed a
> handful of times each, not high-traffic public assets.

---

## 7. Background Jobs — BullMQ + Upstash Redis + Upstash QStash

Gemini processing (5–15 seconds per submission) runs in a background
queue — not blocking the HTTP response. Because this runs on Vercel
serverless (no long-lived process to host an always-on BullMQ
`Worker`), the queue is drained by a **serverless-safe one-shot
function**, triggered on a schedule by QStash rather than a
persistent worker process.

```typescript
// lib/queue.ts — enqueue side
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!)

export const submissionQueue = new Queue('submission-processing', {
  connection
})

export async function addSubmissionJob(submissionId: string) {
  await submissionQueue.add('process', { submissionId })
}
```

```typescript
// worker/process.ts — serverless-safe drain, NOT an always-on Worker
import { Worker } from 'bullmq'

export async function runQueueOnce() {
  const worker = new Worker(
    'submission-processing',
    async (job) => {
      const { submissionId } = job.data
      await processWithGemini(submissionId)
    },
    { connection, autorun: false, concurrency: 5 }
  )
  await worker.run()   // processes whatever's currently queued, then...
  await worker.close() // ...closes cleanly, since this function will exit
}
```

```typescript
// app/api/cron/process-queue/route.ts — QStash calls this every minute
// (Vercel Hobby's native cron is limited to once/day, too infrequent)
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { runQueueOnce } from '@/worker/process'

async function handler() {
  await runQueueOnce()
  return NextResponse.json({ success: true })
}

export const POST = verifySignatureAppRouter(handler)
```

### Queue Status Flow

```
Student submits → instant "Submitted ✅" response shown
                      ↓
              Job added to Redis queue
                      ↓
   QStash triggers /api/cron/process-queue (every minute)
                      ↓
         runQueueOnce() processes queued jobs, then exits
                      ↓
         Status: submitted → ai_processing → ai_done
                      ↓
   In-app notification created for the faculty who owns the assignment
```

---

## 8. Environment Variables

```env
# ── Auth ──────────────────────────────────────
JWT_SECRET=your_jwt_secret_here

# ── IPS Academy Institute DB (read-only, mock) ─
MOCK_DB_URL=https://your-deployment-url.vercel.app/api/mock-institute-db
INSTITUTE_DB_API_KEY=your_institute_api_key

# ── Gemini AI ─────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key

# ── Database (Supabase PostgreSQL, Prisma v7) ─
DATABASE_URL=postgresql://user:password@host:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/postgres

# ── File Storage (Cloudinary) ─────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ── Redis Queue (Upstash) ─────────────────────
REDIS_URL=rediss://your_upstash_redis_url

# ── Scheduled Queue Trigger (Upstash QStash) ──
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key

# ── App ───────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-deployment-url.vercel.app
NODE_ENV=production
```

---

## 9. Deployment Architecture

| Layer | Platform | Reason |
|---|---|---|
| Frontend + API Routes | Vercel | Zero-config Next.js deployment |
| Database | Supabase | Managed PostgreSQL |
| File Storage | Cloudinary | Media CDN, authenticated/signed delivery |
| Redis Queue | Upstash Redis | Serverless Redis, works with Vercel |
| Queue Scheduler | Upstash QStash | Triggers queue drain every minute (Vercel Hobby cron is once/day only) |
| Domain | Default Vercel deployment URL | Custom institute subdomain not yet configured |

### CI/CD Pipeline

```
Developer pushes to GitHub
          ↓
Vercel detects push → auto build
          ↓
Preview URL generated for review
          ↓
Merge to main branch
          ↓
Production deploy → live on default Vercel URL
```

---

## 10. Security Requirements

| Concern | Solution |
|---|---|
| Auth spoofing | JWT in HttpOnly cookie, verified server-side (`jose`) on every request |
| Unauthorized route access | Next.js middleware for pages; every individual API route independently checks session + role (audited across all 26 routes) |
| Data isolation | Students only query their own submissions via Prisma filters; ownership checks (not just role checks) on shared routes like notifications |
| File access | Cloudinary authenticated resources + signed URLs (expire 1 hour after generation) |
| API rate limiting | In-memory rate limiter on `/api/auth/login` and `/api/auth/logout` only (10 req/min per IP) — not applied platform-wide. Deliberately in-memory rather than Redis given Upstash's request quota; planned to move to Redis once that's no longer a constraint |
| Database access | Row Level Security enabled on all 14 tables (denies all access via Supabase's public API by default; Prisma's owner-role connection is unaffected) |
| SQL injection | Prisma ORM — no raw SQL |
| HTTPS | Enforced by Vercel on all routes |
| Institute DB | Read-only API key — no write access ever |
| Secrets | All in `.env.local` — never committed to Git |

---

## 11. Key Dependencies

```json
{
  "dependencies": {
    "@google/genai": "^2.10.0",
    "@upstash/qstash": "^2.11.1",
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "bullmq": "^5.79.1",
    "cloudinary": "^2.10.0",
    "dotenv": "^17.4.2",
    "ioredis": "5.10.1",
    "jose": "^6.2.3",
    "jsonwebtoken": "^9.0.3",
    "next": "14.2.35",
    "pg": "^8.22.0",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^3.9.0",
    "uuid": "^14.0.1"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20",
    "@types/pg": "^8.20.0",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/uuid": "^10.0.0",
    "eslint": "^8",
    "eslint-config-next": "14.2.35",
    "postcss": "^8",
    "prisma": "^7.8.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

> `ioredis` is pinned to the exact version BullMQ bundles internally
> (`5.10.1`) — a mismatched version causes a duplicate-package
> TypeScript conflict.
