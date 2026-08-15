import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, loginLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { logActivity, logAudit } from "../lib/activity";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.status !== "active") {
    res.status(401).json({ error: "Account is inactive" });
    return;
  }
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
  await db.insert(loginLogsTable).values({
    userId: user.id,
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
    status: "success",
  });
  await logActivity({ type: "user_login", description: `${user.name} logged in`, userId: user.id });
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      status: user.status, phone: user.phone, department: user.department,
      avatar: user.avatar, lastLogin: user.lastLogin, createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password required" });
    return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    name, email: email.toLowerCase(), passwordHash,
    role: role ?? "team_member",
  }).returning();
  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.status(201).json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      status: user.status, phone: user.phone, department: user.department,
      avatar: user.avatar, lastLogin: user.lastLogin, createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (user) {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiry = new Date(Date.now() + 3600000); // 1 hour
    await db.update(usersTable).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(usersTable.id, user.id));
    // In production, send email. For now just return token.
    req.log.info({ token }, "Password reset token generated");
  }
  res.json({ message: "If an account exists with that email, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, token));
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(usersTable).set({ passwordHash, resetToken: null, resetTokenExpiry: null }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password reset successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id, name: user.name, email: user.email, role: user.role,
    status: user.status, phone: user.phone, department: user.department,
    avatar: user.avatar, lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
  await logActivity({ type: "password_changed", description: `${user.name} changed their password`, userId: user.id });
  res.json({ message: "Password changed successfully" });
});

router.patch("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, department, avatar } = req.body;
  const [user] = await db.update(usersTable)
    .set({ name, phone, department, avatar })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json({
    id: user.id, name: user.name, email: user.email, role: user.role,
    status: user.status, phone: user.phone, department: user.department,
    avatar: user.avatar, lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
