import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../shared/api-error.ts";

function buildFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = [];
    }
    if (!fieldErrors[key].includes(issue.message)) {
      fieldErrors[key].push(issue.message);
    }
  }
  return fieldErrors;
}

function firstSpecificMessage(error: ZodError, fallback: string): string {
  const custom = error.issues.find(
    (issue) =>
      issue.message &&
      !issue.message.startsWith("Invalid input") &&
      !issue.message.startsWith("Too small") &&
      !issue.message.startsWith("Too big")
  );
  return custom?.message ?? fallback;
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    const fieldErrors = buildFieldErrors(error);
    if (!req.path.startsWith("/auth")) {
      res.status(422).json({
        code: "INVALID_INPUT",
        message: firstSpecificMessage(error, "Periksa kembali data yang dikirim."),
        fieldErrors,
      });
      return;
    }

    const registration = req.path.endsWith("/register");
    res.status(422).json(
      registration
        ? {
            code: "INVALID_PROFILE",
            message: firstSpecificMessage(
              error,
              "Lengkapi profil dan setujui ketentuan layanan."
            ),
            fieldErrors,
          }
        : {
            code: "INVALID_INPUT",
            message: firstSpecificMessage(
              error,
              "Periksa nomor ponsel dan empat digit kode."
            ),
            fieldErrors,
          }
    );
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }

  if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
    res.status(error.status).json({
      code: "INVALID_BODY",
      message: "Data yang dikirim tidak sesuai format atau ukurannya terlalu besar.",
    });
    return;
  }

  console.error("Kegagalan permintaan:", error.code ?? error.name);
  res.status(503).json({
    code: "SERVICE_UNAVAILABLE",
    message: "Layanan sedang mengalami gangguan sementara. Silakan coba kembali sebentar lagi.",
  });
};
