import type { ReactNode } from "react";
import { RoleGuard } from "@/components/layouts/RoleGuard";

export default function FarmerLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["petani"]}>{children}</RoleGuard>;
}
