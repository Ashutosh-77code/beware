import type { Risk } from "./types";

const KEYWORDS = [
  "free",
  "winner",
  "claim",
  "urgent",
  "verify account",
  "crypto",
  "guaranteed returns",
  "limited time",
];

export function flagKeywords(text: string): string[] {
  const t = text.toLowerCase();
  return KEYWORDS.filter((k) => new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`).test(t));
}

export function keywordRisk(flagged: string[]): Risk {
  if (flagged.length >= 4) return "HIGH";
  if (flagged.length >= 2) return "MEDIUM";
  return "LOW";
}
