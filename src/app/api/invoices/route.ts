import { NextResponse } from "next/server";
import { apiError, requireApiUser, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { calculateInvoiceTotals, invoiceNumber } from "@/lib/invoices";
import { invoiceCreateSchema } from "@/lib/validations";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const invoices = db
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
      WHERE invoices.user_id = ?
      ORDER BY invoices.created_at DESC, invoices.id DESC
    `
    )
    .all(user.id);

  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  try {
    const input = invoiceCreateSchema.parse(await request.json());
    const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(input.clientId, user.id);

    if (!client) {
      return apiError("Cliente não encontrado", 404);
    }

    if (input.projectId) {
      const project = db
        .prepare("SELECT id FROM projects WHERE id = ? AND client_id = ? AND user_id = ?")
        .get(input.projectId, input.clientId, user.id);

      if (!project) {
        return apiError("Projeto não encontrado para este cliente", 404);
      }
    }

    const totals = calculateInvoiceTotals(
      user.id,
      input.clientId,
      input.periodStart,
      input.periodEnd,
      input.projectId ?? null
    );

    if (totals.totalMinutes === 0) {
      return apiError("Nenhuma hora faturável encontrada nesse período.", 422);
    }

    const result = db
      .prepare(
        `
        INSERT INTO invoices
          (user_id, client_id, project_id, number, period_start, period_end, total_minutes, total_cents)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        user.id,
        input.clientId,
        input.projectId ?? null,
        invoiceNumber(input.clientId, input.periodStart),
        input.periodStart,
        input.periodEnd,
        totals.totalMinutes,
        totals.totalCents
      );

    return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (error) {
    return validationError(error);
  }
}
