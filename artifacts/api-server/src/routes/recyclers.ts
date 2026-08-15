import { Router } from "express";
import { db, recyclersTable } from "@workspace/db";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";
import { logActivity } from "../lib/activity";

const router = Router();

function formatRecycler(r: typeof recyclersTable.$inferSelect) {
  return {
    id: r.id, name: r.name, company: r.company, phone: r.phone, email: r.email,
    gst: r.gst, cpcbAuth: r.cpcbAuth, spcbAuth: r.spcbAuth, certificates: r.certificates,
    address: r.address, materialCategories: r.materialCategories ?? [],
    capacity: r.capacity, pickupArea: r.pickupArea, paymentTerms: r.paymentTerms,
    notes: r.notes, status: r.status,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/recyclers", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string>;

  let conditions: any[] = [];
  if (q.search) conditions.push(ilike(recyclersTable.name, `%${q.search}%`));
  if (q.status) conditions.push(eq(recyclersTable.status, q.status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(recyclersTable).where(where).limit(limit).offset(offset).orderBy(desc(recyclersTable.createdAt)),
    db.select({ count: count() }).from(recyclersTable).where(where),
  ]);

  res.json({ data: rows.map(formatRecycler), meta: buildMeta(Number(total), page, limit) });
});

router.post("/recyclers", requireAuth, async (req, res): Promise<void> => {
  const { name, company, phone, email, gst, cpcbAuth, spcbAuth, certificates,
    address, materialCategories, capacity, pickupArea, paymentTerms, notes } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [recycler] = await db.insert(recyclersTable).values({
    name, company, phone, email, gst, cpcbAuth, spcbAuth, certificates,
    address, materialCategories: materialCategories ?? [],
    capacity, pickupArea, paymentTerms, notes,
  }).returning();
  await logActivity({ type: "recycler_added", description: `Recycler "${name}" was added`, entityType: "recycler", entityId: recycler.id, entityName: name, userId: req.user?.id });
  res.status(201).json(formatRecycler(recycler));
});

router.get("/recyclers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [r] = await db.select().from(recyclersTable).where(eq(recyclersTable.id, id));
  if (!r) { res.status(404).json({ error: "Recycler not found" }); return; }
  res.json(formatRecycler(r));
});

router.patch("/recyclers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, company, phone, email, gst, cpcbAuth, spcbAuth, certificates,
    address, materialCategories, capacity, pickupArea, paymentTerms, status, notes } = req.body;
  const [r] = await db.update(recyclersTable).set({
    name, company, phone, email, gst, cpcbAuth, spcbAuth, certificates,
    address, materialCategories, capacity, pickupArea, paymentTerms, status, notes,
  }).where(eq(recyclersTable.id, id)).returning();
  if (!r) { res.status(404).json({ error: "Recycler not found" }); return; }
  res.json(formatRecycler(r));
});

router.delete("/recyclers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(recyclersTable).where(eq(recyclersTable.id, id));
  res.sendStatus(204);
});

export default router;
