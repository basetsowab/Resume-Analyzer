import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, FileUp, GraduationCap, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gradeAts, type AtsGrade as AtsGradeResult } from "@/lib/hackerrank";

const TEMPLATE_URL = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/templates/resume-template.docx`;

export function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-chart-1";
  if (grade.startsWith("B")) return "text-chart-2";
  if (grade.startsWith("C")) return "text-chart-4";
  return "text-chart-3";
}

function gradeBg(grade: string) {
  if (grade.startsWith("A")) return "bg-chart-1/10 border-chart-1/20";
  if (grade.startsWith("B")) return "bg-chart-2/10 border-chart-2/20";
  return "bg-chart-3/10 border-chart-3/20";
}

function Results({ result }: { result: AtsGradeResult }) {
  const groups = Array.from(new Set(result.checks.map((c) => c.group)));
  return (
    <div className="space-y-6 font-mono">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`col-span-1 border ${gradeBg(result.grade)}`}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">ATS Grade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className={`text-8xl font-bold tracking-tighter ${gradeColor(result.grade)}`}>{result.grade}</div>
            <div className="text-sm text-muted-foreground mt-2">{result.score} / 100</div>
            <div className="mt-4 flex gap-2 flex-wrap justify-center text-xs">
              <Badge variant="outline">{result.stats.words} words</Badge>
              <Badge variant="outline">{result.stats.bullets} bullets</Badge>
              {result.stats.pages != null && (
                <Badge variant="outline">
                  {result.stats.pages} page{result.stats.pages === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Score by Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.groups.map((g) => {
              const pct = g.max ? (g.points / g.max) * 100 : 0;
              return (
                <div key={g.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">
                      {g.points}/{g.max}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {result.top_fixes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Top Fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 list-decimal list-inside text-sm marker:text-muted-foreground ml-2">
              {result.top_fixes.map((f, i) => (
                <li key={i} className="pl-2">{f}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Template Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">{group}</h3>
              <ul className="space-y-3">
                {result.checks
                  .filter((c) => c.group === group)
                  .map((c) => (
                    <li key={c.key} className="flex items-start gap-3 text-sm">
                      {c.passed ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-chart-1 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 mt-0.5 text-chart-3 shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between gap-4">
                          <span>{c.label}</span>
                          <span className="text-muted-foreground shrink-0">
                            {c.points}/{c.max}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {result.bullets.needs_work.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
              Bullets to Improve ({result.bullets.needs_work.length} of {result.bullets.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {result.bullets.needs_work.map((b, i) => (
                <li key={i} className="text-sm">
                  <p className="mb-1.5">▹ {b.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {b.issues.map((issue) => (
                      <Badge key={issue} variant="outline" className="border-chart-3/30 text-chart-3 bg-chart-3/5 font-normal">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AtsGrade() {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AtsGradeResult | null>(null);

  const mutation = useMutation({ mutationFn: gradeAts, onSuccess: setResult });
  const canSubmit = mode === "file" ? !!file : text.trim().length > 50;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    mutation.mutate(mode === "file" && file ? { file } : { text });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-mono font-bold tracking-tight mb-2">ATS Resume Grade</h1>
            <p className="text-muted-foreground">
              Grade a resume A–F against the ATS resume template: sections, contact line, action-verb bullets,
              quantified results, date format and one-page length.
            </p>
          </div>
          <Button variant="outline" asChild className="font-mono shrink-0">
            <a href={TEMPLATE_URL} download>
              <Download className="mr-2 h-4 w-4" /> Resume template
            </a>
          </Button>
        </div>

        {!result && !mutation.isPending && (
          <form onSubmit={onSubmit} className="space-y-6 font-mono">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "file" | "text")}>
              <TabsList>
                <TabsTrigger value="file">Upload file</TabsTrigger>
                <TabsTrigger value="text">Paste text</TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="pt-4">
                <label
                  htmlFor="ats-file"
                  className="flex flex-col items-center justify-center gap-2 border border-dashed rounded-lg bg-card p-10 cursor-pointer hover:border-primary transition-colors"
                >
                  <FileUp className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm">{file ? file.name : "Click to choose a PDF or Word (.docx) file"}</span>
                  <span className="text-xs text-muted-foreground">Max 10 MB</span>
                </label>
                <input
                  id="ats-file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </TabsContent>
              <TabsContent value="text" className="pt-4">
                <Textarea
                  placeholder="Paste your resume text here. Keep one item per line and start bullets with •"
                  className="min-h-[300px] text-sm bg-card resize-y"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </TabsContent>
            </Tabs>

            {mutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Grading failed</AlertTitle>
                <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              <GraduationCap className="mr-2 h-4 w-4" />
              Grade Resume
            </Button>
          </form>
        )}

        {mutation.isPending && <div className="h-64 bg-card rounded-lg animate-pulse" />}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-mono font-bold">Grade Report</h2>
              <Button variant="outline" onClick={() => setResult(null)} className="font-mono">
                Grade Another
              </Button>
            </div>
            <Results result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
