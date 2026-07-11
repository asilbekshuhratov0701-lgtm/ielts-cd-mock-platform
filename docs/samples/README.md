# Sample exam files

Ready-to-import JSON exams for smoke-testing the question engine end-to-end
(import → builder → runner → auto-scoring). Both files pass `validateExamFile`
with no errors.

| File | Module | Covers |
|---|---|---|
| `reading-all-question-types.json` | reading | All 17 IELTS question types across the `radio`, `checkbox`, `select` and `gap` primitives (34 questions). |
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
