"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
          <span className="font-medium text-foreground">Log Audit Sistem</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Log Audit Peristiwa Bisnis
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Catatan kronologis perubahan status transaksi, pembaruan acuan harga, dan tindakan pengawasan yang tersimpan utuh agar tidak dapat diubah sepihak.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shrink-0">
            <Shield className="w-3.5 h-3.5" />
            <span>Kredensial & OTP Tidak Dicatat</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari aksi, pelaku, atau ID objek..."
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
        />
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card">
        <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">
            Daftar Aktivitas Sistem Terlacak
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredLogs.length} peristiwa
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">Waktu Terjadi</th>
                <th className="py-3 px-5">Pelaku (Peran)</th>
                <th className="py-3 px-5">Aksi Bisnis</th>
                <th className="py-3 px-5">Target Objek</th>
                <th className="py-3 px-5">Rincian Peristiwa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                    Memuat catatan log audit...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ditemukan log audit yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap text-xs tabular-nums">
                      {new Date(log.timestamp).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-foreground whitespace-nowrap">
                      {log.actorName}{" "}
                      <Badge
                        variant="secondary"
                        className="text-xs uppercase font-bold ml-1"
                      >
                        {log.actorRole}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-primary whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-5 tabular-nums text-muted-foreground whitespace-nowrap">
                      {log.targetType}: #{log.targetId}
                    </td>
                    <td className="py-3.5 px-5 text-foreground leading-relaxed max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
