import { pgTable, text, serial, timestamp, integer, real, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const indicatorTypeEnum = pgEnum("indicator_type", ["ip", "url", "domain", "hash"]);
export const riskLevelEnum = pgEnum("risk_level", ["high", "medium", "low", "unknown"]);
export const scanStatusEnum = pgEnum("scan_status", ["pending", "completed", "failed"]);

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  indicatorType: indicatorTypeEnum("indicator_type").notNull(),
  indicatorValue: text("indicator_value").notNull(),
  riskScore: real("risk_score").notNull().default(0),
  riskLevel: riskLevelEnum("risk_level").notNull().default("unknown"),
  status: scanStatusEnum("status").notNull().default("pending"),
  sources: jsonb("sources").notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
