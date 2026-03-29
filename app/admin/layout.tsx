"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/admin/data", label: "Data" },
  { href: "/admin/vocabulary", label: "Vocabulary" },
  { href: "/admin/supplements", label: "Supplements" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show nav on login page
  if (pathname === "/admin") return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin");
  }

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex gap-4 text-[10px] tracking-[2px] uppercase">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href
                  ? "text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="text-[10px] tracking-[2px] text-zinc-400 uppercase hover:text-zinc-600"
        >
          Logout
        </button>
      </div>
      {children}
    </main>
  );
}
