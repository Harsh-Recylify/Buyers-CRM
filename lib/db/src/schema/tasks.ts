import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // todo | in_progress | done
  priority: text("priority").notNull().default("medium"), // high | medium | low
  entityType: text("entity_type"), // company | buyer | recycler | bid
  entityId: integer("entity_id"),
  assignedToId: integer("assigned_to_id"),
  createdById: integer("created_by_id"),
  dueDate: text("due_date"), // YYYY-MM-DD
  reminderAt: text("reminder_at"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const taskCommentsTable = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskCommentSchema = createInsertSchema(taskCommentsTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
export type TaskComment = typeof taskCommentsTable.$inferSelect;
