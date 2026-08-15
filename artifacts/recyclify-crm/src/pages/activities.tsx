import React from "react";
import { useListActivities, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Activity, Building2, Users, Gavel, User, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const entityIconMap: Record<string, React.ReactNode> = {
  company: <Building2 className="h-4 w-4 text-blue-600" />,
  buyer: <Users className="h-4 w-4 text-green-600" />,
  bid: <Gavel className="h-4 w-4 text-purple-600" />,
  user: <User className="h-4 w-4 text-orange-600" />,
  recycler: <Activity className="h-4 w-4 text-teal-600" />,
};

const typeLabels: Record<string, string> = {
  company_created: "Company Created",
  company_updated: "Company Updated",
  stage_changed: "Stage Changed",
  bid_created: "Bid Created",
  buyer_added: "Buyer Added",
  recycler_added: "Recycler Added",
  user_login: "User Login",
  password_changed: "Password Changed",
  task_created: "Task Created",
  task_completed: "Task Completed",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Activities() {
  const [entityType, setEntityType] = React.useState<string>("");
  const params = entityType ? { entityType } : {};
  const { data, isLoading } = useListActivities(params, {
    query: { queryKey: getListActivitiesQueryKey(params) }
  });

  const activities = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">A complete log of all actions and events in the system.</p>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Entities</SelectItem>
            <SelectItem value="company">Companies</SelectItem>
            <SelectItem value="buyer">Buyers</SelectItem>
            <SelectItem value="bid">Bids</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="recycler">Recyclers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-muted-foreground">
            {isLoading ? "Loading..." : `${data?.meta?.total ?? 0} activities`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No activities found</p>
              <p className="text-sm text-muted-foreground mt-1">Activities will appear here as actions are performed.</p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {activity.entityType ? entityIconMap[activity.entityType] ?? <Activity className="h-4 w-4 text-gray-500" /> : <Activity className="h-4 w-4 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      {activity.entityType && (
                        <Badge variant="outline" className="text-xs capitalize">{activity.entityType}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activity.userName && (
                        <span className="text-xs text-muted-foreground">by {activity.userName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgo(activity.createdAt)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(activity.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
