"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminUsers } from "@/features/admin/hooks/use-admin";
import { Lock, UserX, Info } from "lucide-react";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminUsers();
  const [closurePendingUsers, setClosurePendingUsers] = useState<string[]>([]);
  const [closureNotice, setClosureNotice] = useState<string | null>(null);

  const handleToggleClosureRequest = (userId: string) => {
    if (closurePendingUsers.includes(userId)) {
      setClosurePendingUsers(closurePendingUsers.filter((id) => id !== userId));
      setClosureNotice(`Penandaan permohonan penutupan akun #${userId} dibatalkan.`);
    } else {
      setClosurePendingUsers([...closurePendingUsers, userId]);
      setClosureNotice(
        `Permohonan penutupan akun #${userId} dicatat. Akun dibatasi untuk transaksi baru dan data kontak akan dianonimkan setelah kontrak aktif tuntas.`
      );
    }
  };

  return (
    <PageContainer>
      {/* Header & Breadcrumb */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
        >
          <Link href="/admin" className="hover:text-foreground font-semibold">
            Pengawas Sistem
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">Manajemen Pengguna</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Daftar Pengguna &amp; Tata Kelola Privasi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Pengawasan profil petani dan pembeli terdaftar. Penyamaran nomor telepon wajib
              diterapkan bahkan bagi pengawas sistem guna melindungi privasi pengguna.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20 shrink-0">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Penyamaran Kontak Wajib</span>
          </div>
        </div>
      </div>

      {closureNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-medium flex items-start gap-2 leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{closureNotice}</span>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card">
        <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">
            Pengguna Terdaftar di Platform
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {users?.length || 0} akun
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">ID Pengguna</th>
                <th className="py-3 px-5">Nama Lengkap</th>
                <th className="py-3 px-5">Peran</th>
                <th className="py-3 px-5">Nomor Kontak Tersamar</th>
                <th className="py-3 px-5">Wilayah Domisili</th>
                <th className="py-3 px-5">Nama Usaha / Poktan</th>
                <th className="py-3 px-5 text-center">Status Akun</th>
                <th className="py-3 px-5 text-right">Tata Kelola Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : (users || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ditemukan data pengguna terdaftar.
                  </td>
                </tr>
              ) : (
                (users || []).map((u) => {
                  const isPendingClosure = closurePendingUsers.includes(u.id);

                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-5 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                        #{u.id}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-foreground whitespace-nowrap">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <Badge
                          variant={
                            u.role === "admin"
                              ? "destructive"
                              : u.role === "petani"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs font-bold uppercase"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap tabular-nums">
                        <span className="bg-muted px-2 py-0.5 rounded text-xs font-semibold">
                          {u.phone}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap">
                        Kec. {u.district}, Kab. {u.regency}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-foreground whitespace-nowrap">
                        {u.businessName || "-"}
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                            isPendingClosure
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {isPendingClosure ? "Permohonan Tutup" : "Aktif"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {u.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleClosureRequest(u.id)}
                            className="text-xs h-7 px-2 font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            <span>{isPendingClosure ? "Batalkan Tutup" : "Minta Tutup"}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
