# App Flow — Assignment Feedback Loop
## IPS Academy, Indore

---

## Global Rules

- Every login is verified against **IPS Academy's cloud database**
- If credentials don't match → **Access Denied**, no registration allowed
- First login triggers a **one-time profile setup** for both students and faculty
- After setup, direct dashboard access on every subsequent login
- Admin has no separate credential system — an admin account is a
  faculty-database entry flagged `designation: "Admin"`, verified
  through the same login path as faculty

---

## FLOW 1 — Student Journey

```
START
  │
  ▼
[Login Screen]
  Enter: Computer Code + Enrollment Number
  │
  ├── Not found in database → "Access Denied. Contact Admin."
  │
  └── Found ✅
        │
        ▼
  [First Time?]
  │
  ├── YES → [One-Time Profile Setup]
  │           Select: Branch → Sub-Branch → Section → Year → Semester
  │           Confirm → Profile Saved
  │
  └── NO → Direct to Dashboard
        │
        ▼
  [Student Dashboard]
  Shows:
  - Active Assignments (pending submission)
  - Submitted Assignments (awaiting feedback)
  - Graded Assignments (feedback received)
  - Notification bell (unread count badge)
        │
        ▼
  [Open an Assignment]
  - View assignment title, subject, deadline, max marks
  - View faculty instructions
  - Download reference sheet (if faculty attached one)
  - Note: a new assignment published to your section triggers an
    in-app notification automatically
        │
        ▼
  [Submit Assignment]
  - Upload handwritten pages (JPG/PNG/PDF)
  - Can upload multiple pages
  - Add optional note to faculty
  - Confirm Submission → Locked (no edits after submit)
        │
        ▼
  [Submission Tracking]
  Status shown as:
  ● Submitted — queued for AI processing
  ● AI Processing Done — Awaiting Faculty Approval
  ● Graded — Feedback Available
        │
        ▼
  [View Feedback]
  - Marks received vs total
  - AI-generated step-by-step feedback
  - Faculty annotations on digital copy
  - Faculty comments
  - Highlighted errors on original uploaded sheet
  - Note: publishing this evaluation is what triggers the
    "Assignment Graded" notification you received
        │
        ▼
  [Performance Dashboard]
  - Subject-wise marks trend (graph)
  - Semester progress
  - Comparison vs section average (anonymous)
END
```

---

## FLOW 2 — Faculty Journey

```
START
  │
  ▼
[Login Screen]
  Enter: Employee ID + Institute Email
  │
  ├── Not found in database → "Access Denied. Contact Admin."
  │
  └── Found ✅
        │
        ▼
  [First Time?]
  │
  ├── YES → [One-Time Profile Setup]
  │           Select: Branch → Sub-Branch
  │           Input: Number of Sections (creates Section 1, 2, 3...)
  │           Select: Which sections you teach
  │           Select: Subjects you teach per section
  │           Confirm → Profile Saved
  │
  └── NO → Direct to Dashboard
        │
        ▼
  [Faculty Dashboard]
  Shows:
  - Profile card (name, branch, section/subject chips)
  - My Assignments — Active / Draft tabs (with count badges)
  - Analytics tab (see Section Analytics below)
  - Notification bell (unread count badge)
        │
        ▼
  [Create New Assignment]
  - Select: Sub-Branch → Section → Subject
  - Select: Year + Semester
  - Enter: Assignment Title + Description
  - Set: Max Marks + Deadline
  - Define: Evaluation Criteria / Rubric (optional)
  - Attach: Reference sheet or question paper (optional)
  - Publish → Students of that section can now see it, and each
    receives a "New Assignment Posted" notification automatically
        │
        ▼
  [View Submissions]
  - List of all students who submitted
  - Status per student (AI processed / pending)
  - Click any student → open their submission
  - Note: when AI processing finishes for a submission, you receive
    a "Submission Ready to Evaluate" notification automatically
        │
        ▼
  [Evaluate a Submission]
  - View student's uploaded handwritten pages digitally
  - Read AI-generated feedback alongside
  - AI suggested marks shown
  │
  ├── [Annotate Digital Copy]
  │     - Highlight sections
  │     - Draw / circle errors
  │     - Add text comments on specific areas
  │
  ├── [Edit AI Feedback]
  │     - Modify AI suggestions
  │     - Add personal remarks
  │
  └── [Assign Final Marks]
        - Enter marks
        - Overall marks
        - Approve & Publish → student notified automatically
        │
        ▼
  [Section Analytics]
  - Section selector (if you teach more than one section)
  - Average marks per assignment (bar chart)
  - Section average trend over time (line chart)
  - Top 5 most common AI-flagged errors
  - Student-wise marks table
END
```

---

## FLOW 3 — Admin Journey

```
START
  │
  ▼
[Login Screen]
  Same institute-DB check as Faculty — an admin account is simply a
  faculty-database entry flagged designation: "Admin"
        │
        ▼
  [Admin Dashboard]
  - Quick stats: Total Students / Total Faculty / Total Inactive
  - Three nav cards: Manage Users / Branches & Sections / Institute Sync
  - Notification bell (unread count badge)
        │
        ▼
  ├── [Manage Branches]
  │     - Expandable tree: Branch → Sub-Branch → Section
  │     - Enable / Disable any branch, sub-branch, or section
  │       individually (does not cascade to children)
  │     - View student + faculty count at each level
  │
  ├── [Manage Users]
  │     - View all students + faculty in one searchable table
  │     - Filter: All / Students / Faculty / Inactive
  │     - Activate / Deactivate any account (cannot deactivate
  │       your own admin account)
  │     - View last login timestamp per user
  │
  └── [Institute Sync]
        - Trigger a comparison against the institute's mock database
        - View last sync timestamp (persists across reloads)
        - See Matched / New / Flagged counts
        - Review table of flagged records, categorized as:
          new (not yet onboarded), mismatch (data differs), or
          orphaned (exists in our system but not in institute records)
END
```

> **Not currently built:** a platform-wide analytics view (cross-branch
> submission rates, grading turnaround time, AI vs. faculty score
> comparison) was originally planned but does not exist yet. A
> placeholder route exists at `/admin/analytics` but isn't linked from
> anywhere in the app.

---

## Screen List Summary

| Screen | Student | Faculty | Admin |
|---|---|---|---|
| Login | ✅ | ✅ | ✅ |
| One-Time Profile Setup | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ |
| Notifications (bell) | ✅ | ✅ | ✅ |
| Assignment List | ✅ | ✅ | ❌ |
| Assignment Detail | ✅ | ✅ | ❌ |
| Upload Submission | ✅ | ❌ | ❌ |
| Submission Status | ✅ | ❌ | ❌ |
| View Feedback | ✅ | ❌ | ❌ |
| Performance Dashboard | ✅ | ❌ | ❌ |
| Create Assignment | ❌ | ✅ | ❌ |
| Evaluate Submission | ❌ | ✅ | ❌ |
| Annotate Digital Copy | ❌ | ✅ | ❌ |
| Section Analytics | ❌ | ✅ | ❌ |
| Manage Users | ❌ | ❌ | ✅ |
| Manage Branches | ❌ | ❌ | ✅ |
| Institute Sync | ❌ | ❌ | ✅ |
| Platform Analytics | ❌ | ❌ | ❌ (not built — see note above) |
