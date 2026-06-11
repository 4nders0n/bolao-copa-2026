export interface BroadcastChannel {
  name: string;
  icon: string;
  url: string;
}

const CHANNELS: Record<string, BroadcastChannel> = {
  "CazéTV": {
    name: "CazéTV",
    icon: "▶️",
    url: "https://www.youtube.com/@CazsTV/live",
  },
  "Globo": {
    name: "Globo",
    icon: "🔵",
    url: "https://globoplay.globo.com",
  },
  "SBT": {
    name: "SBT",
    icon: "📡",
    url: "https://www.sbt.com.br/ao-vivo",
  },
  "SporTV": {
    name: "SporTV",
    icon: "📺",
    url: "https://ge.globo.com/sportv/",
  },
  "Globoplay": {
    name: "Globoplay",
    icon: "🟢",
    url: "https://globoplay.globo.com",
  },
};

/**
 * Parse the broadcast JSON string and return channel objects.
 */
export function getBroadcastChannels(broadcastJson: string | null): BroadcastChannel[] {
  if (!broadcastJson) return [];
  try {
    const names: string[] = JSON.parse(broadcastJson);
    return names
      .map((name) => CHANNELS[name])
      .filter(Boolean) as BroadcastChannel[];
  } catch {
    return [];
  }
}
