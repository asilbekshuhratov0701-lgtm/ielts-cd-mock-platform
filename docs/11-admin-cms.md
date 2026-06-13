# 11 · Admin CMS Architecture

A clean, modern, minimalist SaaS dashboard. Desktop-first, responsive, fast, dark-mode
ready, accessible.

## Layout

```
┌───────────┬─────────────────────────────────────────────┐
│  SIDEBAR  │  TOP HEADER (search · notifications · profile │
│ (collapse)│              · date selector · quick actions) │
│           ├─────────────────────────────────────────────┤
│  nav +    │                                             │
│  icons    │            MAIN CONTENT AREA                │
│           │                                             │
│           ├─────────────────────────────────────────────┤
│           │                FOOTER                       │
└───────────┴─────────────────────────────────────────────┘
```

**Sidebar** (collapsible, icon + label): Dashboard · Candidates · Exams · Writing
Evaluation · Live Exam Center · Analytics · Question Bank · AI Import · Media Library ·
Users & Roles · Reports · System Logs · Settings · Logout.

## Overview dashboard

- **KPI cards** — Total Candidates · Total Exams · Writing Pending · Average Band ·
  Upcoming Exams · Completed Exams · Recent Registrations · Active Sessions.
- **Analytics** — exam activity, candidate growth, band distribution, average performance,
  completion rates, writing-evaluation stats, weekly/monthly trends.
- **Recent activity timeline** — registrations, exam creation/publication, writing
  submissions/evaluations, result publications, user updates, system events.
- **Upcoming exams** — name, date, time, status (Published/Draft), quick edit.
- **Recent results** — candidate, exam, L/R/W, overall band, publication date.

## Sections

| Section | Capabilities |
|---|---|
| **Candidates** | Create/edit/delete, reset password, assign exams, history, scores, search/filter, export, **groups (E3)** |
| **Exams** | Create from template (E1), edit, publish, schedule, duplicate, **version (E5)**, archive, manage sections |
| **Writing Evaluation** | Queue (candidate/exam/submitted/status/examiner/score) → open → assign → score (TR/CC/LR/GRA) → feedback → **admin publish (E13)** |
| **Live Exam Center** | Polling monitor: active candidates, section, remaining time, connection, recent autosaves, disconnects, auto-submits, completed, warnings (E6) |
| **Question Bank** | Reusable content library: search/filter/categorize, build from existing, randomized mock generator (E2) |
| **AI Import** | Upload → pipeline status → review/approve (§7) |
| **Media Library** | Folders, tags, search, version history, archive; storage usage (E9) |
| **Users & Roles** | Super Admin / Admin / Examiner / Candidate; RBAC |
| **Reports** | Candidate, exam, band distribution, writing, attendance → PDF/Excel |
| **System Logs** | Logins, exam starts/submissions, admin actions, evaluations, settings changes, security events |
| **Settings** | Branding/logo/colours, exam settings, band calculation, session limits, security, email, notifications, storage |

## Cross-cutting admin features

Global search · advanced filters · pagination · **bulk actions** · sorting · quick edit ·
notifications (E10) · confirmation dialogs · autosave · dark-mode · responsive design.

## UI style

Rounded cards · subtle shadows · professional typography · IELTS-themed palette ·
interactive charts (Recharts) · minimal clutter · consistent spacing · accessible.

## Notifications (E10)

Worker-generated, in-app + email. **Admin:** AI import completed, writing awaiting
evaluation, exam published, candidate issues, storage warnings, system alerts.
**Candidate:** exam assigned, exam reminder, result published, writing score published,
announcements.
