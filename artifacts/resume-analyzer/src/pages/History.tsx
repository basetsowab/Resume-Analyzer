import { useListResumes } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function getScoreColor(score: number) {
  if (score >= 75) return "text-chart-1";
  if (score >= 50) return "text-chart-2";
  return "text-chart-3";
}

export function History() {
  const { data: resumes, isLoading } = useListResumes();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-mono font-bold tracking-tight mb-8">Analysis History</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full bg-card rounded-lg" />
          ))}
        </div>
      ) : resumes?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-dashed">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-mono font-bold mb-2">No history found</h2>
          <p className="text-muted-foreground text-sm">You haven't run any resume analyses yet.</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline font-mono text-sm">
            Run an analysis
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {resumes?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((resume) => (
            <Link key={resume.id} href={`/resumes/${resume.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer border border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded bg-background border">
                      <span className={`text-xl font-bold font-mono ${getScoreColor(resume.overallScore)}`}>
                        {resume.overallScore}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-lg">
                        {resume.jobTitle || "General Resume"}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1 gap-4 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(resume.createdAt), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
