import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAnalyzeResume, useGetResumeStats, useListResumes } from "@workspace/api-client-react";
import { ResumeAnalysis } from "@/components/resume/ResumeAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getListResumesQueryKey, getGetResumeStatsQueryKey } from "@workspace/api-client-react";
import type { Resume } from "@workspace/api-client-react/src/generated/api.schemas";

const formSchema = z.object({
  content: z.string().min(100, "Resume must be at least 100 characters to provide meaningful analysis."),
  jobTitle: z.string().optional(),
});

export function Home() {
  const [analyzedResume, setAnalyzedResume] = useState<Resume | null>(null);
  const queryClient = useQueryClient();

  const { data: stats } = useGetResumeStats();
  
  const analyzeMutation = useAnalyzeResume({
    mutation: {
      onSuccess: (data) => {
        setAnalyzedResume(data);
        queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResumeStatsQueryKey() });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      jobTitle: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setAnalyzedResume(null);
    analyzeMutation.mutate({ data: values });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-mono font-bold tracking-tight mb-2">Initialize Analysis</h1>
          <p className="text-muted-foreground">
            Paste your resume content below. For context-aware scoring, provide the target job title.
          </p>
        </div>

        {stats && stats.totalAnalyzed > 0 && (
          <div className="bg-secondary/50 rounded-lg p-4 border border-secondary text-sm font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">System Status:</span>
              <span className="text-primary font-bold">ONLINE</span>
            </div>
            <div className="flex gap-6">
              <div>
                <span className="text-muted-foreground mr-2">Analyzed:</span>
                <span className="text-foreground">{stats.totalAnalyzed}</span>
              </div>
              <div>
                <span className="text-muted-foreground mr-2">Avg Score:</span>
                <span className="text-chart-2">{Math.round(stats.averageScore)}</span>
              </div>
            </div>
          </div>
        )}

        {!analyzedResume && !analyzeMutation.isPending && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono">Target Job Title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Frontend Engineer" {...field} className="font-mono bg-card" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono">Resume Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste your raw resume text here..." 
                        className="min-h-[300px] font-mono text-sm bg-card resize-y"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full font-mono" disabled={analyzeMutation.isPending}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                Run Analysis Sequence
              </Button>
            </form>
          </Form>
        )}

        {analyzeMutation.isPending && (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 w-64 bg-card rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 h-64 bg-card rounded-lg"></div>
              <div className="col-span-2 h-64 bg-card rounded-lg"></div>
            </div>
            <div className="h-[400px] bg-card rounded-lg"></div>
          </div>
        )}

        {analyzedResume && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-mono font-bold">Analysis Results</h2>
              <Button variant="outline" onClick={() => setAnalyzedResume(null)} className="font-mono">
                Analyze Another
              </Button>
            </div>
            <ResumeAnalysis resume={analyzedResume} />
          </div>
        )}
      </div>
    </div>
  );
}
