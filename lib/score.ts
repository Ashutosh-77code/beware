import type { AppRow, Risk } from "./types";

export function breachPenalty(count: number): number {
  return Math.min(50, count * 5);
}

export function oauthPenalty(apps: AppRow[]): number {
  const high = apps.filter((a) => a.highRisk).length;
  return Math.min(25, high * 10 + (apps.length - high));
}

export function scamPenalty(risks: (Risk | undefined)[]): number {
  const weights: Record<Risk, number> = { HIGH: 25, MEDIUM: 12, LOW: 0 };
  return Math.max(0, ...risks.map((r) => (r ? weights[r] : 0)));
}

export function privacyScore(input: { breachCount: number; apps: AppRow[]; scamRisks: (Risk | undefined)[] }): number {
  const total = breachPenalty(input.breachCount) + oauthPenalty(input.apps) + scamPenalty(input.scamRisks);
  return Math.max(0, Math.min(100, 100 - total));
}
