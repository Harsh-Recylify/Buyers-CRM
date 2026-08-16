import app from "../artifacts/api-server/src/app";

export default function handler(req: any, res: any) {
  if (req.url) {
    if (!req.url.startsWith("/api")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
  }
  return app(req, res);
}
