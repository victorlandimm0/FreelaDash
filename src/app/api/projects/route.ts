import { NextResponse } from "next/server";
import { apiError, requireApiUser, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { projectSchema } from "@/lib/validations";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const projects = db
    .prepare(
      `
      SELECT projects.*, clients.name AS client_name
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.user_id = ?
      ORDER BY projects.status ASC, projects.name ASC
    `
    )
    .all(user.id);

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  try {
    const input = projectSchema.parse(await request.json());
    const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(input.clientId, user.id);

    if (!client) {
      return apiError("Cliente não encontrado", 404);
    }

    const hourlyRate = input.hourlyRateCents && input.hourlyRateCents > 0 ? input.hourlyRateCents : null;
    const result = db
      .prepare(
        "INSERT INTO projects (user_id, client_id, name, status, hourly_rate_cents) VALUES (?, ?, ?, ?, ?)"
      )
      .run(user.id, input.clientId, input.name, input.status, hourlyRate);

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
      .get(Number(result.lastInsertRowid), user.id);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return validationError(error);
  }
}
