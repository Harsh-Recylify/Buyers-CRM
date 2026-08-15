import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, invitationsTable, usersTable, loginLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireRole, signToken } from "../lib/auth";
import { logActivity, logAudit } from "../lib/activity";

const router = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ROLE_RANK: Record<string, number> = {
  team_member: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function getOrigin(req: import("express").Request): string {
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ?? req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}

function buildInviteUrl(req: import("express").Request, token: string): string {
  return `${getOrigin(req)}/accept-invite?token=${token}`;
}

async function formatInvitation(req: import("express").Request, inv: typeof invitationsTable.$inferSelect) {
  let invitedByName: string | null = null;
  if (inv.invitedById) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, inv.invitedById));
    invitedByName = u?.name ?? null;
  }
  return {
    id: inv.id,
    email: inv.email,
    role: inv.role,
    department: inv.department,
    status: inv.status,
    token: inv.token,
    inviteUrl: buildInviteUrl(req, inv.token),
    invitedByName,
    acceptedAt: inv.acceptedAt?.toISOString() ?? null,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  };
}

// ── List invitations (admin only) ───────────────────────────────────────────
router.get("/invitations", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const { status } = req.query as Record<string, string>;
  const where = status ? eq(invitationsTable.status, status) : undefined;
  const rows = await db.select().from(invitationsTable).where(where).orderBy(desc(invitationsTable.createdAt));
  const data = await Promise.all(rows.map(r => formatInvitation(req, r)));
  res.json({ data });
});

// ── Create invitation (admin only) ──────────────────────────────────────────
router.post("/invitations", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const { email, role, department } = req.body;
  if (!email || !role) {
    res.status(400).json({ error: "Email and role required" });
    return;
  }

  // Enforce role allowlist + hierarchy: a user may only invite roles below their
  // own level. Only a super_admin may issue super_admin or admin invitations.
  if (!(role in ROLE_RANK)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const inviterRole = req.user?.role ?? "";
  if (inviterRole !== "super_admin" && ROLE_RANK[role] >= (ROLE_RANK[inviterRole] ?? 0)) {
    res.status(403).json({ error: "You can only invite roles below your own level" });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existingUser) {
    res.status(400).json({ error: "A user with that email already exists" });
    return;
  }

  // Revoke any prior pending invite for the same email
  await db.update(invitationsTable)
    .set({ status: "revoked" })
    .where(and(eq(invitationsTable.email, normalizedEmail), eq(invitationsTable.status, "pending")));

  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const [inv] = await db.insert(invitationsTable).values({
    email: normalizedEmail,
    role,
    department: department ?? null,
    token,
    status: "pending",
    invitedById: req.user?.id ?? null,
    expiresAt,
  }).returning();

  await logActivity({ type: "invitation_sent", description: `Invited ${normalizedEmail} as ${role}`, userId: req.user?.id });
  await logAudit({
    userId: req.user?.id, action: "create", entityType: "invitation", entityId: inv.id,
    description: `Created invitation for ${normalizedEmail}`,
  });

  res.status(201).json(await formatInvitation(req, inv));
});

// ── Revoke invitation (admin only) ──────────────────────────────────────────
router.delete("/invitations/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(invitationsTable).where(eq(invitationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Invitation not found" }); return; }
  await db.update(invitationsTable).set({ status: "revoked" }).where(eq(invitationsTable.id, id));
  await logAudit({
    userId: req.user?.id, action: "delete", entityType: "invitation", entityId: id,
    description: `Revoked invitation for ${existing.email}`,
  });
  res.sendStatus(204);
});

// ── Resend / refresh invitation (admin only) ────────────────────────────────
router.post("/invitations/:id/resend", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(invitationsTable).where(eq(invitationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Invitation not found" }); return; }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const [inv] = await db.update(invitationsTable)
    .set({ token, status: "pending", expiresAt, acceptedAt: null })
    .where(eq(invitationsTable.id, id))
    .returning();

  res.json(await formatInvitation(req, inv));
});

// ── Verify invitation token (public) ────────────────────────────────────────
router.get("/invitations/verify", async (req, res): Promise<void> => {
  const token = req.query.token as string | undefined;
  if (!token) { res.status(400).json({ error: "Token required" }); return; }

  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.token, token));
  if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
    res.status(400).json({ error: "This invitation is invalid or has expired" });
    return;
  }

  let invitedByName: string | null = null;
  if (inv.invitedById) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, inv.invitedById));
    invitedByName = u?.name ?? null;
  }

  res.json({ email: inv.email, role: inv.role, department: inv.department, invitedByName, valid: true });
});

// ── Accept invitation → create account (public) ─────────────────────────────
router.post("/invitations/accept", async (req, res): Promise<void> => {
  const { token, name, password, phone } = req.body;
  if (!token || !name || !password) {
    res.status(400).json({ error: "Token, name and password required" });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.token, token));
  if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
    res.status(400).json({ error: "This invitation is invalid or has expired" });
    return;
  }

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, inv.email));
  if (existingUser) {
    // Account already exists — do not consume the invitation; direct them to sign in.
    res.status(400).json({ error: "An account with this email already exists. Please sign in." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    name: String(name).trim(),
    email: inv.email,
    passwordHash,
    role: inv.role,
    department: inv.department,
    phone: phone ?? null,
    status: "active",
  }).returning();

  await db.update(invitationsTable).set({ status: "accepted", acceptedAt: new Date() }).where(eq(invitationsTable.id, inv.id));

  await db.insert(loginLogsTable).values({
    userId: user.id,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
    status: "success",
  });
  await logActivity({ type: "user_joined", description: `${user.name} joined the team`, userId: user.id });

  const jwt = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.status(201).json({
    token: jwt,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      status: user.status, phone: user.phone, department: user.department,
      avatar: user.avatar, lastLogin: user.lastLogin, createdAt: user.createdAt.toISOString(),
    },
  });
});

export default router;
