import { db } from "@/lib/db";
import { matches } from "@/lib/schema";
import { asc, and, gte, lte } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFlag } from "@/lib/flags";
import Link from "next/link";
import { MatchResultForm } from "@/components/MatchResultForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">
            Você não tem permissão de administrador.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  // Get today's matches only (Brazil timezone)
  const now = new Date();
  const brStart = new Date(now);
  brStart.setUTCHours(3, 0, 0, 0);
  if (now.getUTCHours() < 3) {
    brStart.setUTCDate(brStart.getUTCDate() - 1);
  }
  const brEnd = new Date(brStart);
  brEnd.setUTCDate(brEnd.getUTCDate() + 1);

  const todayMatches = await db
    .select()
    .from(matches)
    .where(and(gte(matches.matchDate, brStart), lte(matches.matchDate, brEnd)))
    .orderBy(asc(matches.matchDate));

  const scheduled = todayMatches.filter((m) => m.status === "scheduled");
  const live = todayMatches.filter((m) => m.status === "live");
  const finished = todayMatches.filter((m) => m.status === "finished");

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:underline text-sm">
              ← Início
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              🔧 Admin - Jogos de Hoje
            </h1>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-2xl font-bold text-yellow-600">{scheduled.length}</div>
            <div className="text-sm text-gray-500">Agendados</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-2xl font-bold text-blue-600">{live.length}</div>
            <div className="text-sm text-gray-500">Ao Vivo</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-2xl font-bold text-green-600">{finished.length}</div>
            <div className="text-sm text-gray-500">Finalizados</div>
          </div>
        </div>

        {/* Live matches first */}
        {live.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-blue-700">
              🔴 Jogos Ao Vivo
            </h2>
            <div className="grid gap-4">
              {live.map((match) => (
                <MatchResultForm key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Scheduled matches - ready to start or register results */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-yellow-700">
            ⏳ Jogos Agendados ({scheduled.length})
          </h2>
          <div className="grid gap-4">
            {scheduled.map((match) => (
              <MatchResultForm key={match.id} match={match} />
            ))}
          </div>
        </section>

        {/* Finished matches */}
        {finished.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-green-700">
              ✅ Jogos Finalizados ({finished.length})
            </h2>
            <div className="grid gap-4">
              {finished.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-lg border bg-white p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      Grupo {match.group}
                    </span>
                    <span className="font-medium">
                      {getFlag(match.homeTeam)} {match.homeTeam} {match.homeScore} × {match.awayScore} {match.awayTeam} {getFlag(match.awayTeam)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {match.matchDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
