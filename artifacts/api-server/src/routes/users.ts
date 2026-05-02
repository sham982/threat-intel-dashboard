import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db, usersTable, activityLogsTable } from "@workspace/db";
import {
  ListUsersQueryParams,
  CreateUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { role, isActive, search } = parsed.data;

  const conditions = [];
  if (role) conditions.push(eq(usersTable.role, role));
  if (isActive !== undefined) conditions.push(eq(usersTable.isActive, isActive));
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.username, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
        ilike(sql`coalesce(${usersTable.fullName}, '')`, `%${search}%`)
      )
    );
  }

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      fullName: usersTable.fullName,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      lastLogin: usersTable.lastLogin,
    })
    .from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(usersTable.createdAt);

  res.json(users);
});

router.post("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, fullName, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ username, email, fullName, passwordHash, role })
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      fullName: usersTable.fullName,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      lastLogin: usersTable.lastLogin,
    });

  await db.insert(activityLogsTable).values({
    userId: req.user!.userId,
    username: req.user!.username,
    action: "USER_CREATED",
    details: `Created user: ${username} with role: ${role}`,
    ipAddress: req.ip,
  });

  res.status(201).json(user);
});

router.get("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      fullName: usersTable.fullName,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      lastLogin: usersTable.lastLogin,
    })
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  if (parsed.data.password) {
    updates.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      fullName: usersTable.fullName,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      lastLogin: usersTable.lastLogin,
    });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: req.user!.userId,
    username: req.user!.username,
    action: "USER_UPDATED",
    details: `Updated user ID: ${params.data.id}`,
    ipAddress: req.ip,
  });

  res.json(user);
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (params.data.id === req.user!.userId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning({ id: usersTable.id, username: usersTable.username });

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: req.user!.userId,
    username: req.user!.username,
    action: "USER_DELETED",
    details: `Deleted user: ${deleted.username}`,
    ipAddress: req.ip,
  });

  res.json({ message: "User deleted successfully" });
});

export default router;
