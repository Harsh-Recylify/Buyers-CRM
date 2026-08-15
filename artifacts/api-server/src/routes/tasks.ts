import { Router } from "express";
import { db, tasksTable, taskCommentsTable, usersTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";

const router = Router();

async function formatTask(t: typeof tasksTable.$inferSelect) {
  let assignedToName: string | null = null;
  let entityName: string | null = null;
  if (t.assignedToId) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, t.assignedToId));
    assignedToName = user?.name ?? null;
  }
  return {
    id: t.id, title: t.title, description: t.description,
    status: t.status, priority: t.priority, entityType: t.entityType,
    entityId: t.entityId, entityName, assignedToId: t.assignedToId, assignedToName,
    dueDate: t.dueDate, reminderAt: t.reminderAt,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string>;

  let conditions: any[] = [];
  if (q.assignedTo) conditions.push(eq(tasksTable.assignedToId, parseInt(q.assignedTo, 10)));
  if (q.status) conditions.push(eq(tasksTable.status, q.status));
  if (q.priority) conditions.push(eq(tasksTable.priority, q.priority));
  if (q.entityType) conditions.push(eq(tasksTable.entityType, q.entityType));
  if (q.entityId) conditions.push(eq(tasksTable.entityId, parseInt(q.entityId, 10)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(tasksTable).where(where).limit(limit).offset(offset).orderBy(desc(tasksTable.createdAt)),
    db.select({ count: count() }).from(tasksTable).where(where),
  ]);

  const data = await Promise.all(rows.map(formatTask));
  res.json({ data, meta: buildMeta(Number(total), page, limit) });
});

router.post("/tasks", requireAuth, async (req, res): Promise<void> => {
  const { title, description, priority, entityType, entityId, assignedToId, dueDate, reminderAt } = req.body;
  if (!title) { res.status(400).json({ error: "Title required" }); return; }
  const [task] = await db.insert(tasksTable).values({
    title, description, priority: priority ?? "medium",
    entityType, entityId, assignedToId, createdById: req.user?.id, dueDate, reminderAt,
  }).returning();
  res.status(201).json(await formatTask(task));
});

router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(await formatTask(task));
});

router.patch("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, description, status, priority, assignedToId, dueDate, reminderAt } = req.body;
  const completedAt = status === "done" ? new Date() : undefined;
  const [task] = await db.update(tasksTable)
    .set({ title, description, status, priority, assignedToId, dueDate, reminderAt, completedAt })
    .where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(await formatTask(task));
});

router.delete("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.sendStatus(204);
});

router.get("/tasks/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const taskId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const comments = await db.select().from(taskCommentsTable).where(eq(taskCommentsTable.taskId, taskId));
  const data = await Promise.all(comments.map(async c => {
    let authorName: string | null = null;
    if (c.authorId) {
      const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, c.authorId));
      authorName = user?.name ?? null;
    }
    return { id: c.id, taskId: c.taskId, content: c.content, authorId: c.authorId, authorName, createdAt: c.createdAt.toISOString() };
  }));
  res.json(data);
});

router.post("/tasks/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const taskId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }
  const [comment] = await db.insert(taskCommentsTable).values({
    taskId, content, authorId: req.user?.id,
  }).returning();
  let authorName: string | null = null;
  if (comment.authorId) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, comment.authorId));
    authorName = user?.name ?? null;
  }
  res.status(201).json({ id: comment.id, taskId: comment.taskId, content: comment.content, authorId: comment.authorId, authorName, createdAt: comment.createdAt.toISOString() });
});

export default router;
