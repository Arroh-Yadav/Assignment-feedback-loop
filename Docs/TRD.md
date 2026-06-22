# Technical Requirements Document (TRD)
## Assignment Feedback Loop — IPS Academy, Indore

---

## 1. Tech Stack Overview

```
Frontend          Backend / API        AI Engine         Database & Storage
──────────        ─────────────        ─────────         ──────────────────
Next.js 14        Next.js API Routes   Gemini API        PostgreSQL
App Router        (same project)       gemini-1.5-pro    Supabase (host)
Tailwind CSS      Middleware Auth      Google AI SDK     Cloudinary (files)
React 18          Prisma ORM                             Upstash Redis (queue)
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
    /dashboard                    → Faculty home
    /setup                        → First-time branch/section config
    /assignments
      /create                     → New assignment form
      /[id]                       → Assignment detail + submissions list
    /evaluate/[id]                → Annotation + AI feedback + marks

  /admin
    /dashboard                    → Platform overview
    /users                        → Manage students & faculty
    /branches                     → Manage branch/sub-branch/sections
    /analytics                    → Institution-wide reports
    /sync                         → Institute DB sync status

  /api
    /auth
      /login                      → Credential verify + JWT session
      /logout                     → Clear session cookie
    /student
      /assignments                → Fetch assignments for student
      /submit                     → Upload submission files
      /feedback/[id]              → Fetch feedback for student
    /faculty
      /assignments                → CRUD assignments
      /submissions/[id]           → Fetch a submission
      /evaluate                   → Save evaluation + marks
      /annotate                   → Save annotations
    /ai
      /process                    → Trigger Gemini processing
      /feedback/[id]              → Fetch AI feedback result
    /admin
      /users                      → User management
      /branches                   → Branch management
      /sync                       → Trigger DB sync

/middleware.ts                    → Route protection by role
/prisma
  /schema.prisma                  → Full DB schema (all 12 tables)
/lib
  /gemini.ts                      → Gemini API client
  /supabase.ts                    → DB client
  /cloudinary.ts                  → File upload client
  /auth.ts                        → JWT session helpers
  /queue.ts                       → BullMQ Redis queue
```

---

## 3. Authentication System

### Flow
```
User enters credentials
        ↓
Next.js API Route /api/auth/login
        ↓
Check against IPS Academy cloud DB (REST API call, read-only)
        ↓
If match → create JWT session token
        ↓
Store token in HttpOnly cookie (afl_session)
        ↓
Middleware reads cookie on every request
        ↓
Redirect to correct dashboard by role
```

### Middleware — Route Protection

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
| Token type | JWT (JSON Web Token) |
| Storage | HttpOnly cookie — not localStorage |
| Cookie name | `afl_session` |
| Expiry | 8 hours (one college day) |
| Refresh | Auto-refresh on activity |

---

## 4. AI Engine — Gemini API

### Model
`gemini-1.5-pro` — supports vision (images) + text in one call.

### Client Setup

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro'
})
```

### AI Processing Pipeline

```
Student submits pages (images/PDF)
          ↓
Files uploaded to Cloudinary → URLs saved to DB
          ↓
Job pushed to Redis queue (BullMQ)
          ↓
Background worker picks up job
          ↓
  ┌─────────────────────────────────┐
  │         Gemini API Call         │
  │  Input: page images (base64)    │
  │       + assignment rubric       │
  │       + subject context         │
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
Faculty notified
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

## 5. Database — PostgreSQL via Supabase

### Why Supabase
- Managed PostgreSQL — no server setup needed
- Built-in REST + realtime APIs
- Row Level Security (RLS) for data protection
- Scales with the institute's growth
- Free tier sufficient for single-institute use

### ORM — Prisma

```typescript
// lib/supabase.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 6. File Storage — Cloudinary

### Why Cloudinary
- Handles image + PDF uploads simply
- Auto-converts PDF pages to images for Gemini
- CDN delivery — fast loading of submitted sheets
- Signed expiring URLs for secure access

### Upload Utility

```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function uploadSubmissionPage(
  file: Buffer,
  submissionId: string,
  pageNumber: number
) {
  return cloudinary.uploader.upload_stream(
    {
      folder: `afl/submissions/${submissionId}`,
      public_id: `page_${pageNumber}`,
      resource_type: 'auto',
      sign_url: true,
    },
    (error, result) => {
      if (error) throw error
      return result
    }
  )
}
```

---

## 7. Background Jobs — BullMQ + Upstash Redis

Gemini processing (5–15 seconds per submission) runs in a background queue — not blocking the HTTP response.

```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!)

export const submissionQueue = new Queue('submission-processing', {
  connection
})

// Worker — runs in background
export const submissionWorker = new Worker(
  'submission-processing',
  async (job) => {
    const { submissionId } = job.data
    await processWithGemini(submissionId)
  },
  { connection, concurrency: 5 }
)
```

### Queue Status Flow

```
Student submits → instant "Submitted ✅" response shown
                      ↓
              Job added to Redis queue
                      ↓
         Worker processes asynchronously
                      ↓
         Status: submitted → ai_processing → ai_done
                      ↓
         Faculty dashboard shows "Ready to evaluate"
```

---

## 8. Environment Variables

```env
# ── Auth ──────────────────────────────────────
JWT_SECRET=your_jwt_secret_here

# ── IPS Academy Institute DB (read-only) ──────
INSTITUTE_DB_API_URL=https://db.ipsacademy.org/api
INSTITUTE_DB_API_KEY=your_institute_api_key

# ── Gemini AI ─────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key

# ── Database (Supabase PostgreSQL) ────────────
DATABASE_URL=postgresql://user:password@host:5432/afl

# ── File Storage (Cloudinary) ─────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ── Redis Queue (Upstash) ─────────────────────
REDIS_URL=rediss://your_upstash_redis_url

# ── App ───────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://afl.ipsacademy.org
NODE_ENV=production
```

---

## 9. Deployment Architecture

| Layer | Platform | Reason |
|---|---|---|
| Frontend + API Routes | Vercel | Zero-config Next.js deployment |
| Database | Supabase | Managed PostgreSQL |
| File Storage | Cloudinary | Media CDN with transformations |
| Redis Queue | Upstash Redis | Serverless Redis, works with Vercel |
| Domain | `afl.ipsacademy.org` | Institute subdomain |

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
Production deploy → afl.ipsacademy.org live
```

---

## 10. Security Requirements

| Concern | Solution |
|---|---|
| Auth spoofing | JWT in HttpOnly cookie, verified server-side on every request |
| Unauthorized route access | Next.js middleware role checks |
| Data isolation | Students only query their own submissions via Prisma filters |
| File access | Cloudinary signed URLs (expire after 1 hour) |
| API rate limiting | Rate limit middleware on all `/api` routes |
| SQL injection | Prisma ORM — no raw SQL |
| HTTPS | Enforced by Vercel on all routes |
| Institute DB | Read-only API key — no write access ever |
| Secrets | All in `.env` — never committed to Git |

---

## 11. Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "tailwindcss": "^3.4.0",
    "@prisma/client": "^5.0.0",
    "@google/generative-ai": "^0.2.0",
    "cloudinary": "^2.0.0",
    "bullmq": "^4.0.0",
    "ioredis": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "recharts": "^2.8.0",
    "jose": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0"
  }
}
```
