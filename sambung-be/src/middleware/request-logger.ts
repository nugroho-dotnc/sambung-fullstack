import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  let responseMessage: string | undefined;

  // Intercept res.json to capture response message or error code
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (body && typeof body === "object") {
      if (typeof body.message === "string") {
        responseMessage = body.message;
      } else if (typeof body.code === "string") {
        responseMessage = `[${body.code}]`;
      }
    }
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const msg = responseMessage ? ` - "${responseMessage}"` : "";

    // Standard ANSI colors for terminal output
    const statusColor =
      status >= 500
        ? "\x1b[31m" // red
        : status >= 400
        ? "\x1b[33m" // yellow
        : status >= 300
        ? "\x1b[36m" // cyan
        : "\x1b[32m"; // green
    const reset = "\x1b[0m";
    const methodColor = "\x1b[36m"; // cyan method
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });

    console.log(
      `[${time}] ${methodColor}${method}${reset} ${url} ${statusColor}${status}${reset} (${duration}ms)${msg}`
    );
  });

  next();
}
