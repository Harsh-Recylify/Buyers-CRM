import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const invitationsTable = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("team_member"), // super_admin | admin | manager | team_member
  department: text("department"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | accepted | revoked
  invitedById: integer("invited_by_id").references(() => usersTable.id),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitationsTable).omit({ id: true, createdAt: true });
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitationsTable.$inferSelect;
