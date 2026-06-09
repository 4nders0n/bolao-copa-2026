import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  // Local development fallback
  const cwd = (process.cwd() || "").replace(/\\/g, "/");
  return `file:///${cwd}/dev.db`;
}

const globalForDb = globalThis as unknown as {
  db: LibSQLDatabase<typeof schema> | undefined;
};

function createDb(): LibSQLDatabase<typeof schema> {
  const url = getDatabaseUrl();
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return drizzle(client, { schema });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
