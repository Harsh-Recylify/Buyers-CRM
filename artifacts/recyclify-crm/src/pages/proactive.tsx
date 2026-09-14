import React, { useState } from "react";
import { 
  useGetProactiveInsights, 
  useExecuteProactiveFollowup, 
  useGenerateProactiveDigest,
  getGetProactiveInsightsQueryKey,
  getListTasksQueryKey,
  getListNotificationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Zap, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare, 
  Building2, 
  TrendingDown, 
  Users, 
  Gavel, 
  CalendarCheck,
  BellRing,
  RefreshCw,
  Flame,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Target
} from "lucide-react";
import { SmartCommunicationModal, type CommunicationContext } from "@/components/smart-communication-modal";

export default function ProactivePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: insights, isLoading, refetch, isRefetching } = useGetProactiveInsights({
    query: {
      queryKey: getGetProactiveInsightsQueryKey(),
      refetchInterval: 60000,
    }
  });

  const autoFollowup = useExecuteProactiveFollowup();
  const generateDigest = useGenerateProactiveDigest();

  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commContext, setCommContext] = useState<CommunicationContext>({});

  const healthScore = insights?.healthScore || 85;
  const healthStatus = insights?.healthStatus || "Good";

  const staleDeals = insights?.staleDeals || [];
  const expiringBids = insights?.expiringBids || [];
  const overdueTasks = insights?.overdueTasks || [];
  const buyerOpportunities = insights?.buyerMatchOpportunities || [];
  const actionCards = insights?.actionCards || [];

  const totalAtRiskRevenue = staleDeals.reduce((sum, d) => sum + (d.expectedRevenue || 0), 0);

  function handleAutoFollowup(companyId: number, companyName: string, suggestedAction: string, priority: string = "high") {
    autoFollowup.mutate(
      {
        data: {
          companyId,
          taskTitle: `Proactive Follow-up: ${companyName} (${suggestedAction})`,
          priority,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          noteContent: `[Proactive Hub Auto-Trigger] Scheduled follow-up for next step: ${suggestedAction}`,
        }
      },
      {
        onSuccess: () => {
          toast({
            title: "Follow-up Task Created!",
            description: `Auto-assigned task and logged note for ${companyName}.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetProactiveInsightsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Action Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  }

  function handleOpenCommunication(deal: { companyId: number; companyName: string; stage?: string; expectedRevenue?: number | null }) {
    setCommContext({
      companyId: deal.companyId,
      companyName: deal.companyName,
      stage: deal.stage,
      expectedRevenue: deal.expectedRevenue,
      initialTemplate: "stale_nudge",
    });
    setCommModalOpen(true);
  }

  function handleTriggerDigest() {
    generateDigest.mutate(
      undefined,
      {
        onSuccess: (data) => {
          toast({
            title: "Digest Notifications Sent!",
            description: data.message || "Team notified of at-risk deals.",
          });
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Failed to dispatch digest", description: err.message, variant: "destructive" });
        }
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-[#118847]/10 flex items-center justify-center text-[#118847]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Proactive Command Hub</h1>
              <p className="text-muted-foreground text-sm">AI deal acceleration, stale pipeline detection, and 1-click automations.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Intelligence
          </Button>

          <Button 
            size="sm" 
            onClick={handleTriggerDigest}
            disabled={generateDigest.isPending}
            className="gap-1.5 bg-[#118847] hover:bg-[#0e7038] text-white"
          >
            <BellRing className="h-3.5 w-3.5" />
            Push Alert Digest
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Health Score Card */}
        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">CRM Health Index</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{healthScore}/100</span>
              <Badge 
                variant="outline"
                className={
                  healthScore >= 80 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : healthScore >= 60 
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }
              >
                {healthStatus}
              </Badge>
            </div>
            <Progress value={healthScore} className="h-2 bg-slate-100" />
            <p className="text-[11px] text-muted-foreground">
              Evaluated across active pipelines & task cadence
            </p>
          </CardContent>
        </Card>

        {/* At-Risk Deals Card */}
        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Stale Deals at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staleDeals.length} deals</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold text-red-600">₹{totalAtRiskRevenue.toLocaleString("en-IN")}</span> revenue stagnant
            </p>
          </CardContent>
        </Card>

        {/* Expiring Bids Card */}
        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Expiring Bids (&lt; 48h)</CardTitle>
            <Gavel className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringBids.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requiring buyer nudges & quote closure
            </p>
          </CardContent>
        </Card>

        {/* Smart Matches Card */}
        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Buyer Matches</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buyerOpportunities.length} opportunities</div>
            <p className="text-xs text-muted-foreground mt-1">
              Verified buyers matched to active scrap lots
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList className="bg-gray-100/90 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="actions" className="gap-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            Priority Action Cards ({actionCards.length})
          </TabsTrigger>
          <TabsTrigger value="stale" className="gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Stale Deals Rescue ({staleDeals.length})
          </TabsTrigger>
          <TabsTrigger value="bids" className="gap-1.5">
            <Gavel className="h-4 w-4 text-purple-500" />
            Expiring Bids ({expiringBids.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <CalendarCheck className="h-4 w-4 text-amber-500" />
            Overdue Tasks ({overdueTasks.length})
          </TabsTrigger>
          <TabsTrigger value="matching" className="gap-1.5">
            <Users className="h-4 w-4 text-blue-500" />
            Smart Buyer Matches ({buyerOpportunities.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Priority Action Cards */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {actionCards.map((card: any) => (
              <Card key={card.id} className="border shadow-xs bg-white hover:border-[#118847]/40 transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={
                            card.priority === "urgent" 
                              ? "bg-red-50 text-red-700 border-red-200 uppercase text-[10px] font-bold" 
                              : "bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px] font-bold"
                          }
                        >
                          {card.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">{card.impact}</span>
                      </div>
                      <h3 className="font-bold text-base text-foreground mt-1.5">{card.title}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between pt-3 border-t gap-2">
                    {card.entityType === "company" && card.entityId ? (
                      <Link href={`/companies/${card.entityId}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 px-2 text-muted-foreground hover:text-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          View Company
                        </Button>
                      </Link>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      {card.whatsappDraft && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCommContext({
                              companyId: card.entityId,
                              companyName: card.entityName,
                              initialMessage: card.whatsappDraft,
                              initialTemplate: "stale_nudge",
                            });
                            setCommModalOpen(true);
                          }}
                          className="h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Outreach
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          if (card.entityId) {
                            handleAutoFollowup(card.entityId, card.entityName || "Company", card.suggestedTaskTitle || "Follow up", card.priority);
                          }
                        }}
                        disabled={autoFollowup.isPending}
                        className="h-8 text-xs gap-1.5 bg-[#118847] hover:bg-[#0e7038] text-white font-medium"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        1-Click Action
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {actionCards.length === 0 && (
              <div className="col-span-2 text-center py-16 bg-white rounded-xl border">
                <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-bold text-base">Pipeline is Peak Performing!</h3>
                <p className="text-xs text-muted-foreground mt-1">No urgent stale deals or overdue items require attention.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Stale Deals Rescue */}
        <TabsContent value="stale" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stagnant & Stale Pipeline Deals</CardTitle>
              <CardDescription>Deals inactive for &gt; 4 days. Proactively rescue revenue before it slips.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {staleDeals.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  No stale deals detected. High deal velocity maintained!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 border-y text-muted-foreground uppercase text-[11px] font-semibold">
                      <tr>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Stage</th>
                        <th className="py-3 px-4">Stagnant For</th>
                        <th className="py-3 px-4">Est. Revenue</th>
                        <th className="py-3 px-4">Assigned To</th>
                        <th className="py-3 px-4">Suggested Rescue Action</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {staleDeals.map((deal: any) => (
                        <tr key={deal.companyId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            <Link href={`/companies/${deal.companyId}`}>
                              <span className="hover:underline text-primary cursor-pointer flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {deal.companyName}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="bg-slate-100 text-slate-800 text-[11px]">
                              {deal.stage}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge 
                              variant="outline"
                              className={
                                deal.daysStale >= 10 
                                  ? "bg-red-100 text-red-800 border-red-200 font-bold" 
                                  : deal.daysStale >= 7
                                  ? "bg-orange-100 text-orange-800 border-orange-200 font-bold"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                              }
                            >
                              {deal.daysStale} days idle
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {deal.expectedRevenue ? `₹${deal.expectedRevenue.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {deal.assignedManagerName || "Unassigned"}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs text-muted-foreground truncate" title={deal.suggestedAction}>
                            {deal.suggestedAction}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCommunication(deal)}
                                className="h-7 px-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                title="Draft WhatsApp / Email"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleAutoFollowup(deal.companyId, deal.companyName, deal.suggestedAction, deal.priority)}
                                disabled={autoFollowup.isPending}
                                className="h-7 px-2 text-xs bg-[#118847] hover:bg-[#0e7038] text-white"
                                title="Auto-Schedule Follow-up Task"
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                1-Click Task
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Expiring Bids */}
        <TabsContent value="bids" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bidding Deadlines (&lt; 48 Hours)</CardTitle>
              <CardDescription>Ensure maximum buyer participation and competitive auction yields.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {expiringBids.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  No imminent closing bids requiring urgent intervention.
                </div>
              ) : (
                <div className="divide-y">
                  {expiringBids.map((bid: any) => (
                    <div key={bid.bidId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/bids/${bid.bidId}`}>
                            <span className="font-bold text-sm text-foreground hover:underline cursor-pointer">
                              {bid.title}
                            </span>
                          </Link>
                          <Badge 
                            variant="outline"
                            className={
                              bid.hoursLeft <= 12 
                                ? "bg-red-100 text-red-800 border-red-200" 
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {bid.hoursLeft}h remaining
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Company: <span className="font-medium text-foreground">{bid.companyName || "Client"}</span> · Received Quotes: <span className="font-semibold text-foreground">{bid.quotesCount}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/bids/${bid.bidId}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            View Bid Details
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setCommContext({
                              companyName: bid.title,
                              initialTemplate: "bid_invitation",
                            });
                            setCommModalOpen(true);
                          }}
                          className="h-8 text-xs bg-[#118847] hover:bg-[#0e7038] text-white"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          Broadcast to Buyers
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Overdue Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overdue Action Items</CardTitle>
              <CardDescription>Scheduled tasks that missed their completion deadline.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {overdueTasks.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  All tasks are up-to-date with no overdue items.
                </div>
              ) : (
                <div className="divide-y">
                  {overdueTasks.map((t: any) => (
                    <div key={t.taskId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{t.title}</span>
                          <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 text-[10px]">
                            Overdue
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Due Date: {t.dueDate} · Assigned to: <span className="font-medium text-foreground">{t.assignedToName || "Team"}</span> {t.entityName ? `(${t.entityName})` : ""}
                        </p>
                      </div>

                      <Link href="/tasks">
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                          Open in Tasks
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Smart Buyer Matches */}
        <TabsContent value="matching" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Scrap Lot & Buyer Matches</CardTitle>
              <CardDescription>Companies with registered IT assets matched against qualified buyers.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {buyerOpportunities.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  No pending asset matches at this moment.
                </div>
              ) : (
                <div className="divide-y">
                  {buyerOpportunities.map((opp: any) => (
                    <div key={opp.companyId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <Link href={`/companies/${opp.companyId}`}>
                          <span className="font-bold text-sm text-primary hover:underline cursor-pointer flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {opp.companyName}
                          </span>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {opp.assetCount} registered asset lots · <span className="font-semibold text-emerald-700">{opp.matchedBuyerCount} verified buyers</span> ready to bid
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/companies/${opp.companyId}`}>
                          <Button size="sm" className="h-8 text-xs bg-[#118847] hover:bg-[#0e7038] text-white gap-1">
                            Match & Broadcast <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Smart Communication Modal */}
      <SmartCommunicationModal
        open={commModalOpen}
        onOpenChange={setCommModalOpen}
        context={commContext}
      />
    </div>
  );
}
