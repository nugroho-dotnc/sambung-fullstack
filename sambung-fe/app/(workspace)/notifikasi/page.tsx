"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  ScrollText,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks/use-notifications";
import type { NotificationItem } from "@/features/notifications/services/notification.service";

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-01",
    category: "kontrak",
    title: "Tawar Balik Harga Diterima untuk Kontrak #ctr-882101",
    description:
      "Mitra transaksi telah mengajukan penyesuaian harga menjadi Rp7.150/kg untuk 2.000 kg Gabah Kering Panen. Tenggat waktu konfirmasi tersisa 18 jam.",
    time: "2 jam yang lalu",
    isRead: false,
    linkText: "Buka Ruang Negosiasi",
    linkHref: "/kontrak/ctr-882101",
    iconType: "kontrak",
  },
  {
    id: "notif-02",
    category: "kontrak",
    title: "Kesepakatan #ctr-771904 Resmi Disetujui Bersama",
    description:
      "Kesepakatan pasokan 1.500 kg Gabah Kering Giling telah disetujui. Nomor kontak WhatsApp penanggung jawab kedua belah pihak kini telah dibuka.",
    time: "12 jam yang lalu",
    isRead: false,
    linkText: "Lihat Lembar Bukti Kesepakatan",
    linkHref: "/kontrak/ctr-771904/bukti",
    iconType: "sukses",
  },
  {
    id: "notif-03",
    category: "pasar",
    title: "Pembaruan Acuan Harga Wajar Jawa Barat Pekan Ini",
    description:
      "Pusat agregasi pasar SAMBUNG telah memperbarui data acuan regional. Median gabah panen di Subang berada pada Rp6.750 - Rp7.200/kg.",
    time: "1 hari yang lalu",
    isRead: true,
    linkText: "Buka Papan Rantai Harga",
    linkHref: "/harga",
    iconType: "peringatan",
  },
  {
    id: "notif-04",
    category: "sistem",
    title: "Selamat Datang di Platform Agrikultur SAMBUNG",
    description:
      "Akun Anda telah aktif dan terverifikasi. Anda dapat mulai memanfaatkan kalkulator spektrum harga wajar dan membuat kesepakatan pasokan gabah digital bebas komisi.",
    time: "2 hari yang lalu",
    isRead: true,
    iconType: "sistem",
  },
];

export default function NotificationsPage() {
  const isMobile = useMobile();
  const { data: remoteNotifications, isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  const [localFallback, setLocalFallback] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<string>("semua");

  const notifications = useMemo(() => {
    if (remoteNotifications !== undefined) {
      return remoteNotifications;
    }
    return localFallback;
  }, [remoteNotifications, localFallback]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllMutation.mutate();
    setLocalFallback((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleToggleRead = (id: string) => {
    markReadMutation.mutate(id);
    setLocalFallback((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "belum_dibaca") return !n.isRead;
    if (filter !== "semua") return n.category === filter;
    return true;
  });

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground mb-1"
          >
            <span>SAMBUNG</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium text-foreground">Pemberitahuan</span>
          </nav>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Pusat Pemberitahuan
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Riwayat kabar pembaruan penawaran panen, tawar-menawar harga, status kontrak, dan intelijen pasar.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isMobile ? `Dibaca (${unreadCount})` : `Tandai Semua Dibaca (${unreadCount})`}</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilter("semua")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
            filter === "semua"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("belum_dibaca")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
            filter === "belum_dibaca"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("kontrak")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
            filter === "kontrak"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Kesepakatan & Kontrak
        </button>
        <button
          type="button"
          onClick={() => setFilter("pasar")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
            filter === "pasar"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Intelijen Pasar
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground bg-card border border-border/80 rounded-2xl shadow-xs">
            Tidak ada pemberitahuan pada kategori ini.
          </Card>
        ) : (
          filteredNotifications.map((n) => {
            return (
              <Card
                key={n.id}
                className={`rounded-2xl border transition-all p-5 shadow-xs ${
                  n.isRead
                    ? "bg-card border-border/80 opacity-90"
                    : "bg-card border-primary/50 shadow-sm ring-1 ring-primary/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      n.iconType === "sukses"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : n.iconType === "kontrak"
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        : n.iconType === "peringatan"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n.iconType === "sukses" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : n.iconType === "kontrak" ? (
                      <ScrollText className="w-5 h-5" />
                    ) : n.iconType === "peringatan" ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <h3 className="font-display font-bold text-sm text-foreground">
                          {n.title}
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {n.time}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {n.description}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                      {n.linkHref ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold gap-1.5 h-8 px-3 cursor-pointer"
                          render={<Link href={n.linkHref} />}
                        >
                          <span>{n.linkText}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <div />
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleRead(n.id)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {n.isRead ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
