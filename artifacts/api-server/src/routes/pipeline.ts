import { Router } from "express";
import { db, companiesTable, usersTable, pipelineStagesTable } from "@workspace/db";
import { isNull, eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { ensureDefaultBoard } from "./pipeline-boards";

const router = Router();

router.get("/pipeline", requireAuth, async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;

  const defaultBoard = await ensureDefaultBoard();
  const boardId = q.boardId ? parseInt(q.boardId, 10) : defaultBoard.id;

  const stages = await db.select().from(pipelineStagesTable)
    .where(eq(pipelineStagesTable.boardId, boardId))
    .orderBy(asc(pipelineStagesTable.position));

  const stageNames = stages.map(s => s.name);

  const companies = await db.select().from(companiesTable).where(isNull(companiesTable.deletedAt));

  const userIds = [...new Set(companies.flatMap(c => [c.ownerId, c.assignedManagerId].filter(Boolean) as number[]))];
  const users = userIds.length
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
    : [];
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const columns = stages.map(stage => {
    const stageCompanies = companies.filter(c => c.stage === stage.name);
    const totalRevenue = stageCompanies.reduce((sum, c) => sum + (c.expectedRevenue ? Number(c.expectedRevenue) : 0), 0);
    return {
      stage: stage.name,
      stageId: stage.id,
      stageColor: stage.color,
      stagePosition: stage.position,
      count: stageCompanies.length,
      totalRevenue,
      companies: stageCompanies.map(c => ({
        id: c.id, name: c.name, industry: c.industry, website: c.website,
        gst: c.gst, pan: c.pan, address: c.address, state: c.state, city: c.city,
        pincode: c.pincode, leadSource: c.leadSource, ownerId: c.ownerId,
        ownerName: c.ownerId ? userMap.get(c.ownerId) ?? null : null,
        assignedManagerId: c.assignedManagerId,
        assignedManagerName: c.assignedManagerId ? userMap.get(c.assignedManagerId) ?? null : null,
        stage: c.stage, priority: c.priority, status: c.status,
        expectedScrapWeight: c.expectedScrapWeight ? Number(c.expectedScrapWeight) : null,
        expectedRevenue: c.expectedRevenue ? Number(c.expectedRevenue) : null,
        expectedPickupDate: c.expectedPickupDate, notes: c.notes,
        deletedAt: c.deletedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      })),
    };
  });

  res.json({ columns, boardId });
});

export default router;
