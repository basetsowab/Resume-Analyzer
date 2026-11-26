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

// ---------------------------------------------------------------------------
// ATS template grader (rule-based, no API key needed)
// ---------------------------------------------------------------------------

export interface AtsCheck {
  key: string;
  group: string;
  label: string;
  points: number;
  max: number;
  passed: boolean;
  detail: string;
  fix: string | null;
}

export interface AtsGrade {
  score: number;
  grade: string;
  groups: { name: string; points: number; max: number }[];
  checks: AtsCheck[];
  top_fixes: string[];
  bullets: { total: number; needs_work: { text: string; issues: string[] }[] };
  stats: { words: number; pages: number | null; bullets: number };
}

export async function gradeAts(input: { file?: File; text?: string }): Promise<AtsGrade> {
  const form = new FormData();
  if (input.file) form.append("file", input.file);
  if (input.text) form.append("text", input.text);
  const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/ats/grade`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AtsGrade;
}

/** Letter grade on the same scale the ATS grader uses. */
export function letterGrade(percent: number): string {
  const scale: [number, string][] = [
    [93, "A"], [90, "A-"], [87, "B+"], [83, "B"], [80, "B-"],
    [77, "C+"], [73, "C"], [70, "C-"], [67, "D+"], [60, "D"],
  ];
  return scale.find(([cutoff]) => percent >= cutoff)?.[1] ?? "F";
}
