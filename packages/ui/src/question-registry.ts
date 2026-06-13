/**
 * Question-type registry shape.
 *
 * Each official IELTS question type maps to a candidate-facing renderer and an
 * admin-facing editor. Adding a new type = adding one entry here (no engine changes).
 * The concrete React components are filled in during implementation; this file defines
 * the contract and an empty registry so the exam runner can look renderers up by type.
 */
import type { ComponentType } from "react";
import type { QuestionTypeKey } from "@ielts/core";

export interface QuestionRendererProps {
  groupId: string;
  /** Type-specific layout payload (table cells, heading list, diagram anchors, ...). */
  layout: unknown;
  questions: ReadonlyArray<{ id: string; number: number; prompt: string }>;
  /** Current candidate responses keyed by questionId. */
  value: Record<string, unknown>;
  onChange: (questionId: string, response: unknown) => void;
  readOnly?: boolean;
}

export interface QuestionEditorProps {
  groupId: string;
  layout: unknown;
  onLayoutChange: (layout: unknown) => void;
}

export interface QuestionTypeEntry {
  type: QuestionTypeKey;
  label: string;
  Renderer: ComponentType<QuestionRendererProps>;
  Editor: ComponentType<QuestionEditorProps>;
}

export type QuestionRegistry = Partial<Record<QuestionTypeKey, QuestionTypeEntry>>;

/** Populated during implementation as renderers/editors are built. */
export const questionRegistry: QuestionRegistry = {};

export function getQuestionEntry(type: QuestionTypeKey): QuestionTypeEntry | undefined {
  return questionRegistry[type];
}
