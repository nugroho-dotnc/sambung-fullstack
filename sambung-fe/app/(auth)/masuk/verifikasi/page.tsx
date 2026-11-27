"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowRight, RefreshCw, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVerifyOtp, useRequestOtp, useOtpMode } from "@/features/auth/hooks/use-auth";
import { useRedirectAuthenticatedUser } from "@/features/auth/hooks/use-redirect-authenticated";
import { resolvePostAuthPath } from "@/features/auth/domain/role-routes";

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const redirect = searchParams.get("redirect");
  const { isRedirecting } = useRedirectAuthenticatedUser(redirect);

  const [otpCode, setOtpCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [hint, setHint] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [activeOtpMode, setActiveOtpMode] = useState<"demo" | "live">("demo");

  const verifyMutation = useVerifyOtp();
  const requestOtpMutation = useRequestOtp();
  const { data: otpConfig } = useOtpMode();

  useEffect(() => {
    if (!phone) {
      router.push("/masuk");
      return;
    }
    const timer = window.setTimeout(() => {
      setHint(sessionStorage.getItem(`otp-hint:${phone}`) ?? "");
      const storedMode = sessionStorage.getItem("otp-mode") as "demo" | "live" | null;
      if (storedMode) {
        setActiveOtpMode(storedMode);
      } else if (otpConfig?.otpMode) {
        setActiveOtpMode(otpConfig.otpMode);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [phone, router, otpConfig?.otpMode]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (isRedirecting) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Sesi Anda masih aktif. Mengalihkan ke ruang kerja...
      </div>
    );
  }

  const handleResend = async () => {
    if (countdown > 0) return;
    setErrorMsg("");
    try {
      const result = await requestOtpMutation.mutateAsync(phone);
      const nextMode = result.otpMode || otpConfig?.otpMode || "demo";
      setActiveOtpMode(nextMode);
      sessionStorage.setItem("otp-mode", nextMode);
      sessionStorage.setItem(`otp-hint:${phone}`, result.debugHint ?? "");
      setHint(result.debugHint ?? "");
      setCountdown(60);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengirim ulang kode verifikasi."
      );
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 4) {
      setErrorMsg("Masukkan 4 digit kode verifikasi yang telah dikirim.");
      return;
    }

    try {
      const res = await verifyMutation.mutateAsync({
        phone,
        otpCode: cleanCode,
      });

      sessionStorage.removeItem(`otp-hint:${phone}`);
      if (res.isNewUser) {
        const nextParams = new URLSearchParams({ phone });
        if (redirect) nextParams.set("redirect", redirect);
        router.push(`/daftar?${nextParams.toString()}`);
      } else if (res.user) {
        router.replace(resolvePostAuthPath(res.user.role, redirect));
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Kode verifikasi tidak cocok. Silakan periksa kembali."
      );
    }
  };

  const isLive = activeOtpMode === "live";

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="space-y-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {isLive ? "Verifikasi WhatsApp" : "Verifikasi Nomor"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLive
            ? "Masukkan 4 digit kode verifikasi yang telah kami kirimkan ke WhatsApp:"
            : "Masukkan kode verifikasi untuk nomor:"}
          <span className="block mt-1 font-semibold text-foreground tabular-nums text-base">{phone}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-semibold">
              Kode 4-Digit
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <KeyRound className="w-4 h-4" />
              </div>
              <Input
                id="otp"
                type="text"
                maxLength={4}
                placeholder="4 digit"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="pl-10 text-center tracking-[0.5em] text-xl font-bold min-h-12 tabular-nums"
                disabled={verifyMutation.isPending}
                autoFocus
              />
            </div>
          </div>

          {errorMsg && (
            <div className="px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}

          <div className="text-center flex justify-between items-center pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tidak menerima kode verifikasi?{" "}
              {countdown > 0 ? (
                <span className="font-semibold text-foreground tabular-nums">
                  Kirim ulang dalam {countdown} detik
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={requestOtpMutation.isPending}
                  className="font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Kirim Ulang Kode
                </button>
              )}
            </p>
            <Link
              href="/masuk"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              Ganti Nomor Ponsel
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full min-h-11 text-base font-semibold"
          disabled={verifyMutation.isPending || otpCode.length !== 4}
        >
          {verifyMutation.isPending ? "Memverifikasi..." : "Konfirmasi & Masuk"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>

      {isLive ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-4 space-y-1.5 text-xs">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Pesan WhatsApp Terkirim
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Periksa notifikasi pesan WhatsApp di nomor ponsel Anda. Masukkan 4 digit angka yang diterima untuk melanjutkan.
          </p>
        </div>
      ) : (
        hint && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-4 space-y-2">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Verifikasi demo
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
          </div>
        )
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Memuat halaman verifikasi...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
