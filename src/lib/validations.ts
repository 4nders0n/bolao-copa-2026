import { z } from "zod";

// ─── Enums ─────────────────────────────────────────────────────────────

export const MATCH_PHASES = [
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarter_finals",
  "semi_finals",
  "third_place",
  "final",
] as const;

export type Phase = (typeof MATCH_PHASES)[number];

export const MATCH_STATUSES = ["scheduled", "live", "finished"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["live"],
  live: ["finished"],
  finished: [],
};

// ─── Schemas ───────────────────────────────────────────────────────────

export const scoreSchema = z.number().int().min(0).max(99);

export const predictionSchema = z.object({
  matchId: z.string().min(1),
  homeScore: scoreSchema,
  awayScore: scoreSchema,
});

export type PredictionInput = z.infer<typeof predictionSchema>;

export const matchResultSchema = z.object({
  matchId: z.string().min(1),
  homeScore: scoreSchema,
  awayScore: scoreSchema,
});

export type MatchResultInput = z.infer<typeof matchResultSchema>;

export const matchStatusTransitionSchema = z
  .object({
    matchId: z.string().cuid(),
    fromStatus: z.enum(MATCH_STATUSES),
    toStatus: z.enum(MATCH_STATUSES),
  })
  .refine(
    (data) =>
      VALID_STATUS_TRANSITIONS[data.fromStatus]?.includes(data.toStatus),
    {
      message: "Transição de status inválida",
    }
  );

export type MatchStatusTransitionInput = z.infer<
  typeof matchStatusTransitionSchema
>;

// ─── Helpers ───────────────────────────────────────────────────────────

export function isValidStatusTransition(
  from: MatchStatus,
  to: MatchStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
