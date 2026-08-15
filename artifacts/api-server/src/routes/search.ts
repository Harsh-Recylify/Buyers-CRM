import { Router } from "express";
import { db, companiesTable, buyersTable, recyclersTable, usersTable, tasksTable, activitiesTable, bidsTable } from "@workspace/db";
import { ilike, or, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const q = (req.query.q as string) ?? "";
  if (!q.trim()) {
    res.json({ results: [], total: 0 });
    return;
  }
  const pattern = `%${q}%`;

  const [companies, buyers, recyclers, users, tasks, bids] = await Promise.all([
    db.select({ id: companiesTable.id, name: companiesTable.name, industry: companiesTable.industry })
      .from(companiesTable)
      .where(ilike(companiesTable.name, pattern) as any)
      .limit(5),
    db.select({ id: buyersTable.id, name: buyersTable.name, company: buyersTable.company })
      .from(buyersTable)
      .where(ilike(buyersTable.name, pattern) as any)
      .limit(5),
    db.select({ id: recyclersTable.id, name: recyclersTable.name, company: recyclersTable.company })
      .from(recyclersTable)
      .where(ilike(recyclersTable.name, pattern) as any)
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
      .where(ilike(bidsTable.title, pattern) as any)
      .limit(5),
  ]);

  const results = [
    ...companies.map(c => ({ type: "company", id: c.id, title: c.name, subtitle: c.industry ?? null })),
    ...buyers.map(b => ({ type: "buyer", id: b.id, title: b.name, subtitle: b.company ?? null })),
    ...recyclers.map(r => ({ type: "recycler", id: r.id, title: r.name, subtitle: r.company ?? null })),
    ...users.map(u => ({ type: "user", id: u.id, title: u.name, subtitle: u.email ?? null })),
    ...tasks.map(t => ({ type: "task", id: t.id, title: t.title, subtitle: t.status ?? null })),
    ...bids.map(b => ({ type: "bid", id: b.id, title: b.title, subtitle: b.status ?? null })),
  ];

  res.json({ results, total: results.length });
});

export default router;
