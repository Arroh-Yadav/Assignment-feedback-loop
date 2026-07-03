# Implementation Plan — Assignment Feedback Loop
## IPS Academy, Indore | Coding Agent Aligned

---

## Overview

This plan is designed to be executed with a **coding agent (Claude Code)**.
You are the director — the agent writes, runs, and fixes code.
Your job is to give clear task prompts, review output, and move forward.

```
You (Director)          Coding Agent              Output
──────────────          ────────────              ──────
Describe the task   →   Writes the code       →   Working feature
Review the output   →   Fixes issues          →   Tested code
Approve & move on   →   Next task             →   Next feature
```

---

## How to Prompt the Agent Effectively

Instead of vague prompts like:
> "write login code"

Use specific prompts like:
> "Build the `/api/auth/login` route in Next.js 14 App Router. Accept POST with role, computerCode, and enrollmentNumber for students or employeeId and instituteEmail for faculty. Verify against INSTITUTE_DB_API_URL. On success create a JWT stored in an HttpOnly cookie named afl_session. Return 401 if not found."

**The more context → the better the output.**

---

## Phase Overview

```
Phase 1 (2–3 days)   →   Phase 2 (3–4 days)   →   Phase 3 (2–3 days)   →   Phase 4 (2–3 days)
Foundation & Auth         Core Features              AI Engine                Polish & Analytics
6 agent tasks             5 agent tasks              3 agent tasks            5 agent tasks
```

**Total: ~19 agent tasks | ~9–13 days**

---

## Phase 1 — Foundation & Auth

**Goal:** Project set up, all users can log in, structure is in place.

**Status:** ✅ Complete

---

### Agent Task 1.1 — Project Scaffold

**Prompt the agent:**
```
Create a new Next.js 14 project with App Router and Tailwind CSS.
Set up the full folder structure:

/app/login
/app/student/dashboard
/app/student/setup
/app/student/assignment/[id]
/app/student/feedback/[id]
/app/student/performance
/app/faculty/dashboard
/app/faculty/setup
/app/faculty/assignments/create
/app/faculty/assignments/[id]
/app/faculty/evaluate/[id]
/app/admin/dashboard
/app/admin/users
/app/admin/branches
/app/admin/analytics
/app/admin/sync
/app/api/auth/login
/app/api/auth/logout
/lib (gemini.ts, supabase.ts, cloudinary.ts, auth.ts, queue.ts)
/prisma/schema.prisma

Create placeholder page.tsx in each route folder.
Add .env.local with all variable names from the TRD — values empty.
```

**You review:** Folder structure matches TRD exactly ✅

---

### Agent Task 1.2 — Prisma Schema

**Prompt the agent:**
```
Create the full Prisma schema in /prisma/schema.prisma with these 12 models:
users, students, faculty, branches, sub_branches, sections,
faculty_sections, assignments, submissions, ai_feedback, evaluations, annotations.

Use the field definitions from the backend schema document.
Database provider is PostgreSQL (Supabase).
All IDs are UUIDs. Use enums for:
- user_role: student, faculty, admin
- submission_status: submitted, ai_processing, ai_done, under_review, graded
- assignment_status: draft, active, closed
- evaluation_status: in_review, published
- annotation_type: highlight, comment, drawing

Add all foreign key relations correctly.
Run: npx prisma generate
```

**You review:** All 12 tables, correct fields, correct relations ✅

---

### Agent Task 1.3 — Auth API Route

**Prompt the agent:**
```
Build /app/api/auth/login/route.ts in Next.js App Router.

Accept POST with { role, credentials } where:
- Student credentials: { computerCode, enrollmentNumber }
- Faculty credentials: { employeeId, instituteEmail }
- Admin credentials: { adminId, password }

Verify student and faculty against INSTITUTE_DB_API_URL (env var).
On success: create JWT with { userId, role }, store in HttpOnly
cookie named afl_session, expiry 8 hours.
On failure: return 401 with { error: "Access denied" }.

Also build /app/api/auth/logout/route.ts that clears afl_session cookie.
```

**You review:** Login works for all 3 roles, invalid creds return 401 ✅

---

### Agent Task 1.4 — Middleware

**Prompt the agent:**
```
Create middleware.ts at the project root.

Read JWT from cookie named afl_session.
Protect route groups by role:
- /student/* → only role: student
- /faculty/* → only role: faculty
- /admin/*   → only role: admin
- /login     → redirect to dashboard if already logged in

On unauthorized access: redirect to /login.
On valid session: pass through normally.
```

**You review:** Wrong role redirects correctly, valid sessions pass through ✅

---

### Agent Task 1.5 — Login Page UI

**Prompt the agent:**
```
Build /app/login/page.tsx.

Three role tabs: Student | Faculty | Admin
Fields per role:
- Student: Computer Code + Enrollment Number
- Faculty: Employee ID + Institute Email
- Admin: Admin ID + Password

Styling:
- Dark background: #1a1a2e
- Crimson header bar: #8B1A1A with IPS Academy + AFL title
- Active tab: crimson fill
- Input fields: semi-transparent dark
- Sign In button: crimson filled

On submit: POST to /api/auth/login
On success: redirect to /{role}/dashboard
On failure: show error message "Access denied. Contact Admin."
```

**You review:** Matches UI/UX brief, tabs switch fields correctly ✅

---

### Agent Task 1.6 — One-Time Profile Setup

**Prompt the agent:**
```
Build /app/student/setup/page.tsx — multi-step form:
Step 1: Select Branch → Sub-Branch
Step 2: Select Section number → Year → Semester
Step 3: Confirm → POST to /api/student/setup → save to students table
After save: redirect to /student/dashboard
If student profile already exists: skip setup on login.

Build /app/faculty/setup/page.tsx — multi-step form:
Step 1: Select Branch → create or select Sub-Branch
Step 2: Input number of sections (system creates Section 1, 2, 3...)
Step 3: Select which sections they teach
Step 4: Add subject name + subject code per section
Step 5: Confirm → POST to /api/faculty/setup → save to faculty,
        sections, and faculty_sections tables
After save: redirect to /faculty/dashboard
If faculty profile already exists: skip setup on login.
```

**You review:** Profile saves correctly, sections created, redirect works ✅

---

## Phase 2 — Core Features

**Goal:** Faculty creates assignments, students submit, faculty grades manually.

**Status:** ✅ Complete

---

### Agent Task 2.1 — Assignment Creation (Faculty)

**Prompt the agent:**
```
Build /app/faculty/assignments/create/page.tsx

Form fields:
- Select Sub-Branch → Section → Subject (from faculty's mapped sections)
- Year + Semester (auto-filled from section)
- Title (text input)
- Description / Instructions (textarea)
- Max Marks (number input)
- Deadline (date + time picker)
- Optional file attachment (question paper / reference)
- Two buttons: Save as Draft | Publish

Build POST /api/faculty/assignments/route.ts:
- Save assignment to assignments table
- status: 'draft' or 'active' based on button clicked
- Upload reference file to Cloudinary if attached
- Return created assignment id
```

**You review:** Assignment saves, draft vs publish works, appears for students ✅

---

### Agent Task 2.2a — Student Assignment View & Upload

**Prompt the agent:**
```
Build /app/student/assignment/[id]/page.tsx

Show: title, subject, instructions, deadline, max marks
Show: download button if reference_file_url exists
Show: upload section (only if deadline not passed and not submitted)

Upload behavior:
- Accept JPG, PNG, PDF files
- Allow multiple files (multiple pages)
- Show thumbnail previews before submitting
- Optional note to faculty textarea
- Confirm Submit button → show warning "Cannot edit after submission"
- After submit: show status tracker

Build POST /api/student/submit/route.ts:
- Upload each file to Cloudinary folder afl/submissions/{submissionId}/
- Save all file URLs + page_count to submissions table
- Set status: 'submitted'
- Add job to Redis queue for AI processing
- Return submission id
```

**You review:** Upload works, locked after submit, status tracker shows ✅

---

---

### Agent Task 2.2b — Student Dashboard (Assignment List)

**Prompt the agent:**
```
Build /app/student/dashboard/page.tsx

Profile card at top: student name, enrollment number, branch,
sub-branch, section number, year, semester.

Two tabs:
- Active: all ACTIVE assignments for student's section not yet submitted,
  deadline in future. Each card shows subject, title, faculty name,
  max marks, countdown timer (green → amber → red), Submit Now button
  navigates to /student/assignment/{id}.
- Submitted: assignments already submitted. Each card shows subject,
  title, submitted date, status badge, View button, and View Feedback
  button if status is GRADED.

Empty states for both tabs.
Logout button in header.
Performance link at bottom → /student/performance

Build GET /api/student/assignments/route.ts:
- Fetch all ACTIVE assignments for student's sectionId
- Fetch all submissions by this student
- Return student profile info, assignments array, submissionMap
  keyed by assignmentId
```

**Why added:** Students had no way to discover assignments without a direct
URL. The dashboard was scaffolded in Task 1.1 but never explicitly tasked.
Added retroactively as an oversight fix.

**You review:** Dashboard shows assignments, tabs switch correctly,
countdown timers color coded, Submit Now navigates to assignment page ✅

### Agent Task 2.3 — Faculty Submissions List

**Prompt the agent:**
```
Build /app/faculty/assignments/[id]/page.tsx

Show assignment detail header at top.
Below: table of all student submissions for this assignment.

Table columns: Student Name | Enrollment No | Submitted At | Status | Action
Status badges with colors:
- submitted → blue
- ai_processing → purple
- ai_done → indigo
- graded → green

Filter tabs: All | Pending | AI Done | Graded
Action: "Evaluate" button → navigates to /faculty/evaluate/{submissionId}

Fetch from GET /api/faculty/submissions?assignmentId={id}
```

**You review:** All submissions visible with correct status badges ✅

---

### Agent Task 2.4 — Evaluation Screen (Manual, no AI yet)

**Prompt the agent:**
```
Build /app/faculty/evaluate/[id]/page.tsx

Split layout — two panels side by side:

LEFT PANEL:
- Display student's uploaded pages as images
- Page navigation arrows (Page 1 of N)
- Annotation toolbar at bottom: Highlight | Comment | Draw
- Clicking on page adds annotation at that position
- Annotations render as numbered dots on the page
- Dots are clickable to view/edit comment

RIGHT PANEL:
- Faculty remarks textarea
- Marks input (number, max: assignment max_marks)
- Approve & Publish button (crimson)

Build POST /api/faculty/evaluate/route.ts:
- Save to evaluations table (final_marks, faculty_remarks, status: 'in_review')
- On publish: set status: 'published', set published_at timestamp
- Update submission status → 'graded'

Build POST /api/faculty/annotate/route.ts:
- Save annotation to annotations table
- Fields: evaluation_id, page_number, type, coordinates {x,y,w,h}, content
```

**You review:** Annotations save, marks publish, student can see after publish ✅

---

### Agent Task 2.5 — Student Feedback View

**Prompt the agent:**
```
Build /app/student/feedback/[id]/page.tsx

Show only if evaluation.status = 'published'.

Display:
- Original uploaded pages with faculty annotation overlays
  (show numbered dots at correct coordinates, click to read comment)
- Large marks display: "42 / 50" with subject name
- Faculty remarks section
- Submission timeline: Submitted → AI Reviewed → Graded (with timestamps)

Fetch from GET /api/student/feedback/{submissionId}
Return 403 if evaluation not published yet.
```

**You review:** Feedback visible only after publish, annotations overlaid ✅

---

## Phase 3 — Gemini AI Engine

**Goal:** Gemini automatically processes every submission, giving AI feedback to faculty.

**Status:** ✅ Complete — verified end-to-end (July 2026), including the
reference-file comparison enhancement (not in original scope, added after
Task 3.2). See deviations note below for what changed from the original plan.

> **Deviations from the original plan (documented during implementation, July 2026):**
> 1. **Model swapped:** `gemini-1.5-pro` is fully shut down (all requests 404 as of mid-2026). Using `gemini-3.5-flash` instead — the current GA multimodal model.
> 2. **SDK swapped:** `@google/generative-ai` is deprecated/legacy. Using the actively-maintained `@google/genai` unified SDK instead.
> 3. **Worker redesigned for serverless:** the plan's `worker/process.ts` assumed a long-running BullMQ `Worker` process, which doesn't exist on Vercel (serverless). Instead, `worker/process.ts` exports `runQueueOnce()` — a BullMQ worker that runs with `autorun: false`, drains whatever's waiting, then closes. It's invoked per-request by `app/api/cron/process-queue/route.ts`.
> 4. **Trigger swapped:** Vercel's own Cron feature is Hobby-plan-limited to once/day, too infrequent here. Using **Upstash QStash** (same account as Redis) to POST to `/api/cron/process-queue` every minute instead, with QStash signature verification for auth.
> 5. **Schema addition:** `SubmissionStatus` enum was missing an `AI_ERROR` value (needed per Task 3.2's "on all retries failed → ai_error" requirement). Added via `prisma db push` (this project has never used `prisma migrate` — no migration history exists, `db push` is the established workflow here).
> 6. **New feature, beyond original scope — reference file comparison:** the original prompt only graded against `assignment.description` (text). Added: if faculty uploaded a `referenceFileUrl` (question paper / answer key) when creating the assignment, it's now fetched and sent to Gemini alongside the submission, with the prompt instructing Gemini to identify the actual questions from it and grade the student's answers specifically against them (rather than a generic text description). Falls back gracefully to text-only grading if no reference file exists or its fetch fails.
> 7. **UI fix — Task 3.3's "Generated by Gemini 1.5 Pro" label:** changed to pull the real model name dynamically from `AIFeedback.modelUsed` instead of a hardcoded string, so this label doesn't go stale again if the model changes in the future.
>
> New required env vars beyond the original list (see `Docs/TRD.md` §8): `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.

---

### Agent Task 3.1 — Gemini Client + Processing Function

**Prompt the agent:**
```
Install: npm install @google/genai

Create /lib/gemini.ts:
- Initialize GoogleGenAI with GEMINI_API_KEY env var
- Use model: gemini-3.5-flash
- Export async function processSubmission(submissionId: string)

processSubmission should:
1. Fetch submission + assignment from DB using Prisma
2. Fetch each page image from Cloudinary URL
3. Convert images to base64
4. Build prompt using assignment title, subject, max_marks, description
5. Send prompt + images to Gemini
6. Parse JSON response
7. Save to ai_feedback table
8. Update submission status → 'ai_done'

Use this prompt template (from TRD):
[paste the evaluation prompt from TRD section 4]

Handle JSON parse errors gracefully — retry once if malformed.
```

**You review:** Gemini reads a test handwritten image and returns structured JSON ✅

---

### Agent Task 3.2 — Background Queue

**Prompt the agent:**
```
Install: npm install bullmq ioredis

Create /lib/queue.ts:
- Connect to Upstash Redis using REDIS_URL env var
- Create BullMQ Queue named 'submission-processing'
- Export addSubmissionJob(submissionId: string) function

Create /worker/process.ts:
- BullMQ Worker listening to 'submission-processing' queue
- On job: call processSubmission(submissionId) from gemini.ts
- On success: log completion
- On failure: retry up to 3 times with exponential backoff
- On all retries failed: update submission status → 'ai_error'

Update /api/student/submit/route.ts:
- After saving submission to DB, call addSubmissionJob(submissionId)
- Update submission status → 'ai_processing' immediately
```

**You review:** Queue processes, status updates through pipeline correctly ✅

---

### Agent Task 3.3 — AI Feedback in Evaluation Screen

**Prompt the agent:**
```
Update /app/faculty/evaluate/[id]/page.tsx

In the RIGHT PANEL, add AI Feedback section ABOVE faculty remarks:

Header: "AI Feedback" with green dot + "Generated by {actual model used, e.g. Gemini 3.5 Flash}" + timestamp (pull the model name from AIFeedback.modelUsed rather than hardcoding, so this label never goes stale again if the model changes)
Toggle button to show/hide AI panel

Feedback items rendered as cards:
- type: "correct"  → green card with ✓ prefix
- type: "error"    → red card with ✗ prefix
- type: "warning"  → amber card with △ prefix

Below feedback items:
- "AI Suggested Marks: XX / YY" 
- Pre-fill the marks input with this value (faculty can override)

Show loading state if submission status is still 'ai_processing'.
Show "AI processing failed" if status is 'ai_error'.

Fetch AI feedback from GET /api/ai/feedback/{submissionId}
```

**You review:** AI feedback visible, marks pre-filled, faculty can edit + override ✅

---

## Phase 4 — Analytics, Admin & Polish

**Goal:** Data-rich dashboards, admin tools working, production-ready.

---

### Agent Task 4.1 — Student Performance Dashboard

**Prompt the agent:**
```
Install: npm install recharts

Build /app/student/performance/page.tsx

Using recharts:
- LineChart: marks per assignment over time, one line per subject
- BarChart: all assignment scores this semester
- Add class average as dotted reference line on both charts (anonymous)
- Table: assignment history (title, subject, marks, feedback link)
- Semester progress bar (% of assignments graded)

Fetch from GET /api/student/performance
Return: array of { assignmentTitle, subject, marks, maxMarks, date }
and classAverages per subject.
```

**You review:** Charts render with real data, class average shows ✅

---

### Agent Task 4.2 — Faculty Section Analytics

**Prompt the agent:**
```
Add Analytics tab to /app/faculty/dashboard

Using recharts:
- BarChart: average marks per assignment for selected section
- List: top 5 most common error messages from ai_feedback across section
- Table: student-wise marks for each assignment in the section
- LineChart: section average trend over the semester

Add section selector dropdown if faculty teaches multiple sections.

Fetch from GET /api/faculty/analytics?sectionId={id}
```

**You review:** Analytics populate correctly for each section ✅

---

### Agent Task 4.3 — Admin Panel

**Prompt the agent:**
```
Build /app/admin/users/page.tsx:
- Table: all students + faculty with columns:
  Name | ID | Branch | Role | Last Login | Status
- Search input (filter by name or ID)
- Toggle active/inactive per user (PATCH /api/admin/users/{id})
- Filter tabs: All | Students | Faculty | Inactive

Build /app/admin/branches/page.tsx:
- Tree view: Branch → Sub-Branch → Sections
- Each node has enable/disable toggle
- Show faculty count and student count per section
- Expand/collapse per branch

Build /app/admin/sync/page.tsx:
- "Sync Now" button → POST /api/admin/sync
- Shows last sync timestamp
- Shows count: matched records / new records / flagged mismatches
- Table of flagged mismatches for manual review
```

**You review:** User toggle works, branch tree renders, sync logs show ✅

---

### Agent Task 4.4 — In-App Notifications

**Prompt the agent:**
```
Add a notifications table to Prisma schema:
- id, user_id, title, message, is_read, created_at

Add notification bell icon to all dashboard topbars.
Show unread count badge.
Click bell → dropdown list of notifications.
Click notification → mark as read + navigate to relevant page.

Trigger notifications automatically:
- Student: when evaluation.status → 'published' (graded)
- Faculty: when submission.status → 'ai_done' (ready to evaluate)
- Student: when new assignment published to their section

Build GET /api/notifications → return unread notifications for current user
Build PATCH /api/notifications/{id}/read → mark as read
```

**You review:** Bell shows correct count, notifications route to right pages ✅

---

### Agent Task 4.5 — Final QA & Production Checklist

**Run these prompts one by one:**

```
1. "Audit all pages for mobile responsiveness.
    Fix any layout issues on screen widths below 768px.
    Student dashboard, faculty evaluation, and admin users table
    must all work cleanly on mobile."

2. "Audit every /api route. Ensure each one reads the afl_session
    cookie, verifies the JWT, and returns 401 if missing or invalid.
    No API route should be accessible without authentication."

3. "Review all Prisma queries across the project. Add try/catch
    error handling to every database call. Return meaningful
    error messages to the frontend (no raw Prisma errors exposed)."

4. "Check all Cloudinary URLs in the project. Replace any permanent
    public URLs with signed expiring URLs (1 hour expiry).
    Update the cloudinary.ts utility accordingly."

5. "Add rate limiting to all /api/auth/* routes. Maximum 10 requests
    per minute per IP. Use a simple in-memory store or Upstash Redis
    for the rate limit counter."
```

**You review after each:** Fix confirmed before moving to next ✅

---

## Milestone Checklist

| Milestone | Phase | Status |
|---|---|---|
| Project initialized + deployed to Vercel | 1 | ⬜ |
| All 12 DB tables created via Prisma | 1 | ⬜ |
| Login working for all 3 roles | 1 | ⬜ |
| Profile setup working (student + faculty) | 1 | ⬜ |
| Faculty can create assignments | 2 | ⬜ |
| Students can upload and submit pages | 2 | ⬜ |
| Faculty can annotate and grade manually | 2 | ⬜ |
| Student can view feedback after publish | 2 | ⬜ |
| Gemini reads handwritten pages correctly | 3 | ⬜ |
| Background queue processes submissions | 3 | ⬜ |
| AI feedback visible in evaluation screen | 3 | ⬜ |
| Student performance dashboard live | 4 | ⬜ |
| Faculty section analytics live | 4 | ⬜ |
| Admin panel functional | 4 | ⬜ |
| In-app notifications working | 4 | ⬜ |
| All QA tasks passed | 4 | ⬜ |
| Live on afl.ipsacademy.org | 4 | ⬜ |

---

## Revised Timeline With Coding Agent

| Phase | Agent Tasks | Estimated Time |
|---|---|---|
| Phase 1 — Foundation & Auth | 6 tasks | 2–3 days |
| Phase 2 — Core Features | 5 tasks | 3–4 days |
| Phase 3 — Gemini AI Engine | 3 tasks | 2–3 days |
| Phase 4 — Analytics & Admin | 5 tasks | 2–3 days |
| **Total** | **19 tasks** | **9–13 days** |

> With Claude Code as your coding agent, this entire platform can be production-ready in under 2 weeks.

