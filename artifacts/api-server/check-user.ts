import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function checkUser() {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, "admin"));
  
  if (users.length === 0) {
    console.log("Admin user not found!");
    return;
  }
  
  const user = users[0];
  console.log("User found:", user.username, user.role);
  console.log("Password hash:", user.passwordHash);
  
  // Test password
  const isValid = await bcrypt.compare("admin123", user.passwordHash);
  console.log("Password 'admin123' is valid:", isValid);
}

checkUser();
