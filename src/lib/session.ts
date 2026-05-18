export const sessionCookieName = "freeladash_session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "freeladash-dev-secret-change-me";
}
