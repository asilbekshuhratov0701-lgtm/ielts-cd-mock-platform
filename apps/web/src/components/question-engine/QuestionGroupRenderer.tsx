"use client";

import { DragBoundary } from "./dnd";
import { GapGroupView } from "./GapGroupView";
import { CheckboxGroupView, EssayGroupView, RadioGroupView, SelectGroupView } from "./group-views";
import { QuestionGroupFrame } from "./QuestionGroupFrame";
import type { QuestionGroup } from "./types";

function GroupBody({ group }: { group: QuestionGroup }) {
  switch (group.inputKind) {
    case "radio":
      return <RadioGroupView group={group} />;
    case "checkbox":
      return <CheckboxGroupView group={group} />;
    case "gap":
      return <GapGroupView group={group} />;
    case "select":
      return <SelectGroupView group={group} />;
    case "essay":
      return <EssayGroupView group={group} />;
  }
}

export function QuestionGroupRenderer({ group }: { group: QuestionGroup }) {
  return (
    <DragBoundary>
      <QuestionGroupFrame group={group}>
        <GroupBody group={group} />
      </QuestionGroupFrame>
    </DragBoundary>
  );
}
