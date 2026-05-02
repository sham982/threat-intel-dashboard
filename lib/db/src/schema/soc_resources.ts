import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourceCategoryEnum = pgEnum("resource_category", [
  "ip_check",
  "url_check",
  "malware_check",
  "cyber_threat_intelligence",
]);

export const socResourcesTable = pgTable("soc_resources", {
  id: serial("id").primaryKey(),
  category: resourceCategoryEnum("category").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSocResourceSchema = createInsertSchema(socResourcesTable).omit({ id: true, createdAt: true });
export type InsertSocResource = z.infer<typeof insertSocResourceSchema>;
export type SocResource = typeof socResourcesTable.$inferSelect;
