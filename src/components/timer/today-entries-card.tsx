"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import { TodayEntryItem } from "./today-entry-item";
import type { TimerClientOption, TimerProjectOption, TodayEntryRow } from "./timer-shared";

type TodayEntriesCardProps = {
  clients: TimerClientOption[];
  projects: TimerProjectOption[];
  entries: TodayEntryRow[];
  todayMinutes: number;
  onError: (message: string | null) => void;
};

export function TodayEntriesCard({ clients, projects, entries, todayMinutes, onError }: TodayEntriesCardProps) {
  return (
    <Card className="overflow-hidden bg-white">
      <CardHeader className="flex flex-col gap-2 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Horas de hoje</CardTitle>
          <CardDescription>Edite ou remova registros quando precisar ajustar o dia.</CardDescription>
        </div>
        <Badge tone="info" className="w-fit">{formatMinutes(todayMinutes)} no total</Badge>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {entries.map((entry) => (
          <TodayEntryItem key={entry.id} clients={clients} projects={projects} entry={entry} onError={onError} />
        ))}

        {entries.length === 0 && (
          <div className="rounded-lg border border-dashed bg-muted/25 p-8 text-center text-sm text-muted-foreground">
            Ainda não há registros hoje. Use o timer acima ou cadastre um lançamento manual.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
