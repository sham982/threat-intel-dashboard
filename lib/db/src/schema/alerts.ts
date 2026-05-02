import { pgTable, text, serial, timestamp, integer, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scansTable } from "./scans";

export const alertSeverityEnum = pgEnum("alert_severity", ["critical", "high", "medium", "low"]);
export const alertStatusEnum = pgEnum("alert_status", ["open", "resolved"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull().references(() => scansTable.id),
  indicatorValue: text("indicator_value").notNull(),
  indicatorType: text("indicator_type").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  message: text("message").notNull(),
  status: alertStatusEnum("status").notNull().default("open"),
  riskScore: real("risk_score").notNull().default(0),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
