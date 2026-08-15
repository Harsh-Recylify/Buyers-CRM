import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // company_created | company_updated | stage_changed | bid_created | buyer_added | recycler_added | user_login | password_changed | etc.
  description: text("description").notNull(),
  entityType: text("entity_type"), // company | buyer | recycler | bid | user
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  userId: integer("user_id"),
  metadata: text("metadata"), // JSON string for extra data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
