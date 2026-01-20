import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, FileText, Layers, FolderOpen, 
  Settings2, Save, Trash2, Wand2, Check,
  Loader2, ArrowLeft, Eye, RefreshCw, ListOrdered,
  HelpCircle, Image, Table, Globe, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedArticle {
  id: string;
  keyword: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  readTime: number;
  wordCount: number;
  category: string;
  keywords: string[];
  meta_description: string;
  selected: boolean;
  status: 'pending' | 'generating' | 'ready' | 'saved' | 'error';
  error?: string;
}

interface ArticleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  writingStyle: string;
  includeTableOfContents: boolean;
  includeFAQSection: boolean;
  includeImagePlaceholders: boolean;
  includeComparisonTable: boolean;
}

const WRITING_STYLES = [
  { value: "professional", label: "Professional", description: "Formal, authoritative tone" },
  { value: "casual", label: "Casual", description: "Friendly and conversational" },
  { value: "educational", label: "Educational", description: "Informative and explanatory" },
  { value: "persuasive", label: "Persuasive", description: "Engaging and action-oriented" },
  { value: "technical", label: "Technical", description: "Detailed and precise" },
];

const CATEGORIES = [
  "General",
  "Chrome Extensions",
  "Productivity",
  "Security",
  "Development",
  "Social Media",
  "SEO Tools",
  "E-commerce",
  "Education",
  "Entertainment"
];

const LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Arabic", label: "العربية (Arabic)" },
  { value: "French", label: "Français (French)" },
  { value: "Spanish", label: "Español (Spanish)" },
  { value: "German", label: "Deutsch (German)" },
];

const DEFAULT_TEMPLATES: ArticleTemplate[] = [
  {
    id: "seo-article",
    name: "SEO Article",
    description: "Full SEO-optimized article with TOC and FAQ",
    category: "General",
    writingStyle: "professional",
    includeTableOfContents: true,
    includeFAQSection: true,
    includeImagePlaceholders: true,
    includeComparisonTable: false,
  },
  {
    id: "comparison",
    name: "Comparison Post",
    description: "Compare products/services with table",
    category: "Chrome Extensions",
    writingStyle: "professional",
    includeTableOfContents: true,
    includeFAQSection: true,
    includeImagePlaceholders: true,
    includeComparisonTable: true,
  },
  {
    id: "tutorial",
    name: "Tutorial Guide",
    description: "Step-by-step how-to guide",
    category: "Development",
    writingStyle: "educational",
    includeTableOfContents: true,
    includeFAQSection: false,
    includeImagePlaceholders: true,
    includeComparisonTable: false,
  },
  {
    id: "quick-post",
    name: "Quick Post",
    description: "Shorter article without extras",
    category: "General",
    writingStyle: "casual",
    includeTableOfContents: false,
    includeFAQSection: false,
    includeImagePlaceholders: false,
    includeComparisonTable: false,
  },
];

const AIGenerator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generator settings
  const [keywordsText, setKeywordsText] = useState("");
  const [category, setCategory] = useState("General");
  const [language, setLanguage] = useState("English");
  const [writingStyle, setWritingStyle] = useState("professional");
  
  // Content options
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [includeFAQSection, setIncludeFAQSection] = useState(true);
  const [includeImagePlaceholders, setIncludeImagePlaceholders] = useState(true);
  const [includeComparisonTable, setIncludeComparisonTable] = useState(false);

  // Save options
  const [saveMode, setSaveMode] = useState<"draft" | "published" | "scheduled">("draft");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState(24); // hours between articles

  // Generated articles
  const [generatedArticles, setGeneratedArticles] = useState<GeneratedArticle[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Preview
  const [previewArticle, setPreviewArticle] = useState<GeneratedArticle | null>(null);

  // Extensions for internal linking
  const [extensions, setExtensions] = useState<string[]>([]);

  // Stats
  const readyCount = generatedArticles.filter(a => a.status === 'ready').length;
  const savedCount = generatedArticles.filter(a => a.status === 'saved').length;
  const selectedCount = generatedArticles.filter(a => a.selected && a.status === 'ready').length;

  useEffect(() => {
    checkAuth();
    fetchExtensions();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/settings");
      return;
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (role?.role !== "admin") {
      navigate("/settings");
      return;
    }

    setIsAuthenticated(true);
    setLoading(false);
  };

  const fetchExtensions = async () => {
    // Fetch published articles to use for internal linking
    const { data } = await supabase
      .from("articles")
      .select("title, slug")
      .eq("status", "published")
      .limit(20);

    if (data) {
      setExtensions(data.map(a => `${a.title} (/blog/${a.slug})`));
    }
  };

  const parseKeywords = (): string[] => {
    return keywordsText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
  };

  const applyTemplate = (template: ArticleTemplate) => {
    setCategory(template.category);
    setWritingStyle(template.writingStyle);
    setIncludeTableOfContents(template.includeTableOfContents);
    setIncludeFAQSection(template.includeFAQSection);
    setIncludeImagePlaceholders(template.includeImagePlaceholders);
    setIncludeComparisonTable(template.includeComparisonTable);
    toast({ title: "Template Applied", description: `Using "${template.name}" settings` });
  };

  const generateArticles = async () => {
    const keywords = parseKeywords();
    if (keywords.length === 0) {
      toast({ title: "No Keywords", description: "Please enter at least one keyword", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    
    // Initialize articles with pending status
    const initialArticles: GeneratedArticle[] = keywords.map((keyword, index) => ({
      id: `gen-${Date.now()}-${index}`,
      keyword,
      title: "",
      content: "",
      excerpt: "",
      slug: "",
      readTime: 0,
      wordCount: 0,
      category,
      keywords: [keyword],
      meta_description: "",
      selected: true,
      status: 'pending'
    }));

    setGeneratedArticles(initialArticles);

    // Generate articles one by one
    for (let i = 0; i < initialArticles.length; i++) {
      const article = initialArticles[i];
      
      // Update status to generating
      setGeneratedArticles(prev => prev.map(a => 
        a.id === article.id ? { ...a, status: 'generating' as const } : a
      ));

      try {
        const response = await supabase.functions.invoke('generate-article', {
          body: {
            keyword: article.keyword,
            category,
            language,
            writingStyle,
            includeTableOfContents,
            includeFAQSection,
            includeImagePlaceholders,
            includeComparisonTable,
            extensions
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        setGeneratedArticles(prev => prev.map(a => 
          a.id === article.id ? {
            ...a,
            title: data.title,
            content: data.content,
            excerpt: data.excerpt,
            slug: data.slug,
            readTime: data.readTime,
            wordCount: data.wordCount,
            meta_description: data.meta_description,
            keywords: data.keywords,
            status: 'ready' as const
          } : a
        ));

      } catch (error: any) {
        console.error("Generation error:", error);
        setGeneratedArticles(prev => prev.map(a => 
          a.id === article.id ? { 
            ...a, 
            status: 'error' as const, 
            error: error.message || "Generation failed" 
          } : a
        ));
      }

      // Small delay between requests to avoid rate limiting
      if (i < initialArticles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGenerating(false);
    toast({ 
      title: "Generation Complete", 
      description: `Generated ${keywords.length} articles` 
    });
  };

  const saveSelectedArticles = async () => {
    const selected = generatedArticles.filter(a => a.selected && a.status === 'ready');
    if (selected.length === 0) {
      toast({ title: "No Selection", description: "Please select articles to save", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let savedCount = 0;
    const baseDate = scheduleDate ? new Date(scheduleDate) : new Date();

    for (let i = 0; i < selected.length; i++) {
      const article = selected[i];
      
      try {
        // Use content as-is (internal linking will be done later on view)
        const processedContent = article.content;

        // Calculate schedule time for this article
        let scheduledAt = null;
        let publishedAt = null;
        let status = saveMode;

        if (saveMode === "scheduled") {
          const scheduleTime = new Date(baseDate.getTime() + (i * scheduleInterval * 60 * 60 * 1000));
          scheduledAt = scheduleTime.toISOString();
        } else if (saveMode === "published") {
          publishedAt = new Date().toISOString();
        }

        const { error } = await supabase.from("articles").insert({
          title: article.title,
          content: processedContent,
          slug: article.slug + (i > 0 ? `-${i}` : ''),
          excerpt: article.excerpt,
          category: article.category,
          keywords: article.keywords,
          meta_description: article.meta_description,
          read_time: article.readTime,
          status,
          scheduled_at: scheduledAt,
          published_at: publishedAt,
          author: "AI Generator"
        });

        if (error) throw error;

        setGeneratedArticles(prev => prev.map(a => 
          a.id === article.id ? { ...a, status: 'saved' as const } : a
        ));
        savedCount++;

      } catch (error: any) {
        console.error("Save error:", error);
        toast({
          title: "Save Error",
          description: `Failed to save "${article.title}": ${error.message}`,
          variant: "destructive"
        });
      }
    }

    setIsSaving(false);
    toast({ 
      title: "Articles Saved", 
      description: `Successfully saved ${savedCount} articles` 
    });
  };

  const toggleSelectAll = (selected: boolean) => {
    setGeneratedArticles(prev => prev.map(a => 
      a.status === 'ready' ? { ...a, selected } : a
    ));
  };

  const regenerateArticle = async (article: GeneratedArticle) => {
    setGeneratedArticles(prev => prev.map(a => 
      a.id === article.id ? { ...a, status: 'generating' as const } : a
    ));

    try {
      const response = await supabase.functions.invoke('generate-article', {
        body: {
          keyword: article.keyword,
          category,
          language,
          writingStyle,
          includeTableOfContents,
          includeFAQSection,
          includeImagePlaceholders,
          includeComparisonTable,
          extensions
        }
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      setGeneratedArticles(prev => prev.map(a => 
        a.id === article.id ? {
          ...a,
          title: data.title,
          content: data.content,
          excerpt: data.excerpt,
          slug: data.slug,
          readTime: data.readTime,
          wordCount: data.wordCount,
          meta_description: data.meta_description,
          status: 'ready' as const
        } : a
      ));

    } catch (error: any) {
      setGeneratedArticles(prev => prev.map(a => 
        a.id === article.id ? { ...a, status: 'error' as const, error: error.message } : a
      ));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const keywords = parseKeywords();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings/manage")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Programmatic SEO Engine
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered article generation with professional SEO structure
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Wand2 className="h-3 w-3" />
                {readyCount} Ready
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                {savedCount} Saved
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="generator" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Generator
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Layers className="h-4 w-4" />
              Batch Generator
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Batches
            </TabsTrigger>
          </TabsList>

          {/* AI Generator Tab */}
          <TabsContent value="generator" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Article Generator
                </h2>
                <p className="text-sm text-muted-foreground">
                  Generate professional SEO-optimized articles using AI
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{readyCount} Ready</Badge>
                <Badge variant="outline" className="text-green-600">{savedCount} Published</Badge>
                <Badge variant="outline">0 Scheduled</Badge>
                <Badge variant="outline">0 Drafts</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Article Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Article Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Keywords (one per line)
                    </Label>
                    <Textarea
                      placeholder="Bitcoin price prediction 2026&#10;Best crypto wallets&#10;Ethereum vs Bitcoin"
                      value={keywordsText}
                      onChange={(e) => setKeywordsText(e.target.value)}
                      rows={5}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {keywords.length} keywords detected
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Pencil className="h-4 w-4" />
                      Writing Style
                    </Label>
                    <Select value={writingStyle} onValueChange={setWritingStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WRITING_STYLES.map(style => (
                          <SelectItem key={style.value} value={style.value}>
                            <div>
                              <span className="font-medium">{style.label}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {style.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose a tone that matches your audience
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label>Content Options</Label>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="toc" className="flex items-center gap-2 text-sm font-normal">
                        <ListOrdered className="h-4 w-4 text-muted-foreground" />
                        Table of Contents
                      </Label>
                      <Switch
                        id="toc"
                        checked={includeTableOfContents}
                        onCheckedChange={setIncludeTableOfContents}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="faq" className="flex items-center gap-2 text-sm font-normal">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        FAQ Section
                      </Label>
                      <Switch
                        id="faq"
                        checked={includeFAQSection}
                        onCheckedChange={setIncludeFAQSection}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="images" className="flex items-center gap-2 text-sm font-normal">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        Image Placeholders
                      </Label>
                      <Switch
                        id="images"
                        checked={includeImagePlaceholders}
                        onCheckedChange={setIncludeImagePlaceholders}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="table" className="flex items-center gap-2 text-sm font-normal">
                        <Table className="h-4 w-4 text-muted-foreground" />
                        Comparison Table
                      </Label>
                      <Switch
                        id="table"
                        checked={includeComparisonTable}
                        onCheckedChange={setIncludeComparisonTable}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full gap-2 mt-4" 
                    size="lg"
                    onClick={generateArticles}
                    disabled={isGenerating || keywords.length === 0}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Save & Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    Save & Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Save Mode</Label>
                    <Select value={saveMode} onValueChange={(v: any) => setSaveMode(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Save as Draft
                          </div>
                        </SelectItem>
                        <SelectItem value="published">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Publish Now
                          </div>
                        </SelectItem>
                        <SelectItem value="scheduled">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Schedule
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {saveMode === "scheduled" && (
                    <>
                      <div className="space-y-2">
                        <Label>Start Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hours Between Articles</Label>
                        <Input
                          type="number"
                          min={1}
                          value={scheduleInterval}
                          onChange={(e) => setScheduleInterval(parseInt(e.target.value) || 24)}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm font-medium">{selectedCount} selected</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleSelectAll(true)}>
                        All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleSelectAll(false)}>
                        None
                      </Button>
                    </div>
                  </div>

                  <Button 
                    className="w-full gap-2" 
                    variant="default"
                    onClick={saveSelectedArticles}
                    disabled={isSaving || selectedCount === 0}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save {selectedCount} Articles
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Articles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Generated ({generatedArticles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedArticles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No articles generated yet</p>
                      <p className="text-sm">Enter keywords and click Generate</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {generatedArticles.map((article) => (
                          <motion.div
                            key={article.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-3 rounded-lg border ${
                              article.status === 'saved' 
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                : article.status === 'error'
                                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                : 'bg-card'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {article.status === 'ready' && (
                                <Checkbox
                                  checked={article.selected}
                                  onCheckedChange={(checked) => {
                                    setGeneratedArticles(prev => prev.map(a =>
                                      a.id === article.id ? { ...a, selected: !!checked } : a
                                    ));
                                  }}
                                />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                {article.status === 'generating' ? (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Generating: {article.keyword}</span>
                                  </div>
                                ) : article.status === 'pending' ? (
                                  <div className="text-muted-foreground">
                                    Waiting: {article.keyword}
                                  </div>
                                ) : article.status === 'error' ? (
                                  <div>
                                    <p className="font-medium text-red-600">{article.keyword}</p>
                                    <p className="text-sm text-red-500">{article.error}</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-1"
                                      onClick={() => regenerateArticle(article)}
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Retry
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-medium truncate">{article.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                      <span>{article.wordCount} words</span>
                                      <span>•</span>
                                      <span>{article.readTime} min read</span>
                                      {article.status === 'saved' && (
                                        <>
                                          <span>•</span>
                                          <Badge variant="secondary" className="text-xs">Saved</Badge>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>

                              {article.status === 'ready' && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPreviewArticle(article)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => regenerateArticle(article)}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      setGeneratedArticles(prev => 
                                        prev.filter(a => a.id !== article.id)
                                      );
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Article Templates</h2>
              <p className="text-sm text-muted-foreground">
                Pre-configured settings for different article types
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEFAULT_TEMPLATES.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Category:</span>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Style:</span>
                        <Badge variant="secondary">{template.writingStyle}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.includeTableOfContents && (
                          <Badge variant="outline" className="text-xs">TOC</Badge>
                        )}
                        {template.includeFAQSection && (
                          <Badge variant="outline" className="text-xs">FAQ</Badge>
                        )}
                        {template.includeImagePlaceholders && (
                          <Badge variant="outline" className="text-xs">Images</Badge>
                        )}
                        {template.includeComparisonTable && (
                          <Badge variant="outline" className="text-xs">Table</Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => applyTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Batch Generator Tab */}
          <TabsContent value="batch" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Batch Article Generation</CardTitle>
                <CardDescription>
                  Generate multiple articles with advanced scheduling options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Use the AI Generator tab to create articles, then save them in batches with scheduling.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generation History</CardTitle>
                <CardDescription>
                  View previously generated article batches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No batch history yet. Generated articles will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewArticle} onOpenChange={() => setPreviewArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewArticle?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: previewArticle?.content || '' }}
            />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewArticle(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIGenerator;
