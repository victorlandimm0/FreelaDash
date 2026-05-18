"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDurationToMinutes } from "@/lib/duration";
import { formatDate, formatMinutes } from "@/lib/format";
import { ProjectSelect, entrySelection, minutesToHours, splitSelection, type EditDraft, type TimerClientOption, type TimerProjectOption, type TodayEntryRow } from "./timer-shared";

type TodayEntryItemProps = {
  clients: TimerClientOption[];
  projects: TimerProjectOption[];
  entry: TodayEntryRow;
  onError: (message: string | null) => void;
};

export function TodayEntryItem({ clients, projects, entry, onError }: TodayEntryItemProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function beginEdit() {
    setDraft({
      selection: entrySelection(entry),
      hours: minutesToHours(entry.minutes),
      description: entry.description,
      billable: Boolean(entry.billable)
    });
  }

  async function saveEdit() {
    if (!draft) return;

    onError(null);
    const duration = parseDurationToMinutes(draft.hours);

    if (!duration.ok) {
      onError(duration.error);
      return;
    }

    const selection = splitSelection(draft.selection);
    setIsSaving(true);

    const response = await fetch(`/api/time-entries/${entry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selection.clientId,
        projectId: selection.projectId,
        entryDate: entry.entry_date,
        minutes: duration.minutes,
        description: draft.description,
        billable: draft.billable
      })
    });

    await finishMutation(response, "Não foi possível editar o registro.");
    setDraft(null);
  }

  async function removeEntry() {
    if (!confirm("Remover este registro de hoje?")) return;

    setIsSaving(true);
    onError(null);
    const response = await fetch(`/api/time-entries/${entry.id}`, { method: "DELETE" });
    await finishMutation(response, "Não foi possível remover o registro.");
  }

  async function finishMutation(response: Response, fallback: string) {
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      onError(body.error ?? fallback);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      {draft ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_140px_minmax(220px,1.2fr)_auto] lg:items-start">
          <ProjectSelect clients={clients} projects={projects} value={draft.selection} onChange={(selection) => setDraft({ ...draft, selection })} />
          <div className="space-y-1">
            <Input value={draft.hours} onChange={(event) => setDraft({ ...draft, hours: event.target.value })} inputMode="decimal" />
            <p className="text-xs leading-4 text-muted-foreground">1:30 ou 1.5</p>
          </div>
          <Input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.billable} onChange={(event) => setDraft({ ...draft, billable: event.target.checked })} className="h-4 w-4 rounded border" />
              Faturável
            </label>
            <Button size="sm" onClick={saveEdit} disabled={isSaving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="font-semibold leading-5">{entry.description}</p>
              <Badge tone={entry.billable ? "success" : "neutral"}>{entry.billable ? "Faturável" : "Interno"}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{entry.client_name} · {entry.project_name ?? "Sem projeto"} · {formatDate(entry.entry_date)}</p>
          </div>
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{formatMinutes(entry.minutes)}</span>
            <div className="flex gap-2">
              <Button size="icon" variant="secondary" aria-label="Editar registro" onClick={beginEdit}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Remover registro" onClick={removeEntry}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
