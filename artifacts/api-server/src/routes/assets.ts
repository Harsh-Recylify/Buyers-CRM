import { Router } from "express";
import { db, assetsTable, companiesTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";

const router = Router();

async function formatAsset(a: typeof assetsTable.$inferSelect) {
  let companyName: string | null = null;
  const [co] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, a.companyId));
  companyName = co?.name ?? null;
  return {
    id: a.id, companyId: a.companyId, companyName, category: a.category,
    description: a.description, quantity: a.quantity, condition: a.condition,
    estimatedWeight: a.estimatedWeight ? Number(a.estimatedWeight) : null,
    estimatedValue: a.estimatedValue ? Number(a.estimatedValue) : null,
    status: a.status, notes: a.notes,
    createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
  };
}

router.get("/assets", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { companyId } = req.query as Record<string, string>;

  const where = companyId ? eq(assetsTable.companyId, parseInt(companyId, 10)) : undefined;
  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(assetsTable).where(where).limit(limit).offset(offset).orderBy(desc(assetsTable.createdAt)),
    db.select({ count: count() }).from(assetsTable).where(where),
  ]);

  const data = await Promise.all(rows.map(formatAsset));
  res.json({ data, meta: buildMeta(Number(total), page, limit) });
});

router.post("/assets", requireAuth, async (req, res): Promise<void> => {
  const { companyId, category, description, quantity, condition, estimatedWeight, estimatedValue, notes } = req.body;
  if (!companyId || !category) { res.status(400).json({ error: "companyId and category required" }); return; }
  const [asset] = await db.insert(assetsTable).values({
    companyId, category, description, quantity: quantity ?? 1, condition,
    estimatedWeight: estimatedWeight?.toString(),
    estimatedValue: estimatedValue?.toString(), notes,
  }).returning();
  res.status(201).json(await formatAsset(asset));
});

router.get("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, id));
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(await formatAsset(asset));
});

router.patch("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { category, description, quantity, condition, estimatedWeight, estimatedValue, status, notes } = req.body;
  const [asset] = await db.update(assetsTable).set({
    category, description, quantity, condition,
    estimatedWeight: estimatedWeight?.toString(),
    estimatedValue: estimatedValue?.toString(), status, notes,
  }).where(eq(assetsTable.id, id)).returning();
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(await formatAsset(asset));
});

router.delete("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(assetsTable).where(eq(assetsTable.id, id));
  res.sendStatus(204);
});

export default router;
