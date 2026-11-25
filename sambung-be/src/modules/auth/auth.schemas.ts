import { z } from "zod";

const phone = z.string().min(10).max(15).regex(/^(?:\+62|62|0)8[1-9]\d{6,10}$/)
  .transform(value => value.replace(/^(?:\+62|0)/, "62"));
const location = z.string().trim().min(1).max(200);
export const requestSchema = z.object({ phone });
export const verifySchema = requestSchema.extend({ otpCode: z.string().regex(/^\d{4}$/) });
export const registerSchema = requestSchema.extend({
  role: z.enum(["petani", "pembeli"]), agreedToTerms: z.literal(true),
  name: z.string().trim().min(2).max(200), province: location, regency: location,
  district: location, businessName: z.string().optional(),
});
export type Registration = z.infer<typeof registerSchema>;
