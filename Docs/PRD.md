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
- View class-level performance analytics

### 5.2 Student Side
- Register with branch + section + enrollment number
- See all assignments posted by their branch faculty
- Upload handwritten assignment (photo or PDF, multiple pages)
- Track submission status (Submitted / Under Review / Graded)
- View AI + faculty feedback with marks breakdown
- See personal performance trend over time

### 5.3 Admin Side
- Manage all faculty and student accounts
- View institution-wide analytics
- Enable/disable branches or sections
- Monitor submission and grading activity
- Trigger institute database sync

---

## 6. AI Capabilities

| What AI Does | How |
|---|---|
| Read handwritten text & math | Gemini 1.5 Pro Vision |
| Parse diagrams & block drawings | Gemini 1.5 Pro Vision |
| Check solution structure & method | Gemini 1.5 Pro Reasoning |
| Generate step-by-step feedback | Gemini 1.5 Pro Language |
| Suggest marks based on rubric | Gemini + Faculty criteria |

---

## 7. Must-Have Features (MVP)

- [ ] Student & Faculty registration with branch/section
- [ ] Faculty can create branch + sections dynamically
- [ ] Assignment creation by faculty (per subject, per section)
- [ ] Multi-page handwritten upload by students
- [ ] AI reading + feedback generation (Gemini)
- [ ] Faculty annotation + approval of feedback
- [ ] Student feedback view with marks
- [ ] Basic performance dashboard

---

## 8. Nice-to-Have (Phase 2)

- [ ] Plagiarism detection between submissions
- [ ] Export feedback as PDF for students
- [ ] Email/SMS notifications on grading
- [ ] Bulk submission download for faculty
- [ ] Institution-level report for HOD/Principal

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
