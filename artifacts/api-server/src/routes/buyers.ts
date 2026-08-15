import { Router } from "express";
import { db, buyersTable } from "@workspace/db";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";
import { logActivity } from "../lib/activity";

const router = Router();

function formatBuyer(b: typeof buyersTable.$inferSelect) {
  return {
    id: b.id, name: b.name, company: b.company, phone: b.phone, email: b.email,
    gst: b.gst, pan: b.pan, state: b.state, city: b.city, address: b.address,
    materialCategories: b.materialCategories ?? [],
    maxBid: b.maxBid ? Number(b.maxBid) : null,
    preferredMaterials: b.preferredMaterials,
    pickupStates: b.pickupStates ?? [],
    paymentTerms: b.paymentTerms,
    rating: Number(b.rating), status: b.status, notes: b.notes,
    totalBids: b.totalBids, wonBids: b.wonBids,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
  };
}

router.get("/buyers", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string>;

  let conditions: any[] = [];
  if (q.search) conditions.push(ilike(buyersTable.name, `%${q.search}%`));
  if (q.status) conditions.push(eq(buyersTable.status, q.status));
  if (q.state) conditions.push(eq(buyersTable.state, q.state));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(buyersTable).where(where).limit(limit).offset(offset).orderBy(desc(buyersTable.createdAt)),
    db.select({ count: count() }).from(buyersTable).where(where),
  ]);

  res.json({ data: rows.map(formatBuyer), meta: buildMeta(Number(total), page, limit) });
});

router.post("/buyers", requireAuth, async (req, res): Promise<void> => {
  const { name, company, phone, email, gst, pan, state, city, address,
    materialCategories, maxBid, preferredMaterials, pickupStates,
    paymentTerms, rating, notes } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [buyer] = await db.insert(buyersTable).values({
    name, company, phone, email, gst, pan, state, city, address,
    materialCategories: materialCategories ?? [],
    maxBid: maxBid?.toString(),
    preferredMaterials, pickupStates: pickupStates ?? [],
    paymentTerms, rating: (rating ?? 0).toString(), notes,
  }).returning();
  await logActivity({ type: "buyer_added", description: `Buyer "${name}" was added`, entityType: "buyer", entityId: buyer.id, entityName: name, userId: req.user?.id });
  res.status(201).json(formatBuyer(buyer));
});

router.get("/buyers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, id));
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  res.json(formatBuyer(buyer));
});

router.patch("/buyers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, company, phone, email, gst, pan, state, city, address,
    materialCategories, maxBid, preferredMaterials, pickupStates,
    paymentTerms, rating, status, notes } = req.body;
  const [buyer] = await db.update(buyersTable).set({
    name, company, phone, email, gst, pan, state, city, address,
    materialCategories, maxBid: maxBid?.toString(),
    preferredMaterials, pickupStates, paymentTerms,
    rating: rating !== undefined ? rating.toString() : undefined, status, notes,
  }).where(eq(buyersTable.id, id)).returning();
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  res.json(formatBuyer(buyer));
});

router.delete("/buyers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(buyersTable).where(eq(buyersTable.id, id));
  res.sendStatus(204);
});

export default router;
