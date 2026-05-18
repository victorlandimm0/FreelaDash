import { NextResponse } from "next/server";
import { apiError, requireApiUser, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { timeEntrySchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: Request, context: RouteContext) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return apiError("Registro inválido", 400);

  try {
    const input = timeEntrySchema.parse(await request.json());
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

    const result = db
      .prepare(
        `
        UPDATE time_entries
        SET client_id = ?, project_id = ?, entry_date = ?, minutes = ?, description = ?, billable = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `
      )
      .run(
        input.clientId,
        input.projectId ?? null,
        input.entryDate,
        input.minutes,
        input.description,
        input.billable ? 1 : 0,
        id,
        user.id
      );

    if (result.changes === 0) {
      return apiError("Registro não encontrado", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return validationError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return apiError("Registro inválido", 400);

  const result = db.prepare("DELETE FROM time_entries WHERE id = ? AND user_id = ?").run(id, user.id);

  if (result.changes === 0) {
    return apiError("Registro não encontrado", 404);
  }

  return NextResponse.json({ ok: true });
}
