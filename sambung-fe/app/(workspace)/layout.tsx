import type { ReactNode } from "react";
import { AppShell } from "@/components/layouts/AppShell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell allowedRoles={["petani", "pembeli", "admin"]}>{children}</AppShell>;
}
