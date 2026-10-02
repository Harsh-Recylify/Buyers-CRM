import React from "react";
import {
  useListBids, getListBidsQueryKey, useDeleteBid,
  useListAllCompanyBids, getListAllCompanyBidsQueryKey, useDeleteCompanyBid,
  getGetDashboardStatsQueryKey, getGetDashboardChartsQueryKey, getGetDashboardRecentQueryKey,
  useListPipelineBoards, getListPipelineBoardsQueryKey,
  useListPipelineStages, getListPipelineStagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { useLocation } from "wouter";

type UnifiedRow = {
  key: string;
  kind: "bid" | "companyBid";
  id: number;
  companyId: number;
  companyName: string | null;
  companyStage: string | null;
  amount: number | null;
  status: string;
  createdAt: string;
  assignedToName: string | null;
};

const SORT_OPTIONS: Record<string, string> = {
  newest: "Newest First",
  highest: "Highest Bid",
  lowest: "Lowest Bid",
};

const PERIOD_OPTIONS: Record<string, string> = {
  all: "All Time",
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
};

function matchesPeriod(dateStr: string, period: string): boolean {
  if (period === "all") return true;
  const t = new Date(dateStr).getTime();
  const now = new Date();
  if (period === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  if (period === "yesterday") {
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    return t >= yesterdayStart.getTime() && t < todayStart.getTime();
  }
  if (period === "week") {
    const start = new Date(now); start.setDate(start.getDate() - 7);
    return t >= start.getTime();
  }
  if (period === "month") {
    const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  return true;
}

export default function Bids() {
  const { data, isLoading } = useListBids({}, { query: { queryKey: getListBidsQueryKey({}) } });
  const { data: companyBidsData, isLoading: companyBidsLoading } = useListAllCompanyBids({
    query: { queryKey: getListAllCompanyBidsQueryKey() },
  });
  const [, setLocation] = useLocation();
  const [deleting, setDeleting] = React.useState<{ kind: "bid" | "companyBid"; id: number } | null>(null);
  const [stageFilter, setStageFilter] = React.useState("all");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"newest" | "highest" | "lowest">("newest");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Both pipeline boards share the same stage names, so the main board's
  // list is the canonical source for the stage filter/colors here.
  const { data: boardsData } = useListPipelineBoards({ query: { queryKey: getListPipelineBoardsQueryKey() } });
  const mainBoard = boardsData?.data.find((b) => b.isDefault) ?? boardsData?.data[0];
  const { data: stagesData } = useListPipelineStages(mainBoard?.id ?? 0, {
    query: { enabled: !!mainBoard, queryKey: getListPipelineStagesQueryKey(mainBoard?.id ?? 0) },
  });
  const pipelineStages = stagesData?.data ?? [];
  const stageColorMap = new Map(pipelineStages.map((s) => [s.name, s.color]));

  const getStageBadgeStyle = (stage: string | null): React.CSSProperties => {
    const color = stage ? stageColorMap.get(stage) ?? "#6b7280" : "#6b7280";
    return { color, borderColor: `${color}40`, background: `${color}14` };
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListBidsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListAllCompanyBidsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardChartsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardRecentQueryKey() });
  };

  const deleteBid = useDeleteBid({
    mutation: {
      onSuccess: () => { toast({ title: "Bid deleted" }); invalidateAll(); setDeleting(null); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });
  const deleteCompanyBid = useDeleteCompanyBid({
    mutation: {
      onSuccess: () => { toast({ title: "Bid deleted" }); invalidateAll(); setDeleting(null); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const isLoadingAny = isLoading || companyBidsLoading;

  const rows: UnifiedRow[] = React.useMemo(() => {
    const fromBids: UnifiedRow[] = (data?.data ?? []).map((b) => ({
      key: `bid-${b.id}`, kind: "bid", id: b.id,
      companyId: b.companyId, companyName: b.companyName ?? null,
      companyStage: b.companyStage ?? null,
      amount: b.highestBid ?? null, status: b.status, createdAt: b.createdAt,
      assignedToName: null,
    }));
    const fromCompanyBids: UnifiedRow[] = (companyBidsData?.data ?? []).map((cb) => ({
      key: `companyBid-${cb.id}`, kind: "companyBid", id: cb.id,
      companyId: cb.companyId, companyName: cb.companyName ?? null,
      companyStage: cb.companyStage ?? null,
      amount: cb.bidAmount, status: cb.status, createdAt: cb.createdAt,
      assignedToName: cb.assignedToName ?? null,
    }));
    return [...fromBids, ...fromCompanyBids];
  }, [data, companyBidsData]);

  const visibleRows = React.useMemo(() => {
    let result = stageFilter === "all" ? rows : rows.filter(r => r.companyStage === stageFilter);
    result = result.filter(r => matchesPeriod(r.createdAt, periodFilter));
    result = [...result];
    if (sortBy === "highest") {
      result.sort((a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity));
    } else if (sortBy === "lowest") {
      result.sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return result;
  }, [rows, stageFilter, periodFilter, sortBy]);

  function confirmDelete() {
    if (!deleting) return;
    if (deleting.kind === "bid") deleteBid.mutate({ id: deleting.id });
    else deleteCompanyBid.mutate({ id: deleting.id });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bids</h1>
        <p className="text-muted-foreground mt-1">Manage open bids and negotiations.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Pipeline Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {pipelineStages.map(s => (
              <SelectItem key={s.id} value={s.name}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full inline-block" style={{ background: s.color }} />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_OPTIONS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_OPTIONS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Team Member</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingAny ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bids found.</TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => (
                <TableRow key={row.key} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/companies/${row.companyId}`)}>
                  <TableCell className="font-medium">{row.companyName || '-'}</TableCell>
                  <TableCell>{row.amount != null ? `₹${row.amount.toLocaleString()}` : '-'}</TableCell>
                  <TableCell>{row.assignedToName || '-'}</TableCell>
                  <TableCell>
                    {row.companyStage ? (
                      <Badge variant="outline" className="font-medium" style={getStageBadgeStyle(row.companyStage)}>
                        {row.companyStage}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleting({ kind: row.kind, id: row.id }); }}
                    >
                      <span className="sr-only">Delete bid</span>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bid?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the bid and any associated quotes/history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
