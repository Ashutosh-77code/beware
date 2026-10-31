import { NextRequest } from "next/server";
import { guarded } from "@/lib/guard";
import { SourceError, request, fail, requireEnv } from "@/lib/http";
import { flagKeywords, keywordRisk } from "@/lib/keywords";
import type { ImageResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

export function POST(req: NextRequest) {
  return guarded(req, "scan-image", { perSec: 1, perDay: 50 }, async (): Promise<ImageResult> => {
    const apiKey = requireEnv("OPTIIC_API_KEY");
    const form = await req.formData().catch(() => null);
    const file = form?.get("image");
    if (!file || typeof file === "string") throw new SourceError("input", "Upload an image file in the 'image' field", 400);
    const blob = file as Blob & { name?: string };
    if (!blob.type.startsWith("image/")) throw new SourceError("input", "File must be an image", 400);
    if (blob.size > MAX_BYTES) throw new SourceError("input", "Image must be 5 MB or smaller", 400);

    const out = new FormData();
    out.append("apiKey", apiKey);
    out.append("mode", "ocr");
    out.append("image", blob, blob.name ?? "upload");

    const endpoint = process.env.OPTIIC_ENDPOINT ?? "https://api.optiic.dev/process";
    const r = await request("Optiic", endpoint, { method: "POST", body: out }, 30000);
    if (!r.ok) fail("Optiic", r);
    if (!r.data || typeof r.data.text !== "string") {
      throw new SourceError("Optiic", `Unexpected response: ${r.text.slice(0, 200)}`);
    }

    const text = r.data.text.trim();
    const keywords = flagKeywords(text);
    const risk = keywordRisk(keywords);
    const explanation = !text
      ? "No text could be extracted from this image."
      : keywords.length
        ? `The image text contains scam-style language: ${keywords.join(", ")}.`
        : "No scam-style language found in the extracted text.";
    return { textPreview: text.slice(0, 600), keywords, risk, explanation };
  });
}
