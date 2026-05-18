import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, type UserRecord } from "@/lib/db";
import { getAuthSecret, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/session";

const secret = getAuthSecret();

type SessionPayload = {
  userId: number;
  exp: number;
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function createSessionValue(payload: SessionPayload) {
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionValue(value?: string | null): SessionPayload | null {
  if (!value) return null;

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as SessionPayload;
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const passwordHash = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hash, "hex");

  return storedBuffer.length === passwordHash.length && timingSafeEqual(storedBuffer, passwordHash);
}

export async function setSessionCookie(userId: number) {
  const store = await cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds;

  store.set(sessionCookieName, createSessionValue({ userId, exp: expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(sessionCookieName);
}

export async function getCurrentUser() {
  const store = await cookies();
  const session = verifySessionValue(store.get(sessionCookieName)?.value);
  if (!session) return null;

  return (
    db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(session.userId) as UserRecord | undefined
  ) ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
