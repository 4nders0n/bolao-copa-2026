"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Auto-refreshes the page every N seconds.
 * Used on the home page to show live scores in near real-time.
 */
export function AutoRefresh({ intervalSeconds = 30 }: { intervalSeconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [router, intervalSeconds]);

  return null;
}
