# 01 · Sitemap & Complete Page List

## Sitemap

```
/                              Landing (marketing)
├─ /login  /register  /forgot  /reset        Authentication

(candidate)
├─ /dashboard                  Welcome, stats, upcoming/past, resume/start
├─ /exams                      Assigned & available mocks
│   └─ /exams/[id]             Exam detail → start attempt
├─ /results                    Published results list
│   └─ /results/[id]           Detailed result report
├─ /analytics                  Progress analytics
└─ /profile                    Profile settings

(exam runner — locked, fixed flow)
└─ /exam/[attemptId]           Listening → Reading → Writing → Review → Submitted

(admin CMS)
└─ /admin                      Overview (KPIs, charts, activity, upcoming, recent results)
   ├─ /admin/candidates        Manage candidates & groups
   ├─ /admin/exams             Exams (templates, versioning, publish)
   │   └─ /admin/exams/[id]/edit   Exam builder
   ├─ /admin/writing           Writing evaluation queue
   ├─ /admin/live              Live Exam Center (E6)
   ├─ /admin/analytics         Admin analytics
   ├─ /admin/question-bank     Content library (E2)
   ├─ /admin/imports           AI import jobs
   │   └─ /admin/imports/[id]/review   AI review & approve
   ├─ /admin/media             Media library (E9)
   ├─ /admin/users             Users & roles (RBAC)
   ├─ /admin/reports           Reports (PDF/Excel)
   ├─ /admin/logs              System / audit logs
   └─ /admin/settings          Branding, scoring, security, email, storage
```

## Route groups (Next.js App Router)

`(marketing)` · `(auth)` · `(candidate)` · `(exam)` · `(admin)` — each group has its own
layout. The `(exam)` group is intentionally chrome-free and locked down.

## Complete page list

### Marketing
- **Landing** — hero, IELTS branding/logo, nav (Login / Sign Up), features, advantages,
  about, statistics, footer. Responsive, desktop-first.

### Authentication
- **Login** (Remember Me), **Sign Up**, **Forgot Password**, **Reset Password**.
- Role-based redirect after login: Admin → `/admin`, Candidate → `/dashboard`.

### Candidate
- **Dashboard** — welcome, upcoming/past exams, average band, recent scores, progress
  chart, available mocks, resume unfinished exam, start new exam, profile/logout.
- **Exams** / **Exam detail** — assigned list, start flow.
- **Results** / **Result report** — L/R/W bands, overall band, performance breakdown,
  exam history.
- **Analytics** — average band, skill improvements, weak areas, score trends, target band.
- **Profile** — personal details, target band, password.

### Exam runner (single dynamic route, internal stages)
- **Listening** (30 min, 40 Q, audio play-once), **Reading** (60 min, 40 Q, split layout),
  **Writing** (60 min, Task 1 + Task 2), **Review** screen, **Submitted** confirmation.

### Admin (CMS)
- **Overview**, **Candidates**, **Exams**, **Exam builder**, **Writing Evaluation**,
  **Live Exam Center**, **Analytics**, **Question Bank**, **AI Imports**, **Import Review**,
  **Media Library**, **Users & Roles**, **Reports**, **System Logs**, **Settings**.

> Component breakdown for each page is in [05-frontend-architecture.md](05-frontend-architecture.md);
> admin specifics in [11-admin-cms.md](11-admin-cms.md).
