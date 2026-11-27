"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminAuditLogs } from "@/features/admin/hooks/use-admin";
import { Shield, Search } from "lucide-react";

export default function AdminAuditLogPage() {
  const { data: auditLogs, isLoading } = useAdminAuditLogs();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = (auditLogs || []).filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.actorName?.toLowerCase().includes(q) ||
      log.targetId?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer className="py-7 sm:py-9 space-y-7 sm:space-y-8">
      {/* Header & Breadcrumb */}
      <header className="border-b border-border pb-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2.5"
        >
          <Link href="/admin" className="admin-breadcrumb-link font-semibold">
            Pengawas Sistem
          </Link>
          <span className="text-muted-foreground/60" aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-foreground">
            Log Audit Sistem
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
              Log Audit Peristiwa Bisnis
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Catatan kronologis perubahan status transaksi, pembaruan acuan harga, dan tindakan pengawasan yang tersimpan utuh agar tidak dapat diubah sepihak.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-semibold admin-brand-pill px-3 py-1.5 rounded-md shrink-0 self-start sm:self-auto">
            <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
            <span>Kredensial &amp; OTP Tidak Dicatat</span>
          </div>
        </div>
      </header>

      {/* Main Table Card with Integrated Search */}
      <Card className="admin-surface p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-bold text-foreground">
              Daftar Aktivitas Sistem Terlacak
            </h2>
            <span aria-live="polite" className="text-xs font-semibold text-[var(--admin-gold-text)] tabular-nums">
              {filteredLogs.length} peristiwa
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <label htmlFor="admin-audit-search" className="sr-only">
              Cari aksi, pelaku, atau ID objek
            </label>
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="admin-audit-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aksi, pelaku, atau ID objek..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left border-collapse text-[13px]">
            <caption className="sr-only">
              Catatan log audit peristiwa bisnis sistem SAMBUNG
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Waktu Terjadi</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Pelaku (Peran)</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Aksi Bisnis</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Target Objek</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Rincian Peristiwa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableRowsSkeleton columns={5} />
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-xs text-muted-foreground">
                    Tidak ditemukan log audit yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-muted-foreground whitespace-nowrap text-xs tabular-nums">
                      {new Date(log.timestamp).toLocaleString("id-ID")}
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-foreground whitespace-nowrap">
                      <span>{log.actorName}</span>{" "}
                      <Badge
                        variant="outline"
                        className="rounded bg-muted text-foreground border-transparent text-xs uppercase font-semibold ml-1"
                      >
                        {log.actorRole}
                      </Badge>
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-[var(--admin-positive-text)] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                      {log.targetType}: #{log.targetId}
                    </td>
                    <td className="py-4 px-5 first:pl-6 last:pr-6 text-[13px] text-foreground leading-relaxed max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
