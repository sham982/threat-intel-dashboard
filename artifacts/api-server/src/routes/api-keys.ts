import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, userApiKeysTable, socResourcesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const addKeySchema = z.object({
  platform: z.string().min(1, "Platform name is required").max(80),
  category: z.enum(["ip_check", "url_check", "malware_check", "cyber_threat_intelligence"]).optional(),
  url: z.string().url("Must be a valid URL").optional(),
  apiKey: z.string().min(1, "API key is required"),
  label: z.string().max(120).optional(),
});

const updatePrioritySchema = z.object({
  direction: z.enum(["up", "down"]),
});

// GET all keys for current user
router.get("/user/api-keys", requireAuth, async (req, res): Promise<void> => {
  const keys = await db
    .select({
      id: userApiKeysTable.id,
      platform: userApiKeysTable.platform,
      label: userApiKeysTable.label,
      priority: userApiKeysTable.priority,
      updatedAt: userApiKeysTable.updatedAt,
      apiKeyRaw: userApiKeysTable.apiKey,
    })
    .from(userApiKeysTable)
    .where(eq(userApiKeysTable.userId, req.user!.userId))
    .orderBy(asc(userApiKeysTable.platform), asc(userApiKeysTable.priority));

  res.json(keys.map(k => ({
    id: k.id,
    platform: k.platform,
    label: k.label,
    priority: k.priority,
    updatedAt: k.updatedAt,
    apiKey: maskKey(k.apiKeyRaw),
  })));
});

// POST — add a new key for a platform (multiple allowed)
router.post("/user/api-keys", requireAuth, async (req, res): Promise<void> => {
  const parsed = addKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { platform, category, url, apiKey, label } = parsed.data;
  const platformNorm = platform.trim().toLowerCase().replace(/\s+/g, "_");

  // Find the current max priority for this platform/user
  const existing = await db
    .select({ priority: userApiKeysTable.priority })
    .from(userApiKeysTable)
    .where(and(
      eq(userApiKeysTable.userId, req.user!.userId),
      eq(userApiKeysTable.platform, platformNorm)
    ))
    .orderBy(asc(userApiKeysTable.priority));

  const nextPriority = existing.length > 0
    ? (existing[existing.length - 1].priority + 1)
    : 0;

  const [newKey] = await db.insert(userApiKeysTable).values({
    userId: req.user!.userId,
    platform: platformNorm,
    apiKey,
    label: label || `Key ${nextPriority + 1}`,
    priority: nextPriority,
  }).returning({ id: userApiKeysTable.id, priority: userApiKeysTable.priority });

  // ALSO create a SOC Resource for this platform if it doesn't exist yet AND we have category and url
  if (category && url && url.trim() !== "") {
    const existingResource = await db
      .select()
      .from(socResourcesTable)
      .where(eq(socResourcesTable.name, platformNorm))
      .limit(1);

    if (existingResource.length === 0) {
      // Format the name for display (capitalize first letters)
      const displayName = platformNorm.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      
      await db.insert(socResourcesTable).values({
        category: category,
        name: displayName,
        url: url,
        description: `Custom threat intelligence platform. API key configured in Settings.`,
      });
    }
  }

  res.status(201).json({ message: "API key added", id: newKey.id, priority: newKey.priority });
});

// DELETE a specific key by ID
router.delete("/user/api-keys/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid key ID" });
    return;
  }

  const key = await db
    .select({ id: userApiKeysTable.id, platform: userApiKeysTable.platform, priority: userApiKeysTable.priority })
    .from(userApiKeysTable)
    .where(and(eq(userApiKeysTable.id, id), eq(userApiKeysTable.userId, req.user!.userId)))
    .limit(1);

  if (key.length === 0) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  await db.delete(userApiKeysTable).where(eq(userApiKeysTable.id, id));

  // Re-normalise priorities for remaining keys on that platform
  const remaining = await db
    .select({ id: userApiKeysTable.id })
    .from(userApiKeysTable)
    .where(and(
      eq(userApiKeysTable.userId, req.user!.userId),
      eq(userApiKeysTable.platform, key[0].platform)
    ))
    .orderBy(asc(userApiKeysTable.priority));

  for (let i = 0; i < remaining.length; i++) {
    await db.update(userApiKeysTable).set({ priority: i }).where(eq(userApiKeysTable.id, remaining[i].id));
  }

  res.json({ message: "API key removed" });
});

// PATCH — move a key up or down in priority
router.patch("/user/api-keys/:id/priority", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid key ID" });
    return;
  }

  const parsed = updatePrioritySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "direction must be 'up' or 'down'" });
    return;
  }

  const key = await db
    .select()
    .from(userApiKeysTable)
    .where(and(eq(userApiKeysTable.id, id), eq(userApiKeysTable.userId, req.user!.userId)))
    .limit(1);

  if (key.length === 0) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  const siblings = await db
    .select({ id: userApiKeysTable.id, priority: userApiKeysTable.priority })
    .from(userApiKeysTable)
    .where(and(
      eq(userApiKeysTable.userId, req.user!.userId),
      eq(userApiKeysTable.platform, key[0].platform)
    ))
    .orderBy(asc(userApiKeysTable.priority));

  const currentIdx = siblings.findIndex(s => s.id === id);
  const swapIdx = parsed.data.direction === "up" ? currentIdx - 1 : currentIdx + 1;

  if (swapIdx < 0 || swapIdx >= siblings.length) {
    res.status(400).json({ error: "Already at boundary" });
    return;
  }

  const currentPriority = siblings[currentIdx].priority;
  const swapPriority = siblings[swapIdx].priority;

  await db.update(userApiKeysTable).set({ priority: swapPriority }).where(eq(userApiKeysTable.id, siblings[currentIdx].id));
  await db.update(userApiKeysTable).set({ priority: currentPriority }).where(eq(userApiKeysTable.id, siblings[swapIdx].id));

  res.json({ message: "Priority updated" });
});

function parseIdParam(rawId: string | string[]): number | null {
  const value = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!value) return null;
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.max(8, key.length - 8)) + key.slice(-4);
}

export { router as apiKeysRouter };
export default router;
