# 02 · Flows & Data-Flow Diagrams

## Authentication flow

```mermaid
flowchart TD
  A[Visitor] --> B[/register/]
  B --> C[Verify email]
  C --> D[/login/ rate-limited]
  D -->|Argon2id verify| E[Issue httpOnly Secure cookie session + role]
  E --> F{role}
  F -->|ADMIN / SUPER_ADMIN / EXAMINER| G[/admin/]
  F -->|CANDIDATE| H[/dashboard/]
  D -.forgot.-> I[/forgot/ → email single-use token] --> J[/reset/]
```

"Remember me" extends session max-age. Full detail in [08-security-and-auth.md](08-security-and-auth.md).

## Candidate flow

```mermaid
flowchart LR
  L[Login] --> D[Dashboard]
  D --> E[Exams: assigned/available]
  E --> S[Start attempt]
  S --> R[Exam runner: Listening→Reading→Writing→Review→Submit]
  R --> W[Wait: L/R auto-scored, Writing examiner-marked]
  W --> P[Result published by admin]
  P --> RES[Results + report]
  RES --> AN[Analytics: trends, weak areas, target band]
```

## Admin flow

```mermaid
flowchart TD
  AL[Admin login] --> OV[Overview / KPIs]
  OV --> EX[Create exam: template / AI import / manual]
  EX --> RV[Draft → Review → Preview → Approve]
  RV --> PB[Publish]
  PB --> AS[Assign to candidate / group / org]
  AS --> MON[Live Exam Center: monitor active sessions]
  MON --> WR[Writing queue: assign → score → complete]
  WR --> APR[Admin approves & publishes results]
  APR --> RPT[Reports & analytics]
```

## Exam attempt lifecycle (data flow)

```mermaid
sequenceDiagram
  participant C as Candidate (browser)
  participant W as Web (route handlers)
  participant DB as Postgres
  participant K as Worker (cron)

  C->>W: POST /attempts (start)
  W->>DB: create Attempt (unique active per exam+candidate)
  C->>W: POST sections/:id/start
  W->>DB: set startedAt, deadlineAt = startedAt + duration
  loop every answer change / ~12s
    C->>W: POST answers (autosave) + heartbeat
    W->>DB: upsert Answer if now < deadlineAt (else reject)
  end
  Note over K,DB: cron every ~60s
  K->>DB: find IN_PROGRESS where deadlineAt < now
  K->>DB: auto-submit + enqueue scoring
  C->>W: POST /submit (final, idempotent)
  W->>DB: status IN_PROGRESS → SUBMITTED
```

The timer is **server-authoritative**: the client renders a countdown derived from
`deadlineAt`, but enforcement is server-side. Listening audio position is derived from
elapsed section time (play-once, survives refresh). See [13-cd-ux-spec.md](13-cd-ux-spec.md).

## Scoring & result publication (data flow)

```mermaid
flowchart LR
  SUB[Attempt submitted] --> OBJ[Worker: score Listening + Reading vs answer keys]
  OBJ --> BAND[raw → band via conversion table in Settings]
  SUB --> WQ[Writing → evaluation queue]
  WQ --> EX[Examiner: criteria TR/CC/LR/GRA → task bands]
  EX --> WB["Writing band = (T1 + 2·T2)/3"]
  BAND --> OV[Overall = avg L,R,W rounded to .5]
  WB --> OV
  OV --> ADMIN[Admin approves]
  ADMIN --> PUB[Publish → candidate sees result]
```

## AI exam import (data flow)

See the dedicated diagram and stages in [07-ai-import-pipeline.md](07-ai-import-pipeline.md).
