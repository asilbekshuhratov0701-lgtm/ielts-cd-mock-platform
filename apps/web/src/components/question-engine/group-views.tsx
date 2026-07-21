"use client";

import { useAnswer } from "./answers-store";
import { AnswerSlot, OptionBank, useHostedInPassage } from "./dnd";
import { CheckboxInput, RadioInput, SelectMatch } from "./primitives";
import { NumberBadge } from "./QuestionGroupFrame";
import type {
  CheckboxGroup,
  EssayGroup,
  EssayTask,
  RadioGroup,
  RadioQuestion,
  SelectGroup
} from "./types";
import { cn } from "@/lib/cn";

function EssayField({ task }: { task: EssayTask }) {
  const [value, set] = useAnswer(task.id);
  const text = (value as string) ?? "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const under = typeof task.minWords === "number" && words < task.minWords;
  return (
    <div className="space-y-3">
      <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {task.prompt}
      </div>
      {task.imageUrl ? (
        <img
          src={task.imageUrl}
          alt={`Task ${task.number}`}
          className="max-h-80 rounded-lg border border-border"
        />
      ) : null}
      <textarea
        value={text}
        onChange={(e) => set(e.target.value)}
        placeholder="Write your answer here…"
        className="min-h-[320px] w-full rounded-lg border border-border bg-surface p-4 text-base leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      />
      <p className={cn("text-sm font-medium", under ? "text-amber-600" : "text-muted")}>
        {words} {words === 1 ? "word" : "words"}
        {typeof task.minWords === "number" ? ` · minimum ${task.minWords}` : ""}
      </p>
    </div>
  );
}

export function EssayGroupView({ group }: { group: EssayGroup }) {
  return (
    <div className="space-y-6">
      {group.tasks.map((t) => (
        <EssayField key={t.id} task={t} />
      ))}
    </div>
  );
}

function ConnectedRadio({ question, boxed }: { question: RadioQuestion; boxed: boolean }) {
  const [value, set] = useAnswer(question.id);
  return (
    <div>
      <p className="mb-2 text-base text-foreground">
        <NumberBadge n={question.number} boxed={boxed} />
        {question.stem}
      </p>
      <RadioInput
        name={question.id}
        options={question.options}
        value={value as string | null}
        onChange={set}
      />
    </div>
  );
}

function GridRadioRow({ rowId, letters }: { rowId: string; letters: string[] }) {
  const [value, set] = useAnswer(rowId);
  return (
    <>
      {letters.map((letter) => (
        <td key={letter} className="border border-border px-2 py-2 text-center">
          <input
            type="radio"
            name={rowId}
            checked={value === letter}
            onChange={() => set(letter)}
            aria-label={letter}
            className="text-brand-600"
          />
        </td>
      ))}
    </>
  );
}

export function RadioGroupView({ group }: { group: RadioGroup }) {
  if (group.rows && group.optionLetters) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-foreground/[0.02]">
          {group.imageUrl ? (
            <img src={group.imageUrl} alt="Map" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-muted">
              (static map — letters printed on it)
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-base">
            <thead>
              <tr>
                <th className="border border-border bg-brand-50 px-3 py-2 text-left" />
                {group.optionLetters.map((l) => (
                  <th
                    key={l}
                    className="border border-border bg-brand-50 px-2 py-2 text-center font-semibold text-brand-700"
                  >
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap border border-border px-3 py-2 text-foreground">
                    <NumberBadge n={row.number} />
                    {row.label}
                  </td>
                  <GridRadioRow rowId={row.id} letters={group.optionLetters!} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-question)]">
      {(group.questions ?? []).map((q, i) => (
        <ConnectedRadio key={q.id} question={q} boxed={i === 0} />
      ))}
    </div>
  );
}

export function CheckboxGroupView({ group }: { group: CheckboxGroup }) {
  const [value, set] = useAnswer(group.id);
  const [from] = group.numberRange;
  return (
    <div>
      <p className="mb-2 text-base text-foreground">
        <NumberBadge n={from} boxed />
        {group.stem}
      </p>
      <CheckboxInput
        options={group.options}
        value={(value as string[]) ?? []}
        onChange={set}
        maxSelections={group.maxSelections}
      />
    </div>
  );
}

function ConnectedPrompt({
  promptId,
  number,
  text,
  options,
  boxed
}: {
  promptId: string;
  number: number;
  text: string;
  options: { id: string; text: string }[];
  boxed: boolean;
}) {
  const [value, set] = useAnswer(promptId);
  return (
    <div className="flex flex-wrap items-center gap-2 text-base text-foreground">
      <NumberBadge n={number} boxed={boxed} />
      <span className="flex-1">{text}</span>
      <SelectMatch value={value as string | null} onChange={set} options={options} />
    </div>
  );
}

function InlineSelect({
  promptId,
  options
}: {
  promptId: string;
  options: { id: string; text: string }[];
}) {
  const [value, set] = useAnswer(promptId);
  return (
    <SelectMatch value={value as string | null} onChange={set} options={options} letterOnly={false} />
  );
}

function isBareLetterBank(options: { id: string; text: string }[]): boolean {
  return options.length > 0 && options.every((o) => o.text.trim() === o.id.trim());
}

function OptionsPanel({ options }: { options: { id: string; text: string }[] }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Options</p>
      <ul className="space-y-1 text-base text-foreground">
        {options.map((o) => (
          <li key={o.id}>
            <span className="mr-1.5 font-semibold text-brand-700">{o.id}</span>
            {o.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SelectTableRow({ promptId, letters }: { promptId: string; letters: string[] }) {
  const [value, set] = useAnswer(promptId);
  return (
    <>
      {letters.map((letter) => (
        <td key={letter} className="border border-border px-2 py-2 text-center">
          <input
            type="radio"
            name={promptId}
            checked={value === letter}
            onChange={() => set(letter)}
            aria-label={letter}
            className="h-4 w-4 text-brand-600"
          />
        </td>
      ))}
    </>
  );
}

function TableSelectView({ group }: { group: SelectGroup }) {
  const letters = group.optionBank.map((o) => o.id);
  return (
    <div className="space-y-4">
      {!isBareLetterBank(group.optionBank) ? <OptionsPanel options={group.optionBank} /> : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr>
              <th className="border border-border bg-brand-50 px-3 py-2 text-left" />
              {letters.map((l) => (
                <th
                  key={l}
                  className="border border-border bg-brand-50 px-3 py-2 text-center font-semibold text-brand-700"
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.prompts.map((p) => (
              <tr key={p.id}>
                <td className="border border-border px-3 py-2 text-foreground">
                  <NumberBadge n={p.number} />
                  {p.text}
                </td>
                <SelectTableRow promptId={p.id} letters={letters} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DragSelectView({ group }: { group: SelectGroup }) {
  const hostedInPassage = useHostedInPassage(group.id);

  if (hostedInPassage) {
    return <OptionBank group={group} hint="Drag and drop the headings to the correct paragraphs in the passage." />;
  }

  if (group.paragraphs && group.paragraphs.length > 0) {
    const byNumber = new Map(group.prompts.map((p) => [p.number, p] as const));
    return (
      <div className="space-y-4">
        <div className="space-y-3 text-base leading-loose text-foreground">
          {group.paragraphs.map((para, i) => (
            <p key={i}>
              {para.split(/(\{\{\d+\}\})/g).map((part, j) => {
                const m = part.match(/^\{\{(\d+)\}\}$/);
                if (!m) return <span key={j}>{part}</span>;
                const prompt = byNumber.get(Number(m[1]));
                if (!prompt) {
                  return (
                    <span key={j} className="text-muted">
                      {part}
                    </span>
                  );
                }
                return (
                  <AnswerSlot key={j} group={group} promptId={prompt.id} number={prompt.number} />
                );
              })}
            </p>
          ))}
        </div>
        <OptionBank group={group} hint="Drag and drop an option to fill in each blank." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="flex flex-col gap-[var(--space-question)]">
        {group.prompts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 text-base text-foreground">
            <span className="mr-1 text-foreground">•</span>
            <span>{p.text}</span>
            <AnswerSlot group={group} promptId={p.id} number={p.number} />
          </li>
        ))}
      </ul>
      <OptionBank group={group} hint="Drag and drop an option to fill in each blank." />
    </div>
  );
}

export function SelectGroupView({ group }: { group: SelectGroup }) {
  if (group.renderAs === "table" && group.optionBank.length > 0) {
    return <TableSelectView group={group} />;
  }

  if (group.renderAs === "drag" && group.optionBank.length > 0) {
    return <DragSelectView group={group} />;
  }

  if (group.paragraphs && group.paragraphs.length > 0) {
    const byNumber = new Map(group.prompts.map((p) => [p.number, p] as const));
    return (
      <div className="space-y-4">
        {group.optionBank.length > 0 && !isBareLetterBank(group.optionBank) ? (
          <OptionsPanel options={group.optionBank} />
        ) : null}
        <div className="space-y-3 text-base leading-loose text-foreground">
          {group.paragraphs.map((para, i) => (
            <p key={i}>
              {para.split(/(\{\{\d+\}\})/g).map((part, j) => {
                const m = part.match(/^\{\{(\d+)\}\}$/);
                if (m) {
                  const prompt = byNumber.get(Number(m[1]));
                  if (prompt) {
                    return (
                      <InlineSelect key={j} promptId={prompt.id} options={group.optionBank} />
                    );
                  }
                  return (
                    <span key={j} className="text-muted">
                      {part}
                    </span>
                  );
                }
                return <span key={j}>{part}</span>;
              })}
            </p>
          ))}
        </div>
      </div>
    );
  }

  const prompts = (
    <div className="flex flex-col gap-[var(--space-question)]">
      {group.prompts.map((p, i) => (
        <ConnectedPrompt
          key={p.id}
          promptId={p.id}
          number={p.number}
          text={p.text}
          options={group.optionBank}
          boxed={i === 0}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {!group.fixedLabels && group.optionBank.length > 0 && !isBareLetterBank(group.optionBank) ? (
        <OptionsPanel options={group.optionBank} />
      ) : null}
      {group.imageUrl ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-foreground/[0.02]">
            <img
              src={group.imageUrl}
              alt="Map / diagram"
              className="h-full w-full object-contain"
            />
          </div>
          {prompts}
        </div>
      ) : (
        prompts
      )}
    </div>
  );
}
