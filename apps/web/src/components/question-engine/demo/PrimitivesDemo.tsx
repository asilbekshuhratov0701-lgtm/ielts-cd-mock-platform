"use client";

import { AnswersProvider, useAnswer, useAnswers } from "../answers-store";
import { CheckboxInput, GapInput, RadioInput, SelectMatch } from "../primitives";

const TFNG = [
  { id: "TRUE", text: "TRUE" },
  { id: "FALSE", text: "FALSE" },
  { id: "NOT_GIVEN", text: "NOT GIVEN" }
];

const HEADINGS = [
  { id: "i", text: "i — A surprising origin" },
  { id: "ii", text: "ii — Commercial uses" },
  { id: "iii", text: "iii — Environmental impact" },
  { id: "iv", text: "iv — Future research" }
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

function GapDemo() {
  const [v, set] = useAnswer("gap-1");
  return (
    <p className="text-sm leading-loose text-foreground">
      The first public museum opened in{" "}
      <GapInput
        number={1}
        value={(v as string) ?? ""}
        onChange={set}
        wordLimit={1}
        allowNumber
      />{" "}
      and was funded by a group of local{" "}
      <GapInput number={2} value="" onChange={() => {}} wordLimit={2} allowNumber={false} />.
    </p>
  );
}

function RadioDemo() {
  const [v, set] = useAnswer("q-3");
  return (
    <RadioInput
      name="q-3"
      value={v as string | null}
      onChange={set}
      options={[
        { value: "A", label: "It was built for a wealthy family." },
        { value: "B", label: "It replaced an older structure." },
        { value: "C", label: "It was originally a place of worship." }
      ]}
    />
  );
}

function CheckboxDemo() {
  const [v, set] = useAnswer("q-4");
  return (
    <CheckboxInput
      value={(v as string[]) ?? []}
      onChange={set}
      maxSelections={2}
      options={[
        { value: "A", label: "improved transport links" },
        { value: "B", label: "lower production costs" },
        { value: "C", label: "a larger workforce" },
        { value: "D", label: "government subsidies" },
        { value: "E", label: "new technology" }
      ]}
    />
  );
}

function SelectFixedDemo() {
  const [v, set] = useAnswer("q-5");
  return (
    <div className="flex items-center gap-3 text-sm text-foreground">
      <span>The technique was invented in the 19th century.</span>
      <SelectMatch value={v as string | null} onChange={set} options={TFNG} />
    </div>
  );
}

function SelectMatchDemo() {
  const [v, set] = useAnswer("q-6");
  return (
    <div className="flex items-center gap-3 text-sm text-foreground">
      <span className="font-semibold text-brand-700">Paragraph A</span>
      <SelectMatch value={v as string | null} onChange={set} options={HEADINGS} />
    </div>
  );
}

function StoreView() {
  const answers = useAnswers();
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-foreground/[0.03] p-4 text-xs text-foreground">
      {JSON.stringify(answers, null, 2)}
    </pre>
  );
}

export function PrimitivesDemo() {
  return (
    <AnswersProvider>
      <div className="grid gap-[var(--space-group)] lg:grid-cols-2">
        <div className="flex flex-col gap-[var(--space-question)]">
          <Panel title="gap — inline word-limited input">
            <GapDemo />
          </Panel>
          <Panel title="radio — single select">
            <RadioDemo />
          </Panel>
          <Panel title="checkbox — multi select (max 2)">
            <CheckboxDemo />
          </Panel>
          <Panel title="select (dropdown, fixed labels) — True/False/Not Given">
            <SelectFixedDemo />
          </Panel>
          <Panel title="select (dropdown, option bank) — matching headings">
            <SelectMatchDemo />
          </Panel>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="answers store (autosaves on change)">
            <StoreView />
          </Panel>
        </div>
      </div>
    </AnswersProvider>
  );
}
