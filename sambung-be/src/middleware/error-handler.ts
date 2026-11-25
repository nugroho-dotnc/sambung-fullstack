import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../shared/api-error.ts";
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) {
      if (!_req.path.startsWith("/auth")) { res.status(422).json({code:"INVALID_INPUT",message:"Periksa kembali data yang dikirim."}); return; }
      const registration = _req.path.endsWith("/register");
      res.status(422).json(registration ? { code: "INVALID_PROFILE", message: "Lengkapi profil dan setujui ketentuan layanan." }
        : { code: "INVALID_INPUT", message: "Periksa nomor ponsel dan empat digit kode." });
      return;
    }
    if (error instanceof ApiError) { res.status(error.status).json({ code: error.code, message: error.message }); return; }
    if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
      res.status(error.status).json({ code: "INVALID_BODY", message: "Data permintaan tidak valid atau terlalu besar." });
      return;
    }
    console.error("Kegagalan permintaan:", error.code ?? error.name);
    res.status(503).json({ code: "SERVICE_UNAVAILABLE", message: "Layanan belum tersedia. Coba kembali sebentar lagi." });
  };

