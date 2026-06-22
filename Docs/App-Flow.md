# App Flow — Assignment Feedback Loop
## IPS Academy, Indore

---

## Global Rules

- Every login is verified against **IPS Academy's cloud database**
- If credentials don't match → **Access Denied**, no registration allowed
- First login triggers a **one-time profile setup** for both students and faculty
- After setup, direct dashboard access on every subsequent login

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
  - Personal Performance Trend
        │
        ▼
  [Open an Assignment]
  - View assignment title, subject, deadline, max marks
  - View faculty instructions
  - Download reference sheet (if faculty attached one)
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
  ● Submitted — Under AI Processing
  ● AI Review Done — Awaiting Faculty Approval
  ● Graded — Feedback Available
        │
        ▼
  [View Feedback]
  - Marks received vs total
  - AI-generated step-by-step feedback
  - Faculty annotations on digital copy
  - Faculty comments
  - Highlighted errors on original uploaded sheet
        │
        ▼
  [Performance Dashboard]
  - Subject-wise marks trend (graph)
  - Semester progress
  - Comparison vs class average (anonymous)
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
  - My Assignments (active, closed, draft)
  - Pending Evaluations (submissions waiting)
  - Recently Graded
  - Section-wise performance overview
        │
        ▼
  [Create New Assignment]
  - Select: Sub-Branch → Section → Subject
  - Select: Year + Semester
  - Enter: Assignment Title + Description
  - Set: Max Marks + Deadline
  - Define: Evaluation Criteria / Rubric (optional)
  - Attach: Reference sheet or question paper (optional)
  - Publish → Students of that section can now see it
        │
        ▼
  [View Submissions]
  - List of all students who submitted
  - Status per student (AI processed / pending)
  - Click any student → open their submission
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
        - Enter marks per criteria
        - Overall marks
        - Approve & Publish → Student notified
        │
        ▼
  [Section Analytics]
  - Average marks per assignment
  - Common errors across class
  - Student-wise performance table
  - Subject-wise trend graphs
END
```

---

## FLOW 3 — Admin Journey

```
START
  │
  ▼
[Login Screen]
  Admin credentials (separate admin account)
        │
        ▼
  [Admin Dashboard]
  - Institution-wide activity summary
  - Total submissions today / this week
  - Pending evaluations across all branches
  - Active faculty + students count
        │
        ▼
  ├── [Manage Branches]
  │     - View all branches + sub-branches + sections
  │     - Enable / Disable any branch or section
  │     - View faculty mapped to each section
  │
  ├── [Manage Users]
  │     - View all students + faculty
  │     - Deactivate accounts if needed
  │     - View login activity
  │
  ├── [Platform Analytics]
  │     - Branch-wise submission rates
  │     - Grading turnaround time
  │     - AI vs Faculty score comparison
  │     - Most active subjects
  │
  └── [Database Sync]
        - Trigger sync with IPS Academy cloud database
        - View last sync timestamp
        - Flag mismatches between platform and institute DB
END
```

---

## Screen List Summary

| Screen | Student | Faculty | Admin |
|---|---|---|---|
| Login | ✅ | ✅ | ✅ |
| One-Time Profile Setup | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ |
| Assignment List | ✅ | ✅ | ❌ |
| Assignment Detail | ✅ | ✅ | ❌ |
| Upload Submission | ✅ | ❌ | ❌ |
| Submission Status | ✅ | ❌ | ❌ |
| View Feedback | ✅ | ❌ | ❌ |
| Create Assignment | ❌ | ✅ | ❌ |
| Evaluate Submission | ❌ | ✅ | ❌ |
| Annotate Digital Copy | ❌ | ✅ | ❌ |
| Section Analytics | ❌ | ✅ | ❌ |
| Manage Users | ❌ | ❌ | ✅ |
| Manage Branches | ❌ | ❌ | ✅ |
| Platform Analytics | ❌ | ❌ | ✅ |
| Database Sync | ❌ | ❌ | ✅ |
