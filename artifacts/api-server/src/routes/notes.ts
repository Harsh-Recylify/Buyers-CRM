import { Router } from "express";
import { db, notesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function formatNote(n: typeof notesTable.$inferSelect) {
  let authorName: string | null = null;
  if (n.authorId) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, n.authorId));
    authorName = user?.name ?? null;
  }
  return {
    id: n.id, entityType: n.entityType, entityId: n.entityId,
    content: n.content, authorId: n.authorId, authorName,
    createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString(),
  };
}

router.get("/notes", requireAuth, async (req, res): Promise<void> => {
  const { entityType, entityId } = req.query as Record<string, string>;
  let conditions: any[] = [];
  if (entityType) conditions.push(eq(notesTable.entityType, entityType));
  if (entityId) conditions.push(eq(notesTable.entityId, parseInt(entityId, 10)));
  const notes = await db.select().from(notesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(notesTable.createdAt);
  const data = await Promise.all(notes.map(formatNote));
  res.json(data);
});

router.post("/notes", requireAuth, async (req, res): Promise<void> => {
  const { entityType, entityId, content } = req.body;
  if (!entityType || !entityId || !content) {
    res.status(400).json({ error: "entityType, entityId, content required" });
    return;
  }
  const [note] = await db.insert(notesTable).values({
    entityType, entityId, content, authorId: req.user?.id,
  }).returning();
  res.status(201).json(await formatNote(note));
});

router.patch("/notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { content } = req.body;
  const [note] = await db.update(notesTable).set({ content }).where(eq(notesTable.id, id)).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  res.json(await formatNote(note));
});

router.delete("/notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(notesTable).where(eq(notesTable.id, id));
  res.sendStatus(204);
});

export default router;
