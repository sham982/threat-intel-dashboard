import { useGetDashboardStats, useGetScanTrend, useGetRiskBreakdown, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldAlert, Activity, Users, AlertTriangle, Search, TrendingUp, Ban, Eye } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";
import { format } from "date-fns";

// Tsedey Bank Brand Colors
const TSEDEY_GREEN = "#8bc74c";
const TSEDEY_TEAL = "#1bb7b6";
const TSEDEY_LIGHT_GREEN = "#d1e3a9";
const TSEDEY_LIGHT_TEAL = "#bad7d4";
const TSEDEY_LIME = "#c6cc3b";

function StatCard({ title, value, icon: Icon, trend, subtitle, className = "" }: { title: string, value: string | number, icon: any, trend?: string, subtitle?: string, className?: string }) {
  return (
    <Card className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${className}`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#8bc74c]/10 to-[#1bb7b6]/10 rounded-bl-full -mr-2 -mt-2 group-hover:scale-110 transition-transform duration-500" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-gradient-to-br from-[#8bc74c]/20 to-[#1bb7b6]/20">
          <Icon className="h-4 w-4 text-[#8bc74c]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono text-foreground">{value.toLocaleString()}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 font-mono">{subtitle}</p>}
        {trend && (
          <p className="text-xs text-[#8bc74c] mt-2 font-mono flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
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
    high: "#e74c3c",
    medium: "#f39c12",
    low: TSEDEY_GREEN,
    unknown: "#95a5a6"
  };

  const riskData = risk ? [
    { name: "High Risk", value: risk.high || 0, color: RISK_COLORS.high },
    { name: "Medium Risk", value: risk.medium || 0, color: RISK_COLORS.medium },
    { name: "Low Risk", value: risk.low || 0, color: RISK_COLORS.low },
    { name: "Unknown", value: risk.unknown || 0, color: RISK_COLORS.unknown },
  ].filter(d => d.value > 0) : [];

  // Prepare trend data with brand colors
  const trendData = trend?.map(item => ({
    ...item,
    fill: TSEDEY_GREEN
  })) || [];

  // Activity type icons mapping
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'alert': return <ShieldAlert className="w-4 h-4" />;
      case 'scan': return <Search className="w-4 h-4" />;
      case 'block': return <Ban className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-red-500/10';
      case 'scan': return `bg-[#8bc74c]/10`;
      case 'block': return `bg-[#1bb7b6]/10`;
      default: return 'bg-muted';
    }
  };

  const getActivityTextColor = (type: string) => {
    switch (type) {
      case 'alert': return 'text-red-500';
      case 'scan': return 'text-[#8bc74c]';
      case 'block': return 'text-[#1bb7b6]';
      default: return 'text-muted-foreground';
    }
  };

  if (statsLoading || trendLoading || riskLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-[#8bc74c]/20 border-t-[#8bc74c] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-[#8bc74c]/20 animate-pulse" />
            </div>
          </div>
          <span className="text-sm font-mono tracking-widest text-muted-foreground uppercase animate-pulse">Loading Intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Tsedey Bank branding */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-gradient-to-b from-[#8bc74c] to-[#1bb7b6] rounded-full" />
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] bg-clip-text text-transparent">
            Threat Intelligence Dashboard
          </h1>
        </div>
      </div>

      {/* Stats Cards with Tsedey Bank colors */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Scans" 
          value={stats?.totalScans || 0} 
          icon={Shield} 
          subtitle="All time security scans"
          trend={`+${stats?.scansToday || 0} today`}
          className="border-l-4 border-l-[#8bc74c]"
        />
        <StatCard 
          title="High Risk" 
          value={stats?.highRiskDetections || 0} 
          icon={AlertTriangle} 
          subtitle="Critical threats detected"
          trend="Requires immediate attention"
          className="border-l-4 border-l-[#c6cc3b]"
        />
        <StatCard 
          title="Open Alerts" 
          value={stats?.openAlerts || 0} 
          icon={ShieldAlert}
          subtitle="Pending investigation"
          trend={`${stats?.resolvedAlerts || 0} resolved this month`}
          className="border-l-4 border-l-[#1bb7b6]"
        />
        <StatCard 
          title="Active Sources" 
          value={12} 
          icon={Eye}
          subtitle="Threat intelligence feeds"
          trend="All systems operational"
          className="border-l-4 border-l-[#d1e3a9]"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Scan Trend Chart */}
        <Card className="col-span-4 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8bc74c] animate-pulse" />
              Scan Volume Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="tsedeyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TSEDEY_GREEN} stopOpacity={0.4} />
                      <stop offset="50%" stopColor={TSEDEY_TEAL} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={TSEDEY_LIGHT_TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickFormatter={(val) => format(new Date(val), 'MMM dd')}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: `1px solid ${TSEDEY_GREEN}`, borderRadius: '0.75rem' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    labelStyle={{ color: TSEDEY_GREEN, marginBottom: '0.25rem', fontWeight: 'bold' }}
                    labelFormatter={(val) => format(new Date(val), 'MMM dd, yyyy')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={TSEDEY_GREEN} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#tsedeyGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution Pie Chart */}
        <Card className="col-span-3 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1bb7b6] animate-pulse" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              {riskData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: TSEDEY_LIGHT_TEAL, strokeWidth: 1 }}
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: `1px solid ${TSEDEY_TEAL}`, borderRadius: '0.75rem' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle" 
                      formatter={(value) => <span className="text-xs font-mono">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <span className="text-muted-foreground text-sm font-mono">NO RISK DATA AVAILABLE</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#c6cc3b] animate-pulse" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activity?.slice(0, 8).map((item, i) => (
              <div 
                key={item.id} 
                className={`flex items-center gap-4 p-3 rounded-xl ${getActivityBgColor(item.type)} border border-border/30 hover:border-[#8bc74c]/30 transition-all duration-300 animate-in fade-in slide-in-from-left-2`} 
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`p-2 rounded-lg ${getActivityBgColor(item.type)} ${getActivityTextColor(item.type)}`}>
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">{item.username || 'System'}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                    <span className="text-[10px] uppercase font-mono text-[#8bc74c]">{format(new Date(item.createdAt), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
                {item.riskLevel && (
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold ${
                    item.riskLevel === 'high' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                    item.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                    'bg-green-500/20 text-green-500 border border-green-500/30'
                  }`}>
                    {item.riskLevel}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                  {format(new Date(item.createdAt), 'HH:mm:ss')}
                </div>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground font-mono text-sm">NO RECENT ACTIVITY</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
