import { Router } from "express";
import { db, companyBidsTable, companiesTable, buyersTable, usersTable } from "@workspace/db";
import { eq, desc, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router = Router();

async function resolveBuyer(buyerId: number | null) {
  if (!buyerId) return { buyerCompany: null as string | null, buyerState: null as string | null, assignedToId: null as number | null, assignedToName: null as string | null };
  const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, buyerId));
  if (!buyer) return { buyerCompany: null, buyerState: null, assignedToId: null, assignedToName: null };
  let assignedToName: string | null = null;
  if (buyer.assignedToId) {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, buyer.assignedToId));
    assignedToName = user?.name ?? null;
  }
  return {
    buyerCompany: buyer.company || buyer.name,
    buyerState: buyer.state ?? null,
    assignedToId: buyer.assignedToId ?? null,
    assignedToName,
  };
}

function formatRow(r: typeof companyBidsTable.$inferSelect, buyerInfo: Awaited<ReturnType<typeof resolveBuyer>>, extra: Record<string, unknown> = {}) {
  return {
    ...r,
    buyerCompany: buyerInfo.buyerCompany ?? r.buyerCompany,
    buyerState: buyerInfo.buyerState,
    assignedToId: buyerInfo.assignedToId,
    assignedToName: buyerInfo.assignedToName,
    bidAmount: Number(r.bidAmount),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    ...extra,
  };
}

// All company bids across every (non-deleted) company — powers the global
// Bids view, which otherwise only showed the separate, unrelated `bids`
// table and never surfaced bids added directly from a company's own page.
router.get("/company-bids", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: companyBidsTable.id,
      companyId: companyBidsTable.companyId,
      buyerId: companyBidsTable.buyerId,
      buyerCompany: companyBidsTable.buyerCompany,
      contactPerson: companyBidsTable.contactPerson,
      mobile: companyBidsTable.mobile,
      email: companyBidsTable.email,
      bidAmount: companyBidsTable.bidAmount,
      location: companyBidsTable.location,
      pickupTimeline: companyBidsTable.pickupTimeline,
      paymentTerms: companyBidsTable.paymentTerms,
      remarks: companyBidsTable.remarks,
      status: companyBidsTable.status,
      createdById: companyBidsTable.createdById,
      createdAt: companyBidsTable.createdAt,
      updatedAt: companyBidsTable.updatedAt,
      companyName: companiesTable.name,
    })
    .from(companyBidsTable)
    .innerJoin(companiesTable, eq(companiesTable.id, companyBidsTable.companyId))
    .where(isNull(companiesTable.deletedAt))
    .orderBy(desc(companyBidsTable.createdAt));

  const data = await Promise.all(rows.map(async r => {
    const buyerInfo = await resolveBuyer(r.buyerId);
    return formatRow(r as any, buyerInfo, { companyName: r.companyName });
  }));

  res.json({ data });
});

router.get("/companies/:companyId/company-bids", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(req.params["companyId"] as string, 10);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid company id" }); return; }

  const rows = await db
    .select()
    .from(companyBidsTable)
    .where(eq(companyBidsTable.companyId, companyId))
    .orderBy(desc(companyBidsTable.bidAmount));

  const data = await Promise.all(rows.map(async r => formatRow(r, await resolveBuyer(r.buyerId))));

  res.json({ data });
});

router.post("/companies/:companyId/company-bids", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(req.params["companyId"] as string, 10);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid company id" }); return; }

  const { buyerId, contactPerson, mobile, email, bidAmount, location, pickupTimeline, paymentTerms, remarks } = req.body;
  if (!buyerId || bidAmount === undefined || bidAmount === null) {
    res.status(400).json({ error: "buyerId and bidAmount are required" }); return;
  }

  const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, buyerId));
  if (!buyer) { res.status(400).json({ error: "Buyer not found" }); return; }

  const userId = (req as any).user?.id ?? null;

  const [row] = await db.insert(companyBidsTable).values({
    companyId,
    buyerId,
    buyerCompany: buyer.company || buyer.name,
    contactPerson: contactPerson ?? null,
    mobile: mobile ?? null,
    email: email ?? null,
    bidAmount: String(bidAmount),
    location: location ?? null,
    pickupTimeline: pickupTimeline ?? null,
    paymentTerms: paymentTerms ?? null,
    remarks: remarks ?? null,
    status: "pending",
    createdById: userId,
  }).returning();

  await logActivity({
    type: "bid_received",
    description: `New bid received from ${row.buyerCompany}: ₹${Number(bidAmount).toLocaleString("en-IN")}`,
    entityType: "company",
    entityId: companyId,
    userId,
  });

  res.status(201).json(formatRow(row, await resolveBuyer(row.buyerId)));
});

router.patch("/company-bids/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { buyerId, contactPerson, mobile, email, bidAmount, location, pickupTimeline, paymentTerms, remarks, status } = req.body;
  const updates: Record<string, any> = {};
  if (buyerId !== undefined) {
    const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, buyerId));
    if (!buyer) { res.status(400).json({ error: "Buyer not found" }); return; }
    updates.buyerId = buyerId;
    updates.buyerCompany = buyer.company || buyer.name;
  }
  if (contactPerson !== undefined) updates.contactPerson = contactPerson;
  if (mobile !== undefined) updates.mobile = mobile;
  if (email !== undefined) updates.email = email;
  if (bidAmount !== undefined) updates.bidAmount = String(bidAmount);
  if (location !== undefined) updates.location = location;
  if (pickupTimeline !== undefined) updates.pickupTimeline = pickupTimeline;
  if (paymentTerms !== undefined) updates.paymentTerms = paymentTerms;
  if (remarks !== undefined) updates.remarks = remarks;
  if (status !== undefined) updates.status = status;

  const [row] = await db.update(companyBidsTable).set(updates).where(eq(companyBidsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatRow(row, await resolveBuyer(row.buyerId)));
});

router.delete("/company-bids/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(companyBidsTable).where(eq(companyBidsTable.id, id));
  res.status(204).send();
});

export default router;
