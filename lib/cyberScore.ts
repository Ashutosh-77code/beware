export type CyberInput = {
  abuseScore: number | null;
  malwareDetections: number | null;
  cveCount: number | null;
  cveMaxScore: number | null;
};

export function cyberScore(i: CyberInput): number {
  const abuse = Math.min(100, Math.max(0, i.abuseScore ?? 0));
  const malware = Math.min(100, (i.malwareDetections ?? 0) * 8);
  const cve = Math.min(100, (i.cveMaxScore ?? 0) * 7 + Math.min(i.cveCount ?? 0, 10) * 3);
  return Math.round(abuse * 0.4 + malware * 0.4 + cve * 0.2);
}
