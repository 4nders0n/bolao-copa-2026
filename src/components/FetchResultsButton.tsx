"use client";

import { useState } from "react";

export function FetchResultsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; updated?: number; scored?: number; error?: string } | null>(null);

  async function handleFetch() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/fetch-results", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    }

    setLoading(false);
  }

  return (
    <div className="mb-6 rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">🔄 Atualizar Resultados</h3>
          <p className="text-xs text-gray-500">
            Busca resultados de jogos finalizados automaticamente (ESPN)
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Atualizar Tudo"}
        </button>
      </div>

      {result && (
        <div className={`mt-3 rounded p-2 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {result.success
            ? `✅ ${result.updated} jogos atualizados, ${result.scored} palpites pontuados`
            : `❌ Erro: ${result.error}`}
        </div>
      )}
    </div>
  );
}
