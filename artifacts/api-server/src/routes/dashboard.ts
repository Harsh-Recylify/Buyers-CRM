import { Router } from "express";
import { db, companiesTable, activitiesTable, bidsTable, buyersTable, recyclersTable, tasksTable } from "@workspace/db";
import { eq, count, sql, gte, and, isNull, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    [{ todayCompanies }],
    [{ todayActivities }],
    [{ todayBids }],
    [{ monthlyCompanies }],
    [{ monthlyBids }],
    [{ activeBuyers }],
    [{ activeRecyclers }],
    [{ wonDeals }],
    [{ lostDeals }],
    [{ openDeals }],
    revenueRows,
    expectedRevenueRows,
  ] = await Promise.all([
    db.select({ todayCompanies: count() }).from(companiesTable).where(and(gte(companiesTable.createdAt, today), isNull(companiesTable.deletedAt))),
    db.select({ todayActivities: count() }).from(activitiesTable).where(gte(activitiesTable.createdAt, today)),
    db.select({ todayBids: count() }).from(bidsTable).where(gte(bidsTable.createdAt, today)),
    db.select({ monthlyCompanies: count() }).from(companiesTable).where(and(gte(companiesTable.createdAt, monthStart), isNull(companiesTable.deletedAt))),
    db.select({ monthlyBids: count() }).from(bidsTable).where(gte(bidsTable.createdAt, monthStart)),
    db.select({ activeBuyers: count() }).from(buyersTable).where(eq(buyersTable.status, "active")),
    db.select({ activeRecyclers: count() }).from(recyclersTable).where(eq(recyclersTable.status, "active")),
    db.select({ wonDeals: count() }).from(companiesTable).where(and(eq(companiesTable.stage, "Won"), isNull(companiesTable.deletedAt))),
    db.select({ lostDeals: count() }).from(companiesTable).where(and(eq(companiesTable.stage, "Lost"), isNull(companiesTable.deletedAt))),
    db.select({ openDeals: count() }).from(bidsTable).where(eq(bidsTable.status, "open")),
    db.select({ total: sql<string>`COALESCE(SUM(CAST(winning_amount AS numeric)), 0)` }).from(bidsTable).where(eq(bidsTable.status, "awarded")),
    db.select({ total: sql<string>`COALESCE(SUM(CAST(expected_revenue AS numeric)), 0)` }).from(companiesTable).where(and(isNull(companiesTable.deletedAt))),
  ]);

  res.json({
    todayCompanies: Number(todayCompanies),
    todayActivities: Number(todayActivities),
    todayBids: Number(todayBids),
    monthlyCompanies: Number(monthlyCompanies),
    monthlyBids: Number(monthlyBids),
    activeBuyers: Number(activeBuyers),
    activeRecyclers: Number(activeRecyclers),
    wonDeals: Number(wonDeals),
    lostDeals: Number(lostDeals),
    openDeals: Number(openDeals),
    totalRevenue: Number(revenueRows[0]?.total ?? 0),
    expectedRevenue: Number(expectedRevenueRows[0]?.total ?? 0),
  });
});

router.get("/dashboard/charts", requireAuth, async (req, res): Promise<void> => {
  // Monthly companies for last 6 months
  const monthlyCompanies = await db.execute(sql`
    SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
           DATE_TRUNC('month', created_at) as month_start,
           COUNT(*) as value
    FROM companies
    WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY month, month_start ORDER BY month_start ASC
  `);

  const monthlyBidValue = await db.execute(sql`
    SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
           DATE_TRUNC('month', created_at) as month_start,
           COALESCE(SUM(CAST(winning_amount AS numeric)), 0) as value
    FROM bids
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY month, month_start ORDER BY month_start ASC
  `);

  const stages = ["New Lead","Contacted","Meeting Scheduled","Site Inspection","Quotation Sent","Bid Open","Negotiation","Approved","Pickup Scheduled","Material Collected","Completed","Won","Lost"];
  const pipelineRows = await db.execute(sql`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(CAST(expected_revenue AS numeric)), 0) as value
    FROM companies WHERE deleted_at IS NULL GROUP BY stage
  `);
  const pipelineMap = new Map((pipelineRows.rows as any[]).map(r => [r.stage, r]));
  const pipelineFunnel = stages.map(stage => ({
    stage,
    count: Number(pipelineMap.get(stage)?.count ?? 0),
    value: Number(pipelineMap.get(stage)?.value ?? 0),
  }));

  const bidStatusRows = await db.execute(sql`
    SELECT status, COUNT(*) as count FROM bids GROUP BY status
  `);
  const bidStatus = (bidStatusRows.rows as any[]).map(r => ({ status: r.status, count: Number(r.count) }));

  const topBuyersRows = await db.execute(sql`
    SELECT b.id, b.name, b.won_bids as bids,
           COALESCE(SUM(CAST(bq.amount AS numeric)), 0) as "wonAmount"
    FROM buyers b
    LEFT JOIN bid_quotes bq ON bq.buyer_id = b.id AND bq.status = 'accepted'
    GROUP BY b.id, b.name ORDER BY b.won_bids DESC LIMIT 5
  `);
  const topBuyers = (topBuyersRows.rows as any[]).map(r => ({ id: Number(r.id), name: r.name, bids: Number(r.bids), wonAmount: Number(r.wonAmount) }));

  const topManagersRows = await db.execute(sql`
    SELECT u.id, u.name, COUNT(DISTINCT c.id) as companies,
           COUNT(DISTINCT CASE WHEN c.stage = 'Won' THEN c.id END) as deals
    FROM users u
    LEFT JOIN companies c ON c.assigned_manager_id = u.id AND c.deleted_at IS NULL
    GROUP BY u.id, u.name ORDER BY companies DESC LIMIT 5
  `);
  const topManagers = (topManagersRows.rows as any[]).map(r => ({ id: Number(r.id), name: r.name, companies: Number(r.companies), deals: Number(r.deals) }));

  res.json({
    monthlyCompanies: (monthlyCompanies.rows as any[]).map(r => ({ month: r.month, value: Number(r.value) })),
    monthlyBidValue: (monthlyBidValue.rows as any[]).map(r => ({ month: r.month, value: Number(r.value) })),
    pipelineFunnel,
    bidStatus,
    topBuyers,
    topManagers,
  });
});

router.get("/dashboard/recent", requireAuth, async (req, res): Promise<void> => {
  const [recentActivities, recentCompanies, recentBids, upcomingFollowUps] = await Promise.all([
    db.select().from(activitiesTable).orderBy(desc(activitiesTable.createdAt)).limit(10),
    db.select().from(companiesTable).where(isNull(companiesTable.deletedAt)).orderBy(desc(companiesTable.createdAt)).limit(5),
    db.select().from(bidsTable).orderBy(desc(bidsTable.createdAt)).limit(5),
    db.select().from(tasksTable).where(eq(tasksTable.status, "todo")).orderBy(tasksTable.dueDate).limit(5),
  ]);

  res.json({
    recentActivities: recentActivities.map(a => ({
      id: a.id, type: a.type, description: a.description, entityType: a.entityType,
      entityId: a.entityId, entityName: a.entityName, userId: a.userId, userName: null,
      metadata: a.metadata, createdAt: a.createdAt.toISOString(),
    })),
    recentCompanies: recentCompanies.map(c => ({
      id: c.id, name: c.name, industry: c.industry, website: c.website, gst: c.gst,
      pan: c.pan, address: c.address, state: c.state, city: c.city, pincode: c.pincode,
      leadSource: c.leadSource, ownerId: c.ownerId, ownerName: null,
      assignedManagerId: c.assignedManagerId, assignedManagerName: null,
      stage: c.stage, priority: c.priority, status: c.status,
      expectedScrapWeight: c.expectedScrapWeight ? Number(c.expectedScrapWeight) : null,
      expectedRevenue: c.expectedRevenue ? Number(c.expectedRevenue) : null,
      expectedPickupDate: c.expectedPickupDate, notes: c.notes,
      deletedAt: c.deletedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
    })),
    recentBids: recentBids.map(b => ({
      id: b.id, title: b.title, companyId: b.companyId, companyName: null,
      status: b.status, description: b.description, expiryDate: b.expiryDate,
      winningBuyerId: b.winningBuyerId, winningBuyerName: null,
      winningAmount: b.winningAmount ? Number(b.winningAmount) : null,
      highestBid: null, lowestBid: null, averageBid: null, totalQuotes: 0,
      createdById: b.createdById, createdByName: null,
      createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
    })),
    upcomingFollowUps: upcomingFollowUps.map(t => ({
      id: t.id, title: t.title, description: t.description, status: t.status,
      priority: t.priority, entityType: t.entityType, entityId: t.entityId, entityName: null,
      assignedToId: t.assignedToId, assignedToName: null,
      dueDate: t.dueDate, reminderAt: t.reminderAt,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
    })),
  });
});

export default router;
