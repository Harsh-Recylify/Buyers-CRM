import React from "react";
import {
  useListBids, getListBidsQueryKey, useDeleteBid,
  getGetDashboardStatsQueryKey, getGetDashboardChartsQueryKey, getGetDashboardRecentQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Bids() {
  const { data, isLoading } = useListBids({}, { query: { queryKey: getListBidsQueryKey({}) } });
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteBid = useDeleteBid({
    mutation: {
      onSuccess: () => {
        toast({ title: "Bid deleted" });
        queryClient.invalidateQueries({ queryKey: getListBidsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardChartsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardRecentQueryKey() });
        setDeletingId(null);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bids</h1>
        <p className="text-muted-foreground mt-1">Manage open bids and negotiations.</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Highest Bid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bids found.</TableCell>
              </TableRow>
            ) : (
              data?.data.map((bid) => (
                <TableRow key={bid.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/companies/${bid.companyId}`)}>
                  <TableCell className="font-medium">{bid.title}</TableCell>
                  <TableCell>{bid.companyName || '-'}</TableCell>
                  <TableCell>{bid.highestBid ? `₹${bid.highestBid.toLocaleString()}` : '-'}</TableCell>
                  <TableCell><Badge variant="outline">{bid.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(bid.id); }}
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

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bid?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the bid, its quotes, and its history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingId && deleteBid.mutate({ id: deletingId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
