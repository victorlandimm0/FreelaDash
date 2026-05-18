import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <AppShell user={{ name: user.name, email: user.email, avatar_url: user.avatar_url }}>
      {children}
    </AppShell>
  );
}
