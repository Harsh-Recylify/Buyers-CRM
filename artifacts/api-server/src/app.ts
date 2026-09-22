import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

import path from "node:path";
import fs from "node:fs";

const app: Express = express();

// The app sits behind Render's proxy (and Cloudflare in front of that for
// the custom domain). Without this, Express sees every request as coming
// from the same upstream proxy IP, so express-rate-limit below keys its
// per-IP buckets on that one shared address — meaning ALL visitors combined
// share a single 15-requests-per-15-minutes login budget instead of each
// getting their own, causing unrelated users' login attempts to trip each
// other's rate limit. Trusting the proxy lets Express read the real client
// IP from X-Forwarded-For instead.
app.set("trust proxy", true);

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

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 200 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // Limit each IP to 15 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
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
