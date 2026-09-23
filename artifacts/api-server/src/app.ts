import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";
import { clientIp } from "./lib/request-ip";

import path from "node:path";
import fs from "node:fs";

const app: Express = express();

// The app sits behind exactly one reverse proxy at the infra level: Render's
// own edge, which is what actually opens the TCP connection to this process
// (Cloudflare, in front of that for the custom domain, is a separate hop
// that Render's edge sees — not this app). Trusting 1 hop lets Express read
// the real client IP from the end of the X-Forwarded-For chain instead of
// treating every request as coming from Render's edge itself — otherwise
// express-rate-limit below would key all visitors' requests to the same
// shared bucket, causing unrelated users to trip each other's rate limit.
// (Deliberately NOT `true`: that trusts every hop in X-Forwarded-For,
// including client-supplied ones, letting anyone spoof their IP and bypass
// rate limiting outright — express-rate-limit refuses to start with that.)
app.set("trust proxy", 1);

// Security Headers (relaxed CSP so SPA assets & fonts load smoothly)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration (allow dynamic environments, sanitize whitespace & trailing slashes)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health checks (Render's own liveness probe, and any external uptime/keep-alive
// pinger) must never be rate limited. They're infra-internal, expected to be
// frequent, and getting a 429 here makes Render think the whole service is
// down — it has actually flagged "server failure" over this before. Mounted
// ahead of the rate limiters below so it never touches that budget.
app.use("/api", healthRouter);

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // Limit each IP to 15 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  message: { error: "Too many authentication attempts, please try again after 15 minutes." },
});

// Apply rate limits
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", apiLimiter);

app.use("/api", router);

// Serve frontend static assets if built and present (Fullstack / Single-Service deployment)
const candidateStaticDirs = [
  path.resolve(__dirname, "../../recyclify-crm/dist/public"),
  path.resolve(__dirname, "../public"),
  path.resolve(process.cwd(), "dist/public"),
  path.resolve(process.cwd(), "public"),
  path.resolve(process.cwd(), "artifacts/recyclify-crm/dist/public"),
];
const staticDir = candidateStaticDirs.find((dir) => fs.existsSync(dir));

if (staticDir) {
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    const indexHtml = path.join(staticDir, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      next();
    }
  });
}

// Global JSON error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err, url: req.url }, "Unhandled server error");
  if (res.headersSent) {
    return next(err);
  }
  const detail = err.cause?.message || err.detail || "";
  const errorMessage = detail ? `${err.message} (${detail})` : (err.message || "Internal Server Error");
  res.status(err.status || 500).json({
    error: errorMessage,
  });
});

export default app;
