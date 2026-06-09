/**
 * Setup script for Turso: pushes schema and seeds matches.
 * 
 * Edit the URL and TOKEN below, then run:
 *   node scripts/setup-turso.mjs
 */

// ===== CONFIGURE THESE =====
const TURSO_URL = "libsql://bolao-copa-andersonmarc20.aws-us-east-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDYxMzMsImlkIjoiMDE5ZWFjM2MtNzMwMS03NzE5LThiZTItNmIyYmZjMzBmZGZjIiwicmlkIjoiOTllNGYyNTYtMDA0Ny00Y2NlLWE1NjgtMTliOTYyNzUxZWJjIn0.-0Pe_vBc0bA5nAb8I4FvaE361sRG4rsbEyWUO95RS0Umly5ehGzqPDUg5k0nEcX1dh69DXa-x50KKegrZjCGBw";
// ============================

import { createClient } from "@libsql/client";
import crypto from "crypto";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

function id() {
  return crypto.randomBytes(12).toString("hex");
}

async function createTables() {
  console.log("📦 Creating tables...");

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS provider_providerAccountId_idx ON account(provider, providerAccountId);

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      sessionToken TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verificationToken (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS identifier_token_idx ON verificationToken(identifier, token);

    CREATE TABLE IF NOT EXISTS match (
      id TEXT PRIMARY KEY NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      match_date INTEGER NOT NULL,
      phase TEXT NOT NULL,
      "group" TEXT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS match_unique_idx ON match(home_team, away_team, match_date);

    CREATE TABLE IF NOT EXISTS prediction (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      match_id TEXT NOT NULL REFERENCES match(id) ON DELETE CASCADE,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      points INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS prediction_user_match_idx ON prediction(user_id, match_id);
  `);

  console.log("✅ Tables created!");
}

async function seedMatches() {
  console.log("⚽ Seeding matches...");

  const GROUP_STAGE_MATCHES = [
    { home: "Mexico", away: "South Africa", date: "2026-06-11T19:00:00Z", group: "A" },
    { home: "South Korea", away: "Czech Republic", date: "2026-06-12T02:00:00Z", group: "A" },
    { home: "Canada", away: "Bosnia & Herzegovina", date: "2026-06-12T19:00:00Z", group: "B" },
    { home: "USA", away: "Paraguay", date: "2026-06-13T01:00:00Z", group: "D" },
    { home: "Qatar", away: "Switzerland", date: "2026-06-13T19:00:00Z", group: "B" },
    { home: "Brazil", away: "Morocco", date: "2026-06-13T22:00:00Z", group: "C" },
    { home: "Haiti", away: "Scotland", date: "2026-06-14T01:00:00Z", group: "C" },
    { home: "Australia", away: "Turkey", date: "2026-06-14T04:00:00Z", group: "D" },
    { home: "Germany", away: "Curacao", date: "2026-06-14T17:00:00Z", group: "E" },
    { home: "Netherlands", away: "Japan", date: "2026-06-14T20:00:00Z", group: "F" },
    { home: "Ivory Coast", away: "Ecuador", date: "2026-06-14T23:00:00Z", group: "E" },
    { home: "Sweden", away: "Tunisia", date: "2026-06-15T02:00:00Z", group: "F" },
    { home: "Spain", away: "Cape Verde", date: "2026-06-15T16:00:00Z", group: "H" },
    { home: "Belgium", away: "Egypt", date: "2026-06-15T19:00:00Z", group: "G" },
    { home: "Saudi Arabia", away: "Uruguay", date: "2026-06-15T22:00:00Z", group: "H" },
    { home: "Iran", away: "New Zealand", date: "2026-06-16T01:00:00Z", group: "G" },
    { home: "France", away: "Senegal", date: "2026-06-16T19:00:00Z", group: "I" },
    { home: "Iraq", away: "Norway", date: "2026-06-16T22:00:00Z", group: "I" },
    { home: "Argentina", away: "Algeria", date: "2026-06-17T01:00:00Z", group: "J" },
    { home: "Austria", away: "Jordan", date: "2026-06-17T04:00:00Z", group: "J" },
    { home: "Portugal", away: "DR Congo", date: "2026-06-17T17:00:00Z", group: "K" },
    { home: "England", away: "Croatia", date: "2026-06-17T20:00:00Z", group: "L" },
    { home: "Ghana", away: "Panama", date: "2026-06-17T23:00:00Z", group: "L" },
    { home: "Uzbekistan", away: "Colombia", date: "2026-06-18T02:00:00Z", group: "K" },
    { home: "Czech Republic", away: "South Africa", date: "2026-06-18T16:00:00Z", group: "A" },
    { home: "Switzerland", away: "Bosnia & Herzegovina", date: "2026-06-18T19:00:00Z", group: "B" },
    { home: "Canada", away: "Qatar", date: "2026-06-18T22:00:00Z", group: "B" },
    { home: "Mexico", away: "South Korea", date: "2026-06-19T01:00:00Z", group: "A" },
    { home: "USA", away: "Australia", date: "2026-06-19T19:00:00Z", group: "D" },
    { home: "Scotland", away: "Morocco", date: "2026-06-19T22:00:00Z", group: "C" },
    { home: "Brazil", away: "Haiti", date: "2026-06-20T00:30:00Z", group: "C" },
    { home: "Turkey", away: "Paraguay", date: "2026-06-20T03:00:00Z", group: "D" },
    { home: "Netherlands", away: "Sweden", date: "2026-06-20T17:00:00Z", group: "F" },
    { home: "Germany", away: "Ivory Coast", date: "2026-06-20T20:00:00Z", group: "E" },
    { home: "Ecuador", away: "Curacao", date: "2026-06-21T00:00:00Z", group: "E" },
    { home: "Tunisia", away: "Japan", date: "2026-06-21T04:00:00Z", group: "F" },
    { home: "Spain", away: "Saudi Arabia", date: "2026-06-21T16:00:00Z", group: "H" },
    { home: "Belgium", away: "Iran", date: "2026-06-21T19:00:00Z", group: "G" },
    { home: "Uruguay", away: "Cape Verde", date: "2026-06-21T22:00:00Z", group: "H" },
    { home: "New Zealand", away: "Egypt", date: "2026-06-22T01:00:00Z", group: "G" },
    { home: "Argentina", away: "Austria", date: "2026-06-22T17:00:00Z", group: "J" },
    { home: "France", away: "Iraq", date: "2026-06-22T21:00:00Z", group: "I" },
    { home: "Norway", away: "Senegal", date: "2026-06-23T00:00:00Z", group: "I" },
    { home: "Jordan", away: "Algeria", date: "2026-06-23T03:00:00Z", group: "J" },
    { home: "Portugal", away: "Uzbekistan", date: "2026-06-23T17:00:00Z", group: "K" },
    { home: "England", away: "Ghana", date: "2026-06-23T20:00:00Z", group: "L" },
    { home: "Panama", away: "Croatia", date: "2026-06-23T23:00:00Z", group: "L" },
    { home: "Colombia", away: "DR Congo", date: "2026-06-24T02:00:00Z", group: "K" },
    { home: "Switzerland", away: "Canada", date: "2026-06-24T19:00:00Z", group: "B" },
    { home: "Bosnia & Herzegovina", away: "Qatar", date: "2026-06-24T19:00:00Z", group: "B" },
    { home: "Morocco", away: "Haiti", date: "2026-06-24T22:00:00Z", group: "C" },
    { home: "Scotland", away: "Brazil", date: "2026-06-24T22:00:00Z", group: "C" },
    { home: "South Africa", away: "South Korea", date: "2026-06-25T01:00:00Z", group: "A" },
    { home: "Czech Republic", away: "Mexico", date: "2026-06-25T01:00:00Z", group: "A" },
    { home: "Curacao", away: "Ivory Coast", date: "2026-06-25T20:00:00Z", group: "E" },
    { home: "Ecuador", away: "Germany", date: "2026-06-25T20:00:00Z", group: "E" },
    { home: "Tunisia", away: "Netherlands", date: "2026-06-25T23:00:00Z", group: "F" },
    { home: "Japan", away: "Sweden", date: "2026-06-25T23:00:00Z", group: "F" },
    { home: "Turkey", away: "USA", date: "2026-06-26T02:00:00Z", group: "D" },
    { home: "Paraguay", away: "Australia", date: "2026-06-26T02:00:00Z", group: "D" },
    { home: "Norway", away: "France", date: "2026-06-26T19:00:00Z", group: "I" },
    { home: "Senegal", away: "Iraq", date: "2026-06-26T19:00:00Z", group: "I" },
    { home: "Cape Verde", away: "Saudi Arabia", date: "2026-06-27T00:00:00Z", group: "H" },
    { home: "Uruguay", away: "Spain", date: "2026-06-27T00:00:00Z", group: "H" },
    { home: "New Zealand", away: "Belgium", date: "2026-06-27T03:00:00Z", group: "G" },
    { home: "Egypt", away: "Iran", date: "2026-06-27T03:00:00Z", group: "G" },
    { home: "Panama", away: "England", date: "2026-06-27T21:00:00Z", group: "L" },
    { home: "Croatia", away: "Ghana", date: "2026-06-27T21:00:00Z", group: "L" },
    { home: "Colombia", away: "Portugal", date: "2026-06-27T23:30:00Z", group: "K" },
    { home: "DR Congo", away: "Uzbekistan", date: "2026-06-27T23:30:00Z", group: "K" },
    { home: "Algeria", away: "Austria", date: "2026-06-28T02:00:00Z", group: "J" },
    { home: "Jordan", away: "Argentina", date: "2026-06-28T02:00:00Z", group: "J" },
  ];

  const now = Date.now();
  let inserted = 0;
  let skipped = 0;

  for (const match of GROUP_STAGE_MATCHES) {
    try {
      const matchDate = new Date(match.date).getTime();
      await client.execute({
        sql: `INSERT INTO match (id, home_team, away_team, match_date, phase, "group", home_score, away_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'scheduled', ?, ?)`,
        args: [id(), match.home, match.away, matchDate, "group_stage", match.group, now, now],
      });
      inserted++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`✅ Seed complete: ${inserted} inserted, ${skipped} skipped`);
}

try {
  await createTables();
  await seedMatches();
} catch (e) {
  console.error("❌ Error:", e.message);
}

client.close();
