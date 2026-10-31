import type { NextRequest } from "next/server";

export type Session = { at: string; email: string; hd: string | null; exp: number };
export const SESSION_COOKIE = "beware_g";

export function encodeSession(s: Session): string {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}

export function readSession(req: NextRequest): Session | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString()) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}
