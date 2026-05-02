import { Router, type IRouter } from "express";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { db, scansTable, alertsTable, activityLogsTable, usersTable } from "@workspace/db";
import {
  ListScansQueryParams,
  CreateScanBody,
  GetScanParams,
  DeleteScanParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { runThreatScan } from "../lib/threat-intel";

const router: IRouter = Router();

router.get("/scans", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListScansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { indicatorType, riskLevel, userId, search, limit, offset } = parsed.data;
  const conditions = [];

  if (indicatorType) conditions.push(eq(scansTable.indicatorType, indicatorType));
  if (riskLevel) conditions.push(eq(scansTable.riskLevel, riskLevel));
  if (userId) conditions.push(eq(scansTable.userId, userId));
  if (search) conditions.push(ilike(scansTable.indicatorValue, `%${search}%`));

  if (req.user!.role === "viewer") {
    conditions.push(eq(scansTable.userId, req.user!.userId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [scans, [{ count }]] = await Promise.all([
    db
      .select({
        id: scansTable.id,
        userId: scansTable.userId,
        username: usersTable.username,
        indicatorType: scansTable.indicatorType,
        indicatorValue: scansTable.indicatorValue,
        riskScore: scansTable.riskScore,
        riskLevel: scansTable.riskLevel,
        status: scansTable.status,
        sources: scansTable.sources,
        notes: scansTable.notes,
        createdAt: scansTable.createdAt,
      })
      .from(scansTable)
      .leftJoin(usersTable, eq(scansTable.userId, usersTable.id))
      .where(whereClause)
      .orderBy(desc(scansTable.createdAt))
      .limit(limit ?? 50)
      .offset(offset ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(scansTable).where(whereClause),
  ]);

  res.json({ scans, total: count });
});

router.post("/scans", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { indicatorType, indicatorValue, notes } = parsed.data;

  const [pendingScan] = await db
    .insert(scansTable)
    .values({
      userId: req.user!.userId,
      indicatorType,
      indicatorValue,
      notes,
      status: "pending",
      sources: [],
      riskScore: 0,
      riskLevel: "unknown",
    })
    .returning();

  const { sources, riskScore, riskLevel } = await runThreatScan(indicatorType, indicatorValue);

  const [scan] = await db
    .update(scansTable)
    .set({ sources: sources as object[], riskScore, riskLevel, status: "completed" })
    .where(eq(scansTable.id, pendingScan.id))
    .returning();

  if (riskLevel === "high") {
    await db.insert(alertsTable).values({
      scanId: scan.id,
      indicatorValue,
      indicatorType,
      severity: riskScore >= 85 ? "critical" : "high",
      message: `High-risk ${indicatorType} detected: ${indicatorValue} (Risk Score: ${riskScore})`,
      status: "open",
      riskScore,
    });
  }

  await db.insert(activityLogsTable).values({
    userId: req.user!.userId,
    username: req.user!.username,
    action: "SCAN_CREATED",
    details: `Scanned ${indicatorType}: ${indicatorValue} — Risk: ${riskLevel} (${riskScore})`,
    ipAddress: req.ip,
  });

  const user = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

  res.status(201).json({
    ...scan,
    username: user[0]?.username ?? req.user!.username,
    sources,
  });
});

router.get("/scans/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scan] = await db
    .select({
      id: scansTable.id,
      userId: scansTable.userId,
      username: usersTable.username,
      indicatorType: scansTable.indicatorType,
      indicatorValue: scansTable.indicatorValue,
      riskScore: scansTable.riskScore,
      riskLevel: scansTable.riskLevel,
      status: scansTable.status,
      sources: scansTable.sources,
      notes: scansTable.notes,
      createdAt: scansTable.createdAt,
    })
    .from(scansTable)
    .leftJoin(usersTable, eq(scansTable.userId, usersTable.id))
    .where(eq(scansTable.id, params.data.id));

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  if (req.user!.role === "viewer" && scan.userId !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(scan);
});

router.delete("/scans/:id", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  const params = DeleteScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(scansTable)
    .where(eq(scansTable.id, params.data.id))
    .returning({ id: scansTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  res.json({ message: "Scan deleted successfully" });
});

export default router;
