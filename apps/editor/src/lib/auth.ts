import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { magicLink } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { createTransport } from "nodemailer";

// Synchronous MongoClient initialization for Next.js App Router
const client = new MongoClient(process.env.ATLAS_URI || "");
const db = client.db(process.env.ATLAS_DATABASE_NAME || "");

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  database: mongodbAdapter(db),
  // socialProviders: {
  //   github: {
  //     clientId: process.env.AUTH_GITHUB_ID!,
  //     clientSecret: process.env.AUTH_GITHUB_SECRET!,
  //   },
  //   google: {
  //     clientId: process.env.AUTH_GOOGLE_ID!,
  //     clientSecret: process.env.AUTH_GOOGLE_SECRET!,
  //   },
  //   microsoftEntraId: {
  //     clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
  //     clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
  //     tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "common",
  //   },
  // },
  emailAndPassword: {
    enabled: process.env.NODE_ENV === "development", // Only for testing
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        const transport = createTransport({
          host: process.env.EMAIL_SERVER_HOST,
          port: Number(process.env.EMAIL_SERVER_PORT),
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        });
        await transport.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: "Sign in to RPG Studio",
          html: `<p>Click <a href="${url}">here</a> to sign in to RPG Studio.</p>`,
        });
      },
    }),
  ],
  user: {
    additionalFields: {
      oldId: {
        type: "string",
        required: false,
      }
    }
  }
});
