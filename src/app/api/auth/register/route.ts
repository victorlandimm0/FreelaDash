import { NextResponse } from "next/server";
import { setSessionCookie, hashPassword } from "@/lib/auth";
import { apiError, validationError } from "@/lib/api";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(input.email);

    if (existing) {
      return apiError("Já existe uma conta com este email.", 409);
    }

    const result = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(input.name, input.email, hashPassword(input.password));

    await setSessionCookie(Number(result.lastInsertRowid));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return validationError(error);
  }
}
