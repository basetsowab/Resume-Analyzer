import { Link } from "wouter";
import { LineChart, History, Gauge, GraduationCap } from "lucide-react";

export function Navbar() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary font-mono font-bold text-lg">
          <LineChart className="h-5 w-5" />
          <span className="max-[380px]:hidden">ResumeTerminal</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/ats-grade"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">ATS Grade</span>
          </Link>
          <Link
            href="/hackerrank"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">HackerRank Score</span>
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
