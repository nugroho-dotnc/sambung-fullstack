import type { ReactNode } from "react";
import { AppShell } from "@/components/layouts/AppShell";

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return <AppShell allowedRoles={["admin"]}>{children}</AppShell>;
}
