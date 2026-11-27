/**
 * Validates and normalizes an internal workspace return path for subscription upgrade flows.
 */
export function sanitizeSubscriptionReturnPath(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }
  const pathOnly = trimmed.split(/[?#]/, 1)[0];
  if (pathOnly === "/langganan" || pathOnly.startsWith("/langganan/")) {
    return null;
  }
  return trimmed;
}

/**
 * Builds the /langganan href while preserving a safe internal ?from= return path.
 */
export function buildSubscriptionUpgradeHref(
  fromPath?: string | null
): string {
  const safePath = sanitizeSubscriptionReturnPath(fromPath);
  if (!safePath) return "/langganan";
  return `/langganan?from=${encodeURIComponent(safePath)}`;
}
