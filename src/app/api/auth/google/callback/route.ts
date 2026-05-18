import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { db, type UserRecord } from "@/lib/db";

type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", url.origin));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=google-auth-failed", url.origin));
  }

  const tokenBody = (await tokenResponse.json()) as { access_token?: string };

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` }
  });

  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=google-auth-failed", url.origin));
  }

  const profile = (await profileResponse.json()) as GoogleProfile;
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(profile.email) as UserRecord | undefined;

  let userId = existing?.id;

  if (existing) {
    db.prepare(
      "UPDATE users SET google_id = COALESCE(google_id, ?), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(profile.sub, profile.picture ?? null, existing.id);
  } else {
    const result = db
      .prepare("INSERT INTO users (name, email, google_id, avatar_url) VALUES (?, ?, ?, ?)")
      .run(profile.name ?? profile.email.split("@")[0], profile.email.toLowerCase(), profile.sub, profile.picture ?? null);
    userId = Number(result.lastInsertRowid);
  }

  await setSessionCookie(Number(userId));

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
