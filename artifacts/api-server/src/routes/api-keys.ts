import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userApiKeysTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const upsertKeySchema = z.object({
  platform: z.enum(["virustotal", "abuseipdb", "alienvault_otx", "shodan", "censys"]),
  apiKey: z.string().min(1, "API key is required"),
  label: z.string().optional(),
});

const deleteKeySchema = z.object({
  platform: z.enum(["virustotal", "abuseipdb", "alienvault_otx", "shodan", "censys"]),
});

router.get("/user/api-keys", requireAuth, async (req, res): Promise<void> => {
  const keys = await db
    .select({
      id: userApiKeysTable.id,
      platform: userApiKeysTable.platform,
      label: userApiKeysTable.label,
      updatedAt: userApiKeysTable.updatedAt,
      apiKeyMasked: userApiKeysTable.apiKey,
    })
    .from(userApiKeysTable)
    .where(eq(userApiKeysTable.userId, req.user!.userId));

  const masked = keys.map(k => ({
    ...k,
    apiKey: maskKey(k.apiKeyMasked),
  }));

  res.json(masked);
});

router.put("/user/api-keys", requireAuth, async (req, res): Promise<void> => {
  const parsed = upsertKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { platform, apiKey, label } = parsed.data;

  const existing = await db
    .select({ id: userApiKeysTable.id })
    .from(userApiKeysTable)
    .where(and(
      eq(userApiKeysTable.userId, req.user!.userId),
      eq(userApiKeysTable.platform, platform)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userApiKeysTable)
      .set({ apiKey, label, updatedAt: new Date() })
      .where(and(
        eq(userApiKeysTable.userId, req.user!.userId),
        eq(userApiKeysTable.platform, platform)
      ));
  } else {
    await db.insert(userApiKeysTable).values({
      userId: req.user!.userId,
      platform,
      apiKey,
      label,
    });
  }

  res.json({ message: "API key saved successfully" });
});

router.delete("/user/api-keys/:platform", requireAuth, async (req, res): Promise<void> => {
  const parsed = deleteKeySchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .delete(userApiKeysTable)
    .where(and(
      eq(userApiKeysTable.userId, req.user!.userId),
      eq(userApiKeysTable.platform, parsed.data.platform)
    ));

  res.json({ message: "API key removed" });
});

router.get("/user/api-keys/export", requireAuth, async (req, res): Promise<void> => {
  const keys = await db
    .select()
    .from(userApiKeysTable)
    .where(eq(userApiKeysTable.userId, req.user!.userId));

  res.json(keys.map(k => ({
    platform: k.platform,
    hasKey: true,
    updatedAt: k.updatedAt,
  })));
});

function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.max(8, key.length - 8)) + key.slice(-4);
}

export { router as apiKeysRouter };
export default router;
