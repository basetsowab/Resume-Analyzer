import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Star, MinusCircle, Github } from "lucide-react";
import type { HackerRankResult } from "@/lib/hackerrank";

function pctColor(pct: number) {
  if (pct >= 75) return "text-chart-1";
  if (pct >= 50) return "text-chart-2";
  return "text-chart-3";
}

function pctBg(pct: number) {
  if (pct >= 75) return "bg-chart-1/10 border-chart-1/20";
  if (pct >= 50) return "bg-chart-2/10 border-chart-2/20";
  return "bg-chart-3/10 border-chart-3/20";
}

export function HackerRankResults({ result }: { result: HackerRankResult }) {
  const pct = result.max_score > 0 ? (result.total_score / result.max_score) * 100 : 0;

  return (
    <div className="space-y-6 font-mono">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`col-span-1 border ${pctBg(pct)}`}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">HackerRank Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className={`text-7xl font-bold tracking-tighter ${pctColor(pct)}`}>{result.total_score}</div>
            <div className="text-sm text-muted-foreground mt-1">out of {result.max_score}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="bg-background">{result.role.replace(/_/g, " ")}</Badge>
              {result.github_used && (
                <Badge variant="secondary" className="gap-1">
                  <Github className="h-3 w-3" /> GitHub used
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
              Category Scores · {result.candidate_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.categories.map((c) => {
              const cPct = c.max > 0 ? (c.score / c.max) * 100 : 0;
              return (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{c.label}</span>
                    <span className={pctColor(cPct)}>
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <Progress value={cPct} className="h-2" />
                  {c.evidence && <p className="text-xs text-muted-foreground leading-relaxed">{c.evidence}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {(result.bonus_points?.total || result.deductions?.total) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {result.bonus_points && result.bonus_points.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-chart-1 uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-4 w-4" /> Bonus +{result.bonus_points.total}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.bonus_points.breakdown}</p>
              </CardContent>
            </Card>
          )}
          {result.deductions && result.deductions.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-chart-3 uppercase tracking-wider flex items-center gap-2">
                  <MinusCircle className="h-4 w-4" /> Deductions −{result.deductions.total}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.deductions.reasons}</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Key Findings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="flex items-center gap-2 text-chart-1 font-bold mb-4">
              <CheckCircle2 className="h-4 w-4" /> Strengths
            </h3>
            <ul className="space-y-3">
              {result.key_strengths.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-chart-1 mt-0.5 opacity-50">▹</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-chart-3 font-bold mb-4">
              <AlertTriangle className="h-4 w-4" /> Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {result.areas_for_improvement.map((w, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-chart-3 mt-0.5 opacity-50">▹</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
