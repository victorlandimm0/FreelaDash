"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TimerRunnerCard } from "@/components/timer/timer-runner-card";
import { ManualEntryCard } from "@/components/timer/manual-entry-card";
import { TodayEntriesCard } from "@/components/timer/today-entries-card";
import type { TimerClientOption, TimerProjectOption, TodayEntryRow } from "@/components/timer/timer-shared";

export type { TimerClientOption, TimerProjectOption, TodayEntryRow };

type TimerManagerProps = {
  clients: TimerClientOption[];
  projects: TimerProjectOption[];
  entries: TodayEntryRow[];
};

export function TimerManager({ clients, projects, entries }: TimerManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const activeProjects = projects.filter((project) => project.status === "active");
  const todayMinutes = entries.reduce((total, entry) => total + entry.minutes, 0);

  if (clients.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Cadastre um cliente antes de registrar horas.</p>
          <Link href="/clients" className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Ir para clientes
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <TimerRunnerCard projects={activeProjects} onError={setError} />
        <ManualEntryCard clients={clients} projects={activeProjects} todayMinutes={todayMinutes} onError={setError} />
      </section>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <TodayEntriesCard clients={clients} projects={activeProjects} entries={entries} todayMinutes={todayMinutes} onError={setError} />
    </div>
  );
}
