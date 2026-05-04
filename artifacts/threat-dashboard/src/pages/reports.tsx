import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Download,
  FileBarChart,
  Activity,
  Clock,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Ban,
  Globe,
  Hash,
  Link2,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getAuthHeaders } from "@/lib/api-client";
import { format } from "date-fns";

type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

interface ReportData {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: {
    totalScans: number;
    totalBlocked: number;
    averageRiskScore: number;
    criticalAlerts: number;
    activeSources: number;
    uniqueIndicators: number;
  };
  riskTrend: Array<{ date: string; count: number; avgRiskScore: number; malicious: number; suspicious: number; clean: number }>;
  topIndicators: Array<{ value: string; count: number; riskScore: number; type: string }>;
  topBlockedIPs: Array<{ value: string; count: number; reason: string; blockedAt: string }>;
  riskBreakdown: { critical: number; high: number; medium: number; low: number; unknown: number };
  indicatorTypeDistribution: { ip: number; domain: number; url: number; hash: number };
  recentActivity: Array<{ action: string; details: string; username: string; createdAt: string }>;
}

const COLORS = {
  critical: "#e74c3c",
  high: "#e67e22",
  medium: "#f39c12",
  low: "#27ae60",
  unknown: "#95a5a6",
  ip: "#8bc74c",
  domain: "#1bb7b6",
  url: "#c6cc3b",
  hash: "#d1e3a9",
};

const periodLabels = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  quarterly: "Quarterly Report",
  yearly: "Yearly Report",
};

const periodDescriptions = {
  daily: "Last 24 hours of security activity",
  weekly: "Last 7 days of threat intelligence",
  monthly: "Last 30 days of security operations",
  quarterly: "Last 90 days of threat analysis",
  yearly: "Annual security overview",
};

export default function Reports() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("weekly");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isAuthorized = user?.role === "admin" || user?.role === "analyst";

  const fetchReport = async (period: ReportPeriod) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${period}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch report");
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchReport(selectedPeriod);
    }
  }, [selectedPeriod, isAuthorized]);

  const exportReport = async (format: "json" | "csv") => {
    if (!reportData) return;
    setExporting(true);
    
    try {
      let content = "";
      let filename = "";
      let type = "";
      
      if (format === "json") {
        content = JSON.stringify(reportData, null, 2);
        filename = `tsedey-security-report-${selectedPeriod}-${Date.now()}.json`;
        type = "application/json";
      } else {
        // Generate CSV
        const headers = ["Metric", "Value"];
        const rows = [
          ["Period", periodLabels[selectedPeriod]],
          ["Generated", new Date(reportData.generatedAt).toLocaleString()],
          ["Total Scans", reportData.summary.totalScans],
          ["Total Blocked", reportData.summary.totalBlocked],
          ["Average Risk Score", `${reportData.summary.averageRiskScore}%`],
          ["Critical Alerts", reportData.summary.criticalAlerts],
          ["Active Sources", reportData.summary.activeSources],
          ["Unique Indicators", reportData.summary.uniqueIndicators],
        ];
        content = rows.map(row => row.join(",")).join("\n");
        filename = `tsedey-security-report-${selectedPeriod}-${Date.now()}.csv`;
        type = "text/csv";
      }
      
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">You need administrator or analyst privileges to view reports</p>
      </div>
    );
  }

  const pieData = [
    { name: "Critical", value: reportData?.riskBreakdown.critical || 0, color: COLORS.critical },
    { name: "High", value: reportData?.riskBreakdown.high || 0, color: COLORS.high },
    { name: "Medium", value: reportData?.riskBreakdown.medium || 0, color: COLORS.medium },
    { name: "Low", value: reportData?.riskBreakdown.low || 0, color: COLORS.low },
    { name: "Unknown", value: reportData?.riskBreakdown.unknown || 0, color: COLORS.unknown },
  ].filter(item => item.value > 0);

  const typeData = [
    { name: "IP", value: reportData?.indicatorTypeDistribution.ip || 0, color: COLORS.ip },
    { name: "Domain", value: reportData?.indicatorTypeDistribution.domain || 0, color: COLORS.domain },
    { name: "URL", value: reportData?.indicatorTypeDistribution.url || 0, color: COLORS.url },
    { name: "Hash", value: reportData?.indicatorTypeDistribution.hash || 0, color: COLORS.hash },
  ].filter(item => item.value > 0);

  const getIndicatorIcon = (type: string) => {
    switch (type) {
      case "ip": return <Globe className="w-3 h-3" />;
      case "domain": return <Globe className="w-3 h-3" />;
      case "url": return <Link2 className="w-3 h-3" />;
      case "hash": return <Hash className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive" className="text-[10px]">Critical</Badge>;
    if (score >= 40) return <Badge variant="default" className="bg-orange-500 text-[10px]">High</Badge>;
    if (score >= 20) return <Badge variant="secondary" className="bg-yellow-500 text-[10px]">Medium</Badge>;
    return <Badge variant="outline" className="text-[10px]">Low</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Tsedey Bank branding */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Tsedey Bank" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Security Intelligence Report</h1>
              <p className="text-sm text-muted-foreground font-mono tracking-widest">
                THREAT ANALYSIS & INCIDENT SUMMARY
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport("json")}
              disabled={exporting || !reportData}
              className="font-mono text-xs"
            >
              <FileBarChart className="w-3 h-3 mr-2" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport("csv")}
              disabled={exporting || !reportData}
              className="font-mono text-xs"
            >
              <Download className="w-3 h-3 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex flex-wrap gap-2">
        {(["daily", "weekly", "monthly", "quarterly", "yearly"] as ReportPeriod[]).map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? "default" : "outline"}
            onClick={() => setSelectedPeriod(period)}
            className={selectedPeriod === period ? "bg-[#8bc74c] hover:bg-[#7ab33d]" : ""}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {periodLabels[period]}
          </Button>
        ))}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8bc74c]" />
        </div>
      ) : reportData ? (
        <>
          {/* Date Range Banner */}
          <Card className="bg-gradient-to-r from-[#8bc74c]/10 to-[#1bb7b6]/10 border-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#8bc74c]" />
                  <div>
                    <p className="text-sm font-medium">Report Period</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[#1bb7b6]" />
                  <div>
                    <p className="text-sm font-medium">Generated</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reportData.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-[#8bc74c]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Scans</p>
                    <p className="text-3xl font-bold">{reportData.summary.totalScans.toLocaleString()}</p>
                  </div>
                  <Shield className="w-10 h-10 text-[#8bc74c] opacity-50" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{reportData.summary.uniqueIndicators} unique indicators</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#1bb7b6]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Blocked Threats</p>
                    <p className="text-3xl font-bold">{reportData.summary.totalBlocked.toLocaleString()}</p>
                  </div>
                  <Ban className="w-10 h-10 text-[#1bb7b6] opacity-50" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{reportData.topBlockedIPs.length} unique IPs blocked</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#c6cc3b]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                    <p className="text-3xl font-bold">{reportData.summary.averageRiskScore}%</p>
                  </div>
                  {reportData.summary.averageRiskScore > 50 ? (
                    <TrendingUp className="w-10 h-10 text-red-500 opacity-50" />
                  ) : (
                    <TrendingDown className="w-10 h-10 text-green-500 opacity-50" />
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{reportData.summary.criticalAlerts} critical alerts</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#d1e3a9]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Sources</p>
                    <p className="text-3xl font-bold">{reportData.summary.activeSources}</p>
                  </div>
                  <Eye className="w-10 h-10 text-[#d1e3a9] opacity-50" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Threat intelligence sources</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-mono uppercase tracking-widest">Risk Score Trend</CardTitle>
                <CardDescription>Average risk score over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.riskTrend}>
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8bc74c" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8bc74c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                      formatter={(value) => [`${value}%`, "Risk Score"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgRiskScore"
                      stroke="#8bc74c"
                      strokeWidth={2}
                      fill="url(#riskGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-mono uppercase tracking-widest">Risk Distribution</CardTitle>
                <CardDescription>Threat severity breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Indicators Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-mono uppercase tracking-widest">Top Threat Indicators</CardTitle>
              <CardDescription>Most frequently detected indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-mono text-xs uppercase">Type</th>
                      <th className="text-left p-3 font-mono text-xs uppercase">Indicator</th>
                      <th className="text-left p-3 font-mono text-xs uppercase">Count</th>
                      <th className="text-left p-3 font-mono text-xs uppercase">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topIndicators.map((indicator, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {getIndicatorIcon(indicator.type)}
                            <span className="text-xs font-mono uppercase">{indicator.type}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs break-all max-w-md">{indicator.value}</td>
                        <td className="p-3 font-bold">{indicator.count}</td>
                        <td className="p-3">{getRiskBadge(indicator.riskScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Blocked IPs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-mono uppercase tracking-widest">Top Blocked IP Addresses</CardTitle>
              <CardDescription>Most frequently blocked indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.topBlockedIPs.map((ip, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-[#8bc74c]">#{idx + 1}</span>
                      <div>
                        <p className="font-mono text-sm font-medium">{ip.value}</p>
                        <p className="text-xs text-muted-foreground">{ip.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {ip.count} {ip.count === 1 ? "time" : "times"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ip.blockedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {reportData.topBlockedIPs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No blocked IPs in this period</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-mono uppercase tracking-widest">Recent Activity</CardTitle>
              <CardDescription>Latest security events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.recentActivity.slice(0, 10).map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#8bc74c]/10 flex items-center justify-center shrink-0">
                      {activity.action === "SCAN_COMPLETED" ? (
                        <Activity className="w-4 h-4 text-[#8bc74c]" />
                      ) : (
                        <Ban className="w-4 h-4 text-[#1bb7b6]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.details}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{activity.username}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.createdAt), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <FileBarChart className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Select a period to generate the report</p>
        </div>
      )}
    </div>
  );
}
