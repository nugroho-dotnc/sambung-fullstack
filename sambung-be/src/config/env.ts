import { z } from "zod";

function isValidOriginUrl(value: string): boolean {
  try {
    return /^https?:\/\//.test(value) && new URL(value).origin === value;
  } catch {
    return false;
  }
}

export function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const configuration = z.object({
  DATABASE_URL: z.url().regex(/^postgres(?:ql)?:\/\//),
  FE_ORIGIN: z
    .string()
    .min(1)
    .refine((value) => {
      const origins = parseAllowedOrigins(value);
      return origins.length > 0 && origins.every(isValidOriginUrl);
    }),
  PORT: z.coerce.number().int().min(0).max(65535).default(4000),
  OTP_MODE: z.literal("demo"),
  NODE_ENV: z.string().optional().refine((value) => value !== "production"),
  CONSENT_VERSION: z.string().min(1).default("demo-v1"),
});

export function readConfig() {
  const parsed = configuration.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Periksa konfigurasi demo: " +
        parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")
    );
  }
  return parsed.data;
}
