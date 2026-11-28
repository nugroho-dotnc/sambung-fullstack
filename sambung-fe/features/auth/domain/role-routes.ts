import type { Role } from "../schemas";

/**
 * Returns the primary workspace route for a given user role.
 */
export function getDashboardRoute(role?: Role | string | null): string {
  switch (role) {
    case "petani":
      return "/petani";
    case "pembeli":
      return "/pembeli";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

function isPathAllowedForRole(path: string, role: Role): boolean {
  if (path.startsWith("/admin")) {
    return role === "admin";
  }
  if (path.startsWith("/petani")) {
    return role === "petani";
  }
  if (path.startsWith("/pembeli")) {
    return role === "pembeli";
  }
  return true;
}

/**
 * Resolves a safe post-authentication redirect target that matches the user's role.
 */
export function resolvePostAuthPath(role: Role, requestedRedirect?: string | null): string {
  if (
    !requestedRedirect ||
    !requestedRedirect.startsWith("/") ||
    requestedRedirect.startsWith("//") ||
    /[\\\u0000-\u001F\u007F]/.test(requestedRedirect)
  ) {
    return getDashboardRoute(role);
  }

  let parsed: URL;
  try {
    parsed = new URL(requestedRedirect, "http://localhost");
  } catch {
    return getDashboardRoute(role);
  }

  if (parsed.origin !== "http://localhost" || !parsed.pathname.startsWith("/")) {
    return getDashboardRoute(role);
  }

  if (
    parsed.pathname.startsWith("/masuk") ||
    parsed.pathname.startsWith("/daftar") ||
    parsed.pathname.startsWith("/admin/masuk")
  ) {
    return getDashboardRoute(role);
  }

  const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return isPathAllowedForRole(parsed.pathname, role)
    ? safePath
    : getDashboardRoute(role);
}
