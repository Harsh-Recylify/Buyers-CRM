import { Router } from "express";
import { db, companiesTable, usersTable } from "@workspace/db";
import { eq, ilike, or, count, and, isNull, desc, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { parsePagination, buildMeta } from "../lib/pagination";
import { logActivity, logAudit } from "../lib/activity";

const router = Router();

async function formatCompany(c: typeof companiesTable.$inferSelect) {
  let ownerName: string | null = null;
  let assignedManagerName: string | null = null;
  if (c.ownerId) {
    const [owner] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, c.ownerId));
    ownerName = owner?.name ?? null;
  }
  if (c.assignedManagerId) {
    const [mgr] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, c.assignedManagerId));
    assignedManagerName = mgr?.name ?? null;
  }
  return {
    id: c.id, name: c.name, industry: c.industry, website: c.website,
    gst: c.gst, pan: c.pan, address: c.address, state: c.state, city: c.city,
    pincode: c.pincode, leadSource: c.leadSource, ownerId: c.ownerId, ownerName,
    assignedManagerId: c.assignedManagerId, assignedManagerName,
    stage: c.stage, priority: c.priority, status: c.status,
    expectedScrapWeight: c.expectedScrapWeight ? Number(c.expectedScrapWeight) : null,
    expectedRevenue: c.expectedRevenue ? Number(c.expectedRevenue) : null,
    expectedPickupDate: c.expectedPickupDate, notes: c.notes,
    deletedAt: c.deletedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/companies", requireAuth, async (req, res): Promise<void> => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string>;

  let conditions: ReturnType<typeof and>[] = [isNull(companiesTable.deletedAt)];
  if (q.search) conditions.push(ilike(companiesTable.name, `%${q.search}%`) as any);
  if (q.stage) conditions.push(eq(companiesTable.stage, q.stage) as any);
  if (q.priority) conditions.push(eq(companiesTable.priority, q.priority) as any);
  if (q.status) conditions.push(eq(companiesTable.status, q.status) as any);
  if (q.assignedTo) conditions.push(eq(companiesTable.assignedManagerId, parseInt(q.assignedTo, 10)) as any);

  const where = conditions.length === 1 ? conditions[0]! : and(...(conditions as any[]));

  const [rows, [{ count: total }]] = await Promise.all([
    db.select().from(companiesTable).where(where as any).limit(limit).offset(offset).orderBy(desc(companiesTable.createdAt)),
    db.select({ count: count() }).from(companiesTable).where(where as any),
  ]);

  const data = await Promise.all(rows.map(formatCompany));
  res.json({ data, meta: buildMeta(Number(total), page, limit) });
});

router.post("/companies", requireAuth, async (req, res): Promise<void> => {
  const { name, industry, website, gst, pan, address, state, city, pincode,
    leadSource, ownerId, assignedManagerId, stage, priority,
    expectedScrapWeight, expectedRevenue, expectedPickupDate, notes } = req.body;
  if (!name) { res.status(400).json({ error: "Company name required" }); return; }
  const [company] = await db.insert(companiesTable).values({
    name, industry, website, gst, pan, address, state, city, pincode,
    leadSource, ownerId, assignedManagerId,
    stage: stage ?? "New Lead", priority: priority ?? "medium",
    expectedScrapWeight: expectedScrapWeight?.toString(),
    expectedRevenue: expectedRevenue?.toString(),
    expectedPickupDate, notes,
  }).returning();
  await logActivity({
    type: "company_created", description: `Company "${name}" was created`,
    entityType: "company", entityId: company.id, entityName: name, userId: req.user?.id,
  });
  await logAudit({ userId: req.user?.id, action: "create", entityType: "company", entityId: company.id, description: `Created company ${name}`, ipAddress: req.ip });
  res.status(201).json(await formatCompany(company));
});

router.get("/companies/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.json(await formatCompany(company));
});

router.patch("/companies/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, industry, website, gst, pan, address, state, city, pincode,
    leadSource, ownerId, assignedManagerId, stage, priority, status,
    expectedScrapWeight, expectedRevenue, expectedPickupDate, notes } = req.body;
  const [company] = await db.update(companiesTable).set({
    name, industry, website, gst, pan, address, state, city, pincode,
    leadSource, ownerId, assignedManagerId, stage, priority, status,
    expectedScrapWeight: expectedScrapWeight?.toString(),
    expectedRevenue: expectedRevenue?.toString(),
    expectedPickupDate, notes,
  }).where(eq(companiesTable.id, id)).returning();
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  await logActivity({
    type: "company_updated", description: `Company "${company.name}" was updated`,
    entityType: "company", entityId: id, entityName: company.name, userId: req.user?.id,
  });
  res.json(await formatCompany(company));
});

router.delete("/companies/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(companiesTable).set({ deletedAt: new Date(), status: "deleted" }).where(eq(companiesTable.id, id));
  res.sendStatus(204);
});

router.patch("/companies/:id/stage", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { stage } = req.body;
  if (!stage) { res.status(400).json({ error: "Stage required" }); return; }
  const [existing] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Company not found" }); return; }
  const [company] = await db.update(companiesTable).set({ stage }).where(eq(companiesTable.id, id)).returning();
  await logActivity({
    type: "stage_changed",
    description: `Company "${company.name}" moved from "${existing.stage}" to "${stage}"`,
    entityType: "company", entityId: id, entityName: company.name, userId: req.user?.id,
    metadata: JSON.stringify({ from: existing.stage, to: stage }),
  });
  res.json(await formatCompany(company));
});

router.patch("/companies/:id/restore", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [company] = await db.update(companiesTable)
    .set({ deletedAt: null, status: "active" })
    .where(eq(companiesTable.id, id)).returning();
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.json(await formatCompany(company));
});

export default router;
