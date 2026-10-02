import { auth } from "@/lib/auth";
import { Toaster } from "sonner";
import AdminShell from "./_components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Login page renders without the shell.
  // The proxy handles the redirect; this is a second line of defence.
  if (!session) {
    return <>{children}</>;
  }

  return (
    <>
      <AdminShell userName={session.user?.name || "Admin"}>
        {children}
      </AdminShell>

      {/* Toasts confirm actions that leave the screen looking unchanged
          (saves, LINE sends). Validation errors stay inline on the field. */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-primary-mid)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
          },
        }}
      />
    </>
  );
}
