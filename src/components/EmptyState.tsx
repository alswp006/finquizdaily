import { Paragraph, Spacing, Button } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  testId: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

// 오답노트/랭킹처럼 목록이 0건일 때 공통으로 쓰는 빈 상태 화면.
export default function EmptyState({
  testId,
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "64px 24px",
      }}
    >
      <Icon size={40} color={adaptive.grey400} />
      <Spacing size={16} />
      <Paragraph typography="st4" textAlign="center" color={adaptive.grey900}>
        {title}
      </Paragraph>
      {description ? (
        <>
          <Spacing size={4} />
          <Paragraph typography="st9" textAlign="center" color={adaptive.grey600}>
            {description}
          </Paragraph>
        </>
      ) : null}
      {actionLabel && onAction ? (
        <>
          <Spacing size={20} />
          <Button display="block" variant="weak" onClick={onAction}>
            {actionLabel}
          </Button>
        </>
      ) : null}
    </div>
  );
}
