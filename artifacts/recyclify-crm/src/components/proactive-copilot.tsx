import React, { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
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
  Sparkles, 
  Zap, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare, 
  Building2, 
  CalendarCheck,
  BellRing,
  RefreshCw,
  Flame
} from "lucide-react";
import { SmartCommunicationModal, type CommunicationContext } from "./smart-communication-modal";

export function ProactiveCopilotTrigger() {
  const { data: insights, isLoading } = useGetProactiveInsights({
    query: {
      refetchInterval: 60000,
      queryKey: getGetProactiveInsightsQueryKey(),
    }
  });

  const urgentCount = (insights?.staleDealsCount || 0) + (insights?.expiringBidsCount || 0) + (insights?.overdueTasksCount || 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="relative gap-1.5 border-[#118847]/30 hover:border-[#118847] hover:bg-[#118847]/5 text-foreground h-9 font-medium shadow-sm transition-all"
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <Sparkles className="h-4 w-4 text-[#118847]" />
          <span className="hidden lg:inline font-semibold">Proactive Copilot</span>
          {urgentCount > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[11px] font-bold rounded-full">
              {urgentCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col bg-slate-50/50">
        <ProactiveCopilotContent insights={insights} isLoading={isLoading} />
      </SheetContent>
    </Sheet>
  );
}

function ProactiveCopilotContent({ insights, isLoading }: { insights: any; isLoading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autoFollowup = useExecuteProactiveFollowup();
  const generateDigest = useGenerateProactiveDigest();

  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commContext, setCommContext] = useState<CommunicationContext>({});

  const healthScore = insights?.healthScore || 85;
  const healthStatus = insights?.healthStatus || "Good";

  function handleAutoFollowup(card: any) {
    if (!card.entityId) return;

    autoFollowup.mutate(
      {
        data: {
          companyId: card.entityId,
          taskTitle: card.suggestedTaskTitle || `Proactive follow-up for ${card.entityName}`,
          priority: card.priority || "high",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          noteContent: `[Proactive Copilot Auto-Trigger] Initiated action: ${card.title}`,
        }
      },
      {
        onSuccess: () => {
          toast({
            title: "Follow-up Task Scheduled!",
            description: `Auto-created task & logged timeline note for ${card.entityName}.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetProactiveInsightsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Failed to schedule", description: err.message, variant: "destructive" });
        }
      }
    );
  }

  function handleOpenCommunication(card: any) {
    setCommContext({
      companyId: card.entityId,
      companyName: card.entityName,
      initialMessage: card.whatsappDraft || undefined,
      initialTemplate: card.category === "stale_deal" ? "stale_nudge" : "quotation",
    });
    setCommModalOpen(true);
  }

  function handleTriggerDigest() {
    generateDigest.mutate(
      undefined,
      {
        onSuccess: (data) => {
          toast({
            title: "Digest Notifications Dispatched!",
            description: data.message || "Team notified of at-risk deals.",
          });
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white p-6 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#118847]/10 flex items-center justify-center text-[#118847]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold">Proactive Deal Copilot</SheetTitle>
              <SheetDescription className="text-xs">Real-time pipeline intelligence & instant automations</SheetDescription>
            </div>
          </div>
          <Badge 
            variant="outline"
            className={
              healthScore >= 80 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                : healthScore >= 60
                ? "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                : "bg-red-50 text-red-700 border-red-200 font-semibold"
            }
          >
            {healthStatus}
          </Badge>
        </div>

        {/* Health Meter */}
        <div className="space-y-1.5 mt-4 bg-slate-50 p-3 rounded-lg border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> CRM Health Score
            </span>
            <span className="font-bold text-foreground">{healthScore}/100</span>
          </div>
          <Progress 
            value={healthScore} 
            className="h-2 bg-slate-200" 
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {insights?.staleDealsCount || 0} stale deals · {insights?.expiringBidsCount || 0} closing bids · {insights?.overdueTasksCount || 0} overdue tasks
          </p>
        </div>
      </div>

      {/* Body / Action Cards */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Quick Trigger Digest Button */}
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-emerald-900">Broadcast Alert Digest</p>
            <p className="text-[11px] text-emerald-700">Push in-app alerts to reps for at-risk deals</p>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleTriggerDigest}
            disabled={generateDigest.isPending}
            className="h-7 text-xs bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100"
          >
            <BellRing className="h-3 w-3 mr-1" />
            Send Alerts
          </Button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Highest Priority Actions
          </h4>
          <Link href="/proactive">
            <span className="text-xs font-semibold text-[#118847] hover:underline cursor-pointer flex items-center">
              View All <ArrowRight className="h-3 w-3 ml-0.5" />
            </span>
          </Link>
        </div>

        {/* Action Cards List */}
        <div className="space-y-3">
          {(insights?.actionCards || []).map((card: any) => (
            <Card key={card.id} className="border bg-white shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold leading-tight text-foreground">
                    {card.title}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={
                      card.priority === "urgent" 
                        ? "bg-red-50 text-red-700 border-red-200 text-[10px]"
                        : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                    }
                  >
                    {card.priority}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t gap-2">
                  {card.entityType === "company" && card.entityId && (
                    <Link href={`/companies/${card.entityId}`}>
                      <span className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> View Deal
                      </span>
                    </Link>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    {card.whatsappDraft && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCommunication(card)}
                        className="h-7 px-2 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Outreach
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleAutoFollowup(card)}
                      disabled={autoFollowup.isPending}
                      className="h-7 px-2 text-xs gap-1 bg-[#118847] hover:bg-[#0e7038] text-white"
                    >
                      <Zap className="h-3 w-3" />
                      1-Click Task
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!insights?.actionCards || insights.actionCards.length === 0) && (
            <div className="text-center py-10 bg-white rounded-xl border">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Pipeline is completely up-to-date!</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No stale deals or overdue items detected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t mt-auto">
        <Link href="/proactive">
          <Button className="w-full bg-[#118847] hover:bg-[#0e7038] text-white font-medium gap-2">
            <Sparkles className="h-4 w-4" />
            Open Full Proactive Hub
          </Button>
        </Link>
      </div>

      {/* Smart Communication Modal */}
      <SmartCommunicationModal
        open={commModalOpen}
        onOpenChange={setCommModalOpen}
        context={commContext}
      />
    </div>
  );
}
