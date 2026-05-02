import { useGetDashboardStats, useGetScanTrend, useGetRiskBreakdown, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldAlert, Activity, Users, AlertTriangle, Search } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

function StatCard({ title, value, icon: Icon, trend, className = "" }: { title: string, value: string | number, icon: any, trend?: string, className?: string }) {
  return (
    <Card className={`bg-card/50 backdrop-blur-sm border-border/50 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: trend, isLoading: trendLoading } = useGetScanTrend();
  const { data: risk, isLoading: riskLoading } = useGetRiskBreakdown();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 10 });

  const RISK_COLORS = {
    high: "hsl(var(--destructive))",
    medium: "hsl(var(--warning))",
    low: "hsl(var(--success))",
    unknown: "hsl(var(--muted-foreground))"
  };

  const riskData = risk ? [
    { name: "High", value: risk.high, color: RISK_COLORS.high },
    { name: "Medium", value: risk.medium, color: RISK_COLORS.medium },
    { name: "Low", value: risk.low, color: RISK_COLORS.low },
    { name: "Unknown", value: risk.unknown, color: RISK_COLORS.unknown },
  ].filter(d => d.value > 0) : [];

  if (statsLoading || trendLoading || riskLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Activity className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm font-mono tracking-widest text-muted-foreground uppercase">Loading Telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Operational Overview</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">SYSTEM STATUS: <span className={stats?.systemHealth === "healthy" ? "text-success" : "text-warning"}>{stats?.systemHealth.toUpperCase()}</span></p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Scans" 
          value={stats?.totalScans || 0} 
          icon={Shield} 
          trend={`${stats?.scansToday || 0} today`}
        />
        <StatCard 
          title="High Risk Detections" 
          value={stats?.highRiskDetections || 0} 
          icon={AlertTriangle} 
          className="border-destructive/30"
        />
        <StatCard 
          title="Open Alerts" 
          value={stats?.openAlerts || 0} 
          icon={ShieldAlert}
          trend={`${stats?.resolvedAlerts || 0} resolved`}
        />
        <StatCard 
          title="Active Users" 
          value={stats?.activeUsers || 0} 
          icon={Users} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Scan Volume (14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickFormatter={(val) => format(new Date(val), 'MMM dd')}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                    labelFormatter={(val) => format(new Date(val), 'MMM dd, yyyy')}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {riskData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-muted-foreground text-sm font-mono">NO DATA AVAILABLE</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity?.map((item, i) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-border/50 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`p-2 rounded-md ${
                  item.type === 'alert' ? 'bg-warning/10 text-warning' :
                  item.type === 'scan' ? 'bg-primary/10 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {item.type === 'alert' ? <ShieldAlert className="w-4 h-4" /> :
                   item.type === 'scan' ? <Search className="w-4 h-4" /> :
                   <Activity className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">{item.username}</span>
                    <span className="text-muted-foreground text-[10px]">•</span>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">{format(new Date(item.createdAt), 'MMM dd HH:mm')}</span>
                  </div>
                </div>
                {item.riskLevel && (
                  <div className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider ${
                    item.riskLevel === 'high' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                    item.riskLevel === 'medium' ? 'bg-warning/10 text-warning border border-warning/20' :
                    item.riskLevel === 'low' ? 'bg-success/10 text-success border border-success/20' :
                    'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {item.riskLevel}
                  </div>
                )}
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm">NO RECENT ACTIVITY</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
