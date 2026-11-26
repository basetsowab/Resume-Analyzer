import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileUp, Gauge, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HackerRankResults } from "@/components/resume/HackerRankResults";
import { fetchHackerRankRoles, scoreWithHackerRank, type HackerRankResult } from "@/lib/hackerrank";

export function HackerRank() {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<string>("");
  const [includeGithub, setIncludeGithub] = useState(true);
  const [githubUrl, setGithubUrl] = useState("");
  const [result, setResult] = useState<HackerRankResult | null>(null);

  const rolesQuery = useQuery({ queryKey: ["hackerrank-roles"], queryFn: fetchHackerRankRoles, retry: false });
  const selectedRole = role || rolesQuery.data?.[0]?.name || "";

  const scoreMutation = useMutation({
    mutationFn: scoreWithHackerRank,
    onSuccess: setResult,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setResult(null);
    scoreMutation.mutate({
      file,
      role: selectedRole || undefined,
      includeGithub,
      githubUrl: githubUrl.trim() || undefined,
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight mb-2">HackerRank Scorer</h1>
          <p className="text-muted-foreground">
            Upload a resume PDF and score it with HackerRank's open-source hiring agent rubric, optionally enriched
            with the candidate's GitHub projects.
          </p>
        </div>

        {rolesQuery.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-mono">Scoring service offline</AlertTitle>
            <AlertDescription>{(rolesQuery.error as Error).message}</AlertDescription>
          </Alert>
        )}

        {!result && !scoreMutation.isPending && (
          <form onSubmit={onSubmit} className="space-y-6 font-mono">
            <div className="space-y-2">
              <Label htmlFor="resume-pdf">Resume PDF</Label>
              <label
                htmlFor="resume-pdf"
                className="flex flex-col items-center justify-center gap-2 border border-dashed rounded-lg bg-card p-10 cursor-pointer hover:border-primary transition-colors"
              >
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm">{file ? file.name : "Click to choose a PDF"}</span>
                <span className="text-xs text-muted-foreground">Max 10 MB</span>
              </label>
              <input
                id="resume-pdf"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setRole} disabled={!rolesQuery.data?.length}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={rolesQuery.isLoading ? "Loading roles..." : "Choose a role"} />
                </SelectTrigger>
                <SelectContent>
                  {rolesQuery.data?.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <Label htmlFor="include-github">Use GitHub profile</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Looks up the GitHub link on the resume and scores the candidate's top projects.
                </p>
              </div>
              <Switch id="include-github" checked={includeGithub} onCheckedChange={setIncludeGithub} />
            </div>

            {includeGithub && (
              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub URL (optional override)</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/username"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="bg-card"
                />
              </div>
            )}

            {scoreMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Scoring failed</AlertTitle>
                <AlertDescription>{(scoreMutation.error as Error).message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={!file}>
              <Gauge className="mr-2 h-4 w-4" />
              Score Resume
            </Button>
          </form>
        )}

        {scoreMutation.isPending && (
          <div className="space-y-4 font-mono">
            <p className="text-sm text-muted-foreground">
              Extracting the resume, checking GitHub and scoring. This can take a minute or two...
            </p>
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 h-64 bg-card rounded-lg"></div>
                <div className="col-span-2 h-64 bg-card rounded-lg"></div>
              </div>
              <div className="h-64 bg-card rounded-lg"></div>
            </div>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-mono font-bold">Score Results</h2>
              <Button variant="outline" onClick={() => setResult(null)} className="font-mono">
                Score Another
              </Button>
            </div>
            <HackerRankResults result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
