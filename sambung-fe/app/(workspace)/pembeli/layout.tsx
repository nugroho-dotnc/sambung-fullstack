import type { ReactNode } from "react";
import { RoleGuard } from "@/components/layouts/RoleGuard";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["pembeli"]}>{children}</RoleGuard>;
}
