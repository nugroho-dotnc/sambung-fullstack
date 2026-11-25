"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sprout, KeyRound, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerifyOtp, useRequestOtp } from "@/features/auth/hooks/use-auth";

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";

  const [otpCode, setOtpCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [hint, setHint] = useState("");
  const [countdown, setCountdown] = useState(60);

  const verifyMutation = useVerifyOtp();
  const requestOtpMutation = useRequestOtp();

  useEffect(() => {
    setHint(sessionStorage.getItem(`otp-hint:${phone}`) ?? "");
    if (!phone) {
      router.push("/masuk");
    }
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;
    setErrorMsg("");
    try {
      const result = await requestOtpMutation.mutateAsync(phone);
      sessionStorage.setItem(`otp-hint:${phone}`, result.debugHint ?? "");
      setHint(result.debugHint ?? "");
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengirim ulang kode verifikasi.");
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
        router.push(`/daftar?phone=${encodeURIComponent(phone)}`);
      } else if (res.user) {
        if (res.user.role === "petani") {
          router.push("/petani");
        } else if (res.user.role === "pembeli") {
          router.push("/pembeli");
        } else {
          router.push("/admin");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Kode verifikasi tidak cocok. Silakan periksa kembali.");
    }
  };

    return (
    <div className="w-full flex flex-col gap-8">
      <div className="space-y-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Verifikasi Nomor
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Masukkan kode verifikasi untuk nomor:
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

      {hint && <div className="rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-4 space-y-2">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Verifikasi demo
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {hint}
        </p>
      </div>}
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
