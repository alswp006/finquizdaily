// 도메인 타입 — 모든 화면/로직은 여기서 import한다 (재정의 금지)

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
  explanation?: string;
}

export interface DailyProgress {
  date: string;
  count: number;
  correctCount: number;
}

export interface WrongAnswer {
  questionId: string;
  date: string;
  selectedOptionId: string;
}

export interface WeeklyRecord {
  week: number;
  count: number;
}

// 저장소에서 읽은 값은 손상·부분 스키마일 수 있어 컬렉션 필드를 optional로 둔다.
// getItem()이 런타임에 항상 배열로 정규화해 채운다 — src/lib/storage.ts 참조.
export interface QuizState {
  completed: boolean;
  dailyProgress?: DailyProgress[];
  wrongAnswers?: WrongAnswer[];
  weeklyRecords?: WeeklyRecord[];
}
