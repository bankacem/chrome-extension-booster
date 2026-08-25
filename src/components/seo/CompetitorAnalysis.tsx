import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Users, FileText, Link2, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompetitorBenchmark {
  metric: string;
  current: number;
  ideal: number;
  unit: string;
  icon: React.ReactNode;
}

interface CompetitorAnalysisProps {
  wordCount: number;
  headingsCount: { h1: number; h2: number; h3: number };
  imagesCount: number;
  internalLinks: number;
  externalLinks: number;
}

export function CompetitorAnalysis({
  wordCount,
  headingsCount,
  imagesCount,
  internalLinks,
  externalLinks
}: CompetitorAnalysisProps) {
  // Industry benchmarks for Chrome extension articles
  const benchmarks: CompetitorBenchmark[] = [
    {
      metric: "Word Count",
      current: wordCount,
      ideal: 1500,
      unit: "words",
      icon: <FileText className="w-4 h-4" />
    },
    {
      metric: "H2 Headings",
      current: headingsCount.h2,
      ideal: 5,
      unit: "headings",
      icon: <FileText className="w-4 h-4" />
    },
    {
      metric: "H3 Headings",
      current: headingsCount.h3,
      ideal: 8,
      unit: "headings",
      icon: <FileText className="w-4 h-4" />
    },
    {
      metric: "Images",
      current: imagesCount,
      ideal: 4,
      unit: "images",
      icon: <Image className="w-4 h-4" />
    },
    {
      metric: "Internal Links",
      current: internalLinks,
      ideal: 5,
      unit: "links",
      icon: <Link2 className="w-4 h-4" />
    },
    {
      metric: "External Links",
      current: externalLinks,
      ideal: 3,
      unit: "links",
      icon: <Link2 className="w-4 h-4" />
    }
  ];

  const getStatus = (current: number, ideal: number) => {
    const ratio = current / ideal;
    if (ratio >= 0.9) return { status: 'good', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' };
    if (ratio >= 0.6) return { status: 'warning', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    return { status: 'poor', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' };
  };

  const getIcon = (current: number, ideal: number) => {
    const ratio = current / ideal;
    if (ratio >= 0.9) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (ratio >= 0.6) return <Minus className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-destructive" />;
  };

  const overallScore = Math.round(
    benchmarks.reduce((acc, b) => acc + Math.min(1, b.current / b.ideal), 0) / benchmarks.length * 100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Competitor Analysis</h3>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-sm font-medium",
          overallScore >= 80 ? "bg-green-500/20 text-green-500" :
          overallScore >= 60 ? "bg-yellow-500/20 text-yellow-500" :
          "bg-destructive/20 text-destructive"
        )}>
          {overallScore}% Match
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Compare your content against top-ranking articles for Chrome extension keywords
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {benchmarks.map((benchmark, index) => {
          const status = getStatus(benchmark.current, benchmark.ideal);
          const percentage = Math.min(100, Math.round((benchmark.current / benchmark.ideal) * 100));
          
          return (
            <motion.div
              key={benchmark.metric}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-xl border",
                status.bg,
                status.border
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {benchmark.icon}
                  <span className="text-sm font-medium">{benchmark.metric}</span>
                </div>
                {getIcon(benchmark.current, benchmark.ideal)}
              </div>
              
              <div className="flex items-baseline gap-1 mb-2">
                <span className={cn("text-2xl font-bold", status.color)}>
                  {benchmark.current}
                </span>
                <span className="text-muted-foreground text-sm">
                  / {benchmark.ideal} {benchmark.unit}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    status.status === 'good' ? "bg-green-500" :
                    status.status === 'warning' ? "bg-yellow-500" :
                    "bg-destructive"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
