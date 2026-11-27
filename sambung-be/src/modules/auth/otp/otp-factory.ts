import type { OtpSender } from "./otp-sender.interface.ts";
import { MockOtpSender } from "./mock-otp-sender.ts";
import { FonnteOtpSender } from "./fonnte-otp-sender.ts";

export function getOtpSender(): OtpSender {
  const mode = (process.env.OTP_MODE || "demo").toLowerCase();
  if (mode === "live" || mode === "fonnte") {
    return new FonnteOtpSender(process.env.FONNTE_TOKEN);
  }
  return new MockOtpSender();
}
