import React from "react";
import {
  useGetPipelineReport,
  useGetBidsReport,
  useGetBuyersReport,
  useGetTeamReport,
  getGetPipelineReportQueryKey,
  getGetBidsReportQueryKey,
  getGetBuyersReportQueryKey,
  getGetTeamReportQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, Building2, Gavel, Users, UserCheck } from "lucide-react";

const COLORS = ["#118847", "#22c55e", "#86efac", "#bbf7d0", "#d1fae5", "#f0fdf4"];

const PERIOD_LABELS: Record<string, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  quarterly: "This Quarter",
  annual: "This Year",
};

function formatINR(val: number) {
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function Reports() {
  const [period, setPeriod] = React.useState("monthly");
  const periodParam = { period };

  const { data: pipelineData, isLoading: pipelineLoading } = useGetPipelineReport(periodParam, {
    query: { queryKey: getGetPipelineReportQueryKey(periodParam) }
  });
  const { data: bidsData, isLoading: bidsLoading } = useGetBidsReport(periodParam, {
    query: { queryKey: getGetBidsReportQueryKey(periodParam) }
  });
  const { data: buyersData, isLoading: buyersLoading } = useGetBuyersReport(periodParam, {
    query: { queryKey: getGetBuyersReportQueryKey(periodParam) }
  });
  const { data: teamData, isLoading: teamLoading } = useGetTeamReport(periodParam, {
    query: { queryKey: getGetTeamReportQueryKey(periodParam) }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and performance insights across your operations.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="bg-gray-100/80">
          <TabsTrigger value="pipeline" className="gap-2">
            <Building2 className="h-4 w-4" />Pipeline
          </TabsTrigger>
          <TabsTrigger value="bids" className="gap-2">
            <Gavel className="h-4 w-4" />Bids
          </TabsTrigger>
          <TabsTrigger value="buyers" className="gap-2">
            <Users className="h-4 w-4" />Buyers
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <UserCheck className="h-4 w-4" />Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6 space-y-6">
          {pipelineLoading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Companies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{(pipelineData as any)?.totalCompanies ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatINR((pipelineData as any)?.totalValue ?? 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{((pipelineData as any)?.conversionRate ?? 0).toFixed(1)}%</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pipeline Stage Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(pipelineData as any)?.stageBreakdown ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [v, "Companies"]} />
                      <Bar dataKey="count" fill="#118847" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="bids" className="mt-6 space-y-6">
          {bidsLoading ? (
            <div className="grid md:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { label: "Total Bids", value: (bidsData as any)?.totalBids ?? 0 },
                  { label: "Open Bids", value: (bidsData as any)?.openBids ?? 0 },
                  { label: "Awarded Bids", value: (bidsData as any)?.awardedBids ?? 0 },
                  { label: "Total Value", value: formatINR((bidsData as any)?.totalValue ?? 0) },
                ].map(({ label, value }) => (
                  <Card key={label}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Bids by Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={(bidsData as any)?.statusBreakdown ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, count }) => `${status} (${count})`}>
                        {((bidsData as any)?.statusBreakdown ?? []).map((_: any, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="buyers" className="mt-6 space-y-6">
          {buyersLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Top Buyers by Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Buyer</th>
                        <th className="text-right py-2 font-medium">Total Bids</th>
                        <th className="text-right py-2 font-medium">Won</th>
                        <th className="text-right py-2 font-medium">Win Rate</th>
                        <th className="text-right py-2 font-medium">Amount Won</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {((buyersData as any)?.buyers ?? []).map((b: any) => (
                        <tr key={b.id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-medium">{b.name}</td>
                          <td className="py-3 text-right text-muted-foreground">{b.totalBids}</td>
                          <td className="py-3 text-right text-muted-foreground">{b.wonBids}</td>
                          <td className="py-3 text-right">
                            <Badge variant="outline" className={b.winRate > 40 ? "text-green-700 border-green-200" : ""}>
                              {b.winRate.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="py-3 text-right font-medium">{formatINR(b.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {((buyersData as any)?.buyers ?? []).length === 0 && (
                    <div className="py-10 text-center text-muted-foreground">No buyer data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-6">
          {teamLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Team Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Member</th>
                        <th className="text-left py-2 font-medium">Role</th>
                        <th className="text-right py-2 font-medium">Companies</th>
                        <th className="text-right py-2 font-medium">Tasks</th>
                        <th className="text-right py-2 font-medium">Activities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {((teamData as any)?.members ?? []).map((m: any) => (
                        <tr key={m.id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-medium">{m.name}</td>
                          <td className="py-3">
                            <Badge variant="outline" className="capitalize">{m.role.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="py-3 text-right text-muted-foreground">{m.companies}</td>
                          <td className="py-3 text-right text-muted-foreground">{m.tasks}</td>
                          <td className="py-3 text-right text-muted-foreground">{m.activitiesLogged}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
