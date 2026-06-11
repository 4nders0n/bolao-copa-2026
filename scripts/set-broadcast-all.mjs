/**
 * Set broadcast channels for all group stage matches.
 * 
 * Based on Copa 2026 broadcast rights in Brazil:
 * - CazéTV has ALL 104 matches
 * - Globo, SBT, SporTV share the remaining (most group stage games are on all)
 * 
 * Run: node scripts/set-broadcast-all.mjs
 */

import { createClient } from "@libsql/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Use Turso if available, otherwise local
const TURSO_URL = "libsql://bolao-copa-andersonmarc20.aws-us-east-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDYxMzMsImlkIjoiMDE5ZWFjM2MtNzMwMS03NzE5LThiZTItNmIyYmZjMzBmZGZjIiwicmlkIjoiOTllNGYyNTYtMDA0Ny00Y2NlLWE1NjgtMTliOTYyNzUxZWJjIn0.-0Pe_vBc0bA5nAb8I4FvaE361sRG4rsbEyWUO95RS0Umly5ehGzqPDUg5k0nEcX1dh69DXa-x50KKegrZjCGBw";

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Default: all group stage matches are on CazéTV + Globo + SBT + SporTV
const defaultChannels = JSON.stringify(["CazéTV", "Globo", "SBT", "SporTV"]);

try {
  const result = await client.execute({
    sql: "UPDATE match SET broadcast = ? WHERE broadcast IS NULL",
    args: [defaultChannels],
  });
  console.log(`✅ Transmissão definida para ${result.rowsAffected} jogos (Turso)`);
} catch (e) {
  console.error("❌ Erro:", e.message);
}

client.close();

// Also update local DB
const cwd = process.cwd().replace(/\\/g, "/");
const localClient = createClient({ url: `file:///${cwd}/dev.db` });

try {
  const result = await localClient.execute({
    sql: "UPDATE match SET broadcast = ? WHERE broadcast IS NULL",
    args: [defaultChannels],
  });
  console.log(`✅ Transmissão definida para ${result.rowsAffected} jogos (local)`);
} catch (e) {
  console.error("❌ Erro local:", e.message);
}

localClient.close();
