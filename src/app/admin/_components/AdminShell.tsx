"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCircle,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/admin/dashboard",
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/bookings",
    label: "รายการจอง",
    icon: CalendarCheck,
  },
  {
    href: "/admin/calendar",
    label: "ปฏิทิน",
    icon: Calendar,
  },
  {
    href: "/admin/settings",
    label: "ตั้งค่า",
    icon: Settings,
  },
];

export default function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSignOut() {
    signOut({ callbackUrl: "/admin/login" });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-border-light bg-primary-mid transition-transform lg:sticky lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-deep">
              <span className="font-display text-xs font-extrabold text-on-accent">
                B
              </span>
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-[0.1em] text-text-heading">
                BSE
              </div>
              <div className="font-mono text-[7px] tracking-[0.2em] text-text-muted uppercase">
                Admin Panel
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-primary-light lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    isActive
                      ? "bg-accent-subtle text-accent"
                      : "text-text-muted hover:bg-primary-light hover:text-text-heading"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User + profile + sign out */}
        <div className="border-t border-border-light p-4">
          <div className="mb-3 text-xs text-text-muted">
            เข้าสู่ระบบเป็น{" "}
            <span className="text-text-heading">{userName}</span>
          </div>
          <div className="space-y-1">
            <Link
              href="/admin/profile"
              onClick={() => setSidebarOpen(false)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname === "/admin/profile"
                  ? "bg-accent-subtle text-accent"
                  : "text-text-muted hover:bg-primary-light hover:text-text-heading"
              }`}
            >
              <UserCircle className="h-4 w-4" />
              โปรไฟล์
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-primary-light hover:text-status-cancelled"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex items-center border-b border-border-light bg-primary/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-primary-light"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-display text-sm font-bold text-text-heading">
            BSE Admin
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
