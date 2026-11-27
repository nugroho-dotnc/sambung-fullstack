"use client";

import type { ComponentProps, ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useCurrentUser } from "../hooks/use-auth";
import { getDashboardRoute } from "../domain/role-routes";
import type { Role } from "../schemas";

interface AuthAwareLinkButtonProps {
  guestHref?: string;
  guestLabel: ReactNode;
  authenticatedLabel?: ReactNode;
  authenticatedLabelByRole?: Partial<Record<Role, ReactNode>>;
  trailingIcon?: ReactNode;
  variant?: ComponentProps<typeof ButtonLink>["variant"];
  size?: ComponentProps<typeof ButtonLink>["size"];
  className?: string;
}

/**
 * Renders a link button that routes logged-in users directly to their workspace
 * instead of sending them back through the login screen.
 */
export function AuthAwareLinkButton({
  guestHref = "/masuk",
  guestLabel,
  authenticatedLabel = "Buka Ruang Kerja",
  authenticatedLabelByRole,
  trailingIcon,
  variant,
  size,
  className,
}: AuthAwareLinkButtonProps) {
  const { data: user } = useCurrentUser();
  const targetHref = user ? getDashboardRoute(user.role) : guestHref;
  const roleSpecificLabel = user ? authenticatedLabelByRole?.[user.role] : undefined;
  const label = user ? (roleSpecificLabel ?? authenticatedLabel) : guestLabel;

  return (
    <ButtonLink
      variant={variant}
      size={size}
      className={className}
      href={targetHref}
    >
      {label}
      {trailingIcon}
    </ButtonLink>
  );
}
