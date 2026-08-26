import { Routes, Route, Navigate } from 'react-router-dom';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import WrongNotePage from './pages/WrongNotePage';
import RankingPage from './pages/RankingPage';

export default function App() {
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
