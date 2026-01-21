import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIOptimizeButtonProps {
  articleId: string;
  content: string;
  title: string;
  metaDescription: string | null;
  targetKeyword: string;
  missingKeywords: string[];
  issues: { type: string; message: string; field: string }[];
  currentKeywordDensity: number;
  wordCount: number;
  onOptimized: () => void;
}

export function AIOptimizeButton({
  articleId,
  content,
  title,
  metaDescription,
  targetKeyword,
  missingKeywords,
  issues,
  currentKeywordDensity,
  wordCount,
  onOptimized
}: AIOptimizeButtonProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [optimizedData, setOptimizedData] = useState<{
    optimizedContent: string;
    optimizedTitle: string;
    optimizedMetaDescription: string;
    changes: string[];
  } | null>(null);
  const { toast } = useToast();

  const handleOptimize = async () => {
    setIsOptimizing(true);

    try {
      const { data, error } = await supabase.functions.invoke('seo-optimizer', {
        body: {
          content,
          title,
          metaDescription,
          targetKeyword,
          missingKeywords,
          issues,
          currentKeywordDensity,
          wordCount
        }
      });

      if (error) {
        // Check for specific error codes
        if (error.message?.includes('402') || error.message?.includes('payment')) {
          throw new Error('رصيد AI نفذ. يرجى إضافة رصيد في Settings → Workspace → Usage');
        }
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          throw new Error('تم تجاوز حد الطلبات. يرجى المحاولة بعد دقيقة');
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('credit') || data.error.includes('402')) {
          throw new Error('رصيد AI نفذ. يرجى إضافة رصيد في Settings → Workspace → Usage');
        }
        if (data.error.includes('rate') || data.error.includes('429')) {
          throw new Error('تم تجاوز حد الطلبات. يرجى المحاولة بعد دقيقة');
        }
        throw new Error(data.error);
      }

      setOptimizedData(data);
      setShowPreview(true);

    } catch (error) {
      console.error("Optimization error:", error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Could not optimize content",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApply = async () => {
    if (!optimizedData) return;

    try {
      const { error } = await supabase
        .from('articles')
        .update({
          content: optimizedData.optimizedContent,
          title: optimizedData.optimizedTitle,
          meta_description: optimizedData.optimizedMetaDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "✨ Article Optimized!",
        description: "Your content has been updated with SEO improvements"
      });

      setShowPreview(false);
      setOptimizedData(null);
      onOptimized();

    } catch (error) {
      console.error("Apply error:", error);
      toast({
        title: "Update Failed",
        description: "Could not save optimized content",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Button
        onClick={handleOptimize}
        disabled={isOptimizing}
        className="relative overflow-hidden bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer hover:opacity-90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Optimizing with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Magic Fix
          </>
        )}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Optimization Preview
            </DialogTitle>
            <DialogDescription>
              Review the changes before applying them to your article
            </DialogDescription>
          </DialogHeader>

          {optimizedData && (
            <div className="space-y-6">
              {/* Changes Summary */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-green-500 mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Changes Made
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {optimizedData.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Title Comparison */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Title</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <span className="text-xs text-muted-foreground block mb-1">Original</span>
                    <p className="text-sm">{title}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <span className="text-xs text-primary block mb-1">Optimized</span>
                    <p className="text-sm font-medium">{optimizedData.optimizedTitle}</p>
                  </div>
                </div>
              </div>

              {/* Meta Description Comparison */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Meta Description</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <span className="text-xs text-muted-foreground block mb-1">Original</span>
                    <p className="text-sm">{metaDescription || '(Missing)'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <span className="text-xs text-primary block mb-1">Optimized</span>
                    <p className="text-sm">{optimizedData.optimizedMetaDescription}</p>
                    <span className="text-xs text-muted-foreground">
                      {optimizedData.optimizedMetaDescription.length} chars
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Content Preview</h4>
                <ScrollArea className="h-48 rounded-lg border border-border">
                  <div 
                    className="p-4 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: optimizedData.optimizedContent.slice(0, 2000) + '...' }}
                  />
                </ScrollArea>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  This will overwrite your current article content. Make sure to backup if needed.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApply} className="bg-gradient-to-r from-primary to-accent">
                  <Check className="w-4 h-4 mr-2" />
                  Apply Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
