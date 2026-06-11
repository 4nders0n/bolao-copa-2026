/**
 * Add broadcast column to match table.
 * Run: node scripts/add-broadcast-column.mjs
 * 
 * For production (Turso), edit the URL/TOKEN below.
 */

import { createClient } from "@libsql/client";

// Use Turso if configured, otherwise local
const TURSO_URL = process.env.TURSO_DATABASE_URL || "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

const isLocal = !TURSO_URL;
const cwd = process.cwd().replace(/\\/g, "/");

const client = createClient({
  url: isLocal ? `file:///${cwd}/dev.db` : TURSO_URL,
  authToken: TURSO_TOKEN || undefined,
});

try {
  await client.execute("ALTER TABLE match ADD COLUMN broadcast TEXT");
  console.log("✅ Coluna 'broadcast' adicionada à tabela 'match'");
} catch (e) {
  if (e.message?.includes("duplicate column")) {
    console.log("ℹ️ Coluna 'broadcast' já existe");
  } else {
    console.error("❌ Erro:", e.message);
  }
}

client.close();
