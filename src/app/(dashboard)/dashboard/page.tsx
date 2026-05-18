import { BriefcaseBusiness, Clock3, TrendingUp, UsersRound, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCents, formatDate, formatMinutes, monthRange, toDateInputValue } from "@/lib/format";
import { requireUser } from "@/lib/auth";

type MoneyRow = {
  minutes: number;
  client_hourly_rate_cents: number;
  project_hourly_rate_cents: number | null;
};

type DayRow = {
  entry_date: string;
  total_minutes: number;
};

type LatestEntry = {
  id: number;
  entry_date: string;
  minutes: number;
  description: string;
  client_name: string;
  project_name: string | null;
  client_hourly_rate_cents: number;
  project_hourly_rate_cents: number | null;
};

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function amountForEntry(entry: Pick<LatestEntry, "minutes" | "client_hourly_rate_cents" | "project_hourly_rate_cents">) {
  const hourlyRate = entry.project_hourly_rate_cents ?? entry.client_hourly_rate_cents;
  return Math.round((entry.minutes / 60) * hourlyRate);
}

function MetricCard({ title, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <article className="min-w-0 rounded-lg border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Agora</span>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 break-words text-[1.7rem] font-semibold leading-tight tracking-normal sm:text-3xl">{value}</p>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const month = monthRange();
  const today = new Date();
  const chartStart = toDateInputValue(addDays(today, -13));
  const chartEnd = toDateInputValue(today);
  const firstName = user.name.split(" ")[0] ?? "freelancer";

  const monthMinutes = (
    db
      .prepare(
        "SELECT COALESCE(SUM(minutes), 0) AS total FROM time_entries WHERE user_id = ? AND entry_date BETWEEN ? AND ?"
      )
      .get(user.id, month.start, month.end) as { total: number }
  ).total;

  const billableRows = db
    .prepare(
      `
      SELECT
        time_entries.minutes,
        clients.hourly_rate_cents AS client_hourly_rate_cents,
        projects.hourly_rate_cents AS project_hourly_rate_cents
      FROM time_entries
      JOIN clients ON clients.id = time_entries.client_id
      LEFT JOIN projects ON projects.id = time_entries.project_id
      WHERE time_entries.user_id = ?
        AND time_entries.billable = 1
        AND time_entries.entry_date BETWEEN ? AND ?
    `
    )
    .all(user.id, month.start, month.end) as MoneyRow[];

  const totalToReceive = billableRows.reduce((total, row) => {
    const hourlyRate = row.project_hourly_rate_cents ?? row.client_hourly_rate_cents;
    return total + Math.round((row.minutes / 60) * hourlyRate);
  }, 0);
  const billableMinutes = billableRows.reduce((total, row) => total + row.minutes, 0);

  const activeProjects = (
    db.prepare("SELECT COUNT(*) AS count FROM projects WHERE user_id = ? AND status = 'active'").get(user.id) as { count: number }
  ).count;

  const activeClients = (
    db
      .prepare(
        `
        SELECT COUNT(DISTINCT clients.id) AS count
        FROM clients
        JOIN projects ON projects.client_id = clients.id
        WHERE clients.user_id = ?
          AND projects.status = 'active'
      `
      )
      .get(user.id) as { count: number }
  ).count;

  const monthEntriesCount = (
    db
      .prepare("SELECT COUNT(*) AS count FROM time_entries WHERE user_id = ? AND entry_date BETWEEN ? AND ?")
      .get(user.id, month.start, month.end) as { count: number }
  ).count;

  const dayRows = db
    .prepare(
      `
      SELECT entry_date, COALESCE(SUM(minutes), 0) AS total_minutes
      FROM time_entries
      WHERE user_id = ?
        AND entry_date BETWEEN ? AND ?
      GROUP BY entry_date
    `
    )
    .all(user.id, chartStart, chartEnd) as DayRow[];

  const minutesByDay = new Map(dayRows.map((row) => [row.entry_date, row.total_minutes]));
  const chartDays = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    const key = toDateInputValue(date);
    return {
      key,
      label: formatDate(key).slice(0, 5),
      minutes: minutesByDay.get(key) ?? 0
    };
  });
  const maxDayMinutes = Math.max(...chartDays.map((day) => day.minutes), 60);
  const bestDay = chartDays.reduce((best, day) => (day.minutes > best.minutes ? day : best), chartDays[0]);
  const elapsedDaysInMonth = Math.max(1, Math.min(today.getDate(), Number(month.end.slice(-2))));
  const dailyAverageMinutes = Math.round(monthMinutes / elapsedDaysInMonth);

  const latestEntries = db
    .prepare(
      `
      SELECT
        time_entries.id,
        time_entries.entry_date,
        time_entries.minutes,
        time_entries.description,
        clients.name AS client_name,
        clients.hourly_rate_cents AS client_hourly_rate_cents,
        projects.name AS project_name,
        projects.hourly_rate_cents AS project_hourly_rate_cents
      FROM time_entries
      JOIN clients ON clients.id = time_entries.client_id
      LEFT JOIN projects ON projects.id = time_entries.project_id
      WHERE time_entries.user_id = ?
      ORDER BY time_entries.entry_date DESC, time_entries.id DESC
      LIMIT 10
    `
    )
    .all(user.id) as LatestEntry[];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Dashboard</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl">
            Bem-vindo de volta, {firstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Veja o ritmo do mês, acompanhe seus clientes mais ativos e confira o que já está pronto para cobrança.
          </p>
        </div>

        <aside className="rounded-lg bg-[#080b18] p-5 text-white shadow-soft">
          <p className="text-sm text-white/65">Receita estimada do mês</p>
          <p className="mt-3 break-words text-3xl font-semibold leading-tight tracking-normal">{formatCents(totalToReceive)}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
            <div>
              <p className="text-white/45">Faturável</p>
              <p className="mt-1 font-medium">{formatMinutes(billableMinutes)}</p>
            </div>
            <div>
              <p className="text-white/45">Registros</p>
              <p className="mt-1 font-medium">{monthEntriesCount}</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Horas no mês" value={formatMinutes(monthMinutes)} detail={`Média de ${formatMinutes(dailyAverageMinutes)} por dia`} icon={Clock3} />
        <MetricCard title="Valor a receber" value={formatCents(totalToReceive)} detail={`${formatMinutes(billableMinutes)} faturáveis no mês`} icon={TrendingUp} />
        <MetricCard title="Projetos ativos" value={String(activeProjects)} detail="Em andamento agora" icon={BriefcaseBusiness} />
        <MetricCard title="Clientes ativos" value={String(activeClients)} detail="Com projetos ativos" icon={UsersRound} />
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
        <Card className="overflow-hidden bg-white">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Horas dos últimos 14 dias</CardTitle>
                <CardDescription>Seu volume recente de trabalho registrado.</CardDescription>
              </div>
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Melhor dia</p>
                <p className="mt-1 font-semibold">{bestDay.minutes > 0 ? `${bestDay.label} · ${formatMinutes(bestDay.minutes)}` : "Sem registros"}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="overflow-hidden pb-1">
              <div className="grid min-w-0 items-end gap-2 pt-2" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
                {chartDays.map((day, index) => {
                  const height = day.minutes > 0 ? Math.max(12, Math.round((day.minutes / maxDayMinutes) * 170)) : 6;

                  return (
                    <div key={day.key} className="flex min-w-0 flex-col items-center gap-2">
                      <div className="flex h-44 w-full items-end justify-center rounded-md bg-muted/45 px-1">
                        <div
                          className="w-full max-w-8 rounded-t-md bg-primary shadow-sm"
                          style={{ height }}
                          title={`${formatDate(day.key)}: ${formatMinutes(day.minutes)}`}
                          aria-label={`${day.label}: ${formatMinutes(day.minutes)}`}
                        />
                      </div>
                      <span className={`text-[11px] text-muted-foreground ${index % 2 === 1 ? "hidden sm:inline" : ""}`}>{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-white">
          <CardHeader className="border-b">
            <CardTitle>Últimos registros</CardTitle>
            <CardDescription>Os 10 lançamentos mais recentes, com valor estimado.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 p-4 md:hidden">
              {latestEntries.map((entry) => (
                <article key={entry.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium leading-5">{entry.description}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.client_name} · {entry.project_name ?? "Sem projeto"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                      {formatMinutes(entry.minutes)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{formatDate(entry.entry_date)}</span>
                    <span className="font-semibold">{formatCents(amountForEntry(entry))}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b bg-muted/55 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 font-medium">Data</th>
                    <th className="px-3 py-3 font-medium">Cliente</th>
                    <th className="px-3 py-3 font-medium">Projeto</th>
                    <th className="px-3 py-3 font-medium">Descrição</th>
                    <th className="px-3 py-3 font-medium">Horas</th>
                    <th className="px-3 py-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {latestEntries.map((entry) => (
                    <tr key={entry.id} className="border-b transition hover:bg-muted/35 last:border-0">
                      <td className="px-3 py-3">{formatDate(entry.entry_date)}</td>
                      <td className="px-3 py-3">{entry.client_name}</td>
                      <td className="px-3 py-3">{entry.project_name ?? "Sem projeto"}</td>
                      <td className="max-w-[210px] px-3 py-3 leading-5">{entry.description}</td>
                      <td className="px-3 py-3">{formatMinutes(entry.minutes)}</td>
                      <td className="px-3 py-3 font-medium">{formatCents(amountForEntry(entry))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {latestEntries.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum registro ainda.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
