import { Router } from "express";
import { db, bidsTable, bidQuotesTable, bidHistoryTable, companiesTable, buyersTable, usersTable } from "@workspace/db";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";
import { logActivity } from "../lib/activity";

const router = Router();

async function formatBid(b: typeof bidsTable.$inferSelect) {
  const [co] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, b.companyId));
  let winningBuyerName: string | null = null;
  let createdByName: string | null = null;
  if (b.winningBuyerId) {
    const [buyer] = await db.select({ name: buyersTable.name }).from(buyersTable).where(eq(buyersTable.id, b.winningBuyerId));
    winningBuyerName = buyer?.name ?? null;
  }
  if (b.createdById) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, b.createdById));
    createdByName = user?.name ?? null;
  }
  const quotes = await db.select({ amount: bidQuotesTable.amount }).from(bidQuotesTable).where(eq(bidQuotesTable.bidId, b.id));
  const amounts = quotes.map(q => Number(q.amount));
  const highestBid = amounts.length ? Math.max(...amounts) : null;
  const lowestBid = amounts.length ? Math.min(...amounts) : null;
  const averageBid = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : null;
  return {
    id: b.id, title: b.title, companyId: b.companyId, companyName: co?.name ?? null,
    status: b.status, description: b.description, expiryDate: b.expiryDate,
    winningBuyerId: b.winningBuyerId, winningBuyerName,
    winningAmount: b.winningAmount ? Number(b.winningAmount) : null,
    highestBid, lowestBid, averageBid, totalQuotes: quotes.length,
    createdById: b.createdById, createdByName,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
  };
}

router.get("/bids", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string>;

  let conditions: any[] = [];
  if (q.companyId) conditions.push(eq(bidsTable.companyId, parseInt(q.companyId, 10)));
  if (q.status) conditions.push(eq(bidsTable.status, q.status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(bidsTable).where(where).limit(limit).offset(offset).orderBy(desc(bidsTable.createdAt)),
    db.select({ count: count() }).from(bidsTable).where(where),
  ]);

  const data = await Promise.all(rows.map(formatBid));
  res.json({ data, meta: buildMeta(Number(total), page, limit) });
});

router.post("/bids", requireAuth, async (req, res): Promise<void> => {
  const { title, companyId, description, expiryDate, buyerIds } = req.body;
  if (!title || !companyId) { res.status(400).json({ error: "title and companyId required" }); return; }
  const [bid] = await db.insert(bidsTable).values({
    title, companyId, description, expiryDate, createdById: req.user?.id,
  }).returning();
  await db.insert(bidHistoryTable).values({ bidId: bid.id, action: "created", description: `Bid "${title}" was created`, userId: req.user?.id });
  await logActivity({ type: "bid_created", description: `Bid "${title}" was created`, entityType: "bid", entityId: bid.id, entityName: title, userId: req.user?.id });
  res.status(201).json(await formatBid(bid));
});

router.get("/bids/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, id));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }
  res.json(await formatBid(bid));
});

router.patch("/bids/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, description, status, expiryDate } = req.body;
  const [existing] = await db.select().from(bidsTable).where(eq(bidsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Bid not found" }); return; }
  const [bid] = await db.update(bidsTable).set({ title, description, status, expiryDate }).where(eq(bidsTable.id, id)).returning();
  if (status && status !== existing.status) {
    await db.insert(bidHistoryTable).values({ bidId: id, action: "status_changed", description: `Status changed from "${existing.status}" to "${status}"`, userId: req.user?.id, oldValue: existing.status, newValue: status });
  }
  res.json(await formatBid(bid));
});

router.delete("/bids/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(bidsTable).where(eq(bidsTable.id, id));
  res.sendStatus(204);
});

router.get("/bids/:id/quotes", requireAuth, async (req, res): Promise<void> => {
  const bidId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const quotes = await db.select().from(bidQuotesTable).where(eq(bidQuotesTable.bidId, bidId));
  const data = await Promise.all(quotes.map(async q => {
    const [buyer] = await db.select({ name: buyersTable.name }).from(buyersTable).where(eq(buyersTable.id, q.buyerId));
    return {
      id: q.id, bidId: q.bidId, buyerId: q.buyerId, buyerName: buyer?.name ?? null,
      amount: Number(q.amount), counterOffer: q.counterOffer ? Number(q.counterOffer) : null,
      status: q.status, notes: q.notes, createdAt: q.createdAt.toISOString(),
    };
  }));
  res.json(data);
});

router.post("/bids/:id/quotes", requireAuth, async (req, res): Promise<void> => {
  const bidId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { buyerId, amount, counterOffer, notes } = req.body;
  if (!buyerId || !amount) { res.status(400).json({ error: "buyerId and amount required" }); return; }
  const [quote] = await db.insert(bidQuotesTable).values({
    bidId, buyerId, amount: amount.toString(), counterOffer: counterOffer?.toString(), notes,
  }).returning();
  await db.insert(bidHistoryTable).values({ bidId, action: "quote_received", description: `Quote of ₹${amount} received from buyer`, userId: req.user?.id, newValue: amount.toString() });
  const [buyer] = await db.select({ name: buyersTable.name }).from(buyersTable).where(eq(buyersTable.id, buyerId));
  res.status(201).json({
    id: quote.id, bidId: quote.bidId, buyerId: quote.buyerId, buyerName: buyer?.name ?? null,
    amount: Number(quote.amount), counterOffer: quote.counterOffer ? Number(quote.counterOffer) : null,
    status: quote.status, notes: quote.notes, createdAt: quote.createdAt.toISOString(),
  });
});

router.post("/bids/:id/award", requireAuth, async (req, res): Promise<void> => {
  const bidId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { buyerId, amount } = req.body;
  if (!buyerId || !amount) { res.status(400).json({ error: "buyerId and amount required" }); return; }
  const [bid] = await db.update(bidsTable).set({
    winningBuyerId: buyerId, winningAmount: amount.toString(), status: "awarded",
  }).where(eq(bidsTable.id, bidId)).returning();
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }
  await db.update(bidQuotesTable).set({ status: "accepted" }).where(and(eq(bidQuotesTable.bidId, bidId), eq(bidQuotesTable.buyerId, buyerId)));
  await db.update(buyersTable).set({ wonBids: sql`${buyersTable.wonBids} + 1` }).where(eq(buyersTable.id, buyerId));
  await db.insert(bidHistoryTable).values({ bidId, action: "awarded", description: `Bid awarded to buyer with amount ₹${amount}`, userId: req.user?.id, newValue: amount.toString() });
  res.json(await formatBid(bid));
});

router.get("/bids/:id/history", requireAuth, async (req, res): Promise<void> => {
  const bidId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const history = await db.select().from(bidHistoryTable).where(eq(bidHistoryTable.bidId, bidId)).orderBy(desc(bidHistoryTable.createdAt));
  const data = await Promise.all(history.map(async h => {
    let userName: string | null = null;
    if (h.userId) {
      const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, h.userId));
      userName = user?.name ?? null;
    }
    return { id: h.id, bidId: h.bidId, action: h.action, description: h.description, userId: h.userId, userName, oldValue: h.oldValue, newValue: h.newValue, createdAt: h.createdAt.toISOString() };
  }));
  res.json(data);
});

export default router;
