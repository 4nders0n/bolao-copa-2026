import { eq, and } from "drizzle-orm";
import type { Adapter, AdapterAccount, AdapterUser, AdapterSession, VerificationToken } from "next-auth/adapters";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./schema";
import { randomId } from "./utils";

export function DrizzleSQLiteAdapter(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, "id">) {
      const id = randomId();
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

      return user as AdapterUser;
    },

    async getUser(id: string) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      return (user as AdapterUser) ?? null;
    },

    async getUserByEmail(email: string) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      return (user as AdapterUser) ?? null;
    },

    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
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

    async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
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

    async deleteUser(userId: string) {
      await db.delete(users).where(eq(users.id, userId));
    },

    async linkAccount(data: AdapterAccount) {
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
        session_state: (data.session_state as string) ?? null,
      });

      return data;
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.providerAccountId, providerAccountId),
            eq(accounts.provider, provider)
          )
        );
    },

    async createSession(data: { sessionToken: string; userId: string; expires: Date }) {
      const id = randomId();
      await db.insert(sessions).values({
        id,
        userId: data.userId,
        sessionToken: data.sessionToken,
        expires: data.expires,
      });

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, id),
      });

      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken: string) {
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

    async updateSession(data: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
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

    async deleteSession(sessionToken: string) {
      await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken(data: VerificationToken) {
      await db.insert(verificationTokens).values({
        identifier: data.identifier,
        token: data.token,
        expires: data.expires,
      });

      return data;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
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
