import { Router } from "express";
import { db, pipelineBoardsTable, pipelineStagesTable, companiesTable } from "@workspace/db";
import { eq, asc, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

const DEFAULT_STAGES = [
  { name: "New Lead", color: "#3b82f6", position: 0 },
  { name: "Contacted", color: "#8b5cf6", position: 1 },
  { name: "Meeting Scheduled", color: "#f59e0b", position: 2 },
  { name: "Site Inspection", color: "#14b8a6", position: 3 },
  { name: "Quotation Sent", color: "#6366f1", position: 4 },
  { name: "Bid Open", color: "#ec4899", position: 5 },
  { name: "Negotiation", color: "#0ea5e9", position: 6 },
  { name: "Approved", color: "#22c55e", position: 7 },
  { name: "Pickup Scheduled", color: "#f97316", position: 8 },
  { name: "Material Collected", color: "#a855f7", position: 9 },
  { name: "Completed", color: "#10b981", position: 10 },
  { name: "Won", color: "#16a34a", position: 11 },
  { name: "Lost", color: "#6b7280", position: 12 },
];

async function ensureDefaultBoard() {
  const existing = await db.select().from(pipelineBoardsTable).limit(1);
  if (existing.length > 0) return existing[0]!;

  const [board] = await db.insert(pipelineBoardsTable).values({
    name: "Main Pipeline",
    color: "#118847",
    isDefault: true,
  }).returning();

  await db.insert(pipelineStagesTable).values(
    DEFAULT_STAGES.map(s => ({ boardId: board!.id, ...s }))
  );

  return board!;
}

function formatBoard(b: typeof pipelineBoardsTable.$inferSelect) {
  return {
    id: b.id, name: b.name, color: b.color, isDefault: b.isDefault,
    createdById: b.createdById,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
  };
}

function formatStage(s: typeof pipelineStagesTable.$inferSelect) {
  return {
    id: s.id, boardId: s.boardId, name: s.name, color: s.color,
    position: s.position,
    createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(),
  };
}

// ── BOARDS ──────────────────────────────────────────────────────────────────

router.get("/pipeline/boards", requireAuth, async (req, res): Promise<void> => {
  await ensureDefaultBoard();
  const boards = await db.select().from(pipelineBoardsTable).orderBy(asc(pipelineBoardsTable.createdAt));
  res.json({ data: boards.map(formatBoard) });
});

router.post("/pipeline/boards", requireAuth, async (req, res): Promise<void> => {
  const { name, color } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const userId = (req as any).user?.id ?? null;
  const [board] = await db.insert(pipelineBoardsTable).values({
    name, color: color ?? "#118847", isDefault: false, createdById: userId,
  }).returning();
  res.status(201).json(formatBoard(board!));
});

router.patch("/pipeline/boards/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, color } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  const [board] = await db.update(pipelineBoardsTable).set(updates).where(eq(pipelineBoardsTable.id, id)).returning();
  if (!board) { res.status(404).json({ error: "Board not found" }); return; }
  res.json(formatBoard(board));
});

router.delete("/pipeline/boards/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [board] = await db.select().from(pipelineBoardsTable).where(eq(pipelineBoardsTable.id, id));
  if (!board) { res.status(404).json({ error: "Board not found" }); return; }
  if (board.isDefault) { res.status(400).json({ error: "Cannot delete the default board" }); return; }
  await db.delete(pipelineStagesTable).where(eq(pipelineStagesTable.boardId, id));
  await db.delete(pipelineBoardsTable).where(eq(pipelineBoardsTable.id, id));
  res.status(204).send();
});

// ── STAGES ──────────────────────────────────────────────────────────────────

router.get("/pipeline/boards/:boardId/stages", requireAuth, async (req, res): Promise<void> => {
  const boardId = parseInt(req.params["boardId"] as string, 10);
  if (isNaN(boardId)) { res.status(400).json({ error: "Invalid boardId" }); return; }
  const stages = await db.select().from(pipelineStagesTable)
    .where(eq(pipelineStagesTable.boardId, boardId))
    .orderBy(asc(pipelineStagesTable.position));
  res.json({ data: stages.map(formatStage) });
});

router.post("/pipeline/boards/:boardId/stages", requireAuth, async (req, res): Promise<void> => {
  const boardId = parseInt(req.params["boardId"] as string, 10);
  if (isNaN(boardId)) { res.status(400).json({ error: "Invalid boardId" }); return; }
  const { name, color, position } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const existing = await db.select().from(pipelineStagesTable)
    .where(eq(pipelineStagesTable.boardId, boardId))
    .orderBy(asc(pipelineStagesTable.position));
  const pos = position ?? (existing.length > 0 ? existing[existing.length - 1]!.position + 1 : 0);

  const [stage] = await db.insert(pipelineStagesTable).values({
    boardId, name, color: color ?? "#6b7280", position: pos,
  }).returning();
  res.status(201).json(formatStage(stage!));
});

router.patch("/pipeline/stages/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, color, position } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (position !== undefined) updates.position = position;
  const [stage] = await db.update(pipelineStagesTable).set(updates).where(eq(pipelineStagesTable.id, id)).returning();
  if (!stage) { res.status(404).json({ error: "Stage not found" }); return; }
  res.json(formatStage(stage));
});

router.delete("/pipeline/stages/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [stage] = await db.select().from(pipelineStagesTable).where(eq(pipelineStagesTable.id, id));
  if (!stage) { res.status(404).json({ error: "Stage not found" }); return; }
  await db.delete(pipelineStagesTable).where(eq(pipelineStagesTable.id, id));
  res.status(204).send();
});

// ── PIPELINE DATA (per board) ────────────────────────────────────────────────

export { ensureDefaultBoard };
export default router;
