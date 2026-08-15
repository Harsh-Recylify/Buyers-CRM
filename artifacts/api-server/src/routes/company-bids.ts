import { Router } from "express";
import { db, companyBidsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router = Router();

router.get("/companies/:companyId/company-bids", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(req.params["companyId"] as string, 10);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid company id" }); return; }

  const rows = await db
    .select()
    .from(companyBidsTable)
    .where(eq(companyBidsTable.companyId, companyId))
    .orderBy(desc(companyBidsTable.bidAmount));

  const data = rows.map(r => ({
    ...r,
    bidAmount: Number(r.bidAmount),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  res.json({ data });
});

router.post("/companies/:companyId/company-bids", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(req.params["companyId"] as string, 10);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid company id" }); return; }

  const { buyerCompany, contactPerson, mobile, email, bidAmount, location, pickupTimeline, paymentTerms, remarks } = req.body;
  if (!buyerCompany || bidAmount === undefined || bidAmount === null) {
    res.status(400).json({ error: "buyerCompany and bidAmount are required" }); return;
  }

  const userId = (req as any).user?.id ?? null;

  const [row] = await db.insert(companyBidsTable).values({
    companyId,
    buyerCompany,
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
    description: `New bid received from ${buyerCompany}: ₹${Number(bidAmount).toLocaleString("en-IN")}`,
    entityType: "company",
    entityId: companyId,
    userId,
  });

  res.status(201).json({ ...row, bidAmount: Number(row.bidAmount), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.patch("/company-bids/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { buyerCompany, contactPerson, mobile, email, bidAmount, location, pickupTimeline, paymentTerms, remarks, status } = req.body;
  const updates: Record<string, any> = {};
  if (buyerCompany !== undefined) updates.buyerCompany = buyerCompany;
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
  res.json({ ...row, bidAmount: Number(row.bidAmount), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.delete("/company-bids/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(companyBidsTable).where(eq(companyBidsTable.id, id));
  res.status(204).send();
});

export default router;
