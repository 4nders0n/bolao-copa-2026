import { eq, and } from "drizzle-orm";
import type { Adapter, AdapterAccount, AdapterUser, AdapterSession } from "next-auth/adapters";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./schema";
import { randomId } from "./utils";

export function DrizzleSQLiteAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = randomId();
      console.log("[AUTH ADAPTER] createUser:", data.email);
      await db.insert(users).values({
        id,
        email: data.email,
        name: data.name ?? null,
        image: data.image ?? null,
        emailVerified: data.emailVerified,
        role: "user",
      });

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      console.log("[AUTH ADAPTER] createUser result:", user?.id);

      return user as AdapterUser;
    },

    async getUser(id) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      return (user as AdapterUser) ?? null;
    },

    async getUserByEmail(email) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      return (user as AdapterUser) ?? null;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.providerAccountId, providerAccountId),
          eq(accounts.provider, provider)
        ),
      });

      if (!account) return null;

      const user = await db.query.users.findFirst({
        where: eq(users.id, account.userId),
      });

      return (user as AdapterUser) ?? null;
    },

    async updateUser(data) {
      if (!data.id) throw new Error("User id is required");

      await db
        .update(users)
        .set({
          name: data.name,
          email: data.email,
          image: data.image,
          emailVerified: data.emailVerified,
          updatedAt: new Date(),
        })
        .where(eq(users.id, data.id));

      const user = await db.query.users.findFirst({
        where: eq(users.id, data.id),
      });

      return user as AdapterUser;
    },

    async deleteUser(userId) {
      await db.delete(users).where(eq(users.id, userId));
    },

    async linkAccount(data) {
      console.log("[AUTH ADAPTER] linkAccount:", data.provider, data.userId);
      await db.insert(accounts).values({
        id: randomId(),
        userId: data.userId,
        type: data.type,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        refresh_token: data.refresh_token ?? null,
        access_token: data.access_token ?? null,
        expires_at: data.expires_at ?? null,
        token_type: data.token_type ?? null,
        scope: data.scope ?? null,
        id_token: data.id_token ?? null,
        session_state: data.session_state as string ?? null,
      });
      console.log("[AUTH ADAPTER] linkAccount done");

      return data as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.providerAccountId, providerAccountId),
            eq(accounts.provider, provider)
          )
        );
    },

    async createSession(data) {
      const id = randomId();
      console.log("[AUTH ADAPTER] createSession for user:", data.userId);
      await db.insert(sessions).values({
        id,
        userId: data.userId,
        sessionToken: data.sessionToken,
        expires: data.expires,
      });

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, id),
      });
      console.log("[AUTH ADAPTER] createSession result:", session?.id);

      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.sessionToken, sessionToken),
      });

      if (!session) return null;

      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });

      if (!user) return null;

      return {
        session: session as AdapterSession,
        user: user as AdapterUser,
      };
    },

    async updateSession(data) {
      await db
        .update(sessions)
        .set({
          expires: data.expires,
        })
        .where(eq(sessions.sessionToken, data.sessionToken));

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.sessionToken, data.sessionToken),
      });

      return session as AdapterSession;
    },

    async deleteSession(sessionToken) {
      await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken(data) {
      await db.insert(verificationTokens).values({
        identifier: data.identifier,
        token: data.token,
        expires: data.expires,
      });

      return data;
    },

    async useVerificationToken({ identifier, token }) {
      const vt = await db.query.verificationTokens.findFirst({
        where: and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token)
        ),
      });

      if (!vt) return null;

      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token)
          )
        );

      return vt;
    },
  };
}
