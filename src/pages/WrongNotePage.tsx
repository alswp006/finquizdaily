import { Top, Spacing, Paragraph, ListRow } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import EmptyState from "@/components/EmptyState";
import { loadQuestions, loadQuizState } from "@/lib/quizState";
import { formatDate } from "@/lib/date";

export default function WrongNotePage() {
  const state = loadQuizState();
  const questions = loadQuestions();
  const wrongAnswers = state.wrongAnswers ?? [];

  return (
    <div>
      <Top title="오답노트" />
      <Spacing size={12} />
      {wrongAnswers.length === 0 ? (
        <EmptyState
          testId="wrong-note-empty"
          title="틀린 문제가 없어요"
          description="퀴즈를 풀면 오답이 여기에 모여요"
        />
      ) : (
        wrongAnswers.map((wrong, i) => {
          const question = (questions ?? []).find((q) => q.id === wrong.questionId);
          const selected = (question?.options ?? []).find((option) => option.id === wrong.selectedOptionId);

          return (
            <ListRow
              key={`${wrong.questionId}-${wrong.date}-${i}`}
              data-testid="wrong-note-item"
              contents={
                <div>
                  <Paragraph typography="t5">{question?.question ?? "삭제된 문제예요"}</Paragraph>
                  <Paragraph typography="st9" color={adaptive.grey600}>
                    {selected
                      ? `${formatDate(wrong.date)} · 선택한 답: ${selected.text}`
                      : formatDate(wrong.date)}
                  </Paragraph>
                </div>
              }
            />
          );
        })
      )}
    </div>
  );
}
