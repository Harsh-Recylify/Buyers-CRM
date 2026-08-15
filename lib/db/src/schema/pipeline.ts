import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pipelineBoardsTable = pgTable("pipeline_boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#118847"),
  isDefault: boolean("is_default").notNull().default(false),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const pipelineStagesTable = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPipelineBoardSchema = createInsertSchema(pipelineBoardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPipelineStageSchema = createInsertSchema(pipelineStagesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type PipelineBoard = typeof pipelineBoardsTable.$inferSelect;
export type PipelineStage = typeof pipelineStagesTable.$inferSelect;
export type InsertPipelineBoard = z.infer<typeof insertPipelineBoardSchema>;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
