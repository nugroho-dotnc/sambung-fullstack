import { Router } from "express";
import { forecastQuerySchema } from "./forecast.types.ts";
import { getForecasts, getForecastMeta } from "./forecast.service.ts";

export function forecastRouter() {
  const router = Router();

  router.get("/forecasts/meta", async (_req, res) => {
    const meta = await getForecastMeta();
    res.json(meta);
  });

  router.get("/forecasts", async (req, res) => {
    const query = forecastQuerySchema.parse(req.query);
    const data = await getForecasts(query);
    res.json(data);
  });

  return router;
}
