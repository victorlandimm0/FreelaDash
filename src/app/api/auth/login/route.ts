import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { apiError, validationError } from "@/lib/api";
import { db, type UserRecord } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(input.email) as UserRecord | undefined;

    if (!user || !verifyPassword(input.password, user.password_hash)) {
      return apiError("Email ou senha inválidos.", 401);
    }

    await setSessionCookie(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return validationError(error);
  }
}
