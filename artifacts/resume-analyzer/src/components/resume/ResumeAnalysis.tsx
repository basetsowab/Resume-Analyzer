import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, Target } from "lucide-react";
import type { Resume } from "@workspace/api-client-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface ResumeAnalysisProps {
  resume: Resume;
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-chart-1";
  if (score >= 50) return "text-chart-2";
  return "text-chart-3";
}

function getScoreBg(score: number) {
  if (score >= 75) return "bg-chart-1/10 border-chart-1/20";
  if (score >= 50) return "bg-chart-2/10 border-chart-2/20";
  return "bg-chart-3/10 border-chart-3/20";
}

export function ResumeAnalysis({ resume }: ResumeAnalysisProps) {
  const radarData = [
    { subject: "Contact Info", A: resume.sectionScores.contactInfo, fullMark: 100 },
    { subject: "Experience", A: resume.sectionScores.workExperience, fullMark: 100 },
    { subject: "Education", A: resume.sectionScores.education, fullMark: 100 },
    { subject: "Skills", A: resume.sectionScores.skills, fullMark: 100 },
    { subject: "Formatting", A: resume.sectionScores.formatting, fullMark: 100 },
    { subject: "Impact", A: resume.sectionScores.impact, fullMark: 100 },
  ];

  return (
    <div className="space-y-6 font-mono">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`col-span-1 border ${getScoreBg(resume.overallScore)}`}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Overall Match</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className={`text-7xl font-bold tracking-tighter ${getScoreColor(resume.overallScore)}`}>
              {resume.overallScore}
            </div>
            <div className="mt-4 text-center">
              <Badge variant="outline" className="bg-background">
                {resume.jobTitle || "General Resume"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{resume.summary}</p>
          </CardContent>
        </Card>
      </div>

      {resume.jobDescription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4" /> Job Description Match
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center">
              <div className={`text-6xl font-bold tracking-tighter ${getScoreColor(resume.matchScore ?? 0)}`}>
                {resume.matchScore ?? "–"}
                <span className="text-2xl">%</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">Match</div>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-chart-1 font-bold mb-3 text-sm">
                <CheckCircle2 className="h-4 w-4" /> Matched Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {resume.matchedSkills.length ? (
                  resume.matchedSkills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">{s}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None found</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-chart-3 font-bold mb-3 text-sm">
                <AlertCircle className="h-4 w-4" /> Experience Gaps
              </h3>
              <ul className="space-y-2">
                {resume.experienceGaps.length ? (
                  resume.experienceGaps.map((g, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-chart-3 mt-0.5 opacity-50">▹</span>
                      <span>{g}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">No major gaps</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Key Findings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="flex items-center gap-2 text-chart-1 font-bold mb-4">
                <CheckCircle2 className="h-4 w-4" /> Strengths
              </h3>
              <ul className="space-y-3">
                {resume.strengths.map((s, i) => (
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
                {resume.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-chart-3 mt-0.5 opacity-50">▹</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Section Analysis</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] w-full flex items-center justify-center -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'monospace' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 list-decimal list-inside text-sm marker:text-muted-foreground ml-4">
            {resume.suggestions.map((s, i) => (
              <li key={i} className="pl-2">{s}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Keyword Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">Detected Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {resume.keywords.map((k, i) => (
                  <Badge key={i} variant="secondary" className="font-normal">{k}</Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">
                {resume.jobDescription ? "Missing From Job Description" : "Suggested Additions"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {resume.missingKeywords.map((k, i) => (
                  <Badge key={i} variant="outline" className="border-chart-3/30 text-chart-3 bg-chart-3/5 font-normal">
                    + {k}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
