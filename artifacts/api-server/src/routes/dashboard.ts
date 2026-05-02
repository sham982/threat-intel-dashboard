import { Router, type IRouter } from "express";
import { eq, gte, desc, sql } from "drizzle-orm";
import { db, scansTable, alertsTable, usersTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    [{ totalScans }],
    [{ highRiskDetections }],
    [{ openAlerts }],
    [{ activeUsers }],
    [{ scansToday }],
    [{ resolvedAlerts }],
    avgResult,
  ] = await Promise.all([
    db.select({ totalScans: sql<number>`count(*)::int` }).from(scansTable),
    db.select({ highRiskDetections: sql<number>`count(*)::int` }).from(scansTable).where(eq(scansTable.riskLevel, "high")),
    db.select({ openAlerts: sql<number>`count(*)::int` }).from(alertsTable).where(eq(alertsTable.status, "open")),
    db.select({ activeUsers: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.isActive, true)),
    db.select({ scansToday: sql<number>`count(*)::int` }).from(scansTable).where(gte(scansTable.createdAt, today)),
    db.select({ resolvedAlerts: sql<number>`count(*)::int` }).from(alertsTable).where(eq(alertsTable.status, "resolved")),
    db.select({ avg: sql<number>`coalesce(avg(risk_score), 0)::float` }).from(scansTable),
  ]);

  res.json({
    totalScans,
    highRiskDetections,
    openAlerts,
    activeUsers,
    scansToday,
    resolvedAlerts,
    avgRiskScore: Math.round((avgResult[0]?.avg ?? 0) * 10) / 10,
    systemHealth: "healthy",
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const limitRaw = req.query.limit;
  const limit = limitRaw ? parseInt(String(limitRaw), 10) : 10;

  const recentScans = await db
    .select({
      id: scansTable.id,
      username: usersTable.username,
      indicatorType: scansTable.indicatorType,
      indicatorValue: scansTable.indicatorValue,
      riskLevel: scansTable.riskLevel,
      createdAt: scansTable.createdAt,
    })
    .from(scansTable)
    .leftJoin(usersTable, eq(scansTable.userId, usersTable.id))
    .orderBy(desc(scansTable.createdAt))
    .limit(limit);

  const items = recentScans.map(s => ({
    id: s.id,
    type: "scan" as const,
    description: `Scanned ${s.indicatorType}: ${s.indicatorValue}`,
    username: s.username ?? "unknown",
    riskLevel: s.riskLevel,
    indicatorType: s.indicatorType,
    createdAt: s.createdAt,
  }));

  res.json(items);
});

router.get("/dashboard/risk-breakdown", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      riskLevel: scansTable.riskLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(scansTable)
    .groupBy(scansTable.riskLevel);

  const breakdown = { high: 0, medium: 0, low: 0, unknown: 0 };
  for (const row of rows) {
    if (row.riskLevel in breakdown) {
      breakdown[row.riskLevel as keyof typeof breakdown] = row.count;
    }
  }

  res.json(breakdown);
});

router.get("/dashboard/scan-trend", requireAuth, async (_req, res): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${scansTable.createdAt})::date::text`,
      riskLevel: scansTable.riskLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(scansTable)
    .where(gte(scansTable.createdAt, since))
    .groupBy(
      sql`date_trunc('day', ${scansTable.createdAt})::date`,
      scansTable.riskLevel
    )
    .orderBy(sql`date_trunc('day', ${scansTable.createdAt})::date`);

  const dateMap = new Map<string, { high: number; medium: number; low: number; unknown: number }>();
  for (const row of rows) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { high: 0, medium: 0, low: 0, unknown: 0 });
    }
    const entry = dateMap.get(row.date)!;
    if (row.riskLevel in entry) {
      entry[row.riskLevel as keyof typeof entry] = row.count;
    }
  }

  const trend = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    total: counts.high + counts.medium + counts.low + counts.unknown,
    ...counts,
  }));

  res.json(trend);
});

export default router;
