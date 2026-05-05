import { db, scansTable, blocklistTable, alertsTable, activityLogsTable, usersTable } from "@workspace/db";
import { and, between, desc, sql, eq } from "drizzle-orm";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface ScanData {
  date: string;
  count: number;
  avgRiskScore: number;
  malicious: number;
  suspicious: number;
  clean: number;
}

export interface ReportData {
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  summary: {
    totalScans: number;
    totalBlocked: number;
    totalAlerts: number;
    averageRiskScore: number;
    criticalAlerts: number;
    activeSources: number;
    uniqueIndicators: number;
  };
  riskTrend: ScanData[];
  topIndicators: Array<{ value: string; count: number; riskScore: number; type: string }>;
  topBlockedIPs: Array<{ value: string; count: number; reason: string; blockedAt: Date; blockedBy: string }>;
  recentAlerts: Array<{ message: string; severity: string; indicatorValue: string; createdAt: Date; status: string }>;
  riskBreakdown: { critical: number; high: number; medium: number; low: number; unknown: number };
  indicatorTypeDistribution: { ip: number; domain: number; url: number; hash: number };
  recentActivity: Array<{ action: string; details: string; username: string; createdAt: Date }>;
}

function getDateRange(period: ReportPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (period) {
    case "daily":
      start.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      start.setDate(now.getDate() - 7);
      break;
    case "monthly":
      start.setMonth(now.getMonth() - 1);
      break;
    case "quarterly":
      start.setMonth(now.getMonth() - 3);
      break;
    case "yearly":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  return { start, end };
}

export async function generateReportData(period: ReportPeriod): Promise<ReportData> {
  const { start, end } = getDateRange(period);

  // Fetch scans in date range
  const scans = await db
    .select()
    .from(scansTable)
    .where(and(
      between(scansTable.createdAt, start, end),
      eq(scansTable.status, "completed")
    ));

  // Fetch blocklist entries
  const blocklist = await db
    .select({
      id: blocklistTable.id,
      type: blocklistTable.type,
      value: blocklistTable.value,
      reason: blocklistTable.reason,
      blockedAt: blocklistTable.blockedAt,
      blockedByUsername: blocklistTable.blockedByUsername,
    })
    .from(blocklistTable)
    .where(between(blocklistTable.blockedAt, start, end))
    .orderBy(desc(blocklistTable.blockedAt));

  // Fetch alerts in date range
  const alerts = await db
    .select()
    .from(alertsTable)
    .where(between(alertsTable.createdAt, start, end))
    .orderBy(desc(alertsTable.createdAt));

  // Fetch activity logs
  const activities = await db
    .select({
      id: activityLogsTable.id,
      action: activityLogsTable.action,
      details: activityLogsTable.details,
      username: activityLogsTable.username,
      createdAt: activityLogsTable.createdAt,
    })
    .from(activityLogsTable)
    .where(between(activityLogsTable.createdAt, start, end))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(50);

  // Calculate summary statistics
  const totalScans = scans.length;
  const totalBlocked = blocklist.length;
  const totalAlerts = alerts.length;
  const totalRiskScore = scans.reduce((sum, s) => sum + (s.riskScore || 0), 0);
  const averageRiskScore = totalScans > 0 ? Math.round(totalRiskScore / totalScans) : 0;
  const criticalAlerts = alerts.filter(a => a.severity === "critical" || a.severity === "high").length;
  const uniqueIndicators = new Set(scans.map(s => s.indicatorValue)).size;

  // Count active sources
  const activeSourcesSet = new Set<string>();
  for (const scan of scans) {
    const sources = scan.sources as any[];
    if (sources) {
      sources.filter(src => src.status !== "error").forEach(src => {
        activeSourcesSet.add(src.name);
      });
    }
  }

  // Risk breakdown from scans
  const riskBreakdown = {
    critical: scans.filter(s => (s.riskScore || 0) >= 85).length,
    high: scans.filter(s => (s.riskScore || 0) >= 70 && (s.riskScore || 0) < 85).length,
    medium: scans.filter(s => (s.riskScore || 0) >= 40 && (s.riskScore || 0) < 70).length,
    low: scans.filter(s => (s.riskScore || 0) >= 20 && (s.riskScore || 0) < 40).length,
    unknown: scans.filter(s => (s.riskScore || 0) < 20 || !s.riskScore).length,
  };

  // Indicator type distribution
  const indicatorTypeDistribution = {
    ip: scans.filter(s => s.indicatorType === "ip").length,
    domain: scans.filter(s => s.indicatorType === "domain").length,
    url: scans.filter(s => s.indicatorType === "url").length,
    hash: scans.filter(s => s.indicatorType === "hash").length,
  };

  // Risk trend over time
  const dateMap = new Map<string, { count: number; totalRisk: number; malicious: number; suspicious: number; clean: number }>();
  
  for (const scan of scans) {
    const dateKey = scan.createdAt.toISOString().split("T")[0];
    const existing = dateMap.get(dateKey) || { count: 0, totalRisk: 0, malicious: 0, suspicious: 0, clean: 0 };
    
    existing.count++;
    existing.totalRisk += scan.riskScore || 0;
    
    if (scan.riskLevel === "high") existing.malicious++;
    else if (scan.riskLevel === "medium") existing.suspicious++;
    else if (scan.riskLevel === "low") existing.clean++;
    
    dateMap.set(dateKey, existing);
  }

  const riskTrend: ScanData[] = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      avgRiskScore: Math.round(data.totalRisk / data.count),
      malicious: data.malicious,
      suspicious: data.suspicious,
      clean: data.clean,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  // Top indicators
  const indicatorCounts = new Map<string, { count: number; riskScore: number; type: string }>();
  for (const scan of scans) {
    const existing = indicatorCounts.get(scan.indicatorValue);
    if (existing) {
      existing.count++;
      existing.riskScore = Math.max(existing.riskScore, scan.riskScore || 0);
    } else {
      indicatorCounts.set(scan.indicatorValue, { 
        count: 1, 
        riskScore: scan.riskScore || 0,
        type: scan.indicatorType,
      });
    }
  }
  const topIndicators = Array.from(indicatorCounts.entries())
    .map(([value, data]) => ({ value, count: data.count, riskScore: data.riskScore, type: data.type }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top blocked IPs
  const ipBlockCounts = new Map<string, { count: number; reason: string; blockedAt: Date; blockedBy: string }>();
  for (const block of blocklist.filter(b => b.type === "ip")) {
    const existing = ipBlockCounts.get(block.value);
    if (existing) {
      existing.count++;
    } else {
      ipBlockCounts.set(block.value, { 
        count: 1, 
        reason: block.reason || "No reason provided",
        blockedAt: block.blockedAt,
        blockedBy: block.blockedByUsername || "system",
      });
    }
  }
  const topBlockedIPs = Array.from(ipBlockCounts.entries())
    .map(([value, data]) => ({ value, count: data.count, reason: data.reason, blockedAt: data.blockedAt, blockedBy: data.blockedBy }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Recent alerts
  const recentAlerts = alerts.slice(0, 10).map(alert => ({
    message: alert.message,
    severity: alert.severity,
    indicatorValue: alert.indicatorValue,
    createdAt: alert.createdAt,
    status: alert.status,
  }));

  // Recent activity from logs
  const recentActivity = activities.slice(0, 15).map(activity => ({
    action: activity.action,
    details: activity.details || activity.action,
    username: activity.username || "system",
    createdAt: activity.createdAt,
  }));

  return {
    period,
    startDate: start,
    endDate: end,
    generatedAt: new Date(),
    summary: {
      totalScans,
      totalBlocked,
      totalAlerts,
      averageRiskScore,
      criticalAlerts,
      activeSources: activeSourcesSet.size,
      uniqueIndicators,
    },
    riskTrend,
    topIndicators,
    topBlockedIPs,
    recentAlerts,
    riskBreakdown,
    indicatorTypeDistribution,
    recentActivity,
  };
}
