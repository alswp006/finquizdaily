import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, FixedBottomCTA } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { loadQuestions, loadQuizState } from "@/lib/quizState";
import { setItem } from "@/lib/storage";
import { getTodayDateString, weekKey } from "@/lib/date";
import EmptyState from "@/components/EmptyState";
import type { QuestionOption } from "@/lib/types";

const QUIZ_STATE_KEY = "quiz-state";

interface QuizRouteState {
  index?: number;
}

export default function QuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const questions = loadQuestions();
  const routeState = (location.state ?? {}) as QuizRouteState;
  const index = routeState.index ?? 0;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const question = questions?.[index];

  // 같은 "/quiz" 경로에서 문항만 바뀌는 경우 컴포넌트가 리마운트되지 않는다 —
  // 문항이 바뀔 때마다 선택·제출 상태를 명시적으로 리셋해야 CTA가 다시 활성화된다.
  useEffect(() => {
    setSelectedId(null);
    setIsSubmitting(false);
  }, [index]);

  if (!question) {
    return (
      <div data-testid="quiz-empty">
        <Top title="퀴즈" />
        <EmptyState
          testId="quiz-empty-state"
          title="더 풀 문제가 없어요"
          description="오늘 준비된 문제를 모두 확인했어요"
          actionLabel="처음으로"
          onAction={() => navigate("/quiz", { state: { index: 0 } })}
        />
      </div>
    );
  }

  const options = question.options ?? [];

  const handleNext = () => {
    if (!selectedId || isSubmitting) return;
    setIsSubmitting(true);

    const selectedOption = options.find((option: QuestionOption) => option.id === selectedId);
    const isCorrect = !!selectedOption?.isCorrect;
    const state = loadQuizState();

    // 같은 문항을 여러 번 틀려도 오답노트에는 최신 한 건만 남긴다(중복 누적 방지).
    let wrongAnswers = state.wrongAnswers ?? [];
    if (!isCorrect) {
      wrongAnswers = [
        ...wrongAnswers.filter((wrong) => wrong.questionId !== question.id),
        {
          questionId: question.id,
          date: getTodayDateString(),
          selectedOptionId: selectedId,
        },
      ];
    }

    const newCorrectCount = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(newCorrectCount);

    const nextIndex = index + 1;
    const isLastQuestion = nextIndex >= (questions?.length ?? 0);

    if (isLastQuestion) {
      const weeklyRecords = state.weeklyRecords ?? [];
      const currentWeek = Number(weekKey().split("W")[1]);
      const existingIndex = weeklyRecords.findIndex((record) => record.week === currentWeek);
      const nextWeeklyRecords =
        existingIndex >= 0
          ? weeklyRecords.map((record, i) =>
              i === existingIndex ? { ...record, count: record.count + newCorrectCount } : record
            )
          : [...weeklyRecords, { week: currentWeek, count: newCorrectCount }];

      setItem(QUIZ_STATE_KEY, { ...state, wrongAnswers, weeklyRecords: nextWeeklyRecords });
      navigate("/result", { state: { correctCount: newCorrectCount } });
    } else {
      if (!isCorrect) {
        setItem(QUIZ_STATE_KEY, { ...state, wrongAnswers });
      }
      navigate("/quiz", { state: { index: nextIndex } });
    }
  };

  return (
    <div data-testid="quiz-question">
      <Top title={`${index + 1}번 문제`} />
      <Spacing size={16} />
      <Paragraph typography="t4">{question.question}</Paragraph>
      <Spacing size={16} />
      {options.map((option: QuestionOption) => (
        <ListRow
          key={option.id}
          contents={<Paragraph typography="t5">{option.text}</Paragraph>}
          onClick={() => setSelectedId(option.id)}
          withTouchEffect
          border={selectedId === option.id ? "none" : "indented"}
          right={
            selectedId === option.id ? (
              <Paragraph typography="st9" color={adaptive.blue500}>
                선택됨
              </Paragraph>
            ) : undefined
          }
        />
      ))}
      <FixedBottomCTA disabled={!selectedId || isSubmitting} onClick={handleNext}>
        다음 문제
      </FixedBottomCTA>
    </div>
  );
}
