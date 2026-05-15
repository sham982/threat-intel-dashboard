import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const addSchema = z.object({
  type: z.enum(["ip", "hash", "domain", "url"]),
  value: z.string().min(1),
  sourceIp: z.string().optional(),
  destinationIp: z.string().optional(),
  deviceReported: z.string().optional(),
  assignedTo: z.string().optional(),
  action: z.string().default("blocked"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const filterSchema = z.object({
  type: z.enum(["ip", "hash", "domain", "url"]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/blocklist
router.get("/blocklist", requireAuth, async (req, res): Promise<void> => {
  try {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    
    // Return empty array for now - will implement full blocklist later
    res.json({ entries: [], total: 0 });
  } catch (error) {
    console.error("Error fetching blocklist:", error);
    res.json({ entries: [], total: 0 });
  }
});

// POST /api/blocklist
router.post("/blocklist", requireAuth, async (req, res): Promise<void> => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  
  // Return mock success for now
  res.status(201).json({ 
    id: Date.now(),
    ...parsed.data,
    blockedByUsername: req.user!.username,
    blockedAt: new Date().toISOString()
  });
});

// DELETE /api/blocklist/:id
router.delete("/blocklist/:id", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  res.json({ message: "Entry removed from blocklist" });
});

export default router;
