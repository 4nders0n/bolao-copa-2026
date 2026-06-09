"use client";

import { useState } from "react";
import { submitPrediction } from "@/server/actions/predictions";
import { getFlag } from "@/lib/flags";

interface PredictionFormProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  existingHomeScore?: number;
  existingAwayScore?: number;
}

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  matchDate,
  existingHomeScore,
  existingAwayScore,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState(
    existingHomeScore?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    existingAwayScore?.toString() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPastDeadline = new Date() >= new Date(matchDate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setLoading(true);

    const result = await submitPrediction({
      matchId,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
      if (result.details) {
        setFieldErrors(result.details);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3 flex items-center justify-between text-sm font-medium text-gray-700">
        <span>{getFlag(homeTeam)} {homeTeam}</span>
        <span>{awayTeam} {getFlag(awayTeam)}</span>
      </div>

      {isPastDeadline && (
        <p className="mb-3 text-sm text-red-600">
          Prazo encerrado — não é possível alterar palpites.
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor={`home-${matchId}`} className="sr-only">
            Placar {homeTeam}
          </label>
          <input
            id={`home-${matchId}`}
            type="number"
            min="0"
            max="99"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            disabled={isPastDeadline || loading}
            placeholder="0"
            className="w-full rounded border px-3 py-2 text-center text-lg disabled:bg-gray-100"
          />
          {fieldErrors.homeScore && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.homeScore}</p>
          )}
        </div>

        <span className="text-lg font-bold text-gray-400">×</span>

        <div className="flex-1">
          <label htmlFor={`away-${matchId}`} className="sr-only">
            Placar {awayTeam}
          </label>
          <input
            id={`away-${matchId}`}
            type="number"
            min="0"
            max="99"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            disabled={isPastDeadline || loading}
            placeholder="0"
            className="w-full rounded border px-3 py-2 text-center text-lg disabled:bg-gray-100"
          />
          {fieldErrors.awayScore && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.awayScore}</p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="mt-2 text-sm text-green-600">Palpite salvo!</p>
      )}

      {!isPastDeadline && (
        <button
          type="submit"
          disabled={loading}
          className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Palpite"}
        </button>
      )}
    </form>
  );
}
