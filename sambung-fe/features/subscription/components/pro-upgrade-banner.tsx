"use client";

import { usePathname } from "next/navigation";
import { Crown, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { buildSubscriptionUpgradeHref } from "../domain/return-path";

interface ProUpgradeBannerProps {
  title: string;
  description: string;
  compact?: boolean;
  ctaLabel?: string;
  fromPath?: string;
}

export function ProUpgradeBanner({
  title,
  description,
  compact = false,
  ctaLabel = "Aktifkan Produsen Pro — Rp99.000/30 hari",
  fromPath,
}: ProUpgradeBannerProps) {
  const pathname = usePathname();
  const upgradeHref = buildSubscriptionUpgradeHref(fromPath ?? pathname);

  return (
    <div
      className={`rounded-2xl border border-amber-300/80 bg-amber-50/75 dark:border-amber-800/70 dark:bg-amber-950/30 ${
        compact ? "p-4" : "p-5 sm:p-6"
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
          <Lock className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
            <span>{title}</span>
          </p>
          <p className="text-xs text-amber-900/90 dark:text-amber-200/85 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <ButtonLink
        href={upgradeHref}
        size={compact ? "sm" : "default"}
        className="shrink-0 min-h-9 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
      >
        <Crown className="w-3.5 h-3.5 mr-1.5" />
        {ctaLabel}
      </ButtonLink>
    </div>
  );
}
