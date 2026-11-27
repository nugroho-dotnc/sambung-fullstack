import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";
import { isBuyerPro, resolveOptionalActor } from "../auth/session.ts";
import { forecastQuerySchema } from "./forecast.types.ts";
import { getForecasts, getForecastMeta } from "./forecast.service.ts";

export function forecastRouter(db?: PrismaClient) {
  const router = Router();

  router.get("/forecasts/meta", async (_req, res) => {
    const meta = await getForecastMeta();
    res.json(meta);
  });

  router.get("/forecasts", async (req, res) => {
    const query = forecastQuerySchema.parse(req.query);
    if (db) {
      const actor = await resolveOptionalActor(db, req);
      if (!actor) {
        throw new ApiError(
          401,
          "UNAUTHENTICATED",
          "Masuk terlebih dahulu untuk melihat prakiraan harga AI."
        );
      }
      if (actor.role === "pembeli" && !isBuyerPro(actor)) {
        const forecastMeta = await getForecastMeta();
        const actorProvNorm = actor.province.trim().toLowerCase();
        const matchedProvince = forecastMeta.allProvinces.find(
          (prov) => prov.trim().toLowerCase() === actorProvNorm
        );
        const allowedProvince =
          matchedProvince ?? forecastMeta.activeProvinces[0] ?? forecastMeta.allProvinces[0];

        if (
          query.province &&
          allowedProvince &&
          query.province.trim().toLowerCase() !== allowedProvince.toLowerCase()
        ) {
          throw new ApiError(
            403,
            "SUBSCRIPTION_REQUIRED",
            "Perkiraan harga untuk provinsi lain hanya tersedia untuk anggota Produsen Pro."
          );
        }

        const data = await getForecasts({
          ...query,
          province: allowedProvince,
        });
        res.json({
          meta: {
            ...data.meta,
            restrictedPreview: true,
            allowedProvince,
          },
          records: data.records.map((record) => ({
            ...record,
            shapContributions: [],
          })),
        });
        return;
      }
    }

    const data = await getForecasts(query);
    res.json(data);
  });

  return router;
}
