import { NextResponse } from "next/server";
import { apiError, requireApiUser, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { projectSchema } from "@/lib/validations";

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
  if (!id) return apiError("Projeto inválido", 400);

  try {
    const input = projectSchema.parse(await request.json());
    const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(input.clientId, user.id);

    if (!client) {
      return apiError("Cliente não encontrado", 404);
    }

    const hourlyRate = input.hourlyRateCents && input.hourlyRateCents > 0 ? input.hourlyRateCents : null;
    const result = db
      .prepare(
        "UPDATE projects SET client_id = ?, name = ?, status = ?, hourly_rate_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
      )
      .run(input.clientId, input.name, input.status, hourlyRate, id, user.id);

    if (result.changes === 0) {
      return apiError("Projeto não encontrado", 404);
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
  if (!id) return apiError("Projeto inválido", 400);

  const result = db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, user.id);

  if (result.changes === 0) {
    return apiError("Projeto não encontrado", 404);
  }

  return NextResponse.json({ ok: true });
}
