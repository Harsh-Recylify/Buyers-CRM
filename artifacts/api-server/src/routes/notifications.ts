import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";

const router = Router();

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id, type: n.type, title: n.title, message: n.message,
    isRead: n.isRead, entityType: n.entityType, entityId: n.entityId,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { unreadOnly } = req.query as Record<string, string>;
  const userId = req.user!.id;

  let conditions: any[] = [eq(notificationsTable.userId, userId)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));
  const where = and(...conditions);

  const [rows, [{ count: total }], [{ count: unreadCount }]] = await Promise.all([
    db.select().from(notificationsTable).where(where).limit(limit).offset(offset).orderBy(desc(notificationsTable.createdAt)),
    db.select({ count: count() }).from(notificationsTable).where(where),
    db.select({ count: count() }).from(notificationsTable).where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false))),
  ]);

  res.json({
    data: rows.map(formatNotification),
    meta: buildMeta(Number(total), page, limit),
    unreadCount: Number(unreadCount),
  });
});

router.post("/notifications/mark-all-read", requireAuth, async (req, res): Promise<void> => {
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.user!.id));
  res.json({ message: "All notifications marked as read" });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [notification] = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.id)))
    .returning();
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(formatNotification(notification));
});

export default router;
