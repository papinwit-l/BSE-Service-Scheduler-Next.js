import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email as string },
        });

        if (!admin) return null;

        // Deactivated accounts cannot sign in. Checked after the lookup but
        // before the password compare is answered, so the response is the
        // same shape either way.
        if (!admin.active) return null;

        const isValid = await compare(
          credentials.password as string,
          admin.password,
        );

        if (!isValid) return null;

        // Best-effort: a failed write here must not block a valid login.
        try {
          await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (err) {
          console.error("[auth] lastLoginAt update failed", err);
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          mustChangePassword: admin.mustChangePassword,
        };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign-in
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        return token;
      }

      // Client called update() — re-read so a just-changed password or a
      // role change takes effect without signing out and back in.
      if (trigger === "update" && token.id) {
        const admin = await prisma.admin.findUnique({
          where: { id: token.id },
          select: { role: true, mustChangePassword: true, active: true },
        });

        if (admin?.active) {
          token.role = admin.role;
          token.mustChangePassword = admin.mustChangePassword;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
});
