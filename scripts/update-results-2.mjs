/**
 * Update match results - batch 2 (June 16-20)
 * Run: node scripts/update-results-2.mjs
 */

import { createClient } from "@libsql/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = createClient({
  url: "libsql://bolao-copa-andersonmarc20.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDYxMzMsImlkIjoiMDE5ZWFjM2MtNzMwMS03NzE5LThiZTItNmIyYmZjMzBmZGZjIiwicmlkIjoiOTllNGYyNTYtMDA0Ny00Y2NlLWE1NjgtMTliOTYyNzUxZWJjIn0.-0Pe_vBc0bA5nAb8I4FvaE361sRG4rsbEyWUO95RS0Umly5ehGzqPDUg5k0nEcX1dh69DXa-x50KKegrZjCGBw",
});

const RESULTS = [
  // June 16
  { home: "France", away: "Senegal", homeScore: 3, awayScore: 1 },
  { home: "Iraq", away: "Norway", homeScore: 1, awayScore: 4 },
  // June 17
  { home: "Argentina", away: "Algeria", homeScore: 3, awayScore: 0 },
  { home: "Austria", away: "Jordan", homeScore: 3, awayScore: 1 },
  { home: "Portugal", away: "DR Congo", homeScore: 1, awayScore: 1 },
  { home: "England", away: "Croatia", homeScore: 4, awayScore: 2 },
  { home: "Ghana", away: "Panama", homeScore: 1, awayScore: 0 },
  { home: "Uzbekistan", away: "Colombia", homeScore: 1, awayScore: 3 },
  // June 18
  { home: "Czech Republic", away: "South Africa", homeScore: 1, awayScore: 1 },
  { home: "Switzerland", away: "Bosnia & Herzegovina", homeScore: 4, awayScore: 1 },
  { home: "Canada", away: "Qatar", homeScore: 6, awayScore: 0 },
  { home: "Mexico", away: "South Korea", homeScore: 1, awayScore: 0 },
  // June 19
  { home: "USA", away: "Australia", homeScore: 2, awayScore: 0 },
  { home: "Scotland", away: "Morocco", homeScore: 0, awayScore: 1 },
  { home: "Brazil", away: "Haiti", homeScore: 3, awayScore: 0 },
  { home: "Turkey", away: "Paraguay", homeScore: 0, awayScore: 1 },
  // June 20
  { home: "Netherlands", away: "Sweden", homeScore: 5, awayScore: 1 },
  { home: "Germany", away: "Ivory Coast", homeScore: 2, awayScore: 1 },
  { home: "Ecuador", away: "Curacao", homeScore: 0, awayScore: 0 },
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
    const matchResult = await client.execute({
      sql: "SELECT id, status FROM match WHERE home_team = ? AND away_team = ?",
      args: [result.home, result.away],
    });

    if (matchResult.rows.length === 0) {
      console.log(`⚠️  Not found: ${result.home} vs ${result.away}`);
      continue;
    }

    const match = matchResult.rows[0];

    await client.execute({
      sql: "UPDATE match SET home_score = ?, away_score = ?, status = 'finished', updated_at = ? WHERE id = ?",
      args: [result.homeScore, result.awayScore, Date.now(), match.id],
    });
    matchesUpdated++;

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

    console.log(`✅ ${result.home} ${result.homeScore}-${result.awayScore} ${result.away} (${preds.rows.length} palpites)`);
  }

  console.log(`\n🏁 Done! ${matchesUpdated} matches, ${predictionsScored} predictions scored.`);
}

updateResults()
  .then(() => client.close())
  .catch((e) => {
    console.error("❌ Error:", e.message);
    client.close();
  });
