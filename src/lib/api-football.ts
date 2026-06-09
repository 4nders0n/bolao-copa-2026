/**
 * API-Football (api-sports.io) client for FIFA World Cup 2026
 *
 * Docs: https://www.api-football.com/documentation-v3
 * Base URL: https://v3.football.api-sports.io
 * World Cup league ID: 1
 * Season: 2026
 */

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    throw new Error("API_FOOTBALL_KEY não definida no .env");
  }
  return key;
}

async function apiFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": getApiKey(),
    },
  });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}

// ─── Types from API ─────────────────────────────────────────────────────

interface ApiFixture {
  fixture: {
    id: number;
    date: string; // ISO date
    status: {
      short: string; // "NS" = not started, "FT" = full time, "1H", "2H", "HT", etc.
      long: string;
    };
  };
  league: {
    round: string; // "Group A - 1", "Round of 32", etc.
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiResponse<T> {
  response: T[];
  results: number;
  errors: Record<string, string>;
}

// ─── Public Functions ───────────────────────────────────────────────────

export interface WorldCupFixture {
  apiId: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  phase: string;
  group: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
}

/**
 * Parse the API round string into our phase and group fields.
 * Examples:
 * - "Group A - 1" → phase: "group_stage", group: "A"
 * - "Round of 32" → phase: "round_of_32", group: null
 * - "Round of 16" → phase: "round_of_16", group: null
 * - "Quarter-finals" → phase: "quarter_finals", group: null
 * - "Semi-finals" → phase: "semi_finals", group: null
 * - "3rd Place Final" → phase: "third_place", group: null
 * - "Final" → phase: "final", group: null
 */
function parseRound(round: string): { phase: string; group: string | null } {
  if (round.startsWith("Group")) {
    const groupLetter = round.match(/Group\s([A-L])/)?.[1] ?? null;
    return { phase: "group_stage", group: groupLetter };
  }

  const mapping: Record<string, string> = {
    "Round of 32": "round_of_32",
    "Round of 16": "round_of_16",
    "Quarter-finals": "quarter_finals",
    "Semi-finals": "semi_finals",
    "3rd Place Final": "third_place",
    "Final": "final",
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (round.includes(key)) {
      return { phase: value, group: null };
    }
  }

  // Fallback
  return { phase: "group_stage", group: null };
}

/**
 * Map API status to our status enum.
 */
function mapStatus(apiStatus: string): "scheduled" | "live" | "finished" {
  const finishedStatuses = ["FT", "AET", "PEN"];
  const liveStatuses = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];
  
  if (finishedStatuses.includes(apiStatus)) return "finished";
  if (liveStatuses.includes(apiStatus)) return "live";
  return "scheduled";
}

/**
 * Fetch all World Cup 2026 fixtures from the API.
 */
export async function fetchWorldCupFixtures(): Promise<WorldCupFixture[]> {
  const data = await apiFetch<ApiResponse<ApiFixture>>("/fixtures", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
  });

  return data.response.map((item) => {
    const { phase, group } = parseRound(item.league.round);
    return {
      apiId: item.fixture.id,
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      matchDate: new Date(item.fixture.date),
      phase,
      group,
      homeScore: item.goals.home,
      awayScore: item.goals.away,
      status: mapStatus(item.fixture.status.short),
    };
  });
}

/**
 * Fetch only live or recently finished fixtures (for updating scores).
 */
export async function fetchLiveFixtures(): Promise<WorldCupFixture[]> {
  const data = await apiFetch<ApiResponse<ApiFixture>>("/fixtures", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
    live: "all",
  });

  return data.response.map((item) => {
    const { phase, group } = parseRound(item.league.round);
    return {
      apiId: item.fixture.id,
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      matchDate: new Date(item.fixture.date),
      phase,
      group,
      homeScore: item.goals.home,
      awayScore: item.goals.away,
      status: mapStatus(item.fixture.status.short),
    };
  });
}

/**
 * Fetch fixtures by date (useful for checking today's results).
 */
export async function fetchFixturesByDate(date: string): Promise<WorldCupFixture[]> {
  const data = await apiFetch<ApiResponse<ApiFixture>>("/fixtures", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
    date, // format: "YYYY-MM-DD"
  });

  return data.response.map((item) => {
    const { phase, group } = parseRound(item.league.round);
    return {
      apiId: item.fixture.id,
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      matchDate: new Date(item.fixture.date),
      phase,
      group,
      homeScore: item.goals.home,
      awayScore: item.goals.away,
      status: mapStatus(item.fixture.status.short),
    };
  });
}
