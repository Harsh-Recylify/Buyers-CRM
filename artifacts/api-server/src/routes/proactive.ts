import { Router } from "express";
import { 
  db, 
  companiesTable, 
  activitiesTable, 
  notesTable, 
  tasksTable, 
  bidsTable, 
  bidQuotesTable, 
  buyersTable, 
  assetsTable, 
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, isNull, desc, inArray, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router = Router();

// Helper to compute difference in days
function getDaysDiff(pastDate: Date | string): number {
  const d = typeof pastDate === "string" ? new Date(pastDate) : pastDate;
  const diffMs = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// Stage-specific recommendations
const STAGE_NEXT_ACTIONS: Record<string, { action: string; rationale: string; taskTitle: string }> = {
  "New Lead": {
    action: "Schedule Discovery Call & Identify Asset Inventory",
    rationale: "Lead needs initial qualification to assess volume of laptops, servers, or scrap IT assets.",
    taskTitle: "Follow up with procurement for IT asset list",
  },
  "Contacted": {
    action: "Book On-Site / Virtual Asset Inspection",
    rationale: "Procurement contact has responded; schedule inspection to verify working condition vs scrap.",
    taskTitle: "Coordinate site inspection date and security clearance",
  },
  "Meeting Scheduled": {
    action: "Prepare Commercial Disposal Proposal & Compliance Brief",
    rationale: "Meeting is lined up; prepare data destruction certificate sample & pricing guidelines.",
    taskTitle: "Prepare ITAD quotation and compliance kit",
  },
  "Site Inspection": {
    action: "Log Inventory Quantities & Estimate Scrap Value",
    rationale: "Inspection is ongoing or completed; finalize asset quantities to launch bidding.",
    taskTitle: "Upload finalized inventory count and weight estimates",
  },
  "Quotation Sent": {
    action: "Follow Up on Pricing Proposal & Commercial Approval",
    rationale: "Quotation is with client management; check in to address counter-proposals.",
    taskTitle: "Follow up with CFO/Procurement on quotation approval",
  },
  "Bid Open": {
    action: "Nudge Top Verified Buyers & Monitor Quotes",
    rationale: "Bidding window is active; ensure at least 3 certified buyers submit competitive bids.",
    taskTitle: "Broadcast bid invitation to top rated IT scrap buyers",
  },
  "Negotiation": {
    action: "Finalize Winning Buyer Quote & Issue Commercial Terms",
    rationale: "Quotes received; negotiate highest value and secure advance payment terms.",
    taskTitle: "Lock in winning bid terms and sign agreement",
  },
  "Approved": {
    action: "Generate Gate Pass & CPCB Form 6 Manifest",
    rationale: "Deal approved; arrange regulatory documentation and vehicle pass for pickup.",
    taskTitle: "Issue CPCB Form 6 & arrange logistics vehicle",
  },
  "Pickup Scheduled": {
    action: "Verify Logistics Driver, Vehicle Number & Weighbridge Plan",
    rationale: "Pickup date set; ensure driver KYC and weighing protocol is shared with facility.",
    taskTitle: "Confirm vehicle arrival and escort team",
  },
  "Material Collected": {
    action: "Issue Green Recycling Certificate & Final Settlement",
    rationale: "Material collected; upload weighment slip and issue official EPR/Disposal certificate.",
    taskTitle: "Generate EPR certificate and clear client payout",
  },
  "Completed": {
    action: "Request Testimonial & Set 6-Month Refresh Reminder",
    rationale: "Deal successfully closed; retain client for upcoming quarterly asset refreshes.",
    taskTitle: "Schedule 6-month IT refresh check-in",
  },
};

router.get("/proactive/insights", requireAuth, async (req, res): Promise<void> => {
  const [
    allCompanies,
    allActivities,
    allTasks,
    allBids,
    allBuyers,
    allAssets,
    allUsers,
  ] = await Promise.all([
    db.select().from(companiesTable).where(isNull(companiesTable.deletedAt)),
    db.select().from(activitiesTable).orderBy(desc(activitiesTable.createdAt)).limit(200),
    db.select().from(tasksTable).where(eq(tasksTable.status, "todo")),
    db.select().from(bidsTable).where(eq(bidsTable.status, "open")),
    db.select().from(buyersTable).where(eq(buyersTable.status, "active")),
    db.select().from(assetsTable),
    db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable),
  ]);

  const userMap = new Map(allUsers.map(u => [u.id, u.name]));
  const now = new Date();

  // 1. Stale Deals Calculation
  const activeCompanies = allCompanies.filter(c => c.stage !== "Won" && c.stage !== "Lost");
  
  // Map latest activity timestamp per company
  const latestActivityMap = new Map<number, Date>();
  for (const act of allActivities) {
    if (act.entityType === "company" && act.entityId) {
      if (!latestActivityMap.has(act.entityId)) {
        latestActivityMap.set(act.entityId, act.createdAt);
      }
    }
  }

  const staleDeals = [];
  for (const c of activeCompanies) {
    const lastDate = latestActivityMap.get(c.id) || c.updatedAt || c.createdAt;
    const daysStale = getDaysDiff(lastDate);
    const expRev = c.expectedRevenue ? Number(c.expectedRevenue) : null;
    
    // Threshold: > 4 days is stale; > 2 days for urgent priority
    const threshold = c.priority === "urgent" || c.priority === "high" ? 3 : 5;
    
    if (daysStale >= threshold) {
      const riskLevel = daysStale >= 10 || (expRev && expRev > 200000)
        ? "Critical"
        : daysStale >= 7
        ? "High"
        : "Medium";

      const defaultGuidance = STAGE_NEXT_ACTIONS[c.stage] || {
        action: "Follow up with client",
        rationale: "Stagnant deal needs attention",
        taskTitle: `Follow up with ${c.name}`,
      };

      staleDeals.push({
        companyId: c.id,
        companyName: c.name,
        stage: c.stage,
        daysStale,
        expectedRevenue: expRev,
        priority: c.priority,
        assignedManagerName: c.assignedManagerId ? userMap.get(c.assignedManagerId) ?? null : null,
        lastActivityDate: lastDate.toISOString(),
        suggestedAction: defaultGuidance.action,
        riskLevel,
      });
    }
  }

  // Sort stale deals by risk and revenue
  staleDeals.sort((a, b) => {
    const riskWeight = { Critical: 3, High: 2, Medium: 1 };
    const diff = (riskWeight[b.riskLevel as keyof typeof riskWeight] || 0) - (riskWeight[a.riskLevel as keyof typeof riskWeight] || 0);
    if (diff !== 0) return diff;
    return (b.expectedRevenue || 0) - (a.expectedRevenue || 0);
  });

  // 2. Expiring Bids Calculation
  const expiringBids = [];
  for (const b of allBids) {
    if (!b.expiryDate) continue;
    const expDate = new Date(b.expiryDate);
    const diffHours = Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    // Fetch quotes count for this bid
    const quotes = await db.select().from(bidQuotesTable).where(eq(bidQuotesTable.bidId, b.id));
    const quotesCount = quotes.length;
    const co = allCompanies.find(c => c.id === b.companyId);

    if (diffHours <= 48) {
      const urgency = diffHours <= 12 ? "critical" : diffHours <= 24 ? "high" : "medium";
      expiringBids.push({
        bidId: b.id,
        title: b.title,
        companyName: co?.name ?? null,
        expiryDate: b.expiryDate,
        quotesCount,
        hoursLeft: Math.max(0, diffHours),
        urgency,
      });
    }
  }

  // 3. Overdue Tasks Calculation
  const overdueTasks = [];
  for (const t of allTasks) {
    if (t.dueDate) {
      const dueDate = new Date(t.dueDate);
      if (dueDate < now) {
        let entityName: string | null = null;
        if (t.entityType === "company" && t.entityId) {
          entityName = allCompanies.find(c => c.id === t.entityId)?.name ?? null;
        }
        overdueTasks.push({
          taskId: t.id,
          title: t.title,
          dueDate: t.dueDate,
          priority: t.priority,
          entityType: t.entityType,
          entityId: t.entityId,
          entityName,
          assignedToName: t.assignedToId ? userMap.get(t.assignedToId) ?? null : null,
        });
      }
    }
  }

  // 4. Buyer Matching Opportunities
  const buyerMatchOpportunities = [];
  const assetsByCompany = new Map<number, typeof allAssets>();
  for (const asset of allAssets) {
    const list = assetsByCompany.get(asset.companyId) || [];
    list.push(asset);
    assetsByCompany.set(asset.companyId, list);
  }

  for (const c of activeCompanies.slice(0, 10)) {
    const cAssets = assetsByCompany.get(c.id) || [];
    if (cAssets.length > 0) {
      const categories = new Set(cAssets.map(a => a.category.toLowerCase()));
      const matchedBuyers = allBuyers.filter(b => {
        const buyerCats = (b.materialCategories || []).map(m => m.toLowerCase());
        const catMatch = buyerCats.some(bc => categories.has(bc) || Array.from(categories).some(c => c.includes(bc) || bc.includes(c)));
        return catMatch;
      });

      if (matchedBuyers.length > 0) {
        buyerMatchOpportunities.push({
          companyId: c.id,
          companyName: c.name,
          assetCount: cAssets.length,
          matchedBuyerCount: matchedBuyers.length,
          topBuyerName: matchedBuyers[0]?.name ?? null,
        });
      }
    }
  }

  // 5. Proactive Action Cards Generator
  const actionCards = [];

  // Top critical stale deals cards
  for (const sd of staleDeals.slice(0, 4)) {
    actionCards.push({
      id: `stale-${sd.companyId}`,
      title: `⚡ Stagnant Deal: ${sd.companyName} (${sd.daysStale}d idle)`,
      description: `In "${sd.stage}" stage with ₹${(sd.expectedRevenue || 0).toLocaleString("en-IN")} potential. Suggested action: ${sd.suggestedAction}`,
      category: "stale_deal",
      priority: sd.riskLevel === "Critical" ? "urgent" : "high",
      impact: sd.expectedRevenue && sd.expectedRevenue > 100000 ? "High Revenue Impact" : "Deal Velocity Impact",
      actionType: "auto_followup",
      entityType: "company",
      entityId: sd.companyId,
      entityName: sd.companyName,
      suggestedTaskTitle: `Proactive Follow-up: ${sd.companyName} (${sd.suggestedAction})`,
      whatsappDraft: `Hi from Recyclify! Checking in regarding the IT asset disposal project for ${sd.companyName}. We are ready to proceed with the next step (${sd.suggestedAction}). Would today or tomorrow work for a quick sync?`,
    });
  }

  // Expiring bids cards
  for (const eb of expiringBids.slice(0, 3)) {
    actionCards.push({
      id: `bid-${eb.bidId}`,
      title: `⏳ Bid Closing Soon: ${eb.title} (${eb.hoursLeft}h left)`,
      description: `${eb.quotesCount} quote(s) received so far. Urgently invite top registered recyclers & buyers before deadline!`,
      category: "expiring_bid",
      priority: eb.urgency,
      impact: "Auction Yield",
      actionType: "invite_buyers",
      entityType: "bid",
      entityId: eb.bidId,
      entityName: eb.title,
      suggestedTaskTitle: `Nudge buyers for bid: ${eb.title}`,
      whatsappDraft: `Recyclify Alert: Bid for "${eb.title}" is closing in ${eb.hoursLeft} hours. Please submit your highest commercial quotation before the window shuts!`,
    });
  }

  // High-priority overdue tasks
  for (const ot of overdueTasks.slice(0, 3)) {
    actionCards.push({
      id: `task-${ot.taskId}`,
      title: `🚨 Overdue Task: ${ot.title}`,
      description: `Assigned to ${ot.assignedToName || "team"} ${ot.entityName ? `for ${ot.entityName}` : ""}. Due date passed.`,
      category: "overdue_task",
      priority: ot.priority,
      impact: "Task Completion",
      actionType: "complete_task",
      entityType: ot.entityType,
      entityId: ot.entityId,
      entityName: ot.entityName,
      suggestedTaskTitle: ot.title,
      whatsappDraft: null,
    });
  }

  // Calculate overall CRM Health Score (0 - 100)
  let healthScore = 100;
  healthScore -= Math.min(40, staleDeals.length * 4);
  healthScore -= Math.min(25, overdueTasks.length * 3);
  healthScore -= Math.min(20, expiringBids.filter(b => b.quotesCount === 0).length * 8);
  healthScore = Math.max(25, Math.min(98, healthScore));

  const healthStatus = healthScore >= 85 
    ? "Excellent" 
    : healthScore >= 70 
    ? "Good" 
    : healthScore >= 50 
    ? "Needs Attention" 
    : "Critical";

  res.json({
    healthScore,
    healthStatus,
    staleDealsCount: staleDeals.length,
    expiringBidsCount: expiringBids.length,
    overdueTasksCount: overdueTasks.length,
    urgentActionsCount: actionCards.length,
    staleDeals,
    expiringBids,
    overdueTasks,
    buyerMatchOpportunities,
    actionCards,
  });
});

router.get("/proactive/next-action/:companyId", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId, 10);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const [cAssets, cBuyers] = await Promise.all([
    db.select().from(assetsTable).where(eq(assetsTable.companyId, companyId)),
    db.select().from(buyersTable).where(eq(buyersTable.status, "active")),
  ]);

  const guidance = STAGE_NEXT_ACTIONS[company.stage] || {
    action: "Schedule Follow-up with Procurement Lead",
    rationale: "Keep cadence active and address pending questions.",
    taskTitle: `Follow up with ${company.name}`,
  };

  // Match buyers for asset categories
  const categories = new Set(cAssets.map(a => a.category.toLowerCase()));
  const matchedBuyers = cBuyers.filter(b => {
    const buyerCats = (b.materialCategories || []).map(m => m.toLowerCase());
    return buyerCats.some(bc => categories.has(bc) || Array.from(categories).some(c => c.includes(bc) || bc.includes(c)));
  });

  const assetsCountDesc = cAssets.length > 0 
    ? `${cAssets.length} asset lots (${cAssets.map(a => `${a.quantity}x ${a.category}`).join(", ")})`
    : "pending inventory verification";

  const expRevFormatted = company.expectedRevenue 
    ? `₹${Number(company.expectedRevenue).toLocaleString("en-IN")}` 
    : "market valuation";

  const whatsappDraft = `Hi! Greetings from Recyclify.\n\nWe are currently progressing the IT Asset Disposal project for *${company.name}* (Stage: *${company.stage}*).\n\nDetails:\n• Asset Scope: ${assetsCountDesc}\n• Estimated Value: ${expRevFormatted}\n• Next Step: ${guidance.action}\n\nPlease let us know your availability for a quick 5-min alignment call today.`;

  const emailDraft = `Dear ${company.name} Team,\n\nI hope this email finds you well.\n\nWe are pleased to update you on your IT asset disposition and e-waste recycling project with Recyclify. To maintain smooth momentum toward asset collection and CPCB certification, our recommended next step is: ${guidance.action}.\n\nProject Summary:\n- Status Stage: ${company.stage}\n- Estimated Scope: ${assetsCountDesc}\n- Target Timeline: ${company.expectedPickupDate || "Upcoming Week"}\n\nPlease let us know if you have any questions or require updated compliance manifests.\n\nBest regards,\nRecyclify Team`;

  res.json({
    companyId: company.id,
    companyName: company.name,
    stage: company.stage,
    healthScore: company.priority === "urgent" ? 65 : 85,
    recommendedAction: guidance.action,
    rationale: guidance.rationale,
    urgency: company.priority === "urgent" ? "high" : "medium",
    suggestedTaskTitle: guidance.taskTitle,
    whatsappDraft,
    emailDraft,
    matchedBuyersCount: matchedBuyers.length,
  });
});

router.get("/proactive/buyer-matches/:companyId", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId, 10);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const [companyAssets, allBuyers] = await Promise.all([
    db.select().from(assetsTable).where(eq(assetsTable.companyId, companyId)),
    db.select().from(buyersTable).where(eq(buyersTable.status, "active")),
  ]);

  const assetCategories = companyAssets.map(a => a.category);
  const lowerCats = assetCategories.map(c => c.toLowerCase());
  const companyState = (company.state || "").toLowerCase().trim();

  const scoredMatches = allBuyers.map(buyer => {
    let score = 40; // Base score for active verified buyer
    const matchingCategories: string[] = [];

    const buyerCats = (buyer.materialCategories || []).map(m => m.toLowerCase());
    for (const cat of assetCategories) {
      const lower = cat.toLowerCase();
      if (buyerCats.some(bc => bc.includes(lower) || lower.includes(bc) || bc === "all" || bc === "e-waste")) {
        matchingCategories.push(cat);
      }
    }

    // Category matches weight
    if (matchingCategories.length > 0) {
      score += Math.min(30, matchingCategories.length * 12);
    } else if (buyerCats.length === 0) {
      // General buyer
      score += 10;
    }

    // Geographic state match
    const pickupStates = (buyer.pickupStates || []).map(s => s.toLowerCase().trim());
    if (companyState && (pickupStates.includes(companyState) || pickupStates.includes("pan-india") || pickupStates.includes("all"))) {
      score += 15;
    }

    // Rating boost
    const ratingNum = Number(buyer.rating || 0);
    if (ratingNum >= 4.5) score += 10;
    else if (ratingNum >= 4.0) score += 5;

    // Win rate / bid volume bonus
    const wonBids = Number(buyer.wonBids || 0);
    if (wonBids >= 5) score += 5;

    const winRate = buyer.totalBids > 0 ? Math.round((buyer.wonBids / buyer.totalBids) * 100) : 0;

    return {
      buyerId: buyer.id,
      buyerName: buyer.name,
      company: buyer.company,
      phone: buyer.phone,
      email: buyer.email,
      state: buyer.state,
      city: buyer.city,
      matchScore: Math.min(99, score),
      matchingCategories: matchingCategories.length > 0 ? matchingCategories : ["General ITAD"],
      winRate,
      rating: ratingNum,
      notes: buyer.notes,
    };
  });

  // Sort by match score descending
  scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    companyId: company.id,
    companyName: company.name,
    assetsSummary: assetCategories.length > 0 ? assetCategories : ["IT Equipment"],
    matches: scoredMatches.slice(0, 15),
  });
});

router.post("/proactive/auto-followup", requireAuth, async (req, res): Promise<void> => {
  const { companyId, taskTitle, priority, dueDate, noteContent } = req.body;
  if (!companyId || !taskTitle) {
    res.status(400).json({ error: "companyId and taskTitle required" });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const taskDueDate = dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // 1. Create task
  await db.insert(tasksTable).values({
    title: taskTitle,
    priority: priority || "high",
    entityType: "company",
    entityId: companyId,
    assignedToId: company.assignedManagerId || req.user?.id,
    createdById: req.user?.id,
    dueDate: taskDueDate,
    description: `Proactive CRM Automation triggered follow-up for ${company.name}`,
  });

  // 2. Add note if provided
  if (noteContent) {
    await db.insert(notesTable).values({
      entityType: "company",
      entityId: companyId,
      content: noteContent,
      authorId: req.user?.id,
    });
  }

  // 3. Log activity
  await logActivity({
    type: "task_created",
    description: `Proactive follow-up scheduled: "${taskTitle}"`,
    entityType: "company",
    entityId: companyId,
    entityName: company.name,
    userId: req.user?.id,
  });

  res.json({ message: "Proactive follow-up task successfully scheduled!" });
});

router.post("/proactive/generate-digest", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const companies = await db.select().from(companiesTable).where(isNull(companiesTable.deletedAt));
  const active = companies.filter(c => c.stage !== "Won" && c.stage !== "Lost");

  let createdCount = 0;
  for (const c of active.slice(0, 5)) {
    const days = getDaysDiff(c.updatedAt || c.createdAt);
    if (days >= 5) {
      await db.insert(notificationsTable).values({
        userId,
        type: "reminder",
        title: `Proactive Alert: ${c.name} is stagnant (${days} days)`,
        message: `Deal in stage "${c.stage}" has had no activity for ${days} days. Recommended action: Follow up with procurement.`,
        entityType: "company",
        entityId: c.id,
      });
      createdCount++;
    }
  }

  res.json({ message: `Proactive digest created ${createdCount} new notifications.` });
});

export default router;
