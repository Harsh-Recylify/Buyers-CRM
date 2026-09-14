import React from "react";
import { 
  useGetDashboardStats, 
  useGetDashboardCharts, 
  useGetDashboardRecent,
  useGetProactiveInsights,
  getGetProactiveInsightsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, Activity, Gavel, DollarSign, TrendingUp, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Clock, Sparkles, Zap, ArrowRight, CheckCircle2 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: charts, isLoading: chartsLoading } = useGetDashboardCharts();
  const { data: recent, isLoading: recentLoading } = useGetDashboardRecent();
  const { data: proactive } = useGetProactiveInsights({
    query: { queryKey: getGetProactiveInsightsQueryKey(), refetchInterval: 60000 }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your IT Asset Disposal pipeline and operations.</p>
        </div>

        <Link href="/proactive">
          <Button className="bg-[#118847] hover:bg-[#0e7038] text-white gap-2 shadow-xs">
            <Sparkles className="h-4 w-4" />
            Open Proactive Command Hub
          </Button>
        </Link>
      </div>

      {/* Proactive Action Banner */}
      {proactive && (
        <Card className="border-2 border-[#118847]/20 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/30 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#118847]/10 flex items-center justify-center text-[#118847] shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#118847]">
                      Proactive Deal Acceleration
                    </span>
                    <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Health: {proactive.healthScore}/100 ({proactive.healthStatus})
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {proactive.staleDealsCount > 0 
                      ? `⚠️ ${proactive.staleDealsCount} stagnant deals require immediate attention · ${proactive.expiringBidsCount} bids closing soon`
                      : `All active deals have fresh activity! ${proactive.buyerMatchOpportunities.length} buyer matching opportunities available.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href="/proactive">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                    View Action Items ({proactive.urgentActionsCount}) <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(stats?.expectedRevenue || 0).toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">+12%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
                <KanbanSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.openDeals || 0}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="font-medium text-emerald-500">{(stats?.todayCompanies || 0)} new</span> this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Open Bids</CardTitle>
                <Gavel className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.todayBids || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requiring attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Active Buyers</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeBuyers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span className="font-medium text-emerald-500">+{(stats?.activeRecyclers || 0)}</span> recyclers
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pipeline Revenue Pipeline</CardTitle>
            <CardDescription>Expected revenue across stages</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartsLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : charts?.pipelineFunnel && charts.pipelineFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.pipelineFunnel}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Expected Revenue']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No pipeline data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across your CRM</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {(recent?.recentActivities || []).slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {activity.type === 'note' ? <Activity className="h-4 w-4" /> : 
                       activity.type === 'bid' ? <Gavel className="h-4 w-4" /> :
                       <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.userName} <span className="font-normal text-muted-foreground">{activity.description}</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!recent?.recentActivities || recent.recentActivities.length === 0) && (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    No recent activities
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Temporary KanbanSquare icon definition since it's not exported from lucide directly in some versions
function KanbanSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 7v7" />
      <path d="M12 7v4" />
      <path d="M16 7v9" />
    </svg>
  );
}
