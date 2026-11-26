import { Link } from "wouter";
import { LineChart, History } from "lucide-react";

export function Navbar() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary font-mono font-bold text-lg">
          <LineChart className="h-5 w-5" />
          <span>ResumeTerminal</span>
        </Link>
        <nav>
          <Link
            href="/history"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
