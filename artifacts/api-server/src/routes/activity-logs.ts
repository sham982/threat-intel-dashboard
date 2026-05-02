import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { ListActivityLogsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/activity-logs", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = ListActivityLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, limit, offset } = parsed.data;
  const whereClause = userId ? eq(activityLogsTable.userId, userId) : undefined;

  const [logs, [{ count }]] = await Promise.all([
    db
      .select()
      .from(activityLogsTable)
      .where(whereClause)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(limit ?? 50)
      .offset(offset ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(activityLogsTable).where(whereClause),
  ]);

  res.json({ logs, total: count });
});

export default router;
