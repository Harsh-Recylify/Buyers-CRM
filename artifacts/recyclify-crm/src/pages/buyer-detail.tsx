import React from "react";
import { useParams, Link } from "wouter";
import { useGetBuyer, getGetBuyerQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Users, Phone, Mail, MapPin, Gavel, Tag, Award, TrendingUp } from "lucide-react";

export default function BuyerDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);

  const { data: buyer, isLoading } = useGetBuyer(id, {
    query: { enabled: !!id && !isNaN(id), queryKey: getGetBuyerQueryKey(id) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="text-center py-20">
        <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-xl font-medium">Buyer not found</p>
        <Link href="/buyers"><Button variant="outline" className="mt-4">Back to Buyers</Button></Link>
      </div>
    );
  }

  const b = buyer as any;
  const winRate = b.totalBids > 0 ? ((b.wonBids / b.totalBids) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/buyers">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Buyers
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 rounded-xl shrink-0">
            <AvatarFallback className="rounded-xl text-xl font-bold bg-[#118847]/10 text-[#118847]">
              {b.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{b.name}</h1>
            {b.company && <p className="text-muted-foreground">{b.company}</p>}
          </div>
        </div>
        <Badge
          variant={b.status === "active" ? "default" : "secondary"}
          className={b.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-sm" : "text-sm"}
        >
          {b.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Gavel, label: "Total Bids", value: b.totalBids ?? 0 },
          { icon: Award, label: "Won Bids", value: b.wonBids ?? 0 },
          { icon: TrendingUp, label: "Win Rate", value: `${winRate}%` },
          { icon: Tag, label: "Max Bid", value: b.maxBid ? `₹${Number(b.maxBid).toLocaleString("en-IN")}` : "—" },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-4 w-4" />
                <p className="text-sm">{label}</p>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Phone, label: "Phone", value: b.phone ?? "—" },
              { icon: Mail, label: "Email", value: b.email ?? "—" },
              { icon: MapPin, label: "Location", value: [b.city, b.state].filter(Boolean).join(", ") || "—" },
              { icon: Tag, label: "GST", value: b.gst ?? "—" },
              { icon: Tag, label: "PAN", value: b.pan ?? "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div><span className="text-muted-foreground">{label}: </span><span className="font-medium">{value}</span></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Trading Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1.5">Material Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {(b.materialCategories ?? []).map((cat: string) => (
                  <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                ))}
                {(b.materialCategories ?? []).length === 0 && <span className="text-sm text-muted-foreground">Not specified</span>}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1.5">Pickup States</p>
              <div className="flex flex-wrap gap-1.5">
                {(b.pickupStates ?? []).map((s: string) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
                {(b.pickupStates ?? []).length === 0 && <span className="text-sm text-muted-foreground">Not specified</span>}
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Payment Terms: </span>
              <span className="font-medium">{b.paymentTerms ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        {b.notes && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{b.notes}</p></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
