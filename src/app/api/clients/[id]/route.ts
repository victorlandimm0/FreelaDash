import { NextResponse } from "next/server";
import { apiError, requireApiUser, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { clientSchema } from "@/lib/validations";

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
  if (!id) return apiError("Cliente inválido", 400);

  try {
    const input = clientSchema.parse(await request.json());
    const result = db
      .prepare(
        "UPDATE clients SET name = ?, email = ?, hourly_rate_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
      )
      .run(input.name, input.email, input.hourlyRateCents, id, user.id);

    if (result.changes === 0) {
      return apiError("Cliente não encontrado", 404);
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
  if (!id) return apiError("Cliente inválido", 400);

  const result = db.prepare("DELETE FROM clients WHERE id = ? AND user_id = ?").run(id, user.id);

  if (result.changes === 0) {
    return apiError("Cliente não encontrado", 404);
  }

  return NextResponse.json({ ok: true });
}
