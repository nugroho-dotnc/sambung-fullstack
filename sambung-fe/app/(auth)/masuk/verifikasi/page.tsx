"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowRight, RefreshCw, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVerifyOtp, useRequestOtp } from "@/features/auth/hooks/use-auth";
import { useRedirectAuthenticatedUser } from "@/features/auth/hooks/use-redirect-authenticated";
import { resolvePostAuthPath } from "@/features/auth/domain/role-routes";
import { VerificationPageSkeleton } from "@/features/auth/components/auth-page-skeletons";
import { IS_DEMO_FE, IS_LIVE_FE } from "@/lib/config/fe-mode";

function VerificationForm({
  phone,
  redirect,
}: {
  phone: string;
  redirect: string | null;
}) {
  const router = useRouter();
  const { isRedirecting } = useRedirectAuthenticatedUser(redirect);

  const [otpCode, setOtpCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [hint, setHint] = useState("");
  const [countdown, setCountdown] = useState(60);

  const verifyMutation = useVerifyOtp();
  const requestOtpMutation = useRequestOtp();
  const isLive = IS_LIVE_FE;

  useEffect(() => {
    if (!phone) {
      router.push("/masuk");
      return;
    }
    if (!IS_DEMO_FE) return;
    const timer = window.setTimeout(() => {
      setHint(sessionStorage.getItem(`otp-hint:${phone}`) ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (isRedirecting) {
    return <VerificationPageSkeleton label="Mengalihkan ke ruang kerja..." />;
  }

  const handleResend = async () => {
    if (countdown > 0) return;
    setErrorMsg("");
    try {
      const result = await requestOtpMutation.mutateAsync(phone);
      if (IS_DEMO_FE) {
        const nextHint = result.debugHint ?? "";
        sessionStorage.setItem(`otp-hint:${phone}`, nextHint);
        setHint(nextHint);
      }
      setOtpCode("");
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

      setOtpCode("");
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

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="space-y-2">
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

      <form onSubmit={handleVerify} autoComplete="off" className="space-y-5">
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
                name="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="4 digit"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="pl-10 text-center tracking-[0.5em] text-xl font-bold min-h-12 rounded-xl bg-muted/40 border-border/80 tabular-nums"
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
          className="w-full min-h-11 rounded-xl text-base font-semibold"
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

function VerificationContent() {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const reqId = searchParams.get("req") || "";
  const redirect = searchParams.get("redirect");

  return (
    <VerificationForm
      key={`${phone}:${reqId}`}
      phone={phone}
      redirect={redirect}
    />
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<VerificationPageSkeleton />}>
      <VerificationContent />
    </Suspense>
  );
}
