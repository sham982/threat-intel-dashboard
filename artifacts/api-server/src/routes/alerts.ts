import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, alertsTable, activityLogsTable } from "@workspace/db";
import {
  ListAlertsQueryParams,
  GetAlertParams,
  UpdateAlertParams,
  UpdateAlertBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/alerts", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAlertsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, severity, limit, offset } = parsed.data;
  const conditions = [];

  if (status) conditions.push(eq(alertsTable.status, status));
  if (severity) conditions.push(eq(alertsTable.severity, severity));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [alerts, [{ count }]] = await Promise.all([
    db
      .select()
      .from(alertsTable)
      .where(whereClause)
      .orderBy(desc(alertsTable.createdAt))
      .limit(limit ?? 50)
      .offset(offset ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(alertsTable).where(whereClause),
  ]);

  res.json({ alerts, total: count });
});

router.get("/alerts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.id, params.data.id));

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(alert);
});

router.patch("/alerts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "resolved") {
    updates.resolvedBy = req.user!.username;
    updates.resolvedAt = new Date();
  } else {
    updates.resolvedBy = null;
    updates.resolvedAt = null;
  }

  const [alert] = await db
    .update(alertsTable)
    .set(updates)
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: req.user!.userId,
    username: req.user!.username,
    action: parsed.data.status === "resolved" ? "ALERT_RESOLVED" : "ALERT_REOPENED",
    details: `Alert ID ${params.data.id} marked as ${parsed.data.status}`,
    ipAddress: req.ip,
  });

  res.json(alert);
});

export default router;
