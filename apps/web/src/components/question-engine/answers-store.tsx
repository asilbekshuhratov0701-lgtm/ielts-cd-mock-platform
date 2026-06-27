"use client";

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import type { AnswersMap, AnswerValue } from "./types";

type Action = { key: string; value: AnswerValue };

function reducer(state: AnswersMap, action: Action): AnswersMap {
  if (state[action.key] === action.value) return state;
  return { ...state, [action.key]: action.value };
}

type Store = {
  answers: AnswersMap;
  setAnswer: (key: string, value: AnswerValue) => void;
};

const AnswersContext = createContext<Store | null>(null);

export function AnswersProvider({
  initial,
  children
}: {
  initial?: AnswersMap;
  children: React.ReactNode;
}) {
  const [answers, dispatch] = useReducer(reducer, initial ?? {});
  const setAnswer = useCallback((key: string, value: AnswerValue) => {
    dispatch({ key, value });
  }, []);
  const value = useMemo<Store>(() => ({ answers, setAnswer }), [answers, setAnswer]);
  return <AnswersContext.Provider value={value}>{children}</AnswersContext.Provider>;
}

function useStore(): Store {
  const ctx = useContext(AnswersContext);
  if (!ctx) throw new Error("useAnswers must be used within an AnswersProvider");
  return ctx;
}

export function useAnswers(): AnswersMap {
  return useStore().answers;
}

export function useAnswer(key: string): readonly [AnswerValue, (value: AnswerValue) => void] {
  const { answers, setAnswer } = useStore();
  const set = useCallback((value: AnswerValue) => setAnswer(key, value), [key, setAnswer]);
  return [answers[key] ?? null, set] as const;
}
