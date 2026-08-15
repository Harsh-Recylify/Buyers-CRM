import React from "react";
import { useListAssets, getListAssetsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Assets() {
  const { data, isLoading } = useListAssets({}, { query: { queryKey: getListAssetsQueryKey({}) } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IT Assets</h1>
        <p className="text-muted-foreground mt-1">Manage IT assets collected from companies.</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assets found.</TableCell>
              </TableRow>
            ) : (
              data?.data.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.category}</TableCell>
                  <TableCell>{asset.companyName || '-'}</TableCell>
                  <TableCell>{asset.quantity || '-'}</TableCell>
                  <TableCell>{asset.condition || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{asset.status}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
