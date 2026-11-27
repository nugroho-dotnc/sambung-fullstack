"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminTableScroll } from "@/features/admin/components/admin-table-scroll";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminUsers } from "@/features/admin/hooks/use-admin";
import { formatPaymentDateTime } from "@/features/contracts/domain/payment-helpers";
import { ProBadge } from "@/features/subscription/components/pro-badge";
import { UserX, Info } from "lucide-react";

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
      <AdminPageHeader
        section="Manajemen Pengguna"
        title="Daftar Pengguna & Tata Kelola Privasi"
        description="Pengawasan profil petani dan produsen terdaftar. Penyamaran nomor telepon wajib diterapkan bahkan bagi pengawas sistem guna melindungi privasi pengguna."
      />

      {closureNotice && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3.5 rounded-lg status-warning text-xs font-medium flex items-start gap-2.5 leading-relaxed"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{closureNotice}</span>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="rounded-2xl p-0 gap-0 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-foreground">
            Pengguna Terdaftar di Platform
          </h2>
          <span className="text-xs font-semibold text-price-caution tabular-nums">
            {users?.length || 0} akun
          </span>
        </div>

        <AdminTableScroll label="Daftar pengguna">
          <table className="admin-table w-full text-left border-collapse text-[13px]">
            <caption className="sr-only">
              Daftar pengguna terdaftar beserta peran, nomor kontak tersamar, wilayah, dan status akun
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">ID Pengguna</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Nama Lengkap</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Peran</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Nomor Kontak Tersamar</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Wilayah Domisili</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Nama Usaha / Poktan</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-center">Status Akun</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Tata Kelola Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableRowsSkeleton columns={8} />
              ) : (users || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-xs text-muted-foreground">
                    Tidak ditemukan data pengguna terdaftar.
                  </td>
                </tr>
              ) : (
                (users || []).map((u) => {
                  const isPendingClosure = closurePendingUsers.includes(u.id);

                  return (
                    <tr key={u.id}>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                        #{u.id}
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-foreground whitespace-nowrap">
                        {u.name}
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                u.role === "admin"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-foreground border-transparent"
                              }`}
                            >
                              {u.role === "pembeli"
                                ? "Produsen"
                                : u.role === "petani"
                                ? "Petani"
                                : "Admin"}
                            </Badge>
                            {u.role === "pembeli" && u.isPro && <ProBadge size="xs" />}
                          </div>
                          {u.role === "pembeli" && u.isPro && u.proExpiresAt && (
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              Pro s.d. {formatPaymentDateTime(u.proExpiresAt)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-muted-foreground whitespace-nowrap tabular-nums">
                        <span className="bg-muted text-foreground px-2.5 py-0.5 rounded text-xs font-semibold">
                          {u.phone}
                        </span>
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-muted-foreground whitespace-nowrap text-xs">
                        Kec. {u.district}, Kab. {u.regency}
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 font-medium text-foreground whitespace-nowrap">
                        {u.businessName || "-"}
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPendingClosure ? "status-warning" : "status-success"
                          }`}
                        >
                          {isPendingClosure ? "Permohonan Tutup" : "Aktif"}
                        </span>
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-right whitespace-nowrap">
                        {u.role !== "admin" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleClosureRequest(u.id)}
                            className="min-h-9 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-muted active:scale-95 transition-all cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
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
        </AdminTableScroll>
      </Card>
    </PageContainer>
  );
}
