import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const apiPlatformEnum = pgEnum("api_platform", [
  "virustotal",
  "abuseipdb",
  "alienvault_otx",
  "shodan",
  "censys",
]);

export const userApiKeysTable = pgTable("user_api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  platform: apiPlatformEnum("platform").notNull(),
  apiKey: text("api_key").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserApiKey = typeof userApiKeysTable.$inferSelect;
