import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PredictionForm } from "@/components/PredictionForm";
import { AuthButton } from "@/components/AuthButton";
import { getFlag } from "@/lib/flags";
import Link from "next/link";

export default async function JogosPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Get all matches
  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.matchDate));

  // Get user predictions
  let userPredictions: Record<string, { homeScore: number; awayScore: number }> = {};
  if (userId) {
    const preds = await db
      .select()
      .from(predictions)
      .where(eq(predictions.userId, userId));

    userPredictions = Object.fromEntries(
      preds.map((p) => [p.matchId, { homeScore: p.homeScore, awayScore: p.awayScore }])
    );
  }

  // Group matches by phase
  const phaseLabels: Record<string, string> = {
    group_stage: "Fase de Grupos",
    round_of_32: "Oitavas (32 avos)",
    round_of_16: "Oitavas de Final",
    quarter_finals: "Quartas de Final",
    semi_finals: "Semifinais",
    third_place: "Disputa de 3º Lugar",
    final: "Final",
  };

  const matchesByPhase = allMatches.reduce(
    (acc, match) => {
      const phase = match.phase;
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(match);
      return acc;
    },
    {} as Record<string, typeof allMatches>
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
              ⚽ Jogos
            </h1>
          </div>
          <AuthButton />
        </header>

        {allMatches.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-500 mb-2">
              Nenhum jogo cadastrado ainda.
            </p>
            <p className="text-sm text-gray-400">
              Os jogos serão importados automaticamente da API quando disponíveis.
            </p>
          </div>
        ) : (
          Object.entries(matchesByPhase).map(([phase, phaseMatches]) => (
            <section key={phase} className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                {phaseLabels[phase] ?? phase}
                {phase === "group_stage" && phaseMatches[0]?.group && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    Grupo {phaseMatches[0].group}
                  </span>
                )}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {phaseMatches.map((match) => {
                  const existing = userPredictions[match.id];
                  const isFinished = match.status === "finished";

                  return (
                    <div key={match.id} className="rounded-lg border bg-white p-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {match.matchDate.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {match.group && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                            Grupo {match.group}
                          </span>
                        )}
                        {isFinished && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">
                            Encerrado
                          </span>
                        )}
                      </div>

                      {isFinished ? (
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            {getFlag(match.homeTeam)} {match.homeTeam} {match.homeScore} × {match.awayScore} {match.awayTeam} {getFlag(match.awayTeam)}
                          </div>
                          {existing && (
                            <div className="mt-1 text-sm text-gray-500">
                              Seu palpite: {existing.homeScore} × {existing.awayScore}
                            </div>
                          )}
                        </div>
                      ) : (
                        <PredictionForm
                          matchId={match.id}
                          homeTeam={match.homeTeam}
                          awayTeam={match.awayTeam}
                          matchDate={match.matchDate.toISOString()}
                          existingHomeScore={existing?.homeScore}
                          existingAwayScore={existing?.awayScore}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
