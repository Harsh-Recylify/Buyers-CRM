import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or, count, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";

const router = Router();

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

router.patch("/users/:id", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }
  if (existing.isProtected && req.user?.id !== id) {
    res.status(403).json({ error: "Cannot modify protected super admin" });
    return;
  }
  const { name, email, role, status, phone, department } = req.body;
  const [user] = await db.update(usersTable)
    .set({ name, email: email ? email.toLowerCase() : undefined, role, status, phone, department })
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
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

export default router;
