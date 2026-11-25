"use client";

import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, MapPin, Building2, Shield, LogOut, Moon, Sun, AlertCircle } from "lucide-react";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/use-auth";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function ProfilePage() {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  return (
    <PageContainer>
      <PageHeader
        title="Profil & Pengaturan Akun"
        description="Kelola informasi identitas usaha, wilayah operasional, serta preferensi tampilan aplikasi Anda."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Kartu Identitas Utama */}
        <Card className="rounded-2xl border-border/80 shadow-xs lg:col-span-2">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Informasi Terdaftar</CardTitle>
                <CardDescription className="text-xs">
                  Data yang digunakan dalam surat kesepakatan pasokan digital.
                </CardDescription>
              </div>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                Peran: {user?.role || "Pengguna"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Nama Lengkap Penanggung Jawab
                </span>
                <p className="text-sm font-bold text-foreground">{user?.name || "-"}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  Nomor Ponsel Terverifikasi
                </span>
                <p className="text-sm font-bold tabular-nums text-foreground">{user?.phone || "-"}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Nama Kelompok Tani / Usaha
                </span>
                <p className="text-sm font-bold text-foreground">{user?.businessName || "Perorangan"}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Wilayah Domisili Usaha
                </span>
                <p className="text-sm font-bold text-foreground">
                  {user?.district ? `${user.district}, ${user.regency}, ${user.province}` : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground font-semibold">Kebijakan Privasi Nomor Kontak:</strong> Nomor ponsel Anda hanya akan dibagikan kepada pihak lawan apabila kesepakatan pasokan telah resmi disetujui bersama oleh kedua belah pihak.
            </div>
          </CardContent>
        </Card>

        {/* Kolom Kanan: Pengaturan & Aksi */}
        <div className="space-y-6">
          {/* Pengaturan Tampilan */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold">Preferensi Tampilan</CardTitle>
              <CardDescription className="text-xs">
                Sesuaikan mode tampilan layar agar nyaman digunakan saat di lapangan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Tema Aplikasi (Terang / Gelap)</span>
              <ThemeToggle />
            </CardContent>
          </Card>

          {/* Sesi & Penutupan Akun */}
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold">Sesi & Keamanan</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <Button
                variant="outline"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="w-full min-h-11 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {logoutMutation.isPending ? "Mengakhiri Sesi..." : "Keluar dari Akun"}
              </Button>

              <div className="pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => alert("Permintaan penutupan akun Anda telah dicatat. Sesuai ketentuan perlindungan transaksi, seluruh kesepakatan pasokan aktif harus tuntas terlebih dahulu sebelum data kontak dan akun ditutup secara permanen.")}
                  className="text-xs text-muted-foreground hover:text-destructive hover:underline cursor-pointer"
                >
                  Ajukan Permintaan Penutupan Akun
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
