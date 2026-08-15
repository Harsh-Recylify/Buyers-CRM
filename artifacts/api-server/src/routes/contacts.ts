import { Router } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function formatContact(c: typeof contactsTable.$inferSelect) {
  return {
    id: c.id, companyId: c.companyId, name: c.name, email: c.email,
    phone: c.phone, designation: c.designation, isPrimary: c.isPrimary,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/companies/:companyId/contacts", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId, 10);
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.companyId, companyId));
  res.json(contacts.map(formatContact));
});

router.post("/companies/:companyId/contacts", requireAuth, async (req, res): Promise<void> => {
  const companyId = parseInt(Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId, 10);
  const { name, email, phone, designation, isPrimary } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [contact] = await db.insert(contactsTable).values({
    companyId, name, email, phone, designation, isPrimary: !!isPrimary,
  }).returning();
  res.status(201).json(formatContact(contact));
});

router.patch("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, email, phone, designation, isPrimary } = req.body;
  const [contact] = await db.update(contactsTable)
    .set({ name, email, phone, designation, isPrimary })
    .where(eq(contactsTable.id, id)).returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(formatContact(contact));
});

router.delete("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(contactsTable).where(eq(contactsTable.id, id));
  res.sendStatus(204);
});

export default router;
