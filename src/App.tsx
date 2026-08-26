import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import WrongNotePage from './pages/WrongNotePage';
import RankingPage from './pages/RankingPage';

// 딥링크로 하위 화면(결과/랭킹/오답노트)에 곧바로 들어오면 앱 안 히스토리가 없어
// 뒤로가기 한 번에 앱 밖(검은 화면)으로 빠진다. idx===0은 라우터가 처음 본 진입점이라는
// 뜻이므로, 그럴 때만 퀴즈 홈을 그 아래에 깔아 뒤로가기가 앱 안에 머물게 한다.
function useBackSafetyNet() {
  const location = useLocation();
  const navigate = useNavigate();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (idx === 0 && location.pathname !== '/quiz' && location.pathname !== '/') {
      navigate('/quiz', { replace: true });
      navigate(location.pathname + location.search, { replace: false, state: location.state });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  useBackSafetyNet();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/quiz" replace />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/wrong-note" element={<WrongNotePage />} />
      <Route path="/ranking" element={<RankingPage />} />
      <Route path="*" element={<Navigate to="/quiz" replace />} />
    </Routes>
  );
}
