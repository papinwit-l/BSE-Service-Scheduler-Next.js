import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

// Kept as a literal union rather than importing AdminRole from
// @prisma/client: if the Prisma client hasn't been regenerated, that
// import fails and TypeScript silently drops this whole augmentation.
type Role = "ROOT" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    mustChangePassword: boolean;
  }
}
