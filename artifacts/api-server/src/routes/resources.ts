import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, socResourcesTable } from "@workspace/db";
import {
  ListResourcesQueryParams,
  CreateResourceBody,
  UpdateResourceParams,
  UpdateResourceBody,
  DeleteResourceParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/resources", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListResourcesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, search } = parsed.data;
  const conditions = [];

  if (category) conditions.push(eq(socResourcesTable.category, category));
  if (search) {
    conditions.push(
      or(
        ilike(socResourcesTable.name, `%${search}%`),
        ilike(socResourcesTable.url, `%${search}%`)
      )
    );
  }

  const resources = await db
    .select()
    .from(socResourcesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(socResourcesTable.category, socResourcesTable.name);

  res.json(resources);
});

router.post("/resources", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  const parsed = CreateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [resource] = await db
    .insert(socResourcesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(resource);
});

router.patch("/resources/:id", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  const params = UpdateResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [resource] = await db
    .update(socResourcesTable)
    .set(parsed.data)
    .where(eq(socResourcesTable.id, params.data.id))
    .returning();

  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  res.json(resource);
});

router.delete("/resources/:id", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  const params = DeleteResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(socResourcesTable)
    .where(eq(socResourcesTable.id, params.data.id))
    .returning({ id: socResourcesTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  res.json({ message: "Resource deleted successfully" });
});

export default router;
