import type { QuestionGroup } from "../types";

export const LISTENING_GROUPS: QuestionGroup[] = [
  {
    id: "g-form",
    questionType: "form_completion",
    inputKind: "gap",
    layout: "form",
    instructions: "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
    numberRange: [1, 3],
    title: "Library Membership Form",
    content: {
      rows: [
        { label: "Surname", value: "{{1}}" },
        { label: "Date of birth", value: "{{2}} May 1998" },
        { label: "Membership fee", value: "£{{3}} per year" }
      ]
    },
    gaps: [
      { id: "a-1", number: 1, wordLimit: 1, allowNumber: false },
      { id: "a-2", number: 2, wordLimit: 1, allowNumber: true },
      { id: "a-3", number: 3, wordLimit: 1, allowNumber: true }
    ]
  },
  {
    id: "g-mc1",
    questionType: "mc_single",
    inputKind: "radio",
    instructions: "Choose the correct letter, A, B or C.",
    numberRange: [4, 4],
    questions: [
      {
        id: "a-4",
        number: 4,
        stem: "Why is the speaker giving the talk?",
        options: [
          { value: "A", label: "to advertise a new service" },
          { value: "B", label: "to explain a change of opening hours" },
          { value: "C", label: "to introduce members of staff" }
        ]
      }
    ]
  },
  {
    id: "g-mc2",
    questionType: "mc_multiple",
    inputKind: "checkbox",
    instructions: "Choose TWO letters, A–E.",
    numberRange: [5, 6],
    stem: "Which TWO facilities are currently closed for repair?",
    maxSelections: 2,
    options: [
      { value: "A", label: "the café" },
      { value: "B", label: "the rooftop terrace" },
      { value: "C", label: "the study rooms" },
      { value: "D", label: "the car park" },
      { value: "E", label: "the children's section" }
    ]
  },
  {
    id: "g-map",
    questionType: "map_labelling",
    inputKind: "radio",
    instructions: "Label the map below. Choose the correct letter, A–F, for each place.",
    numberRange: [7, 9],
    title: "Town Centre",
    optionLetters: ["A", "B", "C", "D", "E", "F"],
    rows: [
      { id: "a-7", number: 7, label: "Tourist office" },
      { id: "a-8", number: 8, label: "Bus station" },
      { id: "a-9", number: 9, label: "Museum" }
    ]
  },
  {
    id: "g-note",
    questionType: "note_completion",
    inputKind: "gap",
    layout: "note",
    instructions: "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
    numberRange: [10, 11],
    content: {
      title: "Field Trip Notes",
      sections: [
        {
          heading: "Before the trip",
          items: ["Bring a waterproof {{10}}.", "Meet at the main entrance."]
        },
        {
          heading: "During the trip",
          items: ["Samples are collected near the {{11}}.", "Lunch is provided."]
        }
      ]
    },
    gaps: [
      { id: "a-10", number: 10, wordLimit: 2, allowNumber: false },
      { id: "a-11", number: 11, wordLimit: 2, allowNumber: false }
    ]
  }
];

export const READING_GROUPS: QuestionGroup[] = [
  {
    id: "g-tfng",
    questionType: "true_false_not_given",
    inputKind: "select",
    renderAs: "dropdown",
    fixedLabels: true,
    allowReuse: true,
    instructions:
      "Do the following statements agree with the information in the passage? Choose TRUE, FALSE or NOT GIVEN.",
    numberRange: [1, 3],
    prompts: [
      { id: "r-1", number: 1, text: "The technique was first used in Europe." },
      { id: "r-2", number: 2, text: "Production costs fell after 1850." },
      { id: "r-3", number: 3, text: "The author worked in the industry." }
    ],
    optionBank: [
      { id: "TRUE", text: "TRUE" },
      { id: "FALSE", text: "FALSE" },
      { id: "NOT_GIVEN", text: "NOT GIVEN" }
    ]
  },
  {
    id: "g-headings",
    questionType: "matching_headings",
    inputKind: "select",
    renderAs: "dropdown",
    allowReuse: false,
    instructions: "Choose the correct heading for each paragraph from the list of headings.",
    numberRange: [4, 6],
    prompts: [
      { id: "r-4", number: 4, text: "Paragraph A" },
      { id: "r-5", number: 5, text: "Paragraph B" },
      { id: "r-6", number: 6, text: "Paragraph C" }
    ],
    optionBank: [
      { id: "i", text: "A surprising discovery" },
      { id: "ii", text: "Early commercial uses" },
      { id: "iii", text: "Environmental concerns" },
      { id: "iv", text: "Plans for the future" }
    ]
  },
  {
    id: "g-summary",
    questionType: "summary_completion",
    inputKind: "gap",
    layout: "summary",
    instructions: "Complete the summary below. Write ONE WORD ONLY for each answer.",
    numberRange: [7, 9],
    content: {
      title: "Summary",
      paragraph:
        "The material was originally valued for its {{7}}, but later became important in {{8}}. By the end of the century it was being exported to {{9}} markets around the world."
    },
    gaps: [
      { id: "r-7", number: 7, wordLimit: 1, allowNumber: false },
      { id: "r-8", number: 8, wordLimit: 1, allowNumber: false },
      { id: "r-9", number: 9, wordLimit: 1, allowNumber: false }
    ]
  },
  {
    id: "g-table",
    questionType: "table_completion",
    inputKind: "gap",
    layout: "table",
    instructions: "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
    numberRange: [10, 12],
    content: {
      headerRow: true,
      rows: [
        ["Stage", "Detail"],
        ["Harvesting", "Done by {{10}}"],
        ["Processing", "Leaves lose their {{11}}"],
        ["Packing", "Stored in {{12}}"]
      ]
    },
    gaps: [
      { id: "r-10", number: 10, wordLimit: 2, allowNumber: false },
      { id: "r-11", number: 11, wordLimit: 2, allowNumber: false },
      { id: "r-12", number: 12, wordLimit: 2, allowNumber: false }
    ]
  },
  {
    id: "g-short",
    questionType: "short_answer",
    inputKind: "gap",
    layout: "sentence",
    instructions: "Answer the questions below. Write NO MORE THAN THREE WORDS for each answer.",
    numberRange: [13, 14],
    content: {
      sentences: [
        "What did early researchers use to measure the effect? {{13}}",
        "Where was the first factory built? {{14}}"
      ]
    },
    gaps: [
      { id: "r-13", number: 13, wordLimit: 3, allowNumber: true },
      { id: "r-14", number: 14, wordLimit: 3, allowNumber: false }
    ]
  },
  {
    id: "g-flow",
    questionType: "flowchart_completion",
    inputKind: "gap",
    layout: "flowchart",
    instructions: "Complete the flow-chart below. Write ONE WORD ONLY for each answer.",
    numberRange: [15, 16],
    content: {
      nodes: [
        { id: "n1", text: "Collect the raw {{15}}" },
        { id: "n2", text: "Heat and filter the mixture" },
        { id: "n3", text: "Add a {{16}} to set the shape" },
        { id: "n4", text: "Cool and package" }
      ]
    },
    gaps: [
      { id: "r-15", number: 15, wordLimit: 1, allowNumber: false },
      { id: "r-16", number: 16, wordLimit: 1, allowNumber: false }
    ]
  },
  {
    id: "g-diagram",
    questionType: "diagram_labelling",
    inputKind: "gap",
    layout: "image",
    instructions: "Label the diagram below. Write ONE WORD ONLY for each answer.",
    numberRange: [17, 18],
    content: {
      items: ["17. The outer {{17}}", "18. The central {{18}}"]
    },
    gaps: [
      { id: "r-17", number: 17, wordLimit: 1, allowNumber: false },
      { id: "r-18", number: 18, wordLimit: 1, allowNumber: false }
    ]
  },
  {
    id: "g-ynng",
    questionType: "yes_no_not_given",
    inputKind: "select",
    renderAs: "dropdown",
    fixedLabels: true,
    allowReuse: true,
    instructions:
      "Do the following statements agree with the views of the writer? Choose YES, NO or NOT GIVEN.",
    numberRange: [19, 20],
    prompts: [
      { id: "r-19", number: 19, text: "The writer believes the method is reliable." },
      { id: "r-20", number: 20, text: "The writer recommends further study." }
    ],
    optionBank: [
      { id: "YES", text: "YES" },
      { id: "NO", text: "NO" },
      { id: "NOT_GIVEN", text: "NOT GIVEN" }
    ]
  },
  {
    id: "g-endings",
    questionType: "matching_sentence_endings",
    inputKind: "select",
    renderAs: "dropdown",
    allowReuse: false,
    instructions: "Complete each sentence with the correct ending, A–E.",
    numberRange: [21, 22],
    prompts: [
      { id: "r-21", number: 21, text: "The first experiments showed that…" },
      { id: "r-22", number: 22, text: "Later studies confirmed that…" }
    ],
    optionBank: [
      { id: "A", text: "the results were inconsistent." },
      { id: "B", text: "temperature was the key factor." },
      { id: "C", text: "the effect could be reversed." },
      { id: "D", text: "no further work was needed." },
      { id: "E", text: "cost remained the main barrier." }
    ]
  }
];
