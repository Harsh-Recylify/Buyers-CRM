import React from "react";
import { useParams, Link } from "wouter";
import {
  useGetBid, useListBidQuotes, useGetBidHistory, useAddBidQuote, useAwardBid,
  getGetBidQueryKey, getListBidQuotesQueryKey, getGetBidHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gavel, TrendingUp, TrendingDown, BarChart3, Plus, Award, Clock, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  negotiation: "bg-yellow-100 text-yellow-800 border-yellow-200",
  awarded: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AddQuoteDialog({ bidId, onSuccess }: { bidId: number; onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const addQuote = useAddBidQuote();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { buyerId: "", amount: "", notes: "" } });

  function onSubmit(data: any) {
    addQuote.mutate(
      { id: bidId, data: { buyerId: parseInt(data.buyerId, 10), amount: parseFloat(data.amount), notes: data.notes } },
      {
        onSuccess: () => {
          toast({ title: "Quote added" });
          setOpen(false);
          reset();
          onSuccess();
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Add Quote</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Buyer Quote</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Buyer ID</Label>
            <Input type="number" placeholder="Enter buyer ID" {...register("buyerId", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Quote Amount (₹)</Label>
            <Input type="number" step="0.01" placeholder="0.00" {...register("amount", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input placeholder="Any remarks..." {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038]" disabled={addQuote.isPending}>
              {addQuote.isPending ? "Adding..." : "Add Quote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BidDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bid, isLoading } = useGetBid(id, {
    query: { enabled: !!id && !isNaN(id), queryKey: getGetBidQueryKey(id) }
  });
  const { data: quotes, isLoading: quotesLoading } = useListBidQuotes(id, {
    query: { enabled: !!id, queryKey: getListBidQuotesQueryKey(id) }
  });
  const { data: history } = useGetBidHistory(id, {
    query: { enabled: !!id, queryKey: getGetBidHistoryQueryKey(id) }
  });

  const awardBid = useAwardBid();

  function handleAward(buyerId: number, amount: number, buyerName: string) {
    if (!confirm(`Award bid to ${buyerName} for ₹${amount.toLocaleString("en-IN")}?`)) return;
    awardBid.mutate({ id, data: { buyerId, amount } }, {
      onSuccess: () => {
        toast({ title: "Bid awarded successfully" });
        queryClient.invalidateQueries({ queryKey: getGetBidQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListBidQuotesQueryKey(id) });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleQuoteSuccess() {
    queryClient.invalidateQueries({ queryKey: getListBidQuotesQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetBidQueryKey(id) });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="text-center py-20">
        <Gavel className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-xl font-medium">Bid not found</p>
        <Link href="/bids"><Button variant="outline" className="mt-4">Back to Bids</Button></Link>
      </div>
    );
  }

  const b = bid as any;
  const quotesArr = Array.isArray(quotes) ? quotes : [];
  const historyArr = Array.isArray(history) ? history : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/bids">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Bids
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-[#118847]/10 flex items-center justify-center shrink-0">
            <Gavel className="h-7 w-7 text-[#118847]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{b.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {b.companyName && <span className="text-sm text-muted-foreground">{b.companyName}</span>}
              <Badge variant="outline" className={STATUS_COLORS[b.status] ?? ""}>{b.status}</Badge>
            </div>
          </div>
        </div>
        {(b.status === "open" || b.status === "negotiation") && (
          <AddQuoteDialog bidId={id} onSuccess={handleQuoteSuccess} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { icon: BarChart3, label: "Total Quotes", value: b.totalQuotes ?? 0, color: "text-blue-600" },
          { icon: TrendingUp, label: "Highest Bid", value: b.highestBid ? `₹${Number(b.highestBid).toLocaleString("en-IN")}` : "—", color: "text-green-600" },
          { icon: TrendingDown, label: "Lowest Bid", value: b.lowestBid ? `₹${Number(b.lowestBid).toLocaleString("en-IN")}` : "—", color: "text-red-600" },
          { icon: BarChart3, label: "Average Bid", value: b.averageBid ? `₹${Number(b.averageBid).toLocaleString("en-IN")}` : "—", color: "text-purple-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
              <p className="text-xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {b.winningBuyerId && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Awarded to {b.winningBuyerName}</p>
                <p className="text-sm text-green-700">Winning amount: ₹{Number(b.winningAmount).toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buyer Quotes ({quotesArr.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {quotesLoading ? (
            <div className="p-4 space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : quotesArr.length === 0 ? (
            <div className="py-12 text-center">
              <Gavel className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground">No quotes received yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotesArr.map((q: any) => (
                  <TableRow key={q.id} className={q.status === "accepted" ? "bg-green-50/30" : ""}>
                    <TableCell className="font-medium">{q.buyerName ?? `Buyer #${q.buyerId}`}</TableCell>
                    <TableCell className="text-right font-semibold">{Number(q.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={q.status === "accepted" ? "text-green-700 border-green-200" : ""}>
                        {q.status}
                      </Badge>
                      {q.status === "accepted" && <CheckCircle2 className="h-4 w-4 text-green-600 ml-1 inline" />}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{q.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {(b.status === "open" || b.status === "negotiation") && q.status !== "accepted" && (
                        <Button
                          size="sm" className="bg-[#118847] hover:bg-[#0e7038] gap-1"
                          onClick={() => handleAward(q.buyerId, q.amount, q.buyerName ?? "this buyer")}
                          disabled={awardBid.isPending}
                        >
                          <Award className="h-3.5 w-3.5" />Award
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Bid History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {historyArr.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No history recorded</p>
            </div>
          ) : (
            <div className="divide-y">
              {historyArr.map((h: any) => (
                <div key={h.id} className="flex gap-3 p-4">
                  <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{h.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{h.userName ?? "System"} · {timeAgo(h.createdAt)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">{h.action?.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
