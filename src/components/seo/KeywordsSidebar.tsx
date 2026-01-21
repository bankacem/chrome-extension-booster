import { Check, X, AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NLPKeyword {
  keyword: string;
  found: boolean;
  importance: 'high' | 'medium' | 'low';
}

interface KeywordsSidebarProps {
  keywords: NLPKeyword[];
  targetKeyword?: string;
}

export function KeywordsSidebar({ keywords, targetKeyword }: KeywordsSidebarProps) {
  const foundCount = keywords.filter(k => k.found).length;
  const totalCount = keywords.length;
  const percentage = Math.round((foundCount / totalCount) * 100);
  
  const getImportanceColor = (importance: string, found: boolean) => {
    if (!found) {
      return importance === 'high' ? 'text-destructive' : 'text-muted-foreground';
    }
    return 'text-green-500';
  };
  
  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-destructive/20 text-destructive rounded">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-500 rounded">
            MED
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded">
            LOW
          </span>
        );
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-lg mb-2">NLP Keywords</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {foundCount}/{totalCount}
          </span>
        </div>
      </div>
      
      {/* Target Keyword */}
      {targetKeyword && (
        <div className="p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Target:</span>
            <span className="font-medium text-primary">{targetKeyword}</span>
          </div>
        </div>
      )}
      
      {/* Keywords List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {keywords.map((keyword, index) => (
            <motion.div
              key={keyword.keyword}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg transition-colors",
                keyword.found 
                  ? "bg-green-500/10 hover:bg-green-500/15" 
                  : keyword.importance === 'high'
                    ? "bg-destructive/5 hover:bg-destructive/10"
                    : "hover:bg-muted/50"
              )}
            >
              {/* Status Icon */}
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                keyword.found ? "bg-green-500/20" : "bg-muted"
              )}>
                {keyword.found ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <X className={cn(
                    "w-3 h-3",
                    keyword.importance === 'high' ? "text-destructive" : "text-muted-foreground"
                  )} />
                )}
              </div>
              
              {/* Keyword */}
              <span className={cn(
                "flex-1 text-sm truncate",
                getImportanceColor(keyword.importance, keyword.found)
              )}>
                {keyword.keyword}
              </span>
              
              {/* Importance Badge */}
              {getImportanceBadge(keyword.importance)}
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Info Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <p>
            Include high-priority keywords for better search rankings. 
            Medium and low priority keywords add context.
          </p>
        </div>
      </div>
    </div>
  );
}
