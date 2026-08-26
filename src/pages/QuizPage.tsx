import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, FixedBottomCTA } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { loadQuestions, loadQuizState } from "@/lib/quizState";
import { setItem } from "@/lib/storage";
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

  const question = questions?.[index];

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
    if (!selectedId) return;

    const selectedOption = options.find((option: QuestionOption) => option.id === selectedId);
    if (selectedOption && !selectedOption.isCorrect) {
      const state = loadQuizState();
      const wrongAnswers = state.wrongAnswers ?? [];
      setItem(QUIZ_STATE_KEY, {
        ...state,
        wrongAnswers: [
          ...wrongAnswers,
          {
            questionId: question.id,
            date: new Date().toISOString().slice(0, 10),
            selectedOptionId: selectedId,
          },
        ],
      });
    }

    const nextIndex = index + 1;
    if (nextIndex >= (questions?.length ?? 0)) {
      navigate("/result");
    } else {
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
      <FixedBottomCTA disabled={!selectedId} onClick={handleNext}>
        다음 문제
      </FixedBottomCTA>
    </div>
  );
}
