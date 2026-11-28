import type { CONTRACT_STATUS_LABELS, ContractStatus } from "@/features/contracts/domain/state-machine";

type ContractBadgeTone = (typeof CONTRACT_STATUS_LABELS)[ContractStatus]["tone"];

export const contractBadgeStyles: Record<ContractBadgeTone, string> = {
  emerald: "bg-primary/15 text-primary border border-primary/30",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/70 dark:border-blue-800/60",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60",
  danger: "bg-destructive/15 text-destructive border border-destructive/40",
  neutral: "bg-muted text-muted-foreground border border-border/60",
};
