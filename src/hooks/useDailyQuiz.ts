import { useMemo } from "react";
import { loadQuestions, getDailyQuestions } from "@/lib/quizState";
import type { Question } from "@/lib/types";

function isValidQuestion(question: Question | null | undefined): question is Question {
  return !!question && Array.isArray(question.options) && question.options.length > 0;
}

/**
 * 오늘의 데일리 퀴즈 문항(최대 3개)을 반환한다. date를 생략하면 오늘 날짜 기준으로 고정된
 * 3문항이 나온다. 저장소가 비어 있거나 손상돼도, questions.json 항목이 옵션 없이
 * 깨져 있어도 크래시 없이 빈 배열을 반환한다.
 */
export function useDailyQuiz(date?: string): Question[] {
  return useMemo(() => {
    const questions = loadQuestions();
    if (!Array.isArray(questions) || questions.length === 0) return [];

    const validQuestions = questions.filter(isValidQuestion);
    if (validQuestions.length === 0) return [];

    const daily = date ? getDailyQuestions(validQuestions, date) : getDailyQuestions(validQuestions);
    return Array.isArray(daily) ? daily : [];
  }, [date]);
}
