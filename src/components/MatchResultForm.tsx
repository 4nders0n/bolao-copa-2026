"use client";

import { useState } from "react";
import { registerResult, updateBroadcast } from "@/server/actions/admin";
import { getFlag } from "@/lib/flags";

const AVAILABLE_CHANNELS = ["CazéTV", "Globo", "SBT", "SporTV", "Globoplay"];

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
    broadcast: string | null;
  };
}

export function MatchResultForm({ match }: MatchResultFormProps) {
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Parse existing broadcast channels
  const existingChannels: string[] = match.broadcast ? JSON.parse(match.broadcast) : [];
  const [channels, setChannels] = useState<string[]>(existingChannels);
  const [broadcastSaved, setBroadcastSaved] = useState(false);

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
    setBroadcastSaved(false);
  }

  async function handleSaveBroadcast() {
    const result = await updateBroadcast(match.id, channels);
    if (result.success) {
      setBroadcastSaved(true);
    }
  }

  async function handleSubmitResult(e: React.FormEvent) {
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
  const canRegisterResult = isPast;

  return (
    <div className="rounded-lg border bg-white p-4">
      {/* Match info */}
      <div className="flex items-center gap-2 text-sm mb-2">
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

      <div className="font-medium text-gray-900 mb-3">
        {getFlag(match.homeTeam)} {match.homeTeam} vs {match.awayTeam} {getFlag(match.awayTeam)}
      </div>

      {/* Result form */}
      {canRegisterResult ? (
        <form onSubmit={handleSubmitResult} className="flex items-center gap-2 mb-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={homeScore}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
              setHomeScore(v);
            }}
            disabled={loading}
            placeholder="-"
            className="w-14 rounded border px-2 py-1.5 text-center text-lg disabled:bg-gray-100"
            aria-label={`Placar ${match.homeTeam}`}
          />
          <span className="text-lg font-bold text-gray-400">×</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={awayScore}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
              setAwayScore(v);
            }}
            disabled={loading}
            placeholder="-"
            className="w-14 rounded border px-2 py-1.5 text-center text-lg disabled:bg-gray-100"
            aria-label={`Placar ${match.awayTeam}`}
          />
          <button
            type="submit"
            disabled={loading || homeScore.length === 0 || awayScore.length === 0}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "..." : match.status === "finished" ? "Corrigir" : "Resultado"}
          </button>
          {message && (
            <span className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </span>
          )}
        </form>
      ) : (
        <div className="mb-3 text-xs text-gray-400">
          ⏳ Aguardando início do jogo para registrar resultado
        </div>
      )}

      {/* Broadcast channels */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-1">📡 Transmissão:</div>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_CHANNELS.map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => toggleChannel(channel)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                channels.includes(channel)
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-600 hover:border-blue-300"
              }`}
            >
              {channel}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSaveBroadcast}
            className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs text-green-700 hover:bg-green-100"
          >
            {broadcastSaved ? "✓ Salvo" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
