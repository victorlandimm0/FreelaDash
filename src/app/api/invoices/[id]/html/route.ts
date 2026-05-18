import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents, formatDate, formatMinutes } from "@/lib/format";
import { calculateInvoiceTotals } from "@/lib/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

const statusLabels = {
  draft: "Rascunho",
  sent: "Enviada",
  paid: "Paga"
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlDocument(
  freelancer: { name: string; email: string },
  invoice: InvoiceDetail,
  totals: ReturnType<typeof calculateInvoiceTotals>
) {
  const rows = totals.entries
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(formatDate(entry.entry_date))}</td>
          <td>${escapeHtml(entry.project_name ?? "Sem projeto")}</td>
          <td>${escapeHtml(entry.description)}</td>
          <td>${escapeHtml(formatMinutes(entry.minutes))}</td>
          <td>${escapeHtml(formatCents(entry.hourly_rate_cents))}</td>
          <td>${escapeHtml(formatCents(entry.amount_cents))}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cobrança ${escapeHtml(invoice.number)}</title>
  <style>
    @page { margin: 18mm; }
    * { box-sizing: border-box; }
    body { color: #111827; font-family: Arial, sans-serif; line-height: 1.45; margin: 0; }
    main { margin: 0 auto; max-width: 980px; padding: 32px; }
    header { border-bottom: 2px solid #0f766e; display: flex; justify-content: space-between; gap: 24px; padding-bottom: 20px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { color: #475569; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; }
    p { margin: 0; }
    .muted { color: #64748b; }
    .summary { display: grid; gap: 16px; grid-template-columns: repeat(3, 1fr); margin: 28px 0; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; }
    .total { color: #0f766e; font-size: 28px; font-weight: 700; }
    table { border-collapse: collapse; font-size: 14px; width: 100%; }
    th { background: #e2e8f0; color: #334155; font-size: 12px; text-align: left; text-transform: uppercase; }
    th, td { border-bottom: 1px solid #cbd5e1; padding: 12px; vertical-align: top; }
    tfoot td { font-weight: 700; }
    .actions { margin-bottom: 20px; }
    button { background: #0f766e; border: 0; border-radius: 6px; color: white; cursor: pointer; font: inherit; padding: 10px 14px; }
    @media (max-width: 720px) { main { padding: 20px; } header, .summary { display: block; } .box { margin-top: 12px; } }
    @media print { main { max-width: none; padding: 0; } .actions { display: none; } .box { break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <div class="actions"><button onclick="window.print()">Exportar PDF</button></div>
    <header>
      <div>
        <p class="muted">Nota fiscal simplificada</p>
        <h1>Cobrança ${escapeHtml(invoice.number)}</h1>
        <p class="muted">${escapeHtml(formatDate(invoice.period_start))} a ${escapeHtml(formatDate(invoice.period_end))} · ${escapeHtml(invoice.project_name ?? "Todos os projetos")}</p>
      </div>
      <div>
        <h2>Status</h2>
        <p>${escapeHtml(statusLabels[invoice.status])}</p>
        <p class="total">${escapeHtml(formatCents(invoice.total_cents))}</p>
      </div>
    </header>
    <section class="summary">
      <div class="box">
        <h2>Freelancer</h2>
        <p><strong>${escapeHtml(freelancer.name)}</strong></p>
        <p class="muted">${escapeHtml(freelancer.email)}</p>
      </div>
      <div class="box">
        <h2>Cliente</h2>
        <p><strong>${escapeHtml(invoice.client_name)}</strong></p>
        <p class="muted">${escapeHtml(invoice.client_email ?? "Sem email cadastrado")}</p>
      </div>
      <div class="box">
        <h2>Horas</h2>
        <p><strong>${escapeHtml(formatMinutes(invoice.total_minutes))}</strong></p>
      </div>
    </section>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Projeto</th>
          <th>O que fez</th>
          <th>Duração</th>
          <th>Valor/hora</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3">Total</td>
          <td>${escapeHtml(formatMinutes(totals.totalMinutes))}</td>
          <td></td>
          <td>${escapeHtml(formatCents(totals.totalCents))}</td>
        </tr>
      </tfoot>
    </table>
  </main>
</body>
</html>`;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireUser();
  const { id } = await context.params;
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

  const totals = calculateInvoiceTotals(user.id, invoice.client_id, invoice.period_start, invoice.period_end, invoice.project_id);
  const filename = `freeladash-${invoice.number}.html`;

  return new Response(htmlDocument({ name: user.name, email: user.email }, invoice, totals), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
