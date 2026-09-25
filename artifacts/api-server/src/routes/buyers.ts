import { Router } from "express";
import { db, buyersTable, usersTable, bidQuotesTable, bidsTable, companyBidsTable } from "@workspace/db";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";
import { logActivity } from "../lib/activity";

const router = Router();

async function formatBuyer(b: typeof buyersTable.$inferSelect) {
  let assignedToName: string | null = null;
  if (b.assignedToId) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, b.assignedToId));
    assignedToName = user?.name ?? null;
  }
  return {
    id: b.id, name: b.name, company: b.company, phone: b.phone, email: b.email,
    gst: b.gst, state: b.state, city: b.city, address: b.address,
    materialCategories: b.materialCategories ?? [],
    preferredMaterials: b.preferredMaterials,
    pickupStates: b.pickupStates ?? [],
    buyerType: b.buyerType, assignedToId: b.assignedToId, assignedToName,
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
  if (q.buyerType) conditions.push(eq(buyersTable.buyerType, q.buyerType));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(buyersTable).where(where).limit(limit).offset(offset).orderBy(desc(buyersTable.createdAt)),
    db.select({ count: count() }).from(buyersTable).where(where),
  ]);

  res.json({ data: await Promise.all(rows.map(formatBuyer)), meta: buildMeta(Number(total), page, limit) });
});

router.post("/buyers", requireAuth, async (req, res): Promise<void> => {
  const { name, company, phone, email, gst, state, city, address,
    materialCategories, preferredMaterials, pickupStates,
    buyerType, assignedToId, rating, notes } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [buyer] = await db.insert(buyersTable).values({
    name, company, phone, email, gst, state, city, address,
    materialCategories: materialCategories ?? [],
    preferredMaterials, pickupStates: pickupStates ?? [],
    buyerType, assignedToId, rating: (rating ?? 0).toString(), notes,
  }).returning();
  await logActivity({ type: "buyer_added", description: `Buyer "${name}" was added`, entityType: "buyer", entityId: buyer.id, entityName: name, userId: req.user?.id });
  res.status(201).json(await formatBuyer(buyer));
});

router.post("/buyers/import", requireAuth, async (req, res): Promise<void> => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) { res.status(400).json({ error: "rows array is required" }); return; }

  // Resolved server-side (rather than via GET /users, which is admin-only)
  // so team members without user-management access can still import buyers
  // and have "Assigned Team Member" names matched to real accounts.
  const allUsers = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
  const userByName = new Map<string, number>();
  for (const u of allUsers) {
    const key = u.name.trim().toLowerCase();
    if (!userByName.has(key)) userByName.set(key, u.id);
  }

  const errors: { row: number; name: string | null; error: string }[] = [];
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? {};
    const rowNum = i + 2; // +2 accounts for the header row in the spreadsheet
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) {
      failed++;
      errors.push({ row: rowNum, name: null, error: "Buyer Name is required" });
      continue;
    }

    let assignedToId: number | null = null;
    const assignedRaw = typeof r.assignedTeamMember === "string" ? r.assignedTeamMember.trim() : "";
    if (assignedRaw) {
      const match = userByName.get(assignedRaw.toLowerCase());
      if (match) {
        assignedToId = match;
      } else {
        errors.push({ row: rowNum, name, error: `Team member "${assignedRaw}" not found — imported without assignment` });
      }
    }

    await db.insert(buyersTable).values({
      name,
      company: typeof r.company === "string" && r.company.trim() ? r.company.trim() : null,
      phone: typeof r.phone === "string" && r.phone.trim() ? r.phone.trim() : null,
      city: typeof r.city === "string" && r.city.trim() ? r.city.trim() : null,
      assignedToId,
    });
    imported++;
  }

  if (imported > 0) {
    await logActivity({
      type: "buyer_added",
      description: `Imported ${imported} buyer${imported === 1 ? "" : "s"} from spreadsheet`,
      userId: req.user?.id,
    });
  }

  res.json({ imported, failed, errors });
});

router.get("/buyers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, id));
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  res.json(await formatBuyer(buyer));
});

router.patch("/buyers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, company, phone, email, gst, state, city, address,
    materialCategories, preferredMaterials, pickupStates,
    buyerType, assignedToId, rating, status, notes } = req.body;
  const [buyer] = await db.update(buyersTable).set({
    name, company, phone, email, gst, state, city, address,
    materialCategories, preferredMaterials, pickupStates,
    buyerType, assignedToId,
    rating: rating !== undefined ? rating.toString() : undefined, status, notes,
  }).where(eq(buyersTable.id, id)).returning();
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  res.json(await formatBuyer(buyer));
});

router.delete("/buyers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  // Deactivate, don't hard-delete — the confirmation dialog promises "this
  // action will deactivate the buyer, bid history will be preserved", but a
  // real delete here would silently orphan bid_quotes.buyer_id and
  // bids.winning_buyer_id on every bid this buyer was ever involved in.
  const [buyer] = await db.update(buyersTable).set({ status: "inactive" }).where(eq(buyersTable.id, id)).returning();
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  res.sendStatus(204);
});

router.delete("/buyers/:id/permanent", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, id));
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }

  // Permanent delete is only safe when nothing references this buyer —
  // otherwise it silently orphans bid_quotes.buyer_id, bids.winning_buyer_id,
  // and company_bids.buyer_id on every bid this buyer was ever involved in.
  const [[quote], [wonBid], [companyBid]] = await Promise.all([
    db.select({ id: bidQuotesTable.id }).from(bidQuotesTable).where(eq(bidQuotesTable.buyerId, id)).limit(1),
    db.select({ id: bidsTable.id }).from(bidsTable).where(eq(bidsTable.winningBuyerId, id)).limit(1),
    db.select({ id: companyBidsTable.id }).from(companyBidsTable).where(eq(companyBidsTable.buyerId, id)).limit(1),
  ]);
  if (quote || wonBid || companyBid) {
    res.status(409).json({ error: "This buyer has bid history and can't be permanently deleted. Deactivate it instead to preserve that history." });
    return;
  }

  await db.delete(buyersTable).where(eq(buyersTable.id, id));
  await logActivity({
    type: "buyer_deleted",
    description: `Buyer "${buyer.name}" was permanently deleted`,
    entityType: "buyer", entityName: buyer.name, userId: req.user?.id,
  });
  res.sendStatus(204);
});

export default router;
