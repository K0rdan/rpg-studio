import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import Nodemailer from "next-auth/providers/nodemailer"
import Credentials from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { connectToDatabase } from "./lib/mongodb"

// Build providers array
const providers: Provider[] = [
  GitHub,
  Google,
  MicrosoftEntraID({
     clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
     clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
     issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
  }),
  Nodemailer({
    server: {
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM,
  }),
];

// Add Credentials provider ONLY in development for E2E testing
// WARNING: This is insecure and should NEVER be enabled in production!
if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      id: "test-credentials",
      name: "Test User (Dev Only)",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Simple password check for E2E tests
        if (credentials?.password === process.env.TEST_PASSWORD || credentials?.password === "test-password") {
          // Return user object that will be stored in JWT
          return {
            id: "test-user-id-cypress",
            email: "test@rpgstudio.dev",
            name: "Test User",
            image: "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
          };
        }
        return null;
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Only use adapter for non-Credentials providers
  adapter: MongoDBAdapter(connectToDatabase().then(({ client }) => client)),
  providers,
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token for Credentials provider
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token, user }) {
      // For database sessions (OAuth providers)
      if (user) {
        if (session.user) {
          session.user.id = user.id;
        }
      }
      // For JWT sessions (Credentials provider)
      else if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // Use JWT for Credentials provider, database for others
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
})
