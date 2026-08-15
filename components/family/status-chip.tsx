import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
  ShieldAlert,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

export type StatusChipTone = "confirmed" | "action" | "waiting" | "changed" | "critical" | "neutral";

const toneIcons: Record<StatusChipTone, LucideIcon> = {
  confirmed: CheckCircle2,
  action: CircleAlert,
  waiting: Clock3,
  changed: RefreshCw,
  critical: ShieldAlert,
  neutral: Clock3
};

export function StatusChip({
  tone,
  children,
  className = ""
}: {
  tone: StatusChipTone;
  children: ReactNode;
  className?: string;
}) {
  const Icon = toneIcons[tone];
  return (
    <span className={`family-status-chip family-status-chip-${tone} ${className}`.trim()} data-tone={tone}>
      <Icon aria-hidden="true" size={15} strokeWidth={2.2} />
      <span>{children}</span>
    </span>
  );
}
