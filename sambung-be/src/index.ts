import {startExpiry} from "./modules/contracts/contracts.expiry.ts";
import { prisma } from "./db/prisma.ts";
import { readConfig } from "./config/env.ts";
import { createApp } from "./app.ts";

const config = readConfig();
await prisma.account.findFirst({ select: { id: true } });
const stopExpiry=startExpiry(prisma);
const server = createApp(prisma, config.FE_ORIGIN, config.CONSENT_VERSION)
  .listen(config.PORT, () => console.log("SAMBUNG API siap pada port", config.PORT));
function shutdown() {
  stopExpiry();
  server.close(() => { void prisma.$disconnect(); });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
