import { Router } from "express";
import { db, companiesTable, buyersTable, usersTable, tasksTable, activitiesTable, bidsTable } from "@workspace/db";
import { ilike, or, isNull, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const q = (req.query.q as string) ?? "";
  if (!q.trim()) {
    res.json({ results: [], total: 0 });
    return;
  }
  const pattern = `%${q}%`;

  const [companies, buyers, users, tasks, bids] = await Promise.all([
    db.select({ id: companiesTable.id, name: companiesTable.name, industry: companiesTable.industry })
      .from(companiesTable)
      .where(and(ilike(companiesTable.name, pattern), isNull(companiesTable.deletedAt)) as any)
      .limit(5),
    db.select({ id: buyersTable.id, name: buyersTable.name, company: buyersTable.company })
      .from(buyersTable)
      .where(ilike(buyersTable.name, pattern) as any)
      .limit(5),
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(ilike(usersTable.name, pattern) as any)
      .limit(5),
    db.select({ id: tasksTable.id, title: tasksTable.title, status: tasksTable.status })
      .from(tasksTable)
      .where(ilike(tasksTable.title, pattern) as any)
      .limit(5),
    db.select({ id: bidsTable.id, title: bidsTable.title, status: bidsTable.status })
      .from(bidsTable)
      .where(and(
        ilike(bidsTable.title, pattern),
        sql`EXISTS (SELECT 1 FROM companies c WHERE c.id = ${bidsTable.companyId} AND c.deleted_at IS NULL)`,
      ) as any)
      .limit(5),
  ]);

  const results = [
    ...companies.map(c => ({ type: "company", id: c.id, title: c.name, subtitle: c.industry ?? null })),
    ...buyers.map(b => ({ type: "buyer", id: b.id, title: b.name, subtitle: b.company ?? null })),
    ...users.map(u => ({ type: "user", id: u.id, title: u.name, subtitle: u.email ?? null })),
    ...tasks.map(t => ({ type: "task", id: t.id, title: t.title, subtitle: t.status ?? null })),
    ...bids.map(b => ({ type: "bid", id: b.id, title: b.title, subtitle: b.status ?? null })),
  ];

  res.json({ results, total: results.length });
});

export default router;
