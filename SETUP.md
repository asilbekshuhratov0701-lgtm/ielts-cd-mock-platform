# Local Setup — run the app

Pick **one** option:

- **Option A — Local SQLite (fastest, recommended):** an in-process file database. No
  server, no Docker, no account, and it works in **any** terminal (including an
  administrator one). Best for trying it right now.
- **Option B — Neon (free cloud Postgres):** closer to production. Steps further down.

---

## Option A — Local SQLite (recommended to try now)

Two commands. Works in any terminal.

```bash
corepack enable          # if pnpm isn't active
pnpm install
pnpm db:local            # creates the SQLite db, applies schema, seeds demo data
pnpm dev:web             # starts the web app
```

Open <http://localhost:3000> and log in:

| Role | Email | Password |
|---|---|---|
| Candidate | `candidate@demo.test` | `Candidate12345!` |
| Admin | `admin@demo.test` | `Admin12345!` |

Then jump to **[§6 Take the demo exam](#6-take-the-demo-exam-exam-engine)**.

Notes:
- `pnpm db:local` writes `apps/web/.env`, generates a SQLite-compatible Prisma client,
  creates `.localdb/local.db`, and seeds it. Re-run it any time to reset the schema/seed.
- To wipe the local data: delete the `.localdb/` folder, then run `pnpm db:local` again.
- `pnpm db:local` runs `prisma db push`, so don't run it while `pnpm dev:web` is running
  (the dev server locks the Prisma engine). Stop the app, run `db:local`, restart.

---

## Option B — Neon (cloud)

### 1. Create a Neon Postgres (~2 min)

1. Sign up at <https://neon.tech> → **New Project**.
2. Copy the connection string. Neon gives you a **pooled** and a **direct** URL:
   - Pooled (host contains `-pooler`) → `DATABASE_URL`
   - Direct (no `-pooler`) → `DIRECT_URL`
   - If you only see one, use it for both (fine for dev).

## 2. Configure env (two files)

Create **`apps/web/.env`** (read by the web app) with:

```ini
DATABASE_URL="postgresql://<user>:<pass>@<host>-pooler.../<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<pass>@<host>.../<db>?sslmode=require"
# Generate a real secret:  npx auth secret   (or: openssl rand -base64 32)
AUTH_SECRET="paste-a-long-random-string-here"
AUTH_TRUST_HOST=true
```

Also create **`packages/db/.env`** with just the two URLs (the Prisma CLI reads this when
applying migrations):

```ini
DATABASE_URL="postgresql://<user>:<pass>@<host>-pooler.../<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<pass>@<host>.../<db>?sslmode=require"
```

## 3. Create the schema + demo users

```bash
corepack enable          # if pnpm isn't active
pnpm install
pnpm db:generate
pnpm --filter @ielts/db run migrate   # creates tables (name it e.g. "init")
pnpm --filter @ielts/db run seed      # default org + demo users + demo exam
```

The seed prints the demo credentials:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.test` | `Admin12345!` |
| Candidate | `candidate@demo.test` | `Candidate12345!` |

## 4. Run

```bash
pnpm --filter @ielts/web dev     # web only
# or: pnpm dev                   # web + worker (worker needs Redis to do real work)
```

Open <http://localhost:3000>.

## 5. Try the auth flow

- **Register** a new account at `/register` → auto-logs in → lands on `/dashboard`.
- **Login** at `/login`:
  - `admin@demo.test` → redirected to `/admin`.
  - `candidate@demo.test` → redirected to `/dashboard`.
- **Route guards (middleware):**
  - Visiting `/admin/*` while logged out → redirected to `/login`.
  - A candidate visiting `/admin` → redirected to `/dashboard`.
  - A logged-in user visiting `/login` → redirected to their role home.
- **Logout** — the button in the candidate/admin header clears the session.

## 6. Take the demo exam (exam engine)

The seed creates a published **IELTS Academic Mock 1** assigned to the demo candidate
(Listening 30 min → Reading 60 min → Writing 60 min, with sample questions + answer keys).

1. Log in as `candidate@demo.test` → go to **Exams** (`/exams`).
2. Click **Start** → you're taken to the locked runner at `/exam/<attemptId>`.
3. Observe:
   - **Server-authoritative countdown** in the header (derived from the section deadline).
   - **Autosave** — answer a question; the header shows “Saving…” → “Saved”. A background
     **heartbeat** re-syncs the timer every 15s.
   - **Resume** — refresh the page mid-section; your answers and remaining time are restored
     from the server.
   - **Flagging** and an answered counter in the footer.
4. Click **Next section** to advance (Listening → Reading → Writing). On the last section,
   **Finish & submit** records the attempt, **auto-scores Listening & Reading**, and shows
   the submitted screen.
5. Writing has two tasks with a live word counter; spell-check is disabled.

## 7. View results

After submitting, go to **Results** (`/results`) or the **Dashboard**:

- Listening & Reading show **band scores** (raw correct → band via the IELTS conversion
  table; raw is scaled to a /40 equivalent for the small demo exam).
- Writing shows **Pending** (examiner marking — that queue is the next milestone), so the
  **Overall** band shows *Awaiting Writing* until a Writing band exists.
- The Dashboard shows exams completed, average overall band, and recent results.

Notes on this slice: the renderer handles multiple-choice, true/false/not-given, and
short-answer; objective scoring runs inline on submit (production would offload to the
worker). Remaining follow-ups: Writing examiner queue + overall band, the rest of the IELTS
question types, the admin-publish gate for results, and play-once audio / split-reading polish.

## AI exam import (admin)

Admin → **AI Import** lets you upload an IELTS exam **PDF**; the platform extracts the text
and uses Claude to build a Computer-Delivered mock (sections, question types, options, and the
answer key when it's in the file). It lands as a **draft** in the exam builder for you to
review, fix, enter/confirm correct answers, and publish.

- For real AI extraction, add your Anthropic key to **`apps/web/.env`**:
  ```ini
  ANTHROPIC_API_KEY="sk-ant-..."
  AI_MODEL_PRIMARY="claude-opus-4-8"
  ```
  then restart `pnpm dev:web`.
- Without a key it runs in **mock mode** (creates a small editable draft) so you can see the flow.

## Notes

- Passwords are hashed with **Argon2id** (`@node-rs/argon2`); the same parameters are used
  by the app and the seed.
- Sessions are **JWT** (httpOnly cookie) carrying the user's `role`; the edge middleware
  decodes them without a DB hit.
- `/api/v1/*` still returns `501` — those endpoints arrive with the exam engine (next
  milestone). `/api/health` returns `200`.
- Redis (Upstash or Docker) is only needed for the worker (jobs/cron); auth and page
  navigation work without it.
