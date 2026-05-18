"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TimeEntryForm, type ClientOption, type ProjectOption } from "@/components/time-entry-form";
import { formatDate, formatMinutes } from "@/lib/format";

export type TimeEntryRow = {
  id: number;
  entry_date: string;
  minutes: number;
  description: string;
  billable: number;
  client_name: string;
  project_name: string | null;
};

type TimeEntriesManagerProps = {
  clients: ClientOption[];
  projects: ProjectOption[];
  entries: TimeEntryRow[];
};

export function TimeEntriesManager({ clients, projects, entries }: TimeEntriesManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function removeEntry(id: number) {
    if (!confirm("Remover este registro de horas?")) return;

    const response = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    if (response.ok) {
      router.refresh();
      return;
    }

    const body = await response.json().catch(() => ({}));
    setError(body.error ?? "Não foi possível remover o registro.");
  }

  return (
    <div className="space-y-6">
      <TimeEntryForm clients={clients} projects={projects} />
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Projeto</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Tempo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{formatDate(entry.entry_date)}</td>
                    <td className="px-4 py-3">{entry.client_name}</td>
                    <td className="px-4 py-3">{entry.project_name ?? "Sem projeto"}</td>
                    <td className="max-w-md px-4 py-3">{entry.description}</td>
                    <td className="px-4 py-3">{formatMinutes(entry.minutes)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={entry.billable ? "success" : "neutral"}>{entry.billable ? "Faturável" : "Interno"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" aria-label="Remover registro" onClick={() => removeEntry(entry.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum registro de horas ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
