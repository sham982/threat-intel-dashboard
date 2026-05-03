import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, blocklistTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const addSchema = z.object({
  type: z.enum(["ip", "hash", "domain", "url"]),
  value: z.string().min(1, "Value is required"),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

const filterSchema = z.object({
  type: z.enum(["ip", "hash", "domain", "url"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/blocklist — all authenticated users
router.get("/blocklist", requireAuth, async (req, res): Promise<void> => {
  const parsed = filterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { type, limit, offset } = parsed.data;
  const conditions = type ? [eq(blocklistTable.type, type)] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, [{ count }]] = await Promise.all([
    db
      .select()
      .from(blocklistTable)
      .where(whereClause)
      .orderBy(desc(blocklistTable.blockedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(blocklistTable)
      .where(whereClause),
  ]);

  res.json({ entries, total: count });
});

// POST /api/blocklist — all authenticated users can add entries
router.post("/blocklist", requireAuth, async (req, res): Promise<void> => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const [entry] = await db
    .insert(blocklistTable)
    .values({
      ...parsed.data,
      blockedByUserId: req.user!.userId,
      blockedByUsername: req.user!.username,
    })
    .returning();

  res.status(201).json(entry);
});

// DELETE /api/blocklist/:id — admin and analyst only
router.delete("/blocklist/:id", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [deleted] = await db
    .delete(blocklistTable)
    .where(eq(blocklistTable.id, id))
    .returning({ id: blocklistTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json({ message: "Entry removed from blocklist" });
});

export default router;
