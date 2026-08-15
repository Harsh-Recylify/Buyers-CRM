import { Router } from "express";
import { db, filesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function formatFile(f: typeof filesTable.$inferSelect) {
  let uploadedByName: string | null = null;
  if (f.uploadedById) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, f.uploadedById));
    uploadedByName = user?.name ?? null;
  }
  return {
    id: f.id, entityType: f.entityType, entityId: f.entityId,
    filename: f.filename, originalName: f.originalName, mimeType: f.mimeType,
    size: f.size, url: f.url, uploadedById: f.uploadedById, uploadedByName,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/files", requireAuth, async (req, res): Promise<void> => {
  const { entityType, entityId } = req.query as Record<string, string>;
  let conditions: any[] = [];
  if (entityType) conditions.push(eq(filesTable.entityType, entityType));
  if (entityId) conditions.push(eq(filesTable.entityId, parseInt(entityId, 10)));
  const files = await db.select().from(filesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(filesTable.createdAt);
  const data = await Promise.all(files.map(formatFile));
  res.json(data);
});

router.post("/files", requireAuth, async (req, res): Promise<void> => {
  const { entityType, entityId, filename, originalName, mimeType, size, url } = req.body;
  if (!entityType || !entityId || !filename || !url) {
    res.status(400).json({ error: "entityType, entityId, filename, url required" });
    return;
  }
  const [file] = await db.insert(filesTable).values({
    entityType, entityId, filename, originalName: originalName ?? filename,
    mimeType: mimeType ?? "application/octet-stream", size: size ?? 0, url,
    uploadedById: req.user?.id,
  }).returning();
  res.status(201).json(await formatFile(file));
});

router.delete("/files/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(filesTable).where(eq(filesTable.id, id));
  res.sendStatus(204);
});

export default router;
