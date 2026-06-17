/**
 * Update match results from World Cup 2026 (data collected from news sources).
 * Run: node scripts/update-results.mjs
 */

import { createClient } from "@libsql/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = createClient({
  url: "libsql://bolao-copa-andersonmarc20.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDYxMzMsImlkIjoiMDE5ZWFjM2MtNzMwMS03NzE5LThiZTItNmIyYmZjMzBmZGZjIiwicmlkIjoiOTllNGYyNTYtMDA0Ny00Y2NlLWE1NjgtMTliOTYyNzUxZWJjIn0.-0Pe_vBc0bA5nAb8I4FvaE361sRG4rsbEyWUO95RS0Umly5ehGzqPDUg5k0nEcX1dh69DXa-x50KKegrZjCGBw",
});

// Results from news sources (up to June 16)
const RESULTS = [
  // June 11
  { home: "Mexico", away: "South Africa", homeScore: 2, awayScore: 0 },
  // June 12
  { home: "South Korea", away: "Czech Republic", homeScore: 2, awayScore: 1 },
  { home: "Canada", away: "Bosnia & Herzegovina", homeScore: 1, awayScore: 1 },
  // June 13
  { home: "USA", away: "Paraguay", homeScore: 4, awayScore: 1 },
  { home: "Qatar", away: "Switzerland", homeScore: 1, awayScore: 1 },
  { home: "Brazil", away: "Morocco", homeScore: 1, awayScore: 1 },
  // June 14
  { home: "Haiti", away: "Scotland", homeScore: 0, awayScore: 1 },
  { home: "Australia", away: "Turkey", homeScore: 2, awayScore: 0 },
  { home: "Germany", away: "Curacao", homeScore: 7, awayScore: 1 },
  { home: "Netherlands", away: "Japan", homeScore: 2, awayScore: 2 },
  // June 15
  { home: "Ivory Coast", away: "Ecuador", homeScore: 1, awayScore: 0 },
  { home: "Sweden", away: "Tunisia", homeScore: 5, awayScore: 1 },
  { home: "Spain", away: "Cape Verde", homeScore: 0, awayScore: 0 },
  { home: "Belgium", away: "Egypt", homeScore: 1, awayScore: 1 },
  { home: "Saudi Arabia", away: "Uruguay", homeScore: 1, awayScore: 1 },
  // June 16
  { home: "Iran", away: "New Zealand", homeScore: 2, awayScore: 2 },
];

function calculatePoints(predHome, predAway, actualHome, actualAway) {
  if (predHome === actualHome && predAway === actualAway) return 10;
  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;
  const predSign = Math.sign(predDiff);
  const actualSign = Math.sign(actualDiff);
  if (predSign !== actualSign) return 0;
  if (predDiff === actualDiff) return 7;
  return 5;
}

async function updateResults() {
  let matchesUpdated = 0;
  let predictionsScored = 0;

  for (const result of RESULTS) {
    // Find match by team names
    const matchResult = await client.execute({
      sql: "SELECT id, status FROM match WHERE home_team = ? AND away_team = ?",
      args: [result.home, result.away],
    });

    if (matchResult.rows.length === 0) {
      console.log(`⚠️  Match not found: ${result.home} vs ${result.away}`);
      continue;
    }

    const match = matchResult.rows[0];

    // Update match result
    await client.execute({
      sql: "UPDATE match SET home_score = ?, away_score = ?, status = 'finished', updated_at = ? WHERE id = ?",
      args: [result.homeScore, result.awayScore, Date.now(), match.id],
    });
    matchesUpdated++;

    // Score all predictions for this match
    const preds = await client.execute({
      sql: "SELECT id, home_score, away_score FROM prediction WHERE match_id = ?",
      args: [match.id],
    });

    for (const pred of preds.rows) {
      const points = calculatePoints(pred.home_score, pred.away_score, result.homeScore, result.awayScore);
      await client.execute({
        sql: "UPDATE prediction SET points = ?, updated_at = ? WHERE id = ?",
        args: [points, Date.now(), pred.id],
      });
      predictionsScored++;
    }

    console.log(`✅ ${result.home} ${result.homeScore}-${result.awayScore} ${result.away} (${preds.rows.length} palpites pontuados)`);
  }

  console.log(`\n🏁 Done! ${matchesUpdated} matches updated, ${predictionsScored} predictions scored.`);
}

updateResults()
  .then(() => client.close())
  .catch((e) => {
    console.error("❌ Error:", e.message);
    client.close();
  });
