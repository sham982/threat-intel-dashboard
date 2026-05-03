import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const blocklistTypeEnum = pgEnum("blocklist_type", ["ip", "hash", "domain", "url"]);

export const blocklistTable = pgTable("blocklist", {
  id: serial("id").primaryKey(),
  type: blocklistTypeEnum("type").notNull(),
  value: text("value").notNull(),
  blockedByUserId: integer("blocked_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  blockedByUsername: text("blocked_by_username").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Blocklist = typeof blocklistTable.$inferSelect;
