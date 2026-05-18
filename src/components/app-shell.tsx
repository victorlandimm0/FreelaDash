"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppShellProps = {
  user: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
  children: React.ReactNode;
};

const links: Array<{ href: string; label: string; icon: LucideIcon; disabled?: boolean }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timer", label: "Timer", icon: Clock3 },
  { href: "/clients", label: "Clientes", icon: UsersRound },
  { href: "/invoices", label: "Cobranças", icon: FileText }
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-[#f8faf9]/95 px-4 py-5 lg:flex lg:flex-col">
        <Link href="/dashboard" className="mb-5 flex items-center gap-3 px-2">
          <img src="/assets/freeladash-app-icon.png" alt="" className="h-10 w-10 rounded-md object-cover" />
          <span className="min-w-0">
            <img src="/assets/freeladash-wordmark.png" alt="FreelaDash" className="h-6 w-auto max-w-[132px] object-contain object-left" />
            <span className="text-xs text-muted-foreground">Seu mês em ordem</span>
          </span>
        </Link>

        <div className="mb-6 rounded-lg bg-[#080b18] p-4 text-white shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">FreelaDash</p>
          <p className="mt-2 text-lg font-semibold leading-tight tracking-normal">Painel do freelancer</p>
          <p className="mt-3 text-xs leading-5 text-white/65">
            Dashboard, timer e clientes organizados em um fluxo simples para o dia a dia.
          </p>
        </div>

        <nav className="space-y-1">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/60"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active ? "bg-[#080b18] text-white shadow-sm" : "text-muted-foreground hover:bg-white hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 max-w-full border-b bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center justify-between">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
            <img src="/assets/freeladash-app-icon.png" alt="" className="h-9 w-9 rounded-md object-cover" />
            <img src="/assets/freeladash-wordmark.png" alt="FreelaDash" className="h-6 w-auto max-w-[140px] object-contain object-left" />
          </Link>
          <Button variant="ghost" size="icon" aria-label="Sair" onClick={logout}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="min-w-0 max-w-full overflow-x-clip pb-24 lg:pl-64">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid max-w-full grid-cols-4 border-t bg-white lg:hidden">
        {links.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex min-h-16 min-w-0 cursor-not-allowed flex-col items-center justify-center gap-1 overflow-hidden text-[11px] font-medium text-muted-foreground/60"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
