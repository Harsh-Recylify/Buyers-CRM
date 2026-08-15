import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!JWT_SECRET || JWT_SECRET === "recyclify-secret-key") {
    throw new Error("FATAL: SESSION_SECRET must be configured with a secure key in production mode.");
  }
}

const EFFECTIVE_SECRET = JWT_SECRET ?? "recyclify-secret-key";

export interface AuthPayload {
  id: number;
  email: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, EFFECTIVE_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, EFFECTIVE_SECRET) as AuthPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
