import React from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Pencil, Mail, Phone, Building2, Calendar, Clock } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  team_member: "bg-gray-100 text-gray-700",
};

export default function Profile() {
  const { user: authUser } = useAuth();
  const { data: me, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const user = me ?? authUser;
  const initials = (user?.name ?? "U").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your account information and preferences.</p>
        </div>
        <Link href="/settings">
          <Button variant="outline" className="gap-2">
            <Pencil className="h-4 w-4" />Edit Profile
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-[#118847]/20">
              <AvatarFallback className="text-3xl font-semibold bg-[#118847]/10 text-[#118847]">{initials}</AvatarFallback>
            </Avatar>
            {isLoading ? (
              <div className="space-y-2 w-full">
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-24 mx-auto rounded-full" />
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold">{user?.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
                <Badge className={`capitalize ${ROLE_COLORS[(user as any)?.role ?? ""] ?? "bg-gray-100"}`}>
                  {(user as any)?.role?.replace(/_/g, " ")}
                </Badge>
                <Badge variant={user?.status === "active" ? "default" : "secondary"} className={user?.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                  {user?.status}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {[
                  { icon: Mail, label: "Email", value: user?.email ?? "—" },
                  { icon: Phone, label: "Phone", value: (user as any)?.phone ?? "Not set" },
                  { icon: Building2, label: "Department", value: (user as any)?.department ?? "Not set" },
                  { icon: Clock, label: "Last Login", value: (user as any)?.lastLogin ? new Date((user as any).lastLogin).toLocaleString("en-IN") : "—" },
                  { icon: Calendar, label: "Member Since", value: (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="font-medium mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
