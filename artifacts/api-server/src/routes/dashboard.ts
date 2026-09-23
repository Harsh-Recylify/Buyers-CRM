import { Router } from "express";
import { db, companiesTable, activitiesTable, bidsTable, buyersTable, recyclersTable, tasksTable } from "@workspace/db";
import { eq, sql, isNull, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // A single round trip (one pooled connection) instead of 12 parallel
  // queries, which was exhausting the Supabase session-pooler connection cap.
  // Every bids-derived figure excludes bids whose company was soft-deleted —
  // bids has no deleted_at of its own, so without this a deleted company's
  // old bids keep inflating "Open Bids" and revenue forever.
  const [row] = (await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND created_at >= ${today.toISOString()}) AS today_companies,
      (SELECT COUNT(*) FROM activities WHERE created_at >= ${today.toISOString()}) AS today_activities,
      (SELECT COUNT(*) FROM bids b JOIN companies c ON c.id = b.company_id AND c.deleted_at IS NULL WHERE b.created_at >= ${today.toISOString()}) AS today_bids,
      (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND created_at >= ${monthStart.toISOString()}) AS monthly_companies,
      (SELECT COUNT(*) FROM bids b JOIN companies c ON c.id = b.company_id AND c.deleted_at IS NULL WHERE b.created_at >= ${monthStart.toISOString()}) AS monthly_bids,
      (SELECT COUNT(*) FROM buyers WHERE status = 'active') AS active_buyers,
      (SELECT COUNT(*) FROM recyclers WHERE status = 'active') AS active_recyclers,
      (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND stage NOT IN ('Won', 'Lost')) AS active_deals,
      (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND stage = 'Won') AS won_deals,
      (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND stage = 'Lost') AS lost_deals,
      (SELECT COUNT(*) FROM bids b JOIN companies c ON c.id = b.company_id AND c.deleted_at IS NULL WHERE b.status = 'open') AS open_deals,
      (SELECT COALESCE(SUM(CAST(b.winning_amount AS numeric)), 0) FROM bids b JOIN companies c ON c.id = b.company_id AND c.deleted_at IS NULL WHERE b.status = 'awarded') AS total_revenue,
      (SELECT COALESCE(SUM(CAST(expected_revenue AS numeric)), 0) FROM companies WHERE deleted_at IS NULL) AS expected_revenue
  `)).rows as any[];

  res.json({
    todayCompanies: Number(row.today_companies),
    todayActivities: Number(row.today_activities),
    todayBids: Number(row.today_bids),
    monthlyCompanies: Number(row.monthly_companies),
    monthlyBids: Number(row.monthly_bids),
    activeBuyers: Number(row.active_buyers),
    activeRecyclers: Number(row.active_recyclers),
    activeDeals: Number(row.active_deals),
    wonDeals: Number(row.won_deals),
    lostDeals: Number(row.lost_deals),
    openDeals: Number(row.open_deals),
    totalRevenue: Number(row.total_revenue),
    expectedRevenue: Number(row.expected_revenue),
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
    SELECT TO_CHAR(b.created_at, 'Mon YYYY') as month,
           DATE_TRUNC('month', b.created_at) as month_start,
           COALESCE(SUM(CAST(b.winning_amount AS numeric)), 0) as value
    FROM bids b JOIN companies c ON c.id = b.company_id AND c.deleted_at IS NULL
    WHERE b.created_at >= NOW() - INTERVAL '6 months'
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
    SELECT b.status, COUNT(*) as count
    FROM bids b JOIN companies c ON c.id = b.company_id AND c.deleted_at IS NULL
    GROUP BY b.status
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
    db.select().from(bidsTable)
      .where(sql`EXISTS (SELECT 1 FROM companies c WHERE c.id = ${bidsTable.companyId} AND c.deleted_at IS NULL)`)
      .orderBy(desc(bidsTable.createdAt)).limit(5),
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
