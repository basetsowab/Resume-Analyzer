import { useGetResume, getGetResumeQueryKey, useDeleteResume, getListResumesQueryKey, getGetResumeStatsQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { ResumeAnalysis } from "@/components/resume/ResumeAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export function ResumeDetails() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: resume, isLoading, isError } = useGetResume(id, {
    query: {
      enabled: !!id,
      queryKey: getGetResumeQueryKey(id),
    }
  });

  const deleteMutation = useDeleteResume({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResumeStatsQueryKey() });
        setLocation("/history");
      }
    }
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this analysis?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-8 w-32 bg-card rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="col-span-1 h-64 bg-card rounded-lg" />
            <Skeleton className="col-span-2 h-64 bg-card rounded-lg" />
          </div>
          <Skeleton className="h-[400px] bg-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !resume) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-mono font-bold mb-4">Analysis Not Found</h2>
        <p className="text-muted-foreground mb-8">The requested resume analysis could not be loaded.</p>
        <Link href="/history">
          <Button variant="outline" className="font-mono">Return to History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <Link href="/history">
          <Button variant="ghost" size="sm" className="font-mono -ml-3">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to History
          </Button>
        </Link>
        <Button 
          variant="destructive" 
          size="sm" 
          className="font-mono"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete Record
        </Button>
      </div>

      <ResumeAnalysis resume={resume} />
    </div>
  );
}
