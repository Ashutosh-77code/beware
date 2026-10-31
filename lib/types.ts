export type ApiError = { error: string; source: string };
export type Risk = "LOW" | "MEDIUM" | "HIGH";
export type SourceNote = { source: string; error: string };

export type EmailResult = { email: string; breaches: string[]; count: number; subScore: number };

export type UrlSource = { name: string; verdict: string; malicious: boolean | null; error?: string };
export type UrlResult = {
  url: string;
  host: string;
  risk: Risk;
  sources: UrlSource[];
  keywords: string[];
  pageError?: string;
  explanation: string;
};

export type ImageResult = { textPreview: string; keywords: string[]; risk: Risk; explanation: string };

export type AppRow = { appName: string; clientType: string; scopes: string[]; lastAccess: string; highRisk: boolean };
export type AuditResult = {
  signedIn: boolean;
  workspace: boolean;
  email?: string;
  fallbackUrl?: string;
  apps: AppRow[];
};

export type AliasResult =
  | { blocked: true; message: string }
  | { blocked: false; alias: string; used: number | null; limit: number };

export type IpResult = {
  ip: string;
  risk: Risk;
  ports: number[];
  hostnames: string[];
  tags: string[];
  cves: string[];
  abuseScore: number | null;
  totalReports: number | null;
  noise: boolean | null;
  classification: string | null;
  errors: SourceNote[];
};

export type MalwareResult = {
  kind: "url" | "hash";
  target: string;
  detections: number;
  total: number;
  families: string[];
  firstSeen: string | null;
  summary: string;
  errors: SourceNote[];
};

export type CveRow = { id: string; score: number | null; summary: string };
export type VulnResult = {
  domain: string;
  subdomains: string[];
  cves: CveRow[];
  maxScore: number;
  osv: { id: string; summary: string }[];
  errors: SourceNote[];
};
