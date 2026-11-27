"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Phone, ArrowRight, UserCheck, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestOtp, useOtpMode } from "@/features/auth/hooks/use-auth";
import { useRedirectAuthenticatedUser } from "@/features/auth/hooks/use-redirect-authenticated";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { isRedirecting } = useRedirectAuthenticatedUser(redirect);

  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const requestOtpMutation = useRequestOtp();
  const { data: otpConfig } = useOtpMode();
  const isLiveOtp = otpConfig?.otpMode === "live";

  if (isRedirecting) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Sesi Anda masih aktif. Mengalihkan ke ruang kerja...
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanPhone = phone.trim().replace(/[-\s]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Masukkan nomor ponsel yang valid (minimal 10 digit, contoh: 081234567890).");
      return;
    }

    try {
      const result = await requestOtpMutation.mutateAsync(cleanPhone);
      const activeMode = result.otpMode || otpConfig?.otpMode || "demo";
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("otp-hint:")) {
          sessionStorage.removeItem(key);
        }
      }
      sessionStorage.setItem("otp-mode", activeMode);
      sessionStorage.setItem(`otp-hint:${cleanPhone}`, result.debugHint ?? "");

      const nextParams = new URLSearchParams({
        phone: cleanPhone,
        req: String(Date.now()),
      });
      if (redirect) nextParams.set("redirect", redirect);
      setPhone("");
      router.push(`/masuk/verifikasi?${nextParams.toString()}`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal mengirimkan kode verifikasi. Silakan coba kembali."
      );
    }
  };

  const handleQuickFill = (testPhone: string) => {
    setPhone(testPhone);
    setErrorMsg("");
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="space-y-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Selamat datang kembali!
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLiveOtp
            ? "Masuk sebagai Petani atau Pembeli tanpa kata sandi. Kode verifikasi akan dikirimkan langsung ke WhatsApp Anda."
            : "Masuk sebagai Petani atau Pembeli tanpa kata sandi menggunakan nomor ponsel Anda."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-semibold">
              Nomor Ponsel {isLiveOtp && "(WhatsApp)"}
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <Phone className="w-4 h-4" />
              </div>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder={isLiveOtp ? "Nomor WhatsApp (contoh: 081234567890)" : "081234567890"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 min-h-11 text-base tabular-nums"
                disabled={requestOtpMutation.isPending}
                autoFocus
              />
            </div>
          </div>

          {errorMsg && (
            <div className="px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 pt-2">
          <Button
            type="submit"
            className="w-full min-h-11 text-base font-semibold"
            disabled={requestOtpMutation.isPending}
          >
            {requestOtpMutation.isPending
              ? "Mengirim Kode..."
              : isLiveOtp
              ? "Kirim Kode WhatsApp"
              : "Lanjutkan Verifikasi (Demo)"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="flex items-center justify-end w-full pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <Link href="/admin/masuk" className="font-medium text-foreground hover:underline flex items-center gap-1">
              Masuk Pengelola (Admin)
            </Link>
          </div>
        </div>
      </form>

      {isLiveOtp ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-4 space-y-2 text-xs">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Layanan Pengiriman WhatsApp Aktif
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Sistem terhubung langsung ke gateway pengiriman pesan resmi. Pastikan nomor yang Anda masukkan aktif pada aplikasi WhatsApp.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-primary" />
            Nomor Akun Terdaftar untuk Uji Coba:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill("081234567890")}
              className="text-left px-2 py-3 flex flex-col gap-0.5 rounded-lg bg-background border border-border/70 hover:border-primary transition-colors cursor-pointer"
            >
              <p className="font-semibold text-foreground">Akun petani</p>
              <p className="text-xs text-muted-foreground">Untuk mencoba ruang petani</p>
              <span className="text-xs tabular-nums text-primary">081234567890</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("081398765432")}
              className="text-left px-2 py-3 flex flex-col gap-0.5 rounded-lg bg-background border border-border/70 hover:border-primary transition-colors cursor-pointer"
            >
              <p className="font-semibold text-foreground">Akun pembeli</p>
              <p className="text-xs text-muted-foreground">Untuk mencoba ruang pembeli</p>
              <span className="text-xs tabular-nums text-primary">081398765432</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground italic">
            *Mode demo aktif. Masukkan nomor Anda atau klik akun demo di atas untuk mencoba.
          </p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Memuat halaman masuk...</div>}>
      <LoginContent />
    </Suspense>
  );
}
