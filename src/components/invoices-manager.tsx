"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FilePlus2, FileText, Info, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents, formatDate, formatMinutes, monthRange } from "@/lib/format";

type ClientOption = {
  id: number;
  name: string;
};

type ProjectOption = {
  id: number;
  client_id: number;
  name: string;
  status: "active" | "completed";
};

export type InvoiceRow = {
  id: number;
  number: string;
  client_name: string;
  client_email: string | null;
  project_name: string | null;
  period_start: string;
  period_end: string;
  total_minutes: number;
  total_cents: number;
  status: "draft" | "sent" | "paid";
};

type InvoicesManagerProps = {
  clients: ClientOption[];
  projects: ProjectOption[];
  invoices: InvoiceRow[];
};

const statusLabels = {
  draft: "Rascunho",
  sent: "Enviada",
  paid: "Paga"
};

const statusTones = {
  draft: "neutral",
  sent: "warning",
  paid: "success"
} as const;

export function InvoicesManager({ clients, projects, invoices }: InvoicesManagerProps) {
  const router = useRouter();
  const range = monthRange();
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id?.toString() ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientProjects = useMemo(
    () => projects.filter((project) => project.client_id.toString() === selectedClientId),
    [projects, selectedClientId]
  );

  const draftCount = invoices.filter((invoice) => invoice.status === "draft").length;
  const sentCount = invoices.filter((invoice) => invoice.status === "sent").length;
  const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;
  const receivableCents = invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((total, invoice) => total + invoice.total_cents, 0);

  useEffect(() => {
    if (selectedProjectId && !clientProjects.some((project) => project.id.toString() === selectedProjectId)) {
      setSelectedProjectId("");
    }
  }, [clientProjects, selectedProjectId]);

  async function createInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const projectId = String(data.get("projectId") ?? "");
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: Number(data.get("clientId")),
        projectId: projectId ? Number(projectId) : null,
        periodStart: data.get("periodStart"),
        periodEnd: data.get("periodEnd")
      })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível gerar a cobrança.");
      setIsLoading(false);
      return;
    }

    router.push(`/invoices/${body.id}`);
    router.refresh();
  }

  async function updateStatus(id: number, status: string) {
    setError(null);
    const response = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível alterar o status.");
      return;
    }

    router.refresh();
  }

  async function removeInvoice(id: number) {
    if (!confirm("Remover esta cobrança?")) return;

    setError(null);
    const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error ?? "Não foi possível remover a cobrança.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.8fr)] xl:items-start">
        <Card className="bg-white">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Cobranças</p>
            <CardTitle className="max-w-xl text-3xl leading-tight sm:text-4xl">Gere cobranças por cliente, projeto e período</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              Selecione o recorte do trabalho e o sistema monta a cobrança com todas as horas faturáveis no intervalo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={createInvoice}>
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente</Label>
                <select
                  id="clientId"
                  name="clientId"
                  value={selectedClientId}
                  onChange={(event) => setSelectedClientId(event.target.value)}
                  className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectId">Projeto</Label>
                <select
                  id="projectId"
                  name="projectId"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todos os projetos</option>
                  {clientProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}{project.status === "completed" ? " · concluído" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Início do período</Label>
                  <Input id="periodStart" name="periodStart" type="date" defaultValue={range.start} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">Fim do período</Label>
                  <Input id="periodEnd" name="periodEnd" type="date" defaultValue={range.end} required />
                </div>
              </div>

              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || clients.length === 0}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FilePlus2 className="h-4 w-4" aria-hidden="true" />}
                Gerar cobrança
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Resumo</p>
            <CardTitle>Acompanhe o funil de recebimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 rounded-md bg-muted/45 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rascunho</p>
                <p className="mt-3 break-words text-2xl font-semibold leading-tight">{draftCount}</p>
              </div>
              <div className="min-w-0 rounded-md bg-muted/45 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Enviadas</p>
                <p className="mt-3 break-words text-2xl font-semibold leading-tight">{sentCount}</p>
              </div>
              <div className="min-w-0 rounded-md bg-muted/45 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pagas</p>
                <p className="mt-3 break-words text-2xl font-semibold leading-tight">{paidCount}</p>
              </div>
              <div className="min-w-0 rounded-md bg-[#080b18] p-3 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">A receber</p>
                <p className="mt-3 break-words text-base sm:text-lg font-semibold leading-tight">{formatCents(receivableCents)}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white">
                  <Info className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">Cobrar ficou mais simples</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Cada cobrança salva um snapshot das horas do período para manter o histórico estável mesmo se você editar registros depois.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden bg-white">
        <CardHeader className="border-b">
          <CardTitle>Lista de cobranças</CardTitle>
          <CardDescription>Rascunhos, enviadas e pagas em um único painel.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {invoices.map((invoice) => (
              <article key={invoice.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{invoice.number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{invoice.client_name} · {invoice.project_name ?? "Todos"}</p>
                  </div>
                  <Badge tone={statusTones[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-muted/35 p-3">
                    <p className="text-xs text-muted-foreground">Período</p>
                    <p className="mt-1 font-medium">{formatDate(invoice.period_start)} a {formatDate(invoice.period_end)}</p>
                  </div>
                  <div className="rounded-md bg-muted/35 p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="mt-1 font-medium">{formatCents(invoice.total_cents)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <select
                    aria-label="Alterar status"
                    defaultValue={invoice.status}
                    onChange={(event) => updateStatus(invoice.id, event.target.value)}
                    className="h-9 rounded-md border bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviada</option>
                    <option value="paid">Paga</option>
                  </select>
                  <div className="flex gap-2">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted hover:bg-muted/80"
                      aria-label="Ver cobrança"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Button variant="ghost" size="icon" aria-label="Remover cobrança" onClick={() => removeInvoice(invoice.id)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b bg-muted/55 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Projeto</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Horas</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b transition hover:bg-muted/35 last:border-0">
                    <td className="px-4 py-3 font-medium">{invoice.number}</td>
                    <td className="px-4 py-3">{invoice.client_name}</td>
                    <td className="px-4 py-3">{invoice.project_name ?? "Todos"}</td>
                    <td className="px-4 py-3">{formatDate(invoice.period_start)} a {formatDate(invoice.period_end)}</td>
                    <td className="px-4 py-3">{formatMinutes(invoice.total_minutes)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCents(invoice.total_cents)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTones[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                        <select
                          aria-label="Alterar status"
                          defaultValue={invoice.status}
                          onChange={(event) => updateStatus(invoice.id, event.target.value)}
                          className="h-8 rounded-md border bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="draft">Rascunho</option>
                          <option value="sent">Enviada</option>
                          <option value="paid">Paga</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
                          aria-label="Ver cobrança"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Button variant="ghost" size="icon" aria-label="Remover cobrança" onClick={() => removeInvoice(invoice.id)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoices.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />
              Nenhuma cobrança gerada ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
