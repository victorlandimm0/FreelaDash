import { NextResponse } from "next/server";
import { apiError, requireApiUser, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { timeEntrySchema } from "@/lib/validations";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const entries = db
    .prepare(
      `
      SELECT
        time_entries.*,
        clients.name AS client_name,
        projects.name AS project_name
      FROM time_entries
      JOIN clients ON clients.id = time_entries.client_id
      LEFT JOIN projects ON projects.id = time_entries.project_id
      WHERE time_entries.user_id = ?
      ORDER BY time_entries.entry_date DESC, time_entries.id DESC
      LIMIT 100
    `
    )
    .all(user.id);

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

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
        INSERT INTO time_entries
          (user_id, client_id, project_id, entry_date, minutes, description, billable)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        user.id,
        input.clientId,
        input.projectId ?? null,
        input.entryDate,
        input.minutes,
        input.description,
        input.billable ? 1 : 0
      );

    const entry = db
      .prepare("SELECT * FROM time_entries WHERE id = ? AND user_id = ?")
      .get(Number(result.lastInsertRowid), user.id);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return validationError(error);
  }
}
