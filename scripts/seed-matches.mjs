/**
 * Seed script: inserts all 72 World Cup 2026 group stage matches into the database.
 * Run with: node scripts/seed-matches.mjs
 * 
 * Source: FIFA official schedule (times in UTC)
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import crypto from "crypto";

const client = createClient({ url: "file:./dev.db" });
const db = drizzle(client);

const matches = sqliteTable(
  "match",
  {
    id: text("id").notNull().primaryKey(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    matchDate: integer("match_date", { mode: "timestamp_ms" }).notNull(),
    phase: text("phase").notNull(),
    group: text("group"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    status: text("status").notNull().default("scheduled"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (match) => ({
    uniqueMatch: uniqueIndex("match_unique_idx").on(
      match.homeTeam,
      match.awayTeam,
      match.matchDate
    ),
  })
);

function id() {
  return crypto.randomBytes(12).toString("hex");
}

// All times in UTC (UK time = UTC+1 BST in June/July, so subtract 0 from BST... 
// Actually UK is BST = UTC+1 in June. So 8pm BST = 19:00 UTC)
// Converting: UK kick-off time minus 1 hour = UTC

const GROUP_STAGE_MATCHES = [
  // === MATCHDAY 1 ===
  // June 11
  { home: "Mexico", away: "South Africa", date: "2026-06-11T19:00:00Z", group: "A" },
  // June 12
  { home: "South Korea", away: "Czech Republic", date: "2026-06-12T02:00:00Z", group: "A" },
  { home: "Canada", away: "Bosnia & Herzegovina", date: "2026-06-12T19:00:00Z", group: "B" },
  // June 13
  { home: "USA", away: "Paraguay", date: "2026-06-13T01:00:00Z", group: "D" },
  { home: "Qatar", away: "Switzerland", date: "2026-06-13T19:00:00Z", group: "B" },
  { home: "Brazil", away: "Morocco", date: "2026-06-13T22:00:00Z", group: "C" },
  // June 14
  { home: "Haiti", away: "Scotland", date: "2026-06-14T01:00:00Z", group: "C" },
  { home: "Australia", away: "Turkey", date: "2026-06-14T04:00:00Z", group: "D" },
  { home: "Germany", away: "Curacao", date: "2026-06-14T17:00:00Z", group: "E" },
  { home: "Netherlands", away: "Japan", date: "2026-06-14T20:00:00Z", group: "F" },
  // June 15
  { home: "Ivory Coast", away: "Ecuador", date: "2026-06-14T23:00:00Z", group: "E" },
  { home: "Sweden", away: "Tunisia", date: "2026-06-15T02:00:00Z", group: "F" },
  { home: "Spain", away: "Cape Verde", date: "2026-06-15T16:00:00Z", group: "H" },
  { home: "Belgium", away: "Egypt", date: "2026-06-15T19:00:00Z", group: "G" },
  { home: "Saudi Arabia", away: "Uruguay", date: "2026-06-15T22:00:00Z", group: "H" },
  // June 16
  { home: "Iran", away: "New Zealand", date: "2026-06-16T01:00:00Z", group: "G" },
  { home: "France", away: "Senegal", date: "2026-06-16T19:00:00Z", group: "I" },
  { home: "Iraq", away: "Norway", date: "2026-06-16T22:00:00Z", group: "I" },
  // June 17
  { home: "Argentina", away: "Algeria", date: "2026-06-17T01:00:00Z", group: "J" },
  { home: "Austria", away: "Jordan", date: "2026-06-17T04:00:00Z", group: "J" },
  { home: "Portugal", away: "DR Congo", date: "2026-06-17T17:00:00Z", group: "K" },
  { home: "England", away: "Croatia", date: "2026-06-17T20:00:00Z", group: "L" },
  // June 18
  { home: "Ghana", away: "Panama", date: "2026-06-17T23:00:00Z", group: "L" },
  { home: "Uzbekistan", away: "Colombia", date: "2026-06-18T02:00:00Z", group: "K" },

  // === MATCHDAY 2 ===
  // June 18
  { home: "Czech Republic", away: "South Africa", date: "2026-06-18T16:00:00Z", group: "A" },
  { home: "Switzerland", away: "Bosnia & Herzegovina", date: "2026-06-18T19:00:00Z", group: "B" },
  { home: "Canada", away: "Qatar", date: "2026-06-18T22:00:00Z", group: "B" },
  // June 19
  { home: "Mexico", away: "South Korea", date: "2026-06-19T01:00:00Z", group: "A" },
  { home: "USA", away: "Australia", date: "2026-06-19T19:00:00Z", group: "D" },
  { home: "Scotland", away: "Morocco", date: "2026-06-19T22:00:00Z", group: "C" },
  // June 20
  { home: "Brazil", away: "Haiti", date: "2026-06-20T00:30:00Z", group: "C" },
  { home: "Turkey", away: "Paraguay", date: "2026-06-20T03:00:00Z", group: "D" },
  { home: "Netherlands", away: "Sweden", date: "2026-06-20T17:00:00Z", group: "F" },
  { home: "Germany", away: "Ivory Coast", date: "2026-06-20T20:00:00Z", group: "E" },
  // June 21
  { home: "Ecuador", away: "Curacao", date: "2026-06-21T00:00:00Z", group: "E" },
  { home: "Tunisia", away: "Japan", date: "2026-06-21T04:00:00Z", group: "F" },
  { home: "Spain", away: "Saudi Arabia", date: "2026-06-21T16:00:00Z", group: "H" },
  { home: "Belgium", away: "Iran", date: "2026-06-21T19:00:00Z", group: "G" },
  { home: "Uruguay", away: "Cape Verde", date: "2026-06-21T22:00:00Z", group: "H" },
  // June 22
  { home: "New Zealand", away: "Egypt", date: "2026-06-22T01:00:00Z", group: "G" },
  { home: "Argentina", away: "Austria", date: "2026-06-22T17:00:00Z", group: "J" },
  { home: "France", away: "Iraq", date: "2026-06-22T21:00:00Z", group: "I" },
  // June 23
  { home: "Norway", away: "Senegal", date: "2026-06-23T00:00:00Z", group: "I" },
  { home: "Jordan", away: "Algeria", date: "2026-06-23T03:00:00Z", group: "J" },
  { home: "Portugal", away: "Uzbekistan", date: "2026-06-23T17:00:00Z", group: "K" },
  { home: "England", away: "Ghana", date: "2026-06-23T20:00:00Z", group: "L" },
  // June 24
  { home: "Panama", away: "Croatia", date: "2026-06-23T23:00:00Z", group: "L" },
  { home: "Colombia", away: "DR Congo", date: "2026-06-24T02:00:00Z", group: "K" },

  // === MATCHDAY 3 (simultaneous kick-offs per group) ===
  // June 24
  { home: "Switzerland", away: "Canada", date: "2026-06-24T19:00:00Z", group: "B" },
  { home: "Bosnia & Herzegovina", away: "Qatar", date: "2026-06-24T19:00:00Z", group: "B" },
  { home: "Morocco", away: "Haiti", date: "2026-06-24T22:00:00Z", group: "C" },
  { home: "Scotland", away: "Brazil", date: "2026-06-24T22:00:00Z", group: "C" },
  // June 25
  { home: "South Africa", away: "South Korea", date: "2026-06-25T01:00:00Z", group: "A" },
  { home: "Czech Republic", away: "Mexico", date: "2026-06-25T01:00:00Z", group: "A" },
  { home: "Curacao", away: "Ivory Coast", date: "2026-06-25T20:00:00Z", group: "E" },
  { home: "Ecuador", away: "Germany", date: "2026-06-25T20:00:00Z", group: "E" },
  // June 26
  { home: "Tunisia", away: "Netherlands", date: "2026-06-25T23:00:00Z", group: "F" },
  { home: "Japan", away: "Sweden", date: "2026-06-25T23:00:00Z", group: "F" },
  { home: "Turkey", away: "USA", date: "2026-06-26T02:00:00Z", group: "D" },
  { home: "Paraguay", away: "Australia", date: "2026-06-26T02:00:00Z", group: "D" },
  { home: "Norway", away: "France", date: "2026-06-26T19:00:00Z", group: "I" },
  { home: "Senegal", away: "Iraq", date: "2026-06-26T19:00:00Z", group: "I" },
  // June 27
  { home: "Cape Verde", away: "Saudi Arabia", date: "2026-06-27T00:00:00Z", group: "H" },
  { home: "Uruguay", away: "Spain", date: "2026-06-27T00:00:00Z", group: "H" },
  { home: "New Zealand", away: "Belgium", date: "2026-06-27T03:00:00Z", group: "G" },
  { home: "Egypt", away: "Iran", date: "2026-06-27T03:00:00Z", group: "G" },
  { home: "Panama", away: "England", date: "2026-06-27T21:00:00Z", group: "L" },
  { home: "Croatia", away: "Ghana", date: "2026-06-27T21:00:00Z", group: "L" },
  // June 28
  { home: "Colombia", away: "Portugal", date: "2026-06-27T23:30:00Z", group: "K" },
  { home: "DR Congo", away: "Uzbekistan", date: "2026-06-27T23:30:00Z", group: "K" },
  { home: "Algeria", away: "Austria", date: "2026-06-28T02:00:00Z", group: "J" },
  { home: "Jordan", away: "Argentina", date: "2026-06-28T02:00:00Z", group: "J" },
];

async function seed() {
  const now = new Date();
  let inserted = 0;
  let skipped = 0;

  for (const match of GROUP_STAGE_MATCHES) {
    try {
      await db.insert(matches).values({
        id: id(),
        homeTeam: match.home,
        awayTeam: match.away,
        matchDate: new Date(match.date),
        phase: "group_stage",
        group: match.group,
        homeScore: null,
        awayScore: null,
        status: "scheduled",
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    } catch (e) {
      // Probably duplicate (unique constraint)
      skipped++;
    }
  }

  console.log(`✅ Seed complete: ${inserted} matches inserted, ${skipped} skipped (already exist)`);
  console.log(`Total group stage matches: ${GROUP_STAGE_MATCHES.length}`);
}

seed()
  .then(() => client.close())
  .catch((e) => {
    console.error("❌ Seed failed:", e.message);
    client.close();
    process.exit(1);
  });
