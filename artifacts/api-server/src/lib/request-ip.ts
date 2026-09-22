import type { Request } from "express";

/**
 * Cloudflare overwrites this header at its edge with the real client IP, so
 * it can't be spoofed by the client — prefer it over X-Forwarded-For, which
 * depends on correctly guessing how many proxy hops are actually in front
 * of the app. Falls back to Express's own (trust-proxy-derived) req.ip when
 * the request isn't coming through Cloudflare (e.g. local dev).
 */
export function clientIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp) return cfIp;
  return req.ip ?? "unknown";
}
