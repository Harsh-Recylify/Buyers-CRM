import { Router } from "express";
import { db, activitiesTable, usersTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";

const router = Router();

async function formatActivity(a: typeof activitiesTable.$inferSelect) {
  let userName: string | null = null;
  if (a.userId) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, a.userId));
    userName = user?.name ?? null;
  }
  return {
    id: a.id, type: a.type, description: a.description,
    entityType: a.entityType, entityId: a.entityId, entityName: a.entityName,
    userId: a.userId, userName, metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/activities", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { entityType, entityId } = req.query as Record<string, string>;

  let conditions: any[] = [];
  if (entityType) conditions.push(eq(activitiesTable.entityType, entityType));
  if (entityId) conditions.push(eq(activitiesTable.entityId, parseInt(entityId, 10)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(activitiesTable).where(where).limit(limit).offset(offset).orderBy(desc(activitiesTable.createdAt)),
    db.select({ count: count() }).from(activitiesTable).where(where),
  ]);

  const data = await Promise.all(rows.map(formatActivity));
  res.json({ data, meta: buildMeta(Number(total), page, limit) });
});

router.post("/activities", requireAuth, async (req, res): Promise<void> => {
  const { type, description, entityType, entityId, metadata } = req.body;
  if (!type || !description) { res.status(400).json({ error: "type and description required" }); return; }
  const [activity] = await db.insert(activitiesTable).values({
    type, description, entityType, entityId, userId: req.user?.id, metadata,
  }).returning();
  res.status(201).json(await formatActivity(activity));
});

export default router;
