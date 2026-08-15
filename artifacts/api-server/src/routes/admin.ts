import { Router } from "express";
import { db, auditLogsTable, loginLogsTable, appSettingsTable, usersTable } from "@workspace/db";
import { eq, count, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";

const router = Router();

router.get("/admin/audit-logs", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { userId, action } = req.query as Record<string, string>;

  let conditions: any[] = [];
  if (userId) conditions.push(eq(auditLogsTable.userId, parseInt(userId, 10)));
  if (action) conditions.push(eq(auditLogsTable.action, action));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(auditLogsTable).where(where).limit(limit).offset(offset).orderBy(desc(auditLogsTable.createdAt)),
    db.select({ count: count() }).from(auditLogsTable).where(where),
  ]);

  const data = await Promise.all(rows.map(async log => {
    let userName: string | null = null;
    if (log.userId) {
      const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, log.userId));
      userName = user?.name ?? null;
    }
    return {
      id: log.id, userId: log.userId, userName, action: log.action,
      entityType: log.entityType, entityId: log.entityId, description: log.description,
      oldValue: log.oldValue, newValue: log.newValue, ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    };
  }));

  res.json({ data, meta: buildMeta(Number(total), page, limit) });
});

router.get("/admin/login-logs", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { userId } = req.query as Record<string, string>;

  const where = userId ? eq(loginLogsTable.userId, parseInt(userId, 10)) : undefined;
  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(loginLogsTable).where(where).limit(limit).offset(offset).orderBy(desc(loginLogsTable.createdAt)),
    db.select({ count: count() }).from(loginLogsTable).where(where),
  ]);

  const data = await Promise.all(rows.map(async log => {
    const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, log.userId));
    return {
      id: log.id, userId: log.userId,
      userName: user?.name ?? null, userEmail: user?.email ?? null,
      ipAddress: log.ipAddress, userAgent: log.userAgent, status: log.status,
      createdAt: log.createdAt.toISOString(),
    };
  }));

  res.json({ data, meta: buildMeta(Number(total), page, limit) });
});

router.get("/admin/settings", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const [settings] = await db.select().from(appSettingsTable);
  if (!settings) {
    const [created] = await db.insert(appSettingsTable).values({}).returning();
    res.json({ ...created, emailNotifications: created.emailNotifications === "true" });
    return;
  }
  res.json({ ...settings, emailNotifications: settings.emailNotifications === "true" });
});

router.patch("/admin/settings", requireAuth, requireRole("admin", "super_admin"), async (req, res): Promise<void> => {
  const { appName, primaryColor, timezone, currency, emailNotifications } = req.body;
  const [existing] = await db.select().from(appSettingsTable);
  if (!existing) {
    const [created] = await db.insert(appSettingsTable).values({
      appName, primaryColor, timezone, currency,
      emailNotifications: emailNotifications !== undefined ? String(emailNotifications) : "true",
    }).returning();
    res.json({ ...created, emailNotifications: created.emailNotifications === "true" });
    return;
  }
  const [settings] = await db.update(appSettingsTable).set({
    appName, primaryColor, timezone, currency,
    emailNotifications: emailNotifications !== undefined ? String(emailNotifications) : undefined,
  }).where(eq(appSettingsTable.id, existing.id)).returning();
  res.json({ ...settings, emailNotifications: settings.emailNotifications === "true" });
});

export default router;
