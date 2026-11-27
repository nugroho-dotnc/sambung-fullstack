export interface SubscriptionAccessActor {
  role?: string | null;
  isPro?: boolean | null;
}

/**
 * Only active Pembeli Pro and Admin accounts may export CSV datasets.
 * Free Buyers, Petani, unauthenticated, and loading states fail closed.
 */
export function canUserExportCsv(
  user?: SubscriptionAccessActor | null,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "pembeli" && Boolean(user.isPro);
}

/**
 * Returns true when the signed-in user is a Free Buyer eligible to upgrade.
 */
export function canUserUpgradeToPro(
  user?: SubscriptionAccessActor | null,
): boolean {
  return user?.role === "pembeli" && !user.isPro;
}
