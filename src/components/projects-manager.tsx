"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents, formatMinutes, parseBrlToCents } from "@/lib/format";

type ClientOption = {
  id: number;
  name: string;
};

export type ProjectRow = {
  id: number;
  client_id: number;
  client_name: string;
  name: string;
  status: "active" | "completed";
  hourly_rate_cents: number | null;
  total_minutes: number;
};

type ProjectsManagerProps = {
  clients: ClientOption[];
  projects: ProjectRow[];
};

function payloadFromForm(form: HTMLFormElement) {
  const data = new FormData(form);
  const hourlyRate = String(data.get("hourlyRate") ?? "").trim();

  return {
    clientId: Number(data.get("clientId")),
    name: String(data.get("name") ?? ""),
    status: String(data.get("status") ?? "active"),
    hourlyRateCents: hourlyRate ? parseBrlToCents(hourlyRate) : null
  };
}

export function ProjectsManager({ clients, projects }: ProjectsManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>, id?: number) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const response = await fetch(id ? `/api/projects/${id}` : "/api/projects", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromForm(event.currentTarget))
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível salvar o projeto.");
    } else {
      event.currentTarget.reset();
      setEditingId(null);
      router.refresh();
    }

    setIsLoading(false);
  }

  async function removeProject(id: number) {
    if (!confirm("Remover este projeto? Os registros de horas ficam sem projeto.")) return;

    setIsLoading(true);
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });

    if (response.ok) {
      router.refresh();
    } else {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível remover o projeto.");
    }

    setIsLoading(false);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Novo projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => save(event)}>
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente</Label>
              <select
                id="clientId"
                name="clientId"
                className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="active">Ativo</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Valor/hora específico</Label>
              <Input id="hourlyRate" name="hourlyRate" inputMode="decimal" placeholder="Opcional" />
            </div>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isLoading || clients.length === 0}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4">
        {projects.map((project) => {
          const editing = editingId === project.id;

          return (
            <Card key={project.id} className="overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                {editing ? (
                  <form className="grid gap-3 md:grid-cols-5" onSubmit={(event) => save(event, project.id)}>
                    <select name="clientId" defaultValue={project.client_id} className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                    <Input name="name" defaultValue={project.name} required />
                    <select name="status" defaultValue={project.status} className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                      <option value="active">Ativo</option>
                      <option value="completed">Concluído</option>
                    </select>
                    <Input name="hourlyRate" defaultValue={project.hourly_rate_cents ? (project.hourly_rate_cents / 100).toFixed(2).replace(".", ",") : ""} />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isLoading}>Salvar</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                        <h2 className="truncate text-base font-semibold">{project.name}</h2>
                        <Badge className="w-fit shrink-0" tone={project.status === "active" ? "success" : "neutral"}>
                          {project.status === "active" ? "Ativo" : "Concluído"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{project.client_name}</p>
                      <p className="mt-3 inline-flex w-fit rounded-md bg-muted/50 px-3 py-2 text-sm font-medium">
                        {project.hourly_rate_cents ? `${formatCents(project.hourly_rate_cents)} / hora` : "Usa valor do cliente"} · {formatMinutes(project.total_minutes)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2 md:pl-4">
                      <Button variant="secondary" size="icon" aria-label="Editar projeto" onClick={() => setEditingId(project.id)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Remover projeto" onClick={() => removeProject(project.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {projects.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum projeto cadastrado ainda.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
