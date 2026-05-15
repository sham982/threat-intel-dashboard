import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const blocklistTable = pgTable("blocklist", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // ip, hash, domain, url
  value: text("value").notNull(), // the indicator value
  sourceIp: text("source_ip"), // Source IP that attempted connection
  destinationIp: text("destination_ip"), // Destination IP targeted
  deviceReported: text("device_reported"), // Device that reported (FortiSIEM, Checkpoint, etc.)
  assignedTo: text("assigned_to"), // Team assigned (Infrastructure Team, etc.)
  action: text("action").default("blocked"), // Blocked, Monitored, Whitelisted
  reason: text("reason"),
  notes: text("notes"),
  status: text("status").default("blocked"), // blocked, open
  blockedByUserId: integer("blocked_by_user_id").references(() => usersTable.id),
  blockedByUsername: text("blocked_by_username").notNull(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BlocklistEntry = typeof blocklistTable.$inferSelect;
export type NewBlocklistEntry = typeof blocklistTable.$inferInsert;
