"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Clock3, Loader2, Mail, Pencil, Plus, Save, Trash2, WalletCards, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents, formatMinutes, parseBrlToCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ClientRow = {
  id: number;
  name: string;
  email: string | null;
  hourly_rate_cents: number;
  active_projects: number;
  total_minutes: number;
  total_cents: number;
};

export type ClientProjectRow = {
  id: number;
  client_id: number;
  name: string;
  status: "active" | "completed";
  hourly_rate_cents: number | null;
  total_minutes: number;
  total_cents: number;
};

type ClientsManagerProps = {
  clients: ClientRow[];
  projects: ClientProjectRow[];
};

function clientPayloadFromForm(form: HTMLFormElement) {
  const data = new FormData(form);

  return {
    name: String(data.get("name") ?? ""),
    email: String(data.get("email") ?? ""),
    hourlyRateCents: parseBrlToCents(String(data.get("hourlyRate") ?? "0"))
  };
}

function projectPayloadFromForm(form: HTMLFormElement, clientId: number) {
  const data = new FormData(form);
  const hourlyRate = String(data.get("hourlyRate") ?? "").trim();

  return {
    clientId,
    name: String(data.get("name") ?? ""),
    status: String(data.get("status") ?? "active"),
    hourlyRateCents: hourlyRate ? parseBrlToCents(hourlyRate) : null
  };
}

function activeProjectsLabel(count: number) {
  return count === 1 ? "1 ativo" : `${count} ativos`;
}

function rateInputValue(value: number | null) {
  return value ? (value / 100).toFixed(2).replace(".", ",") : "";
}

export function ClientsManager({ clients, projects }: ClientsManagerProps) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(clients[0]?.id ?? null);
  const [editingClient, setEditingClient] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;
  const clientProjects = useMemo(
    () => (selectedClient ? projects.filter((project) => project.client_id === selectedClient.id) : []),
    [projects, selectedClient]
  );

  const activeProjectCount = clients.reduce((total, client) => total + client.active_projects, 0);
  const portfolioCents = clients.reduce((total, client) => total + client.total_cents, 0);
  const portfolioMinutes = clients.reduce((total, client) => total + client.total_minutes, 0);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = event.currentTarget;
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientPayloadFromForm(form))
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível criar o cliente.");
      setIsLoading(false);
      return;
    }

    form.reset();
    setSelectedClientId(body.client?.id ?? selectedClientId);
    setIsLoading(false);
    router.refresh();
  }

  async function updateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient) return;

    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/clients/${selectedClient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientPayloadFromForm(event.currentTarget))
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível salvar o cliente.");
      setIsLoading(false);
      return;
    }

    setEditingClient(false);
    setIsLoading(false);
    router.refresh();
  }

  async function removeClient(id: number) {
    if (!confirm("Remover este cliente e todos os projetos/registros relacionados?")) return;

    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível remover o cliente.");
      setIsLoading(false);
      return;
    }

    setSelectedClientId(null);
    setIsLoading(false);
    router.refresh();
  }

  async function saveProject(event: React.FormEvent<HTMLFormElement>, id?: number) {
    event.preventDefault();
    if (!selectedClient) return;

    setIsLoading(true);
    setError(null);

    const form = event.currentTarget;
    const response = await fetch(id ? `/api/projects/${id}` : "/api/projects", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectPayloadFromForm(form, selectedClient.id))
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível salvar o projeto.");
      setIsLoading(false);
      return;
    }

    form.reset();
    setEditingProjectId(null);
    setIsLoading(false);
    router.refresh();
  }

  async function removeProject(id: number) {
    if (!confirm("Remover este projeto? Os registros de horas ficam sem projeto.")) return;

    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível remover o projeto.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.75fr)] 2xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)]">
        <Card className="bg-white">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Clientes</p>
            <CardTitle className="max-w-xl text-3xl leading-tight sm:text-4xl">Cadastre e gerencie sua carteira</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Crie clientes com valor/hora em reais e acompanhe rapidamente o acumulado de cada um.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto]" onSubmit={createClient}>
              <Input name="name" placeholder="Nome do cliente" required />
              <Input name="email" type="email" placeholder="email@cliente.com" />
              <Input name="hourlyRate" inputMode="decimal" placeholder="Valor/hora em reais" required />
              <Button type="submit" className="w-full 2xl:w-auto" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Criar cliente
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Resumo</p>
            <CardTitle>Clientes ativos e potencial acumulado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="rounded-md bg-muted/45 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Clientes</p>
              <p className="mt-3 break-words text-2xl font-semibold leading-tight">{clients.length}</p>
            </div>
            <div className="rounded-md bg-muted/45 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Projetos ativos</p>
              <p className="mt-3 break-words text-2xl font-semibold leading-tight">{activeProjectCount}</p>
            </div>
            <div className="rounded-md bg-muted/45 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total</p>
              <p className="mt-3 break-words text-lg font-semibold leading-tight sm:text-xl">{formatCents(portfolioCents)}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px] 2xl:items-start">
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((client) => {
            const selected = selectedClient?.id === client.id;

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => { setSelectedClientId(client.id); setEditingClient(false); setEditingProjectId(null); }}
                className={cn(
                "rounded-lg border bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5",
                  selected && "border-primary ring-2 ring-primary/15"
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-semibold">{client.name}</span>
                    <span className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      <span className="truncate">{client.email ?? "Sem email cadastrado"}</span>
                    </span>
                  </span>
                  <Badge tone={client.active_projects > 0 ? "success" : "neutral"}>{activeProjectsLabel(client.active_projects)}</Badge>
                </span>

                <span className="mt-5 grid gap-2 sm:grid-cols-3">
                  <span className="min-w-0 rounded-md bg-muted/40 p-3">
                    <span className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
                      Valor/hora
                    </span>
                    <span className="mt-2 block break-words text-sm font-semibold leading-tight sm:text-base">{formatCents(client.hourly_rate_cents)}</span>
                  </span>
                  <span className="min-w-0 rounded-md bg-muted/40 p-3">
                    <span className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Horas
                    </span>
                    <span className="mt-2 block break-words text-sm font-semibold leading-tight sm:text-base">{formatMinutes(client.total_minutes)}</span>
                  </span>
                  <span className="min-w-0 rounded-md bg-muted/40 p-3">
                    <span className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                      Acumulado
                    </span>
                    <span className="mt-2 block break-words text-sm font-semibold leading-tight sm:text-base">{formatCents(client.total_cents)}</span>
                  </span>
                </span>
              </button>
            );
          })}

          {clients.length === 0 && (
            <Card className="bg-white md:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</CardContent>
            </Card>
          )}
        </div>

        <Card className="overflow-hidden bg-white">
          {selectedClient ? (
            <>
              <CardHeader className="border-b">
                {editingClient ? (
                  <form className="grid gap-3" onSubmit={updateClient}>
                    <Input name="name" defaultValue={selectedClient.name} required />
                    <Input name="email" type="email" defaultValue={selectedClient.email ?? ""} />
                    <Input name="hourlyRate" defaultValue={rateInputValue(selectedClient.hourly_rate_cents)} inputMode="decimal" required />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isLoading}>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingClient(false)}>
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle>{selectedClient.name}</CardTitle>
                      <CardDescription>{selectedClient.email ?? "Sem email cadastrado"}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="icon" aria-label="Editar cliente" onClick={() => setEditingClient(true)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Remover cliente" onClick={() => removeClient(selectedClient.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-5 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Horas</p>
                    <p className="mt-2 break-words font-semibold leading-tight">{formatMinutes(selectedClient.total_minutes)}</p>
                  </div>
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Acumulado</p>
                    <p className="mt-2 break-words font-semibold leading-tight">{formatCents(selectedClient.total_cents)}</p>
                  </div>
                </div>

                <form className="space-y-3 rounded-lg border p-4" onSubmit={(event) => saveProject(event)}>
                  <h3 className="font-semibold">Novo projeto</h3>
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Nome</Label>
                    <Input id="projectName" name="name" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="projectStatus">Status</Label>
                      <select
                        id="projectStatus"
                        name="status"
                        className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="active">Ativo</option>
                        <option value="completed">Concluído</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectRate">Valor/hora específico</Label>
                      <Input id="projectRate" name="hourlyRate" inputMode="decimal" placeholder="Opcional" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    Adicionar projeto
                  </Button>
                </form>

                <div className="space-y-3">
                  <h3 className="font-semibold">Projetos</h3>
                  {clientProjects.map((project) => {
                    const editing = editingProjectId === project.id;

                    return (
                      <div key={project.id} className="rounded-lg border bg-white p-4">
                        {editing ? (
                          <form className="grid gap-3" onSubmit={(event) => saveProject(event, project.id)}>
                            <Input name="name" defaultValue={project.name} required />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <select
                                name="status"
                                defaultValue={project.status}
                                className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="active">Ativo</option>
                                <option value="completed">Concluído</option>
                              </select>
                              <Input name="hourlyRate" defaultValue={rateInputValue(project.hourly_rate_cents)} inputMode="decimal" />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" disabled={isLoading}>
                                <Save className="h-4 w-4" aria-hidden="true" />
                                Salvar
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingProjectId(null)}>
                                <X className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="truncate font-semibold">{project.name}</h4>
                                  <Badge tone={project.status === "active" ? "success" : "neutral"}>
                                    {project.status === "active" ? "Ativo" : "Concluído"}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {project.hourly_rate_cents ? `${formatCents(project.hourly_rate_cents)} / hora` : "Usa valor do cliente"}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button variant="secondary" size="icon" aria-label="Editar projeto" onClick={() => setEditingProjectId(project.id)}>
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="Remover projeto" onClick={() => removeProject(project.id)}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-3 text-sm sm:grid-cols-2">
                              <div className="rounded-md bg-muted/40 p-3">
                                <p className="text-xs text-muted-foreground">Horas</p>
                                <p className="mt-1 break-words font-semibold leading-tight">{formatMinutes(project.total_minutes)}</p>
                              </div>
                              <div className="rounded-md bg-muted/40 p-3">
                                <p className="text-xs text-muted-foreground">Acumulado</p>
                                <p className="mt-1 break-words font-semibold leading-tight">{formatCents(project.total_cents)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {clientProjects.length === 0 && (
                    <div className="rounded-lg border border-dashed bg-muted/25 p-6 text-sm text-muted-foreground">
                      Nenhum projeto para este cliente ainda.
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Selecione ou cadastre um cliente para ver detalhes.</CardContent>
          )}
        </Card>
      </section>

      <p className="text-sm text-muted-foreground">
        Carteira inteira: {formatMinutes(portfolioMinutes)} registrados em {clients.length} clientes.
      </p>
    </div>
  );
}
