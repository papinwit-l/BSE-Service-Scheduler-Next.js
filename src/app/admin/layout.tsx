import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "./_components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Login page renders without the shell
  // Middleware handles redirect, but double-check here
  if (!session) {
    return <>{children}</>;
  }

  return (
    <AdminShell userName={session.user?.name || "Admin"}>
      {children}
    </AdminShell>
  );
}
