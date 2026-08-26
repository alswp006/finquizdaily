import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, FixedBottomCTA } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import EmptyState from "@/components/EmptyState";
import { loadQuestions, loadQuizState } from "@/lib/quizState";

interface ResultRouteState {
  correctCount?: number;
}

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const questions = loadQuestions();
  const total = questions?.length ?? 0;
  const routeState = (location.state ?? {}) as ResultRouteState;
  const wrongCount = loadQuizState().wrongAnswers?.length ?? 0;
  const correctCount = routeState.correctCount ?? Math.max(total - wrongCount, 0);

  if (total === 0) {
    return (
      <>
        <Top title="결과" />
        <EmptyState
          testId="result-empty"
          title="채점할 문제가 없어요"
          description="퀴즈를 먼저 풀어주세요"
          actionLabel="퀴즈 풀기"
          onAction={() => navigate("/quiz", { state: { index: 0 } })}
        />
      </>
    );
  }

  return (
    <div data-testid="result-summary">
      <Top title="결과" />
      <Spacing size={40} />
      <Paragraph typography="t2" textAlign="center">
        {`${total}문제 중 ${correctCount}문제를 맞혔어요`}
      </Paragraph>
      <Spacing size={24} />
      <ListRow
        data-testid="result-ranking-entry"
        contents={<Paragraph typography="t5">이번 주 랭킹 보기</Paragraph>}
        onClick={() => navigate("/ranking")}
        withTouchEffect
        right={
          <Paragraph typography="st9" color={adaptive.grey600}>
            {">"}
          </Paragraph>
        }
      />
      <FixedBottomCTA onClick={() => navigate("/wrong-note")}>오답노트 보기</FixedBottomCTA>
    </div>
  );
}
