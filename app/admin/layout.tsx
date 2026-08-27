"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  AdminErrorState,
  adminErrorMessage,
} from "@/components/admin/admin-error-state";
import { runApi } from "@/lib/effect/client";

const navItems = [
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/vocabulary", label: "Vocabulary" },
  { href: "/admin/supplements", label: "Supplements" },
  { href: "/admin/health", label: "Health" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutPending = useRef(false);

  // Don't show nav on login page
  if (pathname === "/admin") return <>{children}</>;

  async function handleLogout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLogoutError(null);
    setIsLoggingOut(true);
    try {
      await runApi((client) => client.session.delete({}));
      router.push("/admin");
    } catch (error) {
      setLogoutError(
        adminErrorMessage(error, "Could not log out. Please try again."),
      );
    } finally {
      logoutPending.current = false;
      setIsLoggingOut(false);
    }
  }

  return (
    <main id="main-content" className="admin-shell" aria-busy={isLoggingOut}>
      <header className="admin-chrome">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 pr-2"
          aria-label="View public Bloodwork dashboard"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white"
          >
            B
          </span>
          <span>
            <span className="block text-xs font-semibold text-zinc-900">
              Bloodwork
            </span>
            <span className="block text-[0.62rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase">
              Admin
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <nav
            aria-label="Admin sections"
            className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex min-w-max gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-10 items-center rounded-xl px-3 text-xs font-semibold ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          <span aria-hidden="true" className="h-6 w-px bg-zinc-900/10" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="button-quiet min-h-10 shrink-0 px-3 text-xs disabled:opacity-40"
          >
            {isLoggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </header>
      {logoutError && (
        <AdminErrorState
          message={logoutError}
          onRetry={handleLogout}
          retrying={isLoggingOut}
        />
      )}
      {children}
    </main>
  );
}
