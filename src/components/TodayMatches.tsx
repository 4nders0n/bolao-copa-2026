import { getFlag } from "@/lib/flags";

interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  group: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

const BROADCAST_CHANNELS = [
  {
    name: "CazéTV",
    icon: "▶️",
    url: "https://www.youtube.com/@CazsTV",
    note: "Todos os jogos",
  },
  {
    name: "Globoplay",
    icon: "🔵",
    url: "https://globoplay.globo.com",
    note: "Jogos selecionados",
  },
  {
    name: "SporTV",
    icon: "📺",
    url: "https://ge.globo.com/sportv/",
    note: "TV fechada",
  },
  {
    name: "SBT",
    icon: "📡",
    url: "https://www.sbt.com.br",
    note: "TV aberta",
  },
];

export function TodayMatches({ matches }: { matches: MatchData[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        📺 Jogos de Hoje
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((match) => (
          <div
            key={match.id}
            className={`rounded-lg border p-4 ${
              match.status === "live"
                ? "border-red-200 bg-red-50"
                : match.status === "finished"
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>
                {match.status === "live" && (
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
                {match.status === "live"
                  ? "AO VIVO"
                  : match.status === "finished"
                  ? "Encerrado"
                  : match.matchDate.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    })}
              </span>
              {match.group && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                  Grupo {match.group}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getFlag(match.homeTeam)}</span>
                <span className="text-sm font-medium">{match.homeTeam}</span>
              </div>

              {match.status === "scheduled" ? (
                <span className="text-xs text-gray-400">vs</span>
              ) : (
                <div className="rounded bg-gray-900 px-3 py-1 text-center">
                  <span className="text-sm font-bold text-white">
                    {match.homeScore ?? 0} - {match.awayScore ?? 0}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{match.awayTeam}</span>
                <span className="text-xl">{getFlag(match.awayTeam)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          📡 Onde assistir no Brasil
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BROADCAST_CHANNELS.map((channel) => (
            <a
              key={channel.name}
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 p-3 text-center transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="text-xl">{channel.icon}</span>
              <span className="text-xs font-medium text-gray-800">{channel.name}</span>
              <span className="text-[10px] text-gray-500">{channel.note}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
