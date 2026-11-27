import type { OtpSender, SendOtpResult } from "./otp-sender.interface.ts";

export class FonnteOtpSender implements OtpSender {
  readonly mode = "live" as const;
  private readonly token: string;

  constructor(token?: string) {
    this.token = token || process.env.FONNTE_TOKEN || "";
    if (!this.token) {
      console.warn("[FONNTE OTP] Peringatan: FONNTE_TOKEN belum diatur di environment variable.");
    }
  }

  async send(phone: string, code: string): Promise<SendOtpResult> {
    // Normalisasi nomor telepon ke format internasional (misal 62812xxx)
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    const message = `*SAMBUNG - Acuan Harga & Perdagangan Gabah*\n\nKode verifikasi masuk Anda adalah: *${code}*\n\nKode ini berlaku selama 5 menit. Demi keamanan akun Anda, jangan berikan kode ini kepada siapa pun.`;

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: this.token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          target: cleanPhone,
          message,
          countryCode: "62",
        }),
      });

      const data = (await response.json()) as { status?: boolean; reason?: string; detail?: string };

      if (!response.ok || data.status === false) {
        console.error("[FONNTE OTP] Gagal mengirim pesan:", data.reason || data.detail || response.statusText);
        return {
          success: false,
          provider: "fonnte",
          error: data.reason || data.detail || "Gagal mengirim kode via WhatsApp. Pastikan nomor terdaftar di WhatsApp.",
        };
      }

      console.log(`[FONNTE OTP] Berhasil mengirim pesan WhatsApp ke ${cleanPhone}`);
      return {
        success: true,
        provider: "fonnte",
        message: `Kode verifikasi telah dikirimkan via WhatsApp ke nomor ${phone}.`,
      };
    } catch (err) {
      console.error("[FONNTE OTP] Kesalahan koneksi jaringan:", err);
      return {
        success: false,
        provider: "fonnte",
        error: "Tidak dapat terhubung ke server WhatsApp gateway. Silakan coba kembali.",
      };
    }
  }
}
