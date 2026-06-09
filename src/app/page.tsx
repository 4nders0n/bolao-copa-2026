import { getRanking } from "@/server/queries/ranking";
import { AuthButton } from "@/components/AuthButton";
import { CupInfo } from "@/components/CupInfo";
import Link from "next/link";

export default async function Home() {
  const ranking = await getRanking();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            ⚽ Bolão Copa 2026
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/jogos"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Ver Jogos
            </Link>
            <AuthButton />
          </div>
        </header>

        <CupInfo />

        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Ranking Geral
          </h2>
          {ranking.length === 0 ? (
            <p className="text-gray-500">
              Nenhum palpite registrado ainda. O ranking aparecerá após os
              primeiros resultados.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">#</th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Nome
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Pontos
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-700">
                      Placares Exatos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((user) => (
                    <tr key={user.userId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-semibold">
                        {user.position}
                      </td>
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3 font-medium">
                        {user.totalScore}
                      </td>
                      <td className="px-4 py-3">{user.exactPredictions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
