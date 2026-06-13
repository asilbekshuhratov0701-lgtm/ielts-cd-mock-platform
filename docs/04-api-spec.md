# 04 · API Endpoint Structure

REST route handlers under `/api/v1`. Every request is layered:
**route handler → Zod validation → RBAC guard → service → repository (Prisma)**.
Shared request schemas live in [`packages/validators`](../packages/validators/src/index.ts).
Unimplemented endpoints currently return `501` via the catch-all
[`apps/web/src/app/api/v1/[...path]/route.ts`](../apps/web/src/app/api/v1/[...path]/route.ts).

Responses are JSON. Auth via httpOnly session cookie; mutations require a CSRF token.
List endpoints share pagination/search/sort params (`page`, `pageSize`, `q`, `sort`).

## Auth
```
POST   /auth/register
POST   /auth/login            # rate-limited; sets session cookie
POST   /auth/logout
POST   /auth/forgot
POST   /auth/reset
GET    /auth/session
```

## Candidate (self)
```
GET    /me
PATCH  /me
GET    /me/exams              # assigned / upcoming / past
GET    /me/results
GET    /me/results/:attemptId
GET    /me/analytics
```

## Exam engine
```
POST   /attempts                         # start (enforces single active + window)
GET    /attempts/:id                     # resume (state for recovery)
POST   /attempts/:id/sections/:sid/start # sets deadlineAt
POST   /attempts/:id/answers             # autosave (rejected after deadline)
POST   /attempts/:id/heartbeat           # liveness + audio position
POST   /attempts/:id/sections/:sid/submit
POST   /attempts/:id/submit              # final, idempotent
GET    /media/sign?key=                  # short-TTL signed URL
```

## Admin — exams, templates, question bank
```
GET    /admin/exams                      CRUD /admin/exams[/:id]
POST   /admin/exams/:id/publish | duplicate | archive | restore-version
GET    /admin/templates                  CRUD /admin/templates[/:id]
POST   /admin/exams/from-template
CRUD   /admin/sections /admin/question-groups /admin/questions /admin/answer-keys
CRUD   /admin/passages /admin/audio-tracks /admin/writing-tasks
GET    /admin/question-bank              # search/filter/categorize (library)
POST   /admin/question-bank/generate     # randomized mock generator
```

## Admin — candidates, groups, users
```
GET    /admin/candidates                 CRUD /admin/candidates[/:id]
POST   /admin/candidates/:id/reset-password
GET    /admin/candidates/:id/history
GET    /admin/candidates/export
CRUD   /admin/groups /admin/groups/:id/members        # E3
POST   /admin/assignments                # target candidate / group / org
CRUD   /admin/users                      # RBAC
```

## Admin — writing evaluation, results, live
```
GET    /admin/writing/queue
GET    /admin/writing/:submissionId
POST   /admin/writing/:submissionId/assign | score | feedback
POST   /admin/attempts/:id/publish       # admin-only publish gate
GET    /admin/live/sessions              # Live Exam Center polling (E6)
```

## Admin — analytics, reports, media, logs, settings
```
GET    /admin/analytics/*
POST   /admin/reports                    # → worker (PDF/Excel)
CRUD   /admin/media /admin/media/folders # E9
GET    /admin/logs
CRUD   /admin/settings
GET    /admin/notifications              # E10
```

## AI import
```
POST   /admin/imports                    # upload → enqueue (worker)
GET    /admin/imports                    # job list
GET    /admin/imports/:id                # status + log
GET    /admin/imports/:id/review         # draft + suggestions
PATCH  /admin/imports/:id/draft
POST   /admin/imports/:id/suggestions/:sid/accept | reject
POST   /admin/imports/:id/approve        # creates DRAFT exam (never auto-publish)
POST   /admin/imports/:id/reject
```

## Health
```
GET    /api/health                       # 200 liveness (implemented)
```
