export interface SectionIntroCopy {
  title: string;
  time: string;
  instructions: string[];
  information: string[];
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function formatDuration(totalSec: number): string {
  const minutes = Math.round(totalSec / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = hours === 1 ? "1 hour" : `${hours} hours`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} minutes`;
}

export function sectionIntroCopy({
  module,
  durationSec,
  totalQuestions,
  sectionCount
}: {
  module: string;
  durationSec: number;
  totalQuestions: number;
  sectionCount: number;
}): SectionIntroCopy {
  const duration = formatDuration(durationSec);

  if (module === "listening") {
    return {
      title: "IELTS Listening",
      time: `Approximately ${duration}`,
      instructions: [
        "Answer **all** the questions.",
        "You can change your answers at any time during the test."
      ],
      information: [
        `There are ${totalQuestions} questions in this test.`,
        "Each question carries one mark.",
        `There are ${numberWord(sectionCount)} parts to the test.`,
        "Please note you will only hear each part once.",
        "For each part of the test there will be time for you to look through the questions and time for you to check your answers."
      ]
    };
  }

  if (module === "writing") {
    return {
      title: "IELTS Academic Writing",
      time: duration,
      instructions: [
        "Answer **both** parts.",
        "You can change your answers at any time during the test."
      ],
      information: [
        "There are two parts in this test.",
        "Part 2 contributes twice as much as Part 1 to the writing score.",
        "The test clock will show you when there are 10 minutes and 5 minutes remaining."
      ]
    };
  }

  return {
    title: "IELTS Academic Reading",
    time: duration,
    instructions: [
      "Answer **all** the questions.",
      "You can change your answers at any time during the test."
    ],
    information: [
      `There are ${totalQuestions} questions in this test.`,
      "Each question carries one mark.",
      `There are ${numberWord(sectionCount)} parts to the test.`,
      "The test clock will show you when there are 10 minutes and 5 minutes remaining."
    ]
  };
}
