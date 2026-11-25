import { readFile } from "node:fs/promises";
import { z } from "zod";
import { ApiError } from "../../shared/api-error.ts";

const resultSchema = z.object({
  grainType: z.enum(["GKP","GKG"]), region: z.string(), lowerBound: z.number().positive(),
  upperBound: z.number().positive(), rendemen: z.number().positive(), medianPrice: z.number().positive(),
  referenceSource: z.string(), ricePrice: z.number().positive()
});
export async function calculate(grainType: "GKP"|"GKG", province: string, quality: number | null) {
  const base = process.env.AI_BASE_URL || "https://rizsd21-sambung-ai-api.hf.space";
  const url = base + "/gradio_api/call/api_fair_price_calculate";
  const signal = AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 15000));
  try {
    const start = await fetch(url, {method:"POST", signal, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({data:[grainType, province, 0, 0, quality]})});
    if (!start.ok) throw Error();
    const {event_id} = z.object({event_id:z.string().min(1)}).parse(await start.json());
    const response = await fetch(url + "/" + encodeURIComponent(event_id), {signal});
    if (!response.ok) throw Error();
    const event = (await response.text()).replaceAll("\r","").split("\n\n")
      .find(block => block.split("\n").includes("event: complete"));
    const line = event?.split("\n").find(row => row.startsWith("data:"));
    if (!line) throw Error();
    const [value] = JSON.parse(line.slice(5));
    const result = resultSchema.parse(typeof value === "string" ? JSON.parse(value) : value);
    if (result.region !== province || result.grainType !== grainType || result.upperBound < result.lowerBound) throw Error();
    return {...result,sourceMode:"live",sourceDate:null as string|null};
  } catch {
    if(process.env.AI_SNAPSHOT_PATH) {
      try {
        const snapshot=JSON.parse(await readFile(process.env.AI_SNAPSHOT_PATH,"utf8"));
        const row=snapshot.provinces[province];
        const sourceDate=z.string().min(1).parse(snapshot.updatedAt);
        const result=resultSchema.parse({...row[grainType],grainType,region:row.province,ricePrice:row.riceReferencePrice,
          referenceSource:row.referenceSource,rendemen:snapshot.empiricalParams[grainType].rendemenSkgb});
        if(result.region===province && result.lowerBound<=result.upperBound)
          return {...result,sourceMode:"snapshot",sourceDate};
      } catch { /* No matching complete snapshot. */ }
    }
    throw new ApiError(503,"PRICE_UNAVAILABLE","Acuan harga belum tersedia. Simpan draf atau coba lagi.");
  }
}
