/**
 * Recalculate scores for all predictions of finished matches.
 * Run: node scripts/recalculate-scores.mjs
 * 
 * This fixes any predictions that didn't get scored properly.
 */

import { createClient } from "@libsql/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const TURSO_URL = "libsql://bolao-copa-andersonmarc20.aws-us-east-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDYxMzMsImlkIjoiMDE5ZWFjM2MtNzMwMS03NzE5LThiZTItNmIyYmZjMzBmZGZjIiwicmlkIjoiOTllNGYyNTYtMDA0Ny00Y2NlLWE1NjgtMTliOTYyNzUxZWJjIn0.-0Pe_vBc0bA5nAb8I4FvaE361sRG4rsbEyWUO95RS0Umly5ehGzqPDUg5k0nEcX1dh69DXa-x50KKegrZjCGBw";

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

function calculatePoints(predHome, predAway, actualHome, actualAway) {
  // Exact score
  if (predHome === actualHome && predAway === actualAway) return 10;
  
  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;
  const predSign = Math.sign(predDiff);
  const actualSign = Math.sign(actualDiff);
  
  // Wrong outcome
  if (predSign !== actualSign) return 0;
  
  // Correct winner + same goal difference
  if (predDiff === actualDiff) return 7;
  
  // Correct winner only
  return 5;
}

async function recalculate() {
  // Get all finished matches
  const finishedMatches = await client.execute(
    "SELECT id, home_score, away_score FROM match WHERE status = 'finished' AND home_score IS NOT NULL AND away_score IS NOT NULL"
  );

  console.log(`Found ${finishedMatches.rows.length} finished matches`);
  let totalUpdated = 0;

  for (const match of finishedMatches.rows) {
    const matchId = match.id;
    const actualHome = match.home_score;
    const actualAway = match.away_score;

    // Get all predictions for this match
    const preds = await client.execute({
      sql: "SELECT id, home_score, away_score, points FROM prediction WHERE match_id = ?",
      args: [matchId],
    });

    for (const pred of preds.rows) {
      const correctPoints = calculatePoints(pred.home_score, pred.away_score, actualHome, actualAway);
      
      if (pred.points !== correctPoints) {
        await client.execute({
          sql: "UPDATE prediction SET points = ? WHERE id = ?",
          args: [correctPoints, pred.id],
        });
        totalUpdated++;
        console.log(`  Fixed: pred ${pred.id} (${pred.home_score}x${pred.away_score} vs ${actualHome}x${actualAway}) ${pred.points} → ${correctPoints}`);
      }
    }
  }

  console.log(`\n✅ Done! Updated ${totalUpdated} predictions.`);
}

recalculate()
  .then(() => client.close())
  .catch((e) => {
    console.error("❌ Error:", e.message);
    client.close();
  });
