import { AlertCircle, AlertTriangle, Info, CheckCircle2, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SEOIssue } from "@/lib/seoAnalyzer";

interface SEOIssuesListProps {
  issues: SEOIssue[];
  recommendations: string[];
}

export function SEOIssuesList({ issues, recommendations }: SEOIssuesListProps) {
  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');
  
  const hasNoIssues = issues.length === 0;
  
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-sm font-bold text-destructive">{errors.length}</span>
          </div>
          <span className="text-sm text-muted-foreground">Errors</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-yellow-500">{warnings.length}</span>
          </div>
          <span className="text-sm text-muted-foreground">Warnings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-500">{infos.length}</span>
          </div>
          <span className="text-sm text-muted-foreground">Info</span>
        </div>
      </div>
      
      {/* Success state */}
      {hasNoIssues && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-lg text-green-500">
            Excellent SEO!
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            No critical issues found. Your content is well-optimized.
          </p>
        </motion.div>
      )}
      
      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 font-medium text-destructive">
            <AlertCircle className="w-4 h-4" />
            Critical Issues ({errors.length})
          </h4>
          <div className="space-y-2">
            {errors.map((issue, index) => (
              <motion.div
                key={`error-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{issue.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    Field: {issue.field.replace('_', ' ')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 font-medium text-yellow-500">
            <AlertTriangle className="w-4 h-4" />
            Warnings ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((issue, index) => (
              <motion.div
                key={`warning-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{issue.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    Field: {issue.field.replace('_', ' ')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Info */}
      {infos.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 font-medium text-blue-500">
            <Info className="w-4 h-4" />
            Suggestions ({infos.length})
          </h4>
          <div className="space-y-2">
            {infos.map((issue, index) => (
              <motion.div
                key={`info-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
              >
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{issue.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    Field: {issue.field.replace('_', ' ')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 font-medium text-primary">
            <Lightbulb className="w-4 h-4" />
            Recommendations
          </h4>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-primary font-bold">•</span>
                  <span>{rec}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
