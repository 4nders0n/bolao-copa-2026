import { db } from "@/lib/db";
import { predictions, users, matches } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFlag } from "@/lib/flags";
import { AuthButton } from "@/components/AuthButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PalpitesPage() {
  const session = await getServerSession(authOptions);

  // Get all predictions grouped by match
  const allPredictions = await db
    .select({
      matchId: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      matchDate: matches.matchDate,
      group: matches.group,
      matchHomeScore: matches.homeScore,
      matchAwayScore: matches.awayScore,
      matchStatus: matches.status,
      userId: predictions.userId,
      userName: users.name,
      predHome: predictions.homeScore,
      predAway: predictions.awayScore,
      points: predictions.points,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .orderBy(asc(matches.matchDate));

  // Group by match
  const matchMap = new Map<
    string,
    {
      matchId: string;
      homeTeam: string;
      awayTeam: string;
      matchDate: Date;
      group: string | null;
      matchHomeScore: number | null;
      matchAwayScore: number | null;
      matchStatus: string;
      predictions: {
        userId: string;
        userName: string | null;
        predHome: number;
        predAway: number;
        points: number | null;
      }[];
    }
  >();

  for (const row of allPredictions) {
    if (!matchMap.has(row.matchId)) {
      matchMap.set(row.matchId, {
        matchId: row.matchId,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        matchDate: row.matchDate,
        group: row.group,
        matchHomeScore: row.matchHomeScore,
        matchAwayScore: row.matchAwayScore,
        matchStatus: row.matchStatus,
        predictions: [],
      });
    }
    matchMap.get(row.matchId)!.predictions.push({
      userId: row.userId,
      userName: row.userName,
      predHome: row.predHome,
      predAway: row.predAway,
      points: row.points,
    });
  }

  const matchesWithPredictions = Array.from(matchMap.values());

  // Only show predictions for matches that already started (to avoid revealing before deadline)
  const now = new Date();
  const visibleMatches = matchesWithPredictions.filter(
    (m) => m.matchDate <= now
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:underline text-sm">
              ← Ranking
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              🔮 Palpites dos Participantes
            </h1>
          </div>
          <AuthButton />
        </header>

        {visibleMatches.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-500">
              Os palpites ficarão visíveis após o início de cada jogo.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleMatches.map((match) => (
              <div key={match.matchId} className="rounded-lg border bg-white overflow-hidden">
                {/* Match header */}
                <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getFlag(match.homeTeam)}
                    </span>
                    <span className="font-medium text-sm">{match.homeTeam}</span>
                    {match.matchStatus === "finished" ? (
                      <span className="mx-2 rounded bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">
                        {match.matchHomeScore} - {match.matchAwayScore}
                      </span>
                    ) : (
                      <span className="mx-2 text-xs text-gray-400">vs</span>
                    )}
                    <span className="font-medium text-sm">{match.awayTeam}</span>
                    <span className="text-lg">
                      {getFlag(match.awayTeam)}
                    </span>
                  </div>
                  {match.group && (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      Grupo {match.group}
                    </span>
                  )}
                </div>

                {/* Predictions table */}
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Participante</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-600">Palpite</th>
                      {match.matchStatus === "finished" && (
                        <th className="px-4 py-2 text-center font-medium text-gray-600">Pontos</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {match.predictions.map((pred) => (
                      <tr
                        key={pred.userId}
                        className={`border-b last:border-0 ${
                          pred.userId === session?.user?.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-4 py-2">
                          {pred.userName ?? "Anônimo"}
                          {pred.userId === session?.user?.id && (
                            <span className="ml-1 text-xs text-blue-600">(você)</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center font-mono">
                          {pred.predHome} × {pred.predAway}
                        </td>
                        {match.matchStatus === "finished" && (
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                pred.points === 10
                                  ? "bg-green-100 text-green-700"
                                  : pred.points === 7
                                  ? "bg-blue-100 text-blue-700"
                                  : pred.points === 5
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {pred.points ?? 0} pts
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
