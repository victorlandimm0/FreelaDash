"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseDurationToMinutes } from "@/lib/duration";
import { toDateInputValue } from "@/lib/format";
import { ProjectSelect, TodayTotalBadge, splitSelection, type TimerClientOption, type TimerProjectOption } from "./timer-shared";

type ManualEntryCardProps = {
  clients: TimerClientOption[];
  projects: TimerProjectOption[];
  todayMinutes: number;
  onError: (message: string | null) => void;
};

export function ManualEntryCard({ clients, projects, todayMinutes, onError }: ManualEntryCardProps) {
  const router = useRouter();
  const today = toDateInputValue();
  const [selection, setSelection] = useState(projects[0] ? `${projects[0].client_id}|${projects[0].id}` : `${clients[0]?.id ?? ""}|`);
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState("1");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);

    const duration = parseDurationToMinutes(hours);
    if (!duration.ok) {
      onError(duration.error);
      return;
    }

    const selected = splitSelection(selection);
    setIsSaving(true);

    const response = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selected.clientId,
        projectId: selected.projectId,
        entryDate: date,
        minutes: duration.minutes,
        description,
        billable
      })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      onError(body.error ?? "Não foi possível registrar manualmente.");
      setIsSaving(false);
      return;
    }

    setDate(today);
    setHours("1");
    setDescription("");
    setBillable(true);
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Card className="overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Registro manual</p>
          <CardTitle className="mt-2">Esqueceu de ligar o timer?</CardTitle>
        </div>
        <TodayTotalBadge minutes={todayMinutes} />
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Projeto</Label>
            <ProjectSelect clients={clients} projects={projects} value={selection} onChange={setSelection} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualDescription">Descrição</Label>
            <Textarea id="manualDescription" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva rapidamente o trabalho realizado" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="manualDate">Data</Label>
              <Input id="manualDate" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualHours">Duração</Label>
              <Input id="manualHours" value={hours} onChange={(event) => setHours(event.target.value)} inputMode="decimal" required />
            </div>
          </div>
          <p className="rounded-md bg-muted/55 px-3 py-2 text-xs leading-5 text-muted-foreground">1:30 = 1 hora e 30 minutos. 1.5 ou 1,5 = 1 hora e meia.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={billable} onChange={(event) => setBillable(event.target.checked)} className="h-4 w-4 rounded border" />
            Faturável
          </label>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Salvar registro manual
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
