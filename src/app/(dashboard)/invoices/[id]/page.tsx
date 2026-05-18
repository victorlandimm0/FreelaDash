import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { db } from "@/lib/db";
import { formatCents, formatDate, formatMinutes } from "@/lib/format";
import { calculateInvoiceTotals } from "@/lib/invoices";
import { requireUser } from "@/lib/auth";

type InvoiceDetail = {
  id: number;
  number: string;
  client_id: number;
  project_id: number | null;
  client_name: string;
  client_email: string | null;
  project_name: string | null;
  period_start: string;
  period_end: string;
  total_minutes: number;
  total_cents: number;
  status: "draft" | "sent" | "paid";
};

type PageProps = {
  params: Promise<{ id: string }>;
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

export default async function InvoiceDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = db
    .prepare(
      `
      SELECT
        invoices.*,
        clients.name AS client_name,
        clients.email AS client_email,
        projects.name AS project_name
      FROM invoices
      JOIN clients ON clients.id = invoices.client_id
      LEFT JOIN projects ON projects.id = invoices.project_id
      WHERE invoices.id = ? AND invoices.user_id = ?
    `
    )
    .get(Number(id), user.id) as InvoiceDetail | undefined;

  if (!invoice) notFound();

  const totals = calculateInvoiceTotals(
    user.id,
    invoice.client_id,
    invoice.period_start,
    invoice.period_end,
    invoice.project_id
  );

  return (
    <>
      <div className="no-print mb-4">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para cobranças
        </Link>
      </div>

      <PageHeader
        title={`Cobrança ${invoice.number}`}
        description={`${invoice.client_name} · ${formatDate(invoice.period_start)} a ${formatDate(invoice.period_end)}`}
        action={<PrintButton invoiceId={invoice.id} status={invoice.status} />}
      />

      <Card className="overflow-hidden bg-white print:border-0 print:shadow-none">
        <CardContent className="space-y-8 p-6 print:p-0">
          <header className="grid gap-6 border-b pb-6 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="text-sm font-medium uppercase text-primary">Nota fiscal simplificada</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">{invoice.number}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDate(invoice.period_start)} a {formatDate(invoice.period_end)}
                {" · "}
                {invoice.project_name ?? "Todos os projetos"}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2">
                <Badge tone={statusTones[invoice.status]}>{statusLabels[invoice.status]}</Badge>
              </div>
              <p className="mt-4 text-3xl font-semibold text-primary">{formatCents(invoice.total_cents)}</p>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-muted/25 p-5">
              <p className="text-xs font-medium uppercase text-muted-foreground">Freelancer</p>
              <p className="mt-2 text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="rounded-md border bg-muted/25 p-5">
              <p className="text-xs font-medium uppercase text-muted-foreground">Cliente</p>
              <p className="mt-2 text-lg font-semibold">{invoice.client_name}</p>
              <p className="text-sm text-muted-foreground">{invoice.client_email ?? "Sem email cadastrado"}</p>
            </div>
          </section>

          <section>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Projeto</th>
                    <th className="px-4 py-3 font-medium">O que fez</th>
                    <th className="px-4 py-3 font-medium">Duração</th>
                    <th className="px-4 py-3 font-medium">Valor/hora</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{formatDate(entry.entry_date)}</td>
                      <td className="px-4 py-3">{entry.project_name ?? "Sem projeto"}</td>
                      <td className="max-w-md px-4 py-3">{entry.description}</td>
                      <td className="px-4 py-3">{formatMinutes(entry.minutes)}</td>
                      <td className="px-4 py-3">{formatCents(entry.hourly_rate_cents)}</td>
                      <td className="px-4 py-3 font-medium">{formatCents(entry.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t text-base font-semibold">
                    <td className="px-4 py-5" colSpan={3}>Total</td>
                    <td className="px-4 py-5">{formatMinutes(totals.totalMinutes)}</td>
                    <td className="px-4 py-5" />
                    <td className="px-4 py-5 text-primary">{formatCents(totals.totalCents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </CardContent>
      </Card>
    </>
  );
}
