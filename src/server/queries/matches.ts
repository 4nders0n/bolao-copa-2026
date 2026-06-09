import { db } from "@/lib/db";
import { matches } from "@/lib/schema";
import { eq, gt, and, asc } from "drizzle-orm";
import type { Phase } from "@/lib/validations";

export async function getMatches() {
  return db.select().from(matches).orderBy(asc(matches.matchDate));
}

export async function getMatchById(id: string) {
  return db.query.matches.findFirst({
    where: eq(matches.id, id),
  });
}

export async function getMatchesByPhase(phase: Phase) {
  return db
    .select()
    .from(matches)
    .where(eq(matches.phase, phase))
    .orderBy(asc(matches.matchDate));
}

export async function getUpcomingMatches() {
  return db
    .select()
    .from(matches)
    .where(
      and(gt(matches.matchDate, new Date()), eq(matches.status, "scheduled"))
    )
    .orderBy(asc(matches.matchDate));
}
