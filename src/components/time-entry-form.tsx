"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDateInputValue } from "@/lib/format";

export type ClientOption = {
  id: number;
  name: string;
  hourly_rate_cents: number;
};

export type ProjectOption = {
  id: number;
  client_id: number;
  name: string;
  status: "active" | "completed";
  hourly_rate_cents: number | null;
};

type TimeEntryFormProps = {
  clients: ClientOption[];
  projects: ProjectOption[];
  title?: string;
  description?: string;
};

export function TimeEntryForm({
  clients,
  projects,
  title = "Registrar trabalho",
  description = "Anote o que foi feito hoje e mantenha a cobrança pronta."
}: TimeEntryFormProps) {
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id?.toString() ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.client_id.toString() === selectedClient && project.status === "active"),
    [projects, selectedClient]
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const hours = Number(String(formData.get("hours") ?? "0").replace(",", "."));
    const minutes = Math.round(hours * 60);
    const projectId = String(formData.get("projectId") ?? "");

    const response = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: Number(formData.get("clientId")),
        projectId: projectId ? Number(projectId) : null,
        entryDate: formData.get("entryDate"),
        minutes,
        description: formData.get("description"),
        billable: formData.get("billable") === "on"
      })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível registrar as horas.");
      setIsLoading(false);
      return;
    }

    form.reset();
    setSelectedClient(clients[0]?.id?.toString() ?? "");
    setIsLoading(false);
    router.refresh();
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Cadastre um cliente antes de registrar horas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/clients"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Cadastrar cliente
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid min-w-0 gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="entryDate">Data</Label>
            <Input id="entryDate" name="entryDate" type="date" defaultValue={toDateInputValue()} required />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="hours">Horas</Label>
            <Input id="hours" name="hours" inputMode="decimal" defaultValue="1" required />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="clientId">Cliente</Label>
            <select
              id="clientId"
              name="clientId"
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
              className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="projectId">Projeto</Label>
            <select
              id="projectId"
              name="projectId"
              className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sem projeto</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-2 md:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" placeholder="Ex: Ajustes na landing page e revisão do checkout" required />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input id="billable" name="billable" type="checkbox" defaultChecked className="h-4 w-4 rounded border" />
            <Label htmlFor="billable">Faturável</Label>
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">{error}</p>}
          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Registrar horas
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
