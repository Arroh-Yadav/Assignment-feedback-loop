# Product Requirements Document (PRD)
## Assignment Feedback Loop — IPS Academy, Indore

---

## 1. Product Overview

| Field | Details |
|---|---|
| **Product Name** | Assignment Feedback Loop (AFL) |
| **Institution** | IPS Academy, Indore |
| **Type** | Internal Web Platform (Single Institution) |
| **Purpose** | Digitize handwritten engineering assignments, automate AI-powered evaluation, and deliver instant structured feedback to students — replacing the slow paper-based grading cycle. |

---

## 2. Users

| User Type | Who They Are |
|---|---|
| **Student** | Enrolled students across all branches and sections |
| **Faculty** | Branch-specific professors who evaluate submissions |
| **Admin** | Institute-level administrator who manages the platform |

---

## 3. Authentication System

### Student Login
| Field | Details |
|---|---|
| **Computer Code** | Unique institute-assigned student computer code |
| **Enrollment Number** | Student's enrollment ID |
| **Verification** | Matched against institute's cloud database — if not found, registration is rejected |

### Faculty Login
| Field | Details |
|---|---|
| **Employee ID** | Institute-assigned employee ID |
| **Institute Email** | `@ipsacademy.org` verified email |
| **Verification** | Matched against institute's cloud HR/faculty database |

### Admin Login
There is no separate admin credential system — an admin account is simply
a faculty-database entry flagged with `designation: "Admin"`, and goes
through the identical verification path as faculty login above.

> **No open registration.** The system checks every login attempt against the institute's existing cloud database. Only pre-existing, institute-verified individuals can access the platform.

---

## 4. Institution Structure

### Branch Hierarchy
```
IPS Academy
│
├── Computer Science (CS)
│   ├── CS - Artificial Intelligence (CS-AI)
│   │   ├── Section 1
│   │   ├── Section 2
│   │   └── Section 3
│   ├── CS - Data Science (CS-DS)
│   └── CS - Cyber Security (CS-CS)
│
├── Electronics & Communication (EC)
├── Electrical Engineering (EE)
├── Mechanical (ME)
├── Civil (CE)
└── Information Technology (IT)
```

### Structure Rules
- **Branch** → Pre-defined (set by Admin)
- **Sub-Branch** → Created by Faculty on first login
- **Section** → Faculty inputs count → system creates Section 1, 2, 3...
- **Sections** are numbered (1, 2, 3 etc.)
- Standard **B.E. / B.Tech — 4 Years / 8 Semesters**
- Admin can enable/disable any Branch, Sub-Branch, or Section independently
  (does not cascade — disabling a Branch does not automatically disable
  its Sub-Branches or Sections)

---

## 5. Core Features

### 5.1 Faculty Side
- Register with branch + subject they teach
- Input branch name + number of sections → system opens those sections automatically
- Create assignments per subject per section
- Set deadline, marks, and evaluation criteria
- View all student submissions per section
- Annotate digital copies (highlight, comment, draw)
- AI-assisted evaluation with one click
- Override or edit AI feedback before publishing
- View section-level performance analytics (average marks per assignment,
  top recurring AI-flagged errors, student-wise marks table, section
  average trend over time)

### 5.2 Student Side
- Register with branch + section + enrollment number
- See all assignments posted by their branch faculty
- Upload handwritten assignment (photo or PDF, multiple pages)
- Track submission status (Submitted / AI Processing / Under Review / Graded)
- View AI + faculty feedback with marks breakdown
- See personal performance trend over time, compared against an
  anonymized section average
- Receive in-app notifications when an assignment is graded or a new
  assignment is posted

### 5.3 Admin Side
- Manage all faculty and student accounts (search, filter by role/status,
  activate/deactivate)
- View quick platform stats (total students, faculty, inactive accounts)
- Enable/disable branches, sub-branches, or sections individually
- View faculty/student counts per section
- Trigger a comparison against the institute's database (matched / new /
  flagged mismatch counts, with a review table for discrepancies)

> Institution-wide analytics (e.g. cross-branch submission rates, grading
> turnaround time, AI vs. faculty score comparison) is **not currently
> built**. A placeholder route exists but isn't linked from anywhere in
> the app. See Implementation-Plan.md for status.

---

## 6. AI Capabilities

| What AI Does | How |
|---|---|
| Read handwritten text & math | Gemini 3.5 Flash Vision |
| Parse diagrams & block drawings | Gemini 3.5 Flash Vision |
| Check solution structure & method | Gemini 3.5 Flash Reasoning |
| Generate step-by-step feedback | Gemini 3.5 Flash Language |
| Suggest marks based on rubric | Gemini + Faculty criteria |

> Note: these are all handled by a single model call to `gemini-3.5-flash`
> (multimodal — text + vision in one request), not separate named products.

---

## 7. Must-Have Features (MVP) — Status: Delivered

- [x] Student & Faculty registration with branch/section
- [x] Faculty can create branch + sections dynamically
- [x] Assignment creation by faculty (per subject, per section)
- [x] Multi-page handwritten upload by students
- [x] AI reading + feedback generation (Gemini)
- [x] Faculty annotation + approval of feedback
- [x] Student feedback view with marks
- [x] Basic performance dashboard

## 7a. Delivered Beyond Original MVP Scope

These weren't part of the original MVP list above, but were built as
part of Phase 4 and are live in production:

- [x] Student performance dashboard with anonymized section-average comparison
- [x] Faculty section analytics (avg marks, top AI-flagged errors, trend, student-wise table)
- [x] Admin panel — user management, branch/section tree management, institute DB sync
- [x] In-app notifications (graded, new assignment, ready-to-evaluate)
- [x] Cloudinary signed/expiring file URLs (private submissions, not public)
- [x] Rate limiting on login/logout
- [x] Row Level Security enabled on all database tables

---

## 8. Nice-to-Have (Future — Not Yet Built)

> Renamed from the original "Phase 2" label to avoid confusion with
> this project's actual Phase 2 (Core Assignment Loop), which is
> already complete. These are aspirational future ideas, not scheduled work.

- [ ] Plagiarism detection between submissions
- [ ] Export feedback as PDF for students
- [ ] Email/SMS notifications on grading (in-app notifications are live; email/SMS are not)
- [ ] Bulk submission download for faculty
- [ ] Institution-level report for HOD/Principal (true cross-branch analytics)

---

## 9. What This Platform is NOT

- ❌ Not a general LMS (no video lectures, no attendance)
- ❌ Not open to multiple colleges
- ❌ Not an exam/quiz platform
- ❌ Not replacing faculty judgment — AI assists, faculty decides

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Feedback turnaround time | Under 24 hours (vs current 1–2 weeks) |
| Faculty grading time per assignment | Reduced by 60% |
| Student satisfaction with feedback quality | 80%+ positive |
| Assignments digitized in Year 1 | All branches, all sections |
