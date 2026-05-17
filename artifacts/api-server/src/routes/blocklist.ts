import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { z } from "zod";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  password: "1234",
  host: "localhost",
  port: 5432,
  database: "threat_db",
});

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

    const { type, limit, offset } = parsed.data;
    
    let query = "SELECT * FROM blocklist";
    let params: any[] = [];
    let paramIndex = 1;
    
    if (type) {
      query += ` WHERE type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    query += ` ORDER BY blocked_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query("SELECT COUNT(*) as total FROM blocklist");
    
    res.json({ 
      entries: result.rows, 
      total: parseInt(countResult.rows[0].total) 
    });
  } catch (error) {
    console.error("Error fetching blocklist:", error);
    res.status(500).json({ error: "Failed to fetch blocklist" });
  }
});

// POST /api/blocklist
router.post("/blocklist", requireAuth, async (req, res): Promise<void> => {
  console.log("POST /api/blocklist called");
  try {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const data = parsed.data;
    const username = (req.user as any).username;
    const userId = (req.user as any).userId;

    const result = await pool.query(`
      INSERT INTO blocklist (
        type, value, source_ip, destination_ip, device_reported, assigned_to,
        action, reason, notes, status, blocked_by_user_id, blocked_by_username,
        blocked_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `, [
      data.type, data.value, data.sourceIp || null, data.destinationIp || null,
      data.deviceReported || null, data.assignedTo || null,
      data.action, data.reason || null, data.notes || null,
      "active", userId, username
    ]);

    console.log("Entry added, ID:", result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding to blocklist:", error);
    res.status(500).json({ error: "Failed to add to blocklist", details: (error as Error).message });
  }
});

// DELETE /api/blocklist/:id
router.delete("/blocklist/:id", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const result = await pool.query("DELETE FROM blocklist WHERE id = $1 RETURNING id", [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    res.json({ message: "Entry removed from blocklist" });
  } catch (error) {
    console.error("Error deleting from blocklist:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

export default router;
