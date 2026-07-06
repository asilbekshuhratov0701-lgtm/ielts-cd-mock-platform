export type QuestionType =
  | "mc_single"
  | "mc_multiple"
  | "true_false_not_given"
  | "yes_no_not_given"
  | "matching_information"
  | "matching_headings"
  | "matching_features"
  | "matching_sentence_endings"
  | "note_completion"
  | "summary_completion"
  | "table_completion"
  | "form_completion"
  | "flowchart_completion"
  | "sentence_completion"
  | "short_answer"
  | "map_labelling"
  | "diagram_labelling";

export type InputKind = "radio" | "checkbox" | "gap" | "select" | "essay";

export type GapLayout =
  | "note"
  | "summary"
  | "table"
  | "form"
  | "flowchart"
  | "sentence"
  | "image";

export const HELP_TEXT =
  "Use TAB to navigate between the options. Press enter or space to see options. Your answer is saved continuously.";

export interface BaseGroup {
  id: string;
  questionType: QuestionType;
  inputKind: InputKind;
  instructions: string;
  numberRange: [number, number];
  title?: string;
  helpText?: string;
}

export interface RadioQuestion {
  id: string;
  number: number;
  stem: string;
  options: { value: string; label: string }[];
}

export interface RadioRow {
  id: string;
  number: number;
  label: string;
}

export interface RadioGroup extends BaseGroup {
  inputKind: "radio";
  questions?: RadioQuestion[];
  imageUrl?: string;
  optionLetters?: string[];
  rows?: RadioRow[];
}

export interface CheckboxGroup extends BaseGroup {
  inputKind: "checkbox";
  stem: string;
  options: { value: string; label: string }[];
  maxSelections: number;
}

export interface Gap {
  id: string;
  number: number;
  wordLimit: number;
  allowNumber: boolean;
}

export type NoteItem = string | { text: string; sub?: boolean; plain?: boolean };
export interface NoteContent {
  title?: string;
  sections: { heading?: string; items: NoteItem[] }[];
}
export interface SummaryContent {
  title?: string;
  paragraphs: string[];
}
export interface TableContent {
  rows: string[][];
  headerRow?: boolean;
}
export interface FlowchartContent {
  nodes: { id: string; text: string }[];
}
export interface FormContent {
  rows: { label: string; value: string }[];
}
export interface SentenceContent {
  sentences: string[];
}

export interface GapGroup extends BaseGroup {
  inputKind: "gap";
  layout: GapLayout;
  imageUrl?: string;
  content: unknown;
  gaps: Gap[];
}

export interface SelectGroup extends BaseGroup {
  inputKind: "select";
  renderAs: "dropdown" | "drag";
  prompts: { id: string; number: number; text: string }[];
  optionBank: { id: string; text: string }[];
  allowReuse: boolean;
  fixedLabels?: boolean;
  paragraphs?: string[];
}

export interface EssayTask {
  id: string;
  number: number;
  prompt: string;
  minWords?: number;
  imageUrl?: string;
}

export interface EssayGroup extends BaseGroup {
  inputKind: "essay";
  tasks: EssayTask[];
}

export type QuestionGroup = RadioGroup | CheckboxGroup | GapGroup | SelectGroup | EssayGroup;

export type AnswerValue = string | string[] | null;
export type AnswersMap = Record<string, AnswerValue>;
