import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or, count, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";

const router = Router();

const ROLE_RANK: Record<string, number> = {
  team_member: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    status: u.status, phone: u.phone, department: u.department,
    avatar: u.avatar, lastLogin: u.lastLogin?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { search, role } = req.query as Record<string, string>;

  let query = db.select().from(usersTable).$dynamic();
  let countQuery = db.select({ count: count() }).from(usersTable).$dynamic();

  if (search) {
    const cond = or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`));
    query = query.where(cond);
    countQuery = countQuery.where(cond);
  }
  if (role) {
    query = query.where(eq(usersTable.role, role));
    countQuery = countQuery.where(eq(usersTable.role, role));
  }

  const [users, [{ count: total }]] = await Promise.all([
    query.limit(limit).offset(offset).orderBy(usersTable.createdAt),
    countQuery,
  ]);

  res.json({ data: users.map(formatUser), meta: buildMeta(Number(total), page, limit) });
});

router.post("/users", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { name, email, password, role, phone, department } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Name, email, password, role required" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    name, email: email.toLowerCase(), passwordHash, role, phone, department,
  }).returning();
  res.status(201).json(formatUser(user));
});

router.get("/users/:id", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const isSelf = req.user?.id === id;
  const isAdmin = req.user?.role === "admin" || req.user?.role === "super_admin";
  if (existing.isProtected) {
    // The protected seed account may always manage itself — including
    // demoting or deactivating itself — even after it no longer holds an
    // admin role. Anyone else, regardless of their own role, is blocked.
    // (Deliberately NOT "isSelf || isAdmin": self-service here is a special
    // allowance for this one seeded account, not a general rule — a normal
    // user must still go through /auth/profile for their own info, and must
    // not be able to edit their own role/status via this admin endpoint.)
    if (!isSelf) {
      res.status(403).json({ error: "Cannot modify protected super admin" });
      return;
    }
  } else if (!isAdmin) {
    // Non-protected accounts: only admins/super admins may use this
    // endpoint at all, for themselves or anyone else — unchanged from
    // before. Self-service for regular users is handled by /auth/profile,
    // which can't touch role/status.
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, email, role, status, phone, department, password } = req.body;

  // Same rule as invitations: only a super_admin may hand out admin/super_admin
  // roles. Without this, an admin could PATCH their own (or anyone's) role up
  // to super_admin through this endpoint.
  if (role && role !== existing.role && req.user?.role !== "super_admin" && ROLE_RANK[role] >= (ROLE_RANK[req.user?.role ?? ""] ?? 0)) {
    res.status(403).json({ error: "You can only assign roles below your own level" });
    return;
  }

  let passwordHash: string | undefined;
  if (password) {
    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    passwordHash = await bcrypt.hash(password, 12);
  }

  const [user] = await db.update(usersTable)
    .set({ name, email: email ? email.toLowerCase() : undefined, role, status, phone, department, passwordHash })
    .where(eq(usersTable.id, id))
    .returning();
  res.json(formatUser(user));
});

router.delete("/users/:id", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }
  if (existing.isProtected) {
    res.status(403).json({ error: "Cannot delete protected super admin" });
    return;
  }
  if (req.user?.id === id) {
    res.status(403).json({ error: "You can't delete your own account" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

export default router;
