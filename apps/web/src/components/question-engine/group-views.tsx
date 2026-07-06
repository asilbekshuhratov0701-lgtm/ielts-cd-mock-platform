"use client";

import { useAnswer } from "./answers-store";
import { CheckboxInput, RadioInput, SelectMatch } from "./primitives";
import { NumberBadge } from "./QuestionGroupFrame";
import type { CheckboxGroup, RadioGroup, RadioQuestion, SelectGroup } from "./types";

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
  return <SelectMatch value={value as string | null} onChange={set} options={options} />;
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

export function SelectGroupView({ group }: { group: SelectGroup }) {
  if (group.paragraphs && group.paragraphs.length > 0) {
    const byNumber = new Map(group.prompts.map((p) => [p.number, p] as const));
    return (
      <div className="space-y-4">
        {group.optionBank.length > 0 ? <OptionsPanel options={group.optionBank} /> : null}
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

  return (
    <div className="space-y-4">
      {!group.fixedLabels && group.optionBank.length > 0 ? (
        <OptionsPanel options={group.optionBank} />
      ) : null}
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
    </div>
  );
}
