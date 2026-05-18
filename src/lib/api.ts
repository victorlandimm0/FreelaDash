import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("Dados inválidos", 422, error.flatten());
  }

  return apiError("Não foi possível processar a requisição", 400);
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: apiError("Sessão expirada", 401) };
  }

  return { user, response: null };
}
