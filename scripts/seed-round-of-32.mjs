/**
 * Seed Round of 32 matches for World Cup 2026.
 * Run: node scripts/seed-round-of-32.mjs
 */

import { createClient } from "@libsql/client";
import crypto from "crypto";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = createClient({
  url: "libsql://bolao-copa-andersonmarc20.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDYxMzMsImlkIjoiMDE5ZWFjM2MtNzMwMS03NzE5LThiZTItNmIyYmZjMzBmZGZjIiwicmlkIjoiOTllNGYyNTYtMDA0Ny00Y2NlLWE1NjgtMTliOTYyNzUxZWJjIn0.-0Pe_vBc0bA5nAb8I4FvaE361sRG4rsbEyWUO95RS0Umly5ehGzqPDUg5k0nEcX1dh69DXa-x50KKegrZjCGBw",
});

function id() {
  return crypto.randomBytes(12).toString("hex");
}

const broadcast = JSON.stringify(["CazéTV", "Globo", "SBT", "SporTV"]);

// Times in UTC (ET + 4h = UTC during summer)
const ROUND_OF_32 = [
  // June 28
  { home: "South Africa", away: "Canada", date: "2026-06-28T19:00:00Z" },
  // June 29
  { home: "Brazil", away: "Japan", date: "2026-06-29T17:00:00Z" },
  { home: "Germany", away: "Paraguay", date: "2026-06-29T20:30:00Z" },
  { home: "Netherlands", away: "Morocco", date: "2026-06-30T01:00:00Z" },
  // June 30
  { home: "Ivory Coast", away: "Norway", date: "2026-06-30T17:00:00Z" },
  { home: "France", away: "Sweden", date: "2026-06-30T21:00:00Z" },
  { home: "Mexico", away: "Ecuador", date: "2026-07-01T01:00:00Z" },
  // July 1
  { home: "England", away: "DR Congo", date: "2026-07-01T16:00:00Z" },
  { home: "Belgium", away: "Senegal", date: "2026-07-01T20:00:00Z" },
  { home: "USA", away: "Bosnia & Herzegovina", date: "2026-07-02T00:00:00Z" },
  // July 2
  { home: "Spain", away: "Austria", date: "2026-07-02T19:00:00Z" },
  { home: "Portugal", away: "Croatia", date: "2026-07-02T23:00:00Z" },
  { home: "Switzerland", away: "Algeria", date: "2026-07-03T03:00:00Z" },
  // July 3
  { home: "Australia", away: "Egypt", date: "2026-07-03T18:00:00Z" },
  { home: "Argentina", away: "Cape Verde", date: "2026-07-03T22:00:00Z" },
  { home: "Colombia", away: "Ghana", date: "2026-07-04T01:30:00Z" },
];

async function seed() {
  const now = Date.now();
  let inserted = 0;
  let skipped = 0;

  for (const match of ROUND_OF_32) {
    try {
      const matchDate = new Date(match.date).getTime();
      await client.execute({
        sql: `INSERT INTO match (id, home_team, away_team, match_date, phase, "group", home_score, away_score, status, broadcast, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, 'scheduled', ?, ?, ?)`,
        args: [id(), match.home, match.away, matchDate, "round_of_32", broadcast, now, now],
      });
      inserted++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`✅ Round of 32: ${inserted} inserted, ${skipped} skipped`);
}

seed()
  .then(() => client.close())
  .catch((e) => {
    console.error("❌ Error:", e.message);
    client.close();
  });
