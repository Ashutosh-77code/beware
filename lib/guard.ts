import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIp } from "./rateLimit";
import { SourceError, J } from "./http";
import { logger } from "./logger";

type Limits = { perSec: number; perDay: number };

export async function guarded<T>(req: NextRequest, route: string, limits: Limits, fn: (ip: string) => Promise<T>) {
  const ip = clientIp(req);
  const limited = checkRate(route, ip, limits);
  if (limited) return NextResponse.json({ error: limited, source: "rate-limit" }, { status: 429 });
  try {
    return NextResponse.json(await fn(ip));
  } catch (e) {
    if (e instanceof SourceError) return NextResponse.json({ error: e.message, source: e.source }, { status: e.status });
    logger.error("unhandled", { route, message: (e as Error).message });
    return NextResponse.json({ error: "Internal error", source: "server" }, { status: 500 });
  }
}

export async function readBody(req: NextRequest): Promise<J> {
  try {
    return (await req.json()) as J;
  } catch {
    throw new SourceError("input", "Request body must be valid JSON", 400);
  }
}
