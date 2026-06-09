"use client";

import { useState } from "react";
import { registerResult } from "@/server/actions/admin";
import { getFlag } from "@/lib/flags";

interface MatchResultFormProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    matchDate: Date;
    group: string | null;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  };
}

export function MatchResultForm({ match }: MatchResultFormProps) {
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await registerResult({
      matchId: match.id,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
    });

    setLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: `Resultado registrado! ${result.scored} palpites pontuados.` });
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  const matchDate = new Date(match.matchDate);
  const isPast = new Date() > matchDate;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          {match.group && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              Grupo {match.group}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {matchDate.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            })}
          </span>
          {isPast && match.status === "scheduled" && (
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
              Já começou
            </span>
          )}
        </div>
        <div className="mt-1 font-medium text-gray-900">
          {getFlag(match.homeTeam)} {match.homeTeam} vs {match.awayTeam} {getFlag(match.awayTeam)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="99"
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          disabled={loading}
          placeholder="0"
          className="w-14 rounded border px-2 py-1.5 text-center text-lg disabled:bg-gray-100"
          aria-label={`Placar ${match.homeTeam}`}
        />
        <span className="text-lg font-bold text-gray-400">×</span>
        <input
          type="number"
          min="0"
          max="99"
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          disabled={loading}
          placeholder="0"
          className="w-14 rounded border px-2 py-1.5 text-center text-lg disabled:bg-gray-100"
          aria-label={`Placar ${match.awayTeam}`}
        />
      </div>

      <button
        type="submit"
        disabled={loading || homeScore === "" || awayScore === ""}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "..." : "Registrar"}
      </button>

      {message && (
        <span
          className={`text-xs ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </span>
      )}
    </form>
  );
}
