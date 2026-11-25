"use client";

import { useState, type ReactNode } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "../hooks/use-session";
import { roleSchema, type Role } from "../schemas";
import { setDemoRole } from "@/mock/session";

const ROLE_OPTIONS = [
  { value: "petani", label: "Petani" },
  { value: "pembeli", label: "Pembeli / produsen" },
  { value: "admin", label: "Admin" },
];

export function DemoRolePanel({ children, requiredRole }: { children: ReactNode; requiredRole: Role }) {
  const { user, isPending, isDemo } = useSession();
  const queryClient = useQueryClient();
  const mutationCount = useIsMutating();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  async function switchRole(value: string) {
    setSwitching(true); setError("");
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      setDemoRole(roleSchema.parse(value));
    } catch { setError("Tidak dapat menyimpan pilihan role di browser ini."); }
    finally { setSwitching(false); }
  }
  if (!isDemo) {
    if (isPending) return <p role="status">Memuat akun Anda.</p>;
    if (!user) return <a href="/masuk">Masuk untuk membuka halaman ini</a>;
    if (user.role !== requiredRole) return <p>Halaman ini tidak tersedia untuk peran akun Anda.</p>;
    return <div key={user.id}>{children}</div>;
  }
  if (isPending) return <p role="status">Memuat identitas demo…</p>;
  return <>
    <aside className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-muted p-4">
      <div className="mr-auto"><p className="font-medium">Identitas demo: {user?.name}</p><p className="text-sm">Data ilustrasi · bukan sesi login nyata</p></div>
      <div className="flex items-center gap-2 text-sm">
        <span>Lihat sebagai</span>
        <Select
          items={ROLE_OPTIONS}
          value={user?.role ?? "petani"}
          disabled={switching || mutationCount > 0}
          onValueChange={(val) => {
            if (val) void switchRole(val);
          }}
        >
          <SelectTrigger className="h-10 min-w-44 rounded-xl border border-input bg-background px-3 text-xs font-semibold shadow-2xs">
            <SelectValue placeholder="Pilih role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p role="alert">{error}</p>}
    </aside>
    {switching ? <p role="status">Mengganti identitas…</p> : user?.role === requiredRole ? <div key={user.id}>{children}</div> : <p role="status">Role {user?.role} tidak memiliki akses ke ruang Petani. Pilih Petani untuk melanjutkan. Halaman role lainnya belum tersedia.</p>}
  </>;
}
