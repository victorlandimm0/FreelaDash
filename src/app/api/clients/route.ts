import { NextResponse } from "next/server";
import { apiError, requireApiUser, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { clientSchema } from "@/lib/validations";

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const clients = db
    .prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY name ASC")
    .all(user.id);

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  try {
    const input = clientSchema.parse(await request.json());
    const result = db
      .prepare("INSERT INTO clients (user_id, name, email, hourly_rate_cents) VALUES (?, ?, ?, ?)")
      .run(user.id, input.name, input.email, input.hourlyRateCents);

    const client = db
      .prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?")
      .get(Number(result.lastInsertRowid), user.id);

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return validationError(error);
  }
}
