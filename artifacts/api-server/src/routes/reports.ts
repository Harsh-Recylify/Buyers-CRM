import { Router } from "express";
import { db, companiesTable, bidsTable, buyersTable, usersTable, activitiesTable, tasksTable } from "@workspace/db";
import { eq, count, sql, gte, and, isNull, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function getPeriodStart(period?: string): Date {
  const now = new Date();
  switch (period) {
    case "daily": { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    case "weekly": { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "quarterly": { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    case "annual": { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    default: { const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0); return d; } // monthly
  }
}

router.get("/reports/pipeline", requireAuth, async (req, res): Promise<void> => {
  const stages = ["New Lead","Contacted","Meeting Scheduled","Site Inspection","Quotation Sent","Bid Open","Negotiation","Approved","Pickup Scheduled","Material Collected","Completed","Won","Lost"];

  const rows = await db.execute(sql`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(CAST(expected_revenue AS numeric)), 0) as value
    FROM companies WHERE deleted_at IS NULL GROUP BY stage
  `);
  const stageMap = new Map((rows.rows as any[]).map(r => [r.stage, r]));
  const totalCompanies = (rows.rows as any[]).reduce((s, r) => s + Number(r.count), 0);
  const totalValue = (rows.rows as any[]).reduce((s, r) => s + Number(r.value), 0);
  const wonCount = Number(stageMap.get("Won")?.count ?? 0);

  const stageBreakdown = stages.map(stage => {
    const r = stageMap.get(stage);
    const cnt = Number(r?.count ?? 0);
    return { stage, count: cnt, value: Number(r?.value ?? 0), percentage: totalCompanies ? (cnt / totalCompanies) * 100 : 0 };
  });

  res.json({ stageBreakdown, totalCompanies, totalValue, conversionRate: totalCompanies ? (wonCount / totalCompanies) * 100 : 0 });
});

router.get("/reports/bids", requireAuth, async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "monthly";
  const since = getPeriodStart(period);

  const [bidsRows, statusRows, valueRows] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='open' THEN 1 END) as open_bids, COUNT(CASE WHEN status='awarded' THEN 1 END) as awarded FROM bids WHERE created_at >= ${since.toISOString()}`),
    db.execute(sql`SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(winning_amount AS numeric)), 0) as value FROM bids WHERE created_at >= ${since.toISOString()} GROUP BY status`),
    db.execute(sql`SELECT COALESCE(AVG(CAST(winning_amount AS numeric)), 0) as avg_bid_value FROM bids WHERE status='awarded' AND created_at >= ${since.toISOString()}`),
  ]);

  const totals = bidsRows.rows[0] as any;
  const awardedRows = await db.execute(sql`SELECT COALESCE(SUM(CAST(winning_amount AS numeric)), 0) as total_value FROM bids WHERE status='awarded' AND created_at >= ${since.toISOString()}`);

  res.json({
    totalBids: Number(totals.total),
    openBids: Number(totals.open_bids),
    awardedBids: Number(totals.awarded),
    totalValue: Number((awardedRows.rows[0] as any)?.total_value ?? 0),
    avgBidValue: Number((valueRows.rows[0] as any)?.avg_bid_value ?? 0),
    statusBreakdown: (statusRows.rows as any[]).map(r => ({ status: r.status, count: Number(r.count), value: Number(r.value) })),
  });
});

router.get("/reports/buyers", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT b.id, b.name, b.total_bids, b.won_bids,
           COALESCE(SUM(CAST(bq.amount AS numeric)), 0) as total_amount
    FROM buyers b
    LEFT JOIN bid_quotes bq ON bq.buyer_id = b.id AND bq.status = 'accepted'
    GROUP BY b.id, b.name, b.total_bids, b.won_bids
    ORDER BY b.won_bids DESC
  `);

  res.json({
    buyers: (rows.rows as any[]).map(r => ({
      id: Number(r.id), name: r.name,
      totalBids: Number(r.total_bids), wonBids: Number(r.won_bids),
      totalAmount: Number(r.total_amount),
      winRate: Number(r.total_bids) > 0 ? (Number(r.won_bids) / Number(r.total_bids)) * 100 : 0,
    })),
  });
});

router.get("/reports/team", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT u.id, u.name, u.role,
           COUNT(DISTINCT c.id) as companies,
           COUNT(DISTINCT t.id) as tasks,
           COUNT(DISTINCT a.id) as activities_logged
    FROM users u
    LEFT JOIN companies c ON c.assigned_manager_id = u.id AND c.deleted_at IS NULL
    LEFT JOIN tasks t ON t.assigned_to_id = u.id
    LEFT JOIN activities a ON a.user_id = u.id
    GROUP BY u.id, u.name, u.role
    ORDER BY companies DESC
  `);

  res.json({
    members: (rows.rows as any[]).map(r => ({
      id: Number(r.id), name: r.name, role: r.role,
      companies: Number(r.companies), tasks: Number(r.tasks),
      activitiesLogged: Number(r.activities_logged),
    })),
  });
});

export default router;
