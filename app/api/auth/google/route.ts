import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

const SCOPES = "openid email profile https://www.googleapis.com/auth/admin.reports.audit.readonly";

export function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirect) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI is not set", source: "config" }, { status: 500 });
  }
  const state = randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: SCOPES,
    state,
    access_type: "online",
    prompt: "consent",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set("beware_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return res;
}
