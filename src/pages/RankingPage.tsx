import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, Loader } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import EmptyState from "@/components/EmptyState";
import { loadQuizState } from "@/lib/quizState";
import type { WeeklyRecord } from "@/lib/types";

interface RankingEntry {
  rank: number;
  label: string;
  count: number;
}

// 랭킹 API 엔드포인트 배포 전까지는 값이 비어 있어 항상 로컬 모드로 폴백한다.
const RANKING_API_URL: string = import.meta.env.VITE_LEADERBOARD_API_BASE ?? "";

function toLocalEntries(records: WeeklyRecord[]): RankingEntry[] {
  return [...records]
    .sort((a, b) => b.count - a.count)
    .map((record, i) => ({ rank: i + 1, label: `${record.week}주차`, count: record.count }));
}

export default function RankingPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const localEntries = toLocalEntries(loadQuizState().weeklyRecords ?? []);

    if (!RANKING_API_URL || typeof fetch !== "function") {
      setEntries(localEntries);
      setIsLocalMode(true);
      setIsLoading(false);
      return;
    }

    fetch(RANKING_API_URL)
      .then((response) => {
        if (!response.ok) throw new Error("ranking request failed");
        return response.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const remoteEntries = Array.isArray((data as { entries?: unknown })?.entries)
          ? ((data as { entries: RankingEntry[] }).entries ?? [])
          : [];
        if (remoteEntries.length > 0) {
          setEntries(remoteEntries);
          setIsLocalMode(false);
        } else {
          setEntries(localEntries);
          setIsLocalMode(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEntries(localEntries);
        setIsLocalMode(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Top
        title="랭킹"
        right={
          <button
            type="button"
            onClick={() => navigate("/result")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <Paragraph typography="st9" color={adaptive.blue500}>
              결과로
            </Paragraph>
          </button>
        }
      />
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader />
        </div>
      ) : (
        <>
          {isLocalMode ? (
            <div data-testid="ranking-local-mode">
              <Spacing size={8} />
              <Paragraph typography="st9" color={adaptive.grey600}>
                이 기기에 저장된 기록으로 보여드려요
              </Paragraph>
            </div>
          ) : null}
          <Spacing size={12} />
          {entries.length === 0 ? (
            <EmptyState
              testId="ranking-empty"
              title="랭킹 기록이 아직 없어요"
              description="이번 주 퀴즈를 풀면 순위가 생겨요"
            />
          ) : (
            entries.map((entry) => (
              <ListRow
                key={entry.rank}
                data-testid="ranking-item"
                contents={
                  <div>
                    <Paragraph typography="t5">{`${entry.rank}위`}</Paragraph>
                    <Paragraph typography="st9" color={adaptive.grey600}>
                      {entry.label}
                    </Paragraph>
                  </div>
                }
                right={<Paragraph typography="t7">{`${entry.count}문제`}</Paragraph>}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
