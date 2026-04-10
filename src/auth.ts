import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { mongoClientPromise } from "./lib/db/mongoClient";
import { ensureUserDataIndexes } from "./lib/db/database";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET || "fintrace-dev-auth-secret";
const googleEnabled = Boolean(googleClientId && googleClientSecret);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(mongoClientPromise, {
    databaseName: process.env.MONGODB_DB_NAME || "fintrace",
  }),
  providers: googleEnabled
    ? [
        Google({
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        }),
      ]
    : [],
  secret: authSecret,
  session: {
    strategy: "database",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn() {
      await ensureUserDataIndexes();
    },
  },
});
