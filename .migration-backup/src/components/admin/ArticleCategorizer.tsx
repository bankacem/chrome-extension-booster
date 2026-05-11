import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, Tag, ScanSearch, CheckCircle2, AlertCircle, 
  Loader2, FolderTree, Sparkles, ChevronDown, ChevronUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extensions } from "@/lib/extensionsData";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  keywords: string[] | null;
  tags: string[] | null;
}

interface CategorizedArticle extends Article {
  suggestedCategory: string;
  confidence: "high" | "medium" | "low";
  matchedKeywords: string[];
}

// Define categories based on extensions and common topics
const CATEGORIES = [
  { id: "screenshots", name: "Screenshots & Screen Capture", keywords: ["screenshot", "screen capture", "capture", "full page screenshot", "snapshot", "screen grab", "print screen"] },
  { id: "security", name: "Security & Privacy", keywords: ["security", "privacy", "password", "encryption", "protect", "safe", "phishing", "malware", "vpn", "secure"] },
  { id: "ad-blocking", name: "Ad Blocking & Popup Control", keywords: ["popup", "ad blocker", "ads", "advertisement", "block ads", "adblock", "overlay", "intrusive"] },
  { id: "performance", name: "Performance & Memory", keywords: ["memory", "performance", "speed", "fast", "optimize", "suspend", "tab", "ram", "cpu", "battery"] },
  { id: "productivity", name: "Productivity & Tools", keywords: ["productivity", "tool", "calculator", "formula", "workflow", "efficiency", "time", "organize"] },
  { id: "appearance", name: "Appearance & Themes", keywords: ["dark mode", "light mode", "theme", "appearance", "color", "visual", "night mode", "display"] },
  { id: "offline", name: "Offline & Reading", keywords: ["offline", "read later", "save page", "reader", "reading mode", "bookmark"] },
  { id: "cookies", name: "Cookies & Consent", keywords: ["cookie", "gdpr", "consent", "banner", "privacy policy", "tracking"] },
  { id: "redirect", name: "Redirect & Navigation", keywords: ["redirect", "navigation", "url", "link", "chain", "block redirect"] },
  { id: "general", name: "General", keywords: [] }
];

// Map extension-specific keywords
const EXTENSION_CATEGORY_MAP: Record<string, string> = {
  "quick-screenshot-lite": "screenshots",
  "auto-dark-mode-switcher": "appearance",
  "redirect-shield": "redirect",
  "protab-suspender": "performance",
  "light-popup-blocker": "ad-blocking",
  "formula-builder-pro": "productivity",
  "securakey-pro": "security",
  "offline-reader-pro": "offline",
  "cookie-banner-blocker": "cookies"
};

interface ArticleCategorizerProps {
  articles: Article[];
  onCategorized: () => void;
}

const ArticleCategorizer = ({ articles, onCategorized }: ArticleCategorizerProps) => {
  const [scanning, setScanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uncategorizedArticles, setUncategorizedArticles] = useState<CategorizedArticle[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  // Analyze article content to determine category
  const analyzeArticle = (article: Article): CategorizedArticle => {
    const titleLower = article.title.toLowerCase();
    const contentLower = (article.content || "").toLowerCase().substring(0, 5000); // First 5000 chars
    const keywordsLower = (article.keywords || []).map(k => k.toLowerCase());
    const tagsLower = (article.tags || []).map(t => t.toLowerCase());
    
    const allText = `${titleLower} ${contentLower} ${keywordsLower.join(" ")} ${tagsLower.join(" ")}`;
    
    let bestCategory = "general";
    let highestScore = 0;
    let matchedKeywords: string[] = [];
    
    // First, check for extension mentions
    for (const ext of extensions) {
      const extNameLower = ext.name.toLowerCase();
      const extSlug = ext.slug;
      
      if (allText.includes(extNameLower) || allText.includes(extSlug.replace(/-/g, " "))) {
        const mappedCategory = EXTENSION_CATEGORY_MAP[ext.id];
        if (mappedCategory) {
          bestCategory = mappedCategory;
          highestScore = 100;
          matchedKeywords = [ext.name];
          break;
        }
      }
    }
    
    // If no extension match, analyze by keywords
    if (highestScore < 100) {
      for (const category of CATEGORIES) {
        if (category.id === "general") continue;
        
        let score = 0;
        const matches: string[] = [];
        
        for (const keyword of category.keywords) {
          const regex = new RegExp(`\\b${keyword}\\b`, "gi");
          const titleMatches = (titleLower.match(regex) || []).length;
          const contentMatches = (contentLower.match(regex) || []).length;
          
          if (titleMatches > 0) {
            score += titleMatches * 10; // Title matches are more important
            matches.push(keyword);
          }
          if (contentMatches > 0) {
            score += contentMatches;
            if (!matches.includes(keyword)) matches.push(keyword);
          }
        }
        
        if (score > highestScore) {
          highestScore = score;
          bestCategory = category.id;
          matchedKeywords = matches.slice(0, 5);
        }
      }
    }
    
    // Determine confidence
    let confidence: "high" | "medium" | "low" = "low";
    if (highestScore >= 50) confidence = "high";
    else if (highestScore >= 20) confidence = "medium";
    
    const categoryName = CATEGORIES.find(c => c.id === bestCategory)?.name || "General";
    
    return {
      ...article,
      suggestedCategory: categoryName,
      confidence,
      matchedKeywords
    };
  };

  // Scan all articles for uncategorized ones
  const handleScan = async () => {
    setScanning(true);
    setProgress(0);
    setUncategorizedArticles([]);
    
    try {
      // Find articles with "General" category or null category
      const needsCategorization = articles.filter(
        a => !a.category || a.category === "General"
      );
      
      if (needsCategorization.length === 0) {
        toast({
          title: "جميع المقالات مصنفة",
          description: "لا توجد مقالات تحتاج تصنيف"
        });
        setScanning(false);
        return;
      }
      
      const categorized: CategorizedArticle[] = [];
      
      for (let i = 0; i < needsCategorization.length; i++) {
        const article = needsCategorization[i];
        const analyzed = analyzeArticle(article);
        
        // Only add if suggested category is different from current
        if (analyzed.suggestedCategory !== "General" || analyzed.confidence !== "low") {
          categorized.push(analyzed);
        }
        
        setProgress(Math.round(((i + 1) / needsCategorization.length) * 100));
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setUncategorizedArticles(categorized);
      setSelectedArticles(new Set(categorized.filter(a => a.confidence !== "low").map(a => a.id)));
      setShowResults(true);
      
      toast({
        title: "اكتمل المسح",
        description: `تم العثور على ${categorized.length} مقال يحتاج تصنيف`
      });
    } catch (error) {
      console.error("Error scanning articles:", error);
      toast({
        title: "خطأ",
        description: "فشل مسح المقالات",
        variant: "destructive"
      });
    } finally {
      setScanning(false);
    }
  };

  // Apply categories to selected articles
  const handleApplyCategories = async () => {
    if (selectedArticles.size === 0) {
      toast({
        title: "لم يتم تحديد أي مقال",
        description: "يرجى تحديد المقالات المراد تصنيفها",
        variant: "destructive"
      });
      return;
    }
    
    setApplying(true);
    setProgress(0);
    
    try {
      const articlesToUpdate = uncategorizedArticles.filter(a => selectedArticles.has(a.id));
      let successCount = 0;
      
      for (let i = 0; i < articlesToUpdate.length; i++) {
        const article = articlesToUpdate[i];
        
        const { error } = await supabase
          .from("articles")
          .update({ category: article.suggestedCategory })
          .eq("id", article.id);
        
        if (!error) {
          successCount++;
        } else {
          console.error("Error updating article:", article.id, error);
        }
        
        setProgress(Math.round(((i + 1) / articlesToUpdate.length) * 100));
      }
      
      toast({
        title: "تم التصنيف بنجاح",
        description: `تم تصنيف ${successCount} مقال`
      });
      
      setShowResults(false);
      setUncategorizedArticles([]);
      setSelectedArticles(new Set());
      onCategorized();
    } catch (error) {
      console.error("Error applying categories:", error);
      toast({
        title: "خطأ",
        description: "فشل تطبيق التصنيفات",
        variant: "destructive"
      });
    } finally {
      setApplying(false);
    }
  };

  // Update suggested category for an article
  const updateSuggestedCategory = (articleId: string, newCategory: string) => {
    setUncategorizedArticles(prev =>
      prev.map(a =>
        a.id === articleId ? { ...a, suggestedCategory: newCategory } : a
      )
    );
  };

  // Toggle article selection
  const toggleSelection = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  // Select all/none
  const toggleSelectAll = () => {
    if (selectedArticles.size === uncategorizedArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(uncategorizedArticles.map(a => a.id)));
    }
  };

  const uncategorizedCount = articles.filter(a => !a.category || a.category === "General").length;

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">عالية</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">متوسطة</Badge>;
      case "low":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">منخفضة</Badge>;
    }
  };

  return (
    <div className="glass-card p-4 mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
            <FolderTree className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Article Categorizer
              <Sparkles className="h-4 w-4 text-violet-500" />
            </h3>
            <p className="text-sm text-muted-foreground">
              تصنيف المقالات تلقائياً حسب المحتوى
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {uncategorizedCount > 0 && (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">
              {uncategorizedCount} مقال بدون تصنيف
            </Badge>
          )}
          <Button variant="ghost" size="icon">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              <Button 
                onClick={handleScan}
                disabled={scanning || applying}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري المسح...
                  </>
                ) : (
                  <>
                    <ScanSearch className="mr-2 h-4 w-4" />
                    مسح المقالات
                  </>
                )}
              </Button>
              
              {showResults && uncategorizedArticles.length > 0 && (
                <Button
                  onClick={handleApplyCategories}
                  disabled={applying || selectedArticles.size === 0}
                  variant="default"
                >
                  {applying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري التطبيق...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      تطبيق التصنيفات ({selectedArticles.size})
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {(scanning || applying) && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1 text-center">{progress}%</p>
              </div>
            )}

            {/* Results */}
            {showResults && uncategorizedArticles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    نتائج المسح ({uncategorizedArticles.length} مقال)
                  </h4>
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                    {selectedArticles.size === uncategorizedArticles.length ? "إلغاء الكل" : "تحديد الكل"}
                  </Button>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                  {uncategorizedArticles.map((article) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedArticles.has(article.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedArticles.has(article.id)}
                          onCheckedChange={() => toggleSelection(article.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{article.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Select
                              value={article.suggestedCategory}
                              onValueChange={(value) => updateSuggestedCategory(article.id, value)}
                            >
                              <SelectTrigger className="h-8 w-48 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.name}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {getConfidenceBadge(article.confidence)}
                          </div>
                          {article.matchedKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.matchedKeywords.map((kw, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {article.confidence === "high" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        ) : article.confidence === "medium" ? (
                          <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {showResults && uncategorizedArticles.length === 0 && !scanning && (
              <div className="mt-4 p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>جميع المقالات مصنفة بشكل صحيح</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArticleCategorizer;
