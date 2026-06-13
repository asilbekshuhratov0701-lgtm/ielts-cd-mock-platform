# 13 · IELTS Computer-Delivered Experience — UX Spec (E8)

This spec codifies official CD behaviours the runner must preserve. It drives the runner
component contracts in [05-frontend-architecture.md](05-frontend-architecture.md).

## Global

- **Fixed flow** — Listening → Reading → Writing. The candidate cannot change order and
  finishes one section before the next.
- **Server-authoritative countdown** — header timer counts down from server `deadlineAt`;
  no client clock is trusted. Visual warning thresholds (e.g., 10 min, 5 min).
- **Question navigator** — numbered grid showing answered / unanswered / flagged / current;
  click to jump within the active section.
- **Flagging** — candidate can flag any question for review (`Answer.isFlagged`).
- **Review screen** — before submitting a section, a review overview lists answered/flagged.
- **Automatic section transitions** — at section end (time or completion) the runner
  advances; no going back to a finished section.
- **Auto-submit** — on timeout the section/exam submits automatically (server cron enforces).
- **Locked chrome** — fullscreen, no site nav; `beforeunload` guard; blur/visibility and
  fullscreen-exit logged.

## Listening (30 min, 40 questions)

- Audio **plays once**, as one continuous track; **no seeking, no replay**.
- Audio position is **derived from elapsed section time** (`now − startedAt`), so a refresh
  resumes at the correct position rather than restarting.
- Questions are grouped and revealed alongside the audio; answers auto-save.
- Audio is served from R2 via short-TTL signed URLs (range requests).

## Reading (60 min, 40 questions, 3 passages)

- **Split layout** — passage pane | question pane, **resizable** divider.
- Passage text supports highlighting; per-question types render via the registry.
- Question navigator spans all three passages; auto-save throughout.

## Writing (60 min, Task 1 + Task 2)

- **Separate editors** for Task 1 and Task 2.
- **Live word counter** per task.
- **Spell-check disabled**; **copy-paste restrictions optional** (configurable).
- Auto-save; auto-submit on timeout. **No AI scoring** — responses are stored for manual
  examiner evaluation.

## Recovery (ties to E7)

On refresh / disconnect / crash, the runner rehydrates from the server (answers,
`deadlineAt`, derived audio position) plus an IndexedDB buffer of unsent answers, and the
candidate continues without losing work or time. See [15-extensions.md](15-extensions.md) · E7.

## Accessibility

Keyboard navigation, ARIA labels (Radix), sufficient contrast, scalable text — without
breaking exam constraints (timing, play-once audio).
