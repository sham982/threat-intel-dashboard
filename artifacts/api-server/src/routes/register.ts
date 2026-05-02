import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, activityLogsTable } from "@workspace/db";
import { z } from "zod";
import { signToken } from "../lib/auth";

const router: IRouter = Router();

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  email: z.string().email("Invalid email"),
  fullName: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", message: parsed.error.issues[0]?.message });
    return;
  }

  const { username, email, fullName, password } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Username already taken", message: "This username is already in use" });
    return;
  }

  const [existingEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingEmail) {
    res.status(409).json({ error: "Email already registered", message: "This email is already associated with an account" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ username, email, fullName, passwordHash, role: "viewer" })
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
    userId: user.id,
    username: user.username,
    action: "USER_REGISTERED",
    details: `Self-registered with email: ${email}`,
    ipAddress: req.ip,
  });

  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  res.status(201).json({ token, user });
});

export default router;
