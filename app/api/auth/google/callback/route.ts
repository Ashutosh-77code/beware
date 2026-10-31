import { NextRequest, NextResponse } from "next/server";
import { encodeSession, SESSION_COOKIE } from "@/lib/session";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function home(path: string) {
  return new URL(path, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const err = p.get("error");
  if (err) return NextResponse.redirect(home(`/?auth_error=${encodeURIComponent(err)}`));

  const state = p.get("state");
  const code = p.get("code");
  if (!code || !state || state !== req.cookies.get("beware_state")?.value) {
    return NextResponse.redirect(home("/?auth_error=invalid_state"));
  }

  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const tok = await r.json();
    if (!r.ok || !tok.access_token || !tok.id_token) {
      return NextResponse.redirect(home(`/?auth_error=${encodeURIComponent(tok.error_description ?? tok.error ?? "token_exchange_failed")}`));
    }
    const claims = JSON.parse(Buffer.from(String(tok.id_token).split(".")[1], "base64url").toString());
    const res = NextResponse.redirect(home("/?auth=ok"));
    res.cookies.set(
      SESSION_COOKIE,
      encodeSession({ at: tok.access_token, email: String(claims.email ?? ""), hd: claims.hd ? String(claims.hd) : null, exp: Date.now() + Number(tok.expires_in ?? 3600) * 1000 }),
      { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: Number(tok.expires_in ?? 3600), path: "/" },
    );
    res.cookies.delete("beware_state");
    return res;
  } catch (e) {
    logger.error("oauth callback failed", { message: (e as Error).message });
    return NextResponse.redirect(home("/?auth_error=callback_failed"));
  }
}
