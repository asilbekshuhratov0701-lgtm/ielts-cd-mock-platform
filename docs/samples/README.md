# Sample exam files

Ready-to-import JSON exams for smoke-testing the question engine end-to-end
(import → builder → runner → auto-scoring). Both files pass `validateExamFile`
with no errors.

| File | Module | Covers |
|---|---|---|
| `reading-all-question-types.json` | reading | All 17 IELTS question types across the `radio`, `checkbox`, `select` and `gap` primitives (34 questions). |
| `listening-table-completion.json` | listening | `table_completion` in its structured form — merged cells, styled cells, blanks inside cell text. |
| `writing-tasks.json` | writing | The `essay` primitive — Task 1 and Task 2. |

## How to use

1. Log in as an admin → **Exam Builder** (`/admin/exam-import`).
2. Paste the contents of a file into the JSON import box and submit.
3. It lands as a draft blueprint. Open it, review the rendering of each group,
   then publish (Reading answers are pre-filled here, so it auto-scores).
4. Log in as a candidate, take the exam, submit, and confirm Listening/Reading
   auto-score and the Writing tasks reach the examiner queue.

## Notes

- **Listening**: identical in structure to the reading file, but set
  `"module": "listening"`, `"timerSource": "audio"`, `"timeLimitMinutes": null`,
  and add an `"audio"` block (e.g. `{ "ref": "section1.mp3", "required": true }`).
  The exam stays `audio_pending` until you upload and bind the audio file.
- The reading file includes answer keys so it scores immediately. Real imports
  only carry keys when they were present in the source PDF — otherwise you enter
  them in the builder before publishing.
- `map_labelling` / `diagram_labelling` here render as labelled dropdowns/gaps;
  attach a map or diagram image in the builder to show it beside the answers.

## Completion templates

Every `gap` group hosts its blanks in a `template`. The `questionType` picks the
layout (`table_completion` → table, `note_completion` → notes, and so on). A
template is either a **string** or an **object with a `format`**.

The string form is one line per row; `table_completion` splits each line on `|`,
and `{{n}}` marks a blank:

```json
"template": "Stage | Description\nStorage | kept in the {{22}}"
```

The object forms are `notes`, `summary` and `table`. Use `format: "table"` when a
table needs merged or styled cells — a cell is an ordered list of `parts`, each
either literal `text` or a `blank` carrying the exam-wide question number:

```json
"template": {
  "format": "table",
  "title": "Oyster Bay Sailing Club Courses",
  "header": ["Name of course", "What you learn", "Cost", "Other information"],
  "rows": [
    { "cells": [
      { "parts": [{ "text": "Weekend course" }], "bold": true, "rowspan": 2 },
      { "parts": [{ "text": "small groups (max " }, { "gap": 1 }, { "text": " people)" }] }
    ]}
  ]
}
```

- `colspan` / `rowspan` / `bold` / `header` are optional per cell; spans default to 1.
- `header` entries may be plain strings or full cells.
- Each row's width — colspans summed, plus any rowspan carried down from the rows
  above — must equal the header width.
- Answers stay where every other type keeps them: inline on `questions[]`, one
  `{ "type": "gap", "number": n, "answer": [...] }` per blank. Every blank needs a
  question and every question needs a blank; the validator reports both directions
  and names the offending row and cell.

