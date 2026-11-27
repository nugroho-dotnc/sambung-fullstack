export interface SendOtpResult {
  success: boolean;
  provider: "mock" | "fonnte";
  message?: string;
  error?: string;
}

export interface OtpSender {
  readonly mode: "demo" | "live";
  send(phone: string, code: string): Promise<SendOtpResult>;
}
