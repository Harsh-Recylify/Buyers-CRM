import React from "react";
import { useListBids, getListBidsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Bids() {
  const { data, isLoading } = useListBids({}, { query: { queryKey: getListBidsQueryKey({}) } });

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
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No bids found.</TableCell>
              </TableRow>
            ) : (
              data?.data.map((bid) => (
                <TableRow key={bid.id}>
                  <TableCell className="font-medium">{bid.title}</TableCell>
                  <TableCell>{bid.companyName || '-'}</TableCell>
                  <TableCell>{bid.highestBid ? `₹${bid.highestBid.toLocaleString()}` : '-'}</TableCell>
                  <TableCell><Badge variant="outline">{bid.status}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
