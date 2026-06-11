import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── NextAuth.js Tables ────────────────────────────────────────────────

export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const accounts = sqliteTable(
  "account",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    providerIdx: uniqueIndex("provider_providerAccountId_idx").on(
      account.provider,
      account.providerAccountId
    ),
  })
);

export const sessions = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundIdx: uniqueIndex("identifier_token_idx").on(
      vt.identifier,
      vt.token
    ),
  })
);

// ─── Application Tables ────────────────────────────────────────────────

export const matches = sqliteTable(
  "match",
  {
    id: text("id").notNull().primaryKey(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    matchDate: integer("match_date", { mode: "timestamp_ms" }).notNull(),
    phase: text("phase").notNull(), // group_stage, round_of_32, round_of_16, quarter_finals, semi_finals, third_place, final
    group: text("group"), // A-L, only for group_stage
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    status: text("status").notNull().default("scheduled"), // scheduled, live, finished
    broadcast: text("broadcast"), // JSON array: ["CazéTV", "Globo", "SporTV", "SBT"]
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (match) => ({
    uniqueMatch: uniqueIndex("match_unique_idx").on(
      match.homeTeam,
      match.awayTeam,
      match.matchDate
    ),
  })
);

export const predictions = sqliteTable(
  "prediction",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    points: integer("points"), // null = not scored yet, 0 | 5 | 7 | 10
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (prediction) => ({
    userMatchIdx: uniqueIndex("prediction_user_match_idx").on(
      prediction.userId,
      prediction.matchId
    ),
  })
);

// ─── Type Exports ──────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
