import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function createBlocklistTable() {
  console.log("Creating blocklist table...");
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blocklist (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        value TEXT NOT NULL,
        source_ip VARCHAR(45),
        destination_ip VARCHAR(45),
        device_reported VARCHAR(100),
        assigned_to VARCHAR(100),
        action VARCHAR(20) DEFAULT 'blocked',
        reason TEXT,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'active',
        blocked_by_user_id INTEGER,
        blocked_by_username VARCHAR(100),
        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✅ Blocklist table created successfully!");
  } catch (error) {
    console.error("Error creating blocklist table:", error);
  }
}

createBlocklistTable();
