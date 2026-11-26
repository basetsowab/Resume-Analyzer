// Client for the HackerRank hiring-agent scorer, proxied by the API server under /api/hackerrank.

export interface HackerRankRoleCategory {
  key: string;
  label: string;
  max: number;
}

export interface HackerRankRole {
  name: string;
  position_title: string;
  bonus_max: number;
  categories: HackerRankRoleCategory[];
}

export interface HackerRankCategoryScore extends HackerRankRoleCategory {
  score: number;
  evidence: string;
}

export interface HackerRankResult {
  candidate_name: string;
  role: string;
  model: string;
  github_used: boolean;
  total_score: number;
  max_score: number;
  categories: HackerRankCategoryScore[];
  bonus_points: { total: number; breakdown?: string } | null;
  deductions: { total: number; reasons?: string } | null;
  key_strengths: string[];
  areas_for_improvement: string[];
}

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/hackerrank`;

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) return body.detail.map((d: { msg?: string }) => d.msg).join(", ");
  } catch {
    // fall through
  }
  return `Request failed (${res.status})`;
}

export async function fetchHackerRankRoles(): Promise<HackerRankRole[]> {
  const res = await fetch(`${API_BASE}/roles`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { roles: HackerRankRole[] };
  return data.roles;
}

export async function scoreWithHackerRank(params: {
  file: File;
  role?: string;
  includeGithub: boolean;
  githubUrl?: string;
}): Promise<HackerRankResult> {
  const form = new FormData();
  form.append("file", params.file);
  if (params.role) form.append("role", params.role);
  form.append("include_github", String(params.includeGithub));
  if (params.githubUrl) form.append("github_url", params.githubUrl);

  const res = await fetch(`${API_BASE}/score`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as HackerRankResult;
}
