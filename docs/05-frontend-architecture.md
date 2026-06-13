# 05 · Frontend Architecture & Component Hierarchy

## Rendering strategy

- **Server Components** for data-backed pages (dashboards, lists, reports) — fetch on the
  server, no client JS for static content.
- **Client Components** for interactive surfaces: the exam runner and admin editors.
- **TanStack Query** for autosave mutations + polling (Live Exam Center, import status).
- **Zustand** for runner-local state (answers buffer, timer, flags) — small and fast.
- **Tailwind + shadcn/ui (Radix)** primitives in [`packages/ui`](../packages/ui); app-local
  composites in `apps/web/src/components`. Dark-mode via the `.dark` class + CSS variables.
- **Recharts** for analytics. **Tiptap** rich-text in admin editors. The Writing answer box
  is a **plain restricted textarea** (spell-check off, paste optionally blocked).

## App structure (route groups)

```
app/(marketing)   Landing
app/(auth)        login / register / forgot / reset
app/(candidate)   dashboard / exams / results / analytics / profile  (+ shared layout/nav)
app/(exam)        exam/[attemptId]  (chrome-free, locked layout)
app/(admin)       admin/*  (SaaS sidebar shell)
app/api/v1        route handlers
```

## Exam runner component hierarchy (core of the product)

```
<ExamShell>                      fullscreen · beforeunload guard · blur/visibility logging
  <ExamHeader>                   server-authoritative countdown · progress · section name
  <SectionRouter>                fixed order: Listening → Reading → Writing
    <ListeningSection>           <AudioPlayer once/> + <QuestionPane/>
    <ReadingSection>             <PassagePane/> | <QuestionPane/>  (split, resizable)
    <WritingSection>             <PromptPane/> | <WritingEditor wordCount/>
  <QuestionNavigator>            answered / flagged / current grid
  <ReviewScreen>                 pre-submit overview
  <AutosaveProvider>             debounced POST + heartbeat (HTTP, no WebSocket)
  <RecoveryBoundary>             rehydrate from server + IndexedDB on reconnect (E7)
  <QuestionRenderer registry/>   type → renderer (MCQ, TFNG, matching, completion, …)
```

## Question-type registry

One renderer (candidate) + one editor (admin) per official IELTS type. Adding a type =
adding **one registry entry** — no engine changes. The contract lives in
[`packages/ui/src/question-registry.ts`](../packages/ui/src/question-registry.ts):

```
QuestionTypeEntry { type, label, Renderer, Editor }
questionRegistry: Partial<Record<QuestionTypeKey, QuestionTypeEntry>>
```

Covered types: Multiple Choice, Multiple Answer, True/False/Not Given, Yes/No/Not Given,
Matching (Headings / Information / Features / Sentence Endings), Sentence / Summary / Note /
Table / Flow-chart Completion, Diagram / Map / Plan Labelling, Short Answer, Classification,
Writing Task 1 & 2.

## Admin shell

Collapsible left sidebar + top header (global search, notifications, profile, date
selector, quick actions) + content + footer. Shared table/filter/pagination/bulk-action/
confirmation-dialog components. Detail in [11-admin-cms.md](11-admin-cms.md).

## Responsiveness & accessibility

Desktop-first; tablet and mobile supported. Radix primitives give keyboard nav + ARIA.
The exam runner targets desktop/laptop (real exam conditions) but degrades gracefully.
