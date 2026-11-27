import type { OtpSender, SendOtpResult } from "./otp-sender.interface.ts";

export class MockOtpSender implements OtpSender {
  readonly mode = "demo" as const;

  async send(phone: string, code: string): Promise<SendOtpResult> {
    console.log(`[MOCK OTP] Terkirim ke ${phone}: Kode verifikasi = ${code}`);
    return {
      success: true,
      provider: "mock",
      message: "Kode demo siap digunakan.",
    };
  }
}
