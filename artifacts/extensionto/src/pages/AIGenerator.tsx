import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import {
  Sparkles, FileText, Layers, FolderOpen, 
  Settings2, Save, Trash2, Wand2, Check,
  Loader2, ArrowLeft, Eye, RefreshCw, ListOrdered,
  HelpCircle, Image, Table, Globe, Pencil, Key, Cpu, User
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
import { supabase, isDevBypass } from "@/integrations/supabase/client";
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
  { value: "human", label: "Human-Like", description: "Natural, authentic human writing" },
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

// AI Provider types
type AIProvider = "lovable" | "openrouter" | "agentrouter" | "openai" | "gemini" | "groq";

interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  placeholder: string;
  models: { value: string; label: string }[];
}

const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: "lovable",
    name: "Lovable AI",
    description: "Default - No API key needed",
    placeholder: "",
    models: [
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Best)" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
      { value: "openai/gpt-5", label: "GPT-5" },
    ]
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Use your OpenRouter API key",
    placeholder: "sk-or-v1-...",
    models: [
      { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
      { value: "openai/gpt-4o", label: "GPT-4o" },
      { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { value: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    ]
  },
  {
    id: "agentrouter",
    name: "AgentRouter",
    description: "Use your AgentRouter API key (agentrouter.org)",
    placeholder: "sk-...",
    models: [
      { value: "gpt-5", label: "GPT-5" },
      { value: "gpt-5-codex", label: "GPT-5 Codex" },
      { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "claude-opus-4", label: "Claude Opus 4" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "deepseek-chat", label: "DeepSeek Chat" },
      { value: "qwen-max", label: "Qwen Max" },
      { value: "moonshot-v1-128k", label: "Moonshot 128K" },
      { value: "grok-4", label: "Grok 4" },
    ]
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Use your OpenAI API key",
    placeholder: "sk-...",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast)" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Cheap)" },
    ]
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Use your Google AI API key",
    placeholder: "AIza...",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Recommended)" },
      { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash Preview" },
      { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro Preview" },
    ]
  },
  {
    id: "groq",
    name: "Groq",
    description: "Use your Groq API key for fast inference",
    placeholder: "gsk_...",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Best Quality - Recommended)" },
      { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (Fast)" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { value: "gemma2-9b-it", label: "Gemma 2 9B" },
    ]
  }
];

const AIGenerator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // AI Provider settings - load from localStorage
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem('ai-generator-provider') as AIProvider) || "lovable";
  });
  const [customApiKey, setCustomApiKey] = useState(() => {
    return localStorage.getItem('ai-generator-apikey') || "";
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('ai-generator-model') || "google/gemini-3-flash-preview";
  });

  // Generator settings
  const [keywordsText, setKeywordsText] = useState("");
  const [category, setCategory] = useState("General");
  const [language, setLanguage] = useState("English");
  const [writingStyle, setWritingStyle] = useState("professional");
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('ai-generator-author') || "Admin");
  const [featuredImage, setFeaturedImage] = useState("");
  const [featuredVideo, setFeaturedVideo] = useState("");
  const [useAgentPro, setUseAgentPro] = useState(() => localStorage.getItem('ai-generator-agent-pro') === 'true');

  // Save provider settings to localStorage
  useEffect(() => {
    localStorage.setItem('ai-generator-provider', aiProvider);
    localStorage.setItem('ai-generator-apikey', customApiKey);
    localStorage.setItem('ai-generator-model', selectedModel);
    localStorage.setItem('ai-generator-author', authorName);
    localStorage.setItem('ai-generator-agent-pro', String(useAgentPro));
  }, [aiProvider, customApiKey, selectedModel, authorName, useAgentPro]);

  // Reset model when provider changes
  useEffect(() => {
    const provider = AI_PROVIDERS.find(p => p.id === aiProvider);
    if (provider && provider.models.length > 0) {
      const currentModelValid = provider.models.some(m => m.value === selectedModel);
      if (!currentModelValid) {
        setSelectedModel(provider.models[0].value);
      }
    }
  }, [aiProvider]);
  
  // Content options
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [includeFAQSection, setIncludeFAQSection] = useState(true);
  const [includeImagePlaceholders, setIncludeImagePlaceholders] = useState(true);
  const [includeComparisonTable, setIncludeComparisonTable] = useState(false);

  // Save options
  const [saveMode, setSaveMode] = useState<"draft" | "published" | "scheduled">("draft");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [articlesPerDay, setArticlesPerDay] = useState(2);
  const [hoursBetweenArticles, setHoursBetweenArticles] = useState(4);

  // Generated articles - load from localStorage
  const [generatedArticles, setGeneratedArticles] = useState<GeneratedArticle[]>(() => {
    const saved = localStorage.getItem('ai-generator-articles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Preview
  const [previewArticle, setPreviewArticle] = useState<GeneratedArticle | null>(null);

  // Extensions for internal linking
  const [extensions, setExtensions] = useState<string[]>([]);

  // Stats
  const readyCount = generatedArticles.filter(a => a.status === 'ready').length;
  const savedCount = generatedArticles.filter(a => a.status === 'saved').length;

  // Persist generated articles to localStorage
  useEffect(() => {
    if (generatedArticles.length > 0) {
      localStorage.setItem('ai-generator-articles', JSON.stringify(generatedArticles));
    }
  }, [generatedArticles]);
  const selectedCount = generatedArticles.filter(a => a.selected && a.status === 'ready').length;

  useEffect(() => {
    checkAuth();
    fetchExtensions();
  }, []);

  const checkAuth = async () => {
    if (isDevBypass) {
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

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
    // Fetch published articles for internal linking — always from markdown index
    try {
      const res = await fetch("/content/articles-index.json");
      if (!res.ok) return;
      const data = await res.json();
      setExtensions(
        (data as { title: string; slug: string }[])
          .slice(0, 20)
          .map(a => `${a.title} (/blog/${a.slug})`)
      );
    } catch {
      // Non-critical — silently ignore
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

    // Validate API key for custom providers
    if (aiProvider !== "lovable" && !customApiKey.trim()) {
      toast({ 
        title: "API Key Required", 
        description: `Please enter your ${AI_PROVIDERS.find(p => p.id === aiProvider)?.name} API key`,
        variant: "destructive" 
      });
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
        const fnName = useAgentPro ? 'seo-agent-pro' : 'generate-article';
        const fnBody = useAgentPro
          ? { keyword: article.keyword, niche: category, model: selectedModel, category }
          : {
              keyword: article.keyword,
              category,
              language,
              writingStyle,
              includeTableOfContents,
              includeFAQSection,
              includeImagePlaceholders,
              includeComparisonTable,
              extensions,
              aiProvider,
              customApiKey: aiProvider !== "lovable" ? customApiKey : undefined,
              model: selectedModel
            };
        const response = await supabase.functions.invoke(fnName, { body: fnBody });

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
    
    // Parse schedule date and time
    const baseDate = scheduleDate ? new Date(scheduleDate) : new Date();
    if (scheduleTime) {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      baseDate.setHours(hours, minutes, 0, 0);
    }

    for (let i = 0; i < selected.length; i++) {
      const article = selected[i];
      
      try {
        // Prepend video embed if provided
        let processedContent = article.content;
        if (featuredVideo) {
          const ytMatch = featuredVideo.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) {
            processedContent = `<div class="aspect-video my-6 rounded-xl overflow-hidden border border-border"><iframe src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full" loading="lazy"></iframe></div>\n\n` + processedContent;
          } else {
            processedContent = `<div class="aspect-video my-6 rounded-xl overflow-hidden border border-border"><video src="${featuredVideo}" controls preload="metadata" class="w-full h-full object-contain bg-black"></video></div>\n\n` + processedContent;
          }
        }

        // Calculate schedule time for this article
        let scheduledAt = null;
        let publishedAt = null;
        let status = saveMode;

        if (saveMode === "scheduled") {
          // Calculate which day and which slot within that day
          const dayIndex = Math.floor(i / articlesPerDay);
          const slotIndex = i % articlesPerDay;
          
          // Add days and hours based on position
          const articleDate = new Date(baseDate.getTime());
          articleDate.setDate(articleDate.getDate() + dayIndex);
          articleDate.setHours(articleDate.getHours() + (slotIndex * hoursBetweenArticles));
          
          scheduledAt = articleDate.toISOString();
        } else if (saveMode === "published") {
          publishedAt = new Date().toISOString();
        }

        // Build a clean SEO slug; only add a tiny suffix on actual collision.
        const { cleanSlug, withCollisionSuffix } = await import("@/utils/slug");
        let uniqueSlug = cleanSlug(article.title || article.slug);
        const { data: clash } = await supabase
          .from("articles")
          .select("id")
          .eq("slug", uniqueSlug)
          .maybeSingle();
        if (clash) uniqueSlug = withCollisionSuffix(uniqueSlug);

        const { error } = await supabase.from("articles").insert({
          title: article.title,
          content: processedContent,
          slug: uniqueSlug,
          excerpt: article.excerpt,
          category: article.category,
          keywords: article.keywords,
          meta_description: article.meta_description,
          read_time: article.readTime,
          featured_image: featuredImage || null,
          status,
          scheduled_at: scheduledAt,
          published_at: publishedAt,
          author: authorName || "Admin"
        });

        if (error) throw error;

        // Auto-publish to GitHub as static Markdown so the article appears
        // immediately on /blog without manual sync.
        if (status === "published") {
          supabase.functions.invoke("publish-to-github", {
            body: {
              slug: uniqueSlug,
              title: article.title,
              content: processedContent,
              excerpt: article.excerpt,
              meta_description: article.meta_description,
              category: article.category,
              keywords: article.keywords,
              featured_image: featuredImage || null,
              author: authorName || "Admin",
              published_at: publishedAt,
              read_time: article.readTime,
            },
          }).catch((e) => console.warn("publish-to-github failed:", e));
        }

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
    // Validate API key for custom providers
    if (aiProvider !== "lovable" && !customApiKey.trim()) {
      toast({ 
        title: "API Key Required", 
        description: `Please enter your ${AI_PROVIDERS.find(p => p.id === aiProvider)?.name} API key`,
        variant: "destructive" 
      });
      return;
    }

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
          extensions,
          // AI Provider settings
          aiProvider,
          customApiKey: aiProvider !== "lovable" ? customApiKey : undefined,
          model: selectedModel
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
      <SEO
        title="AI Article Generator - Programmatic SEO"
        description="Generate professional SEO-optimized articles using AI. Programmatic SEO engine for extensionto.com."
        noindex
      />
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
              {generatedArticles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    localStorage.removeItem('ai-generator-articles');
                    setGeneratedArticles([]);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </Button>
              )}
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

            {/* AI Provider Settings Card */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                  AI Provider
                </CardTitle>
                <CardDescription>
                  Use Lovable AI (free) or your own API keys
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {AI_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setAiProvider(provider.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        aiProvider === provider.id
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{provider.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{provider.description}</div>
                    </button>
                  ))}
                </div>

                {aiProvider !== "lovable" && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-dashed">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        {AI_PROVIDERS.find(p => p.id === aiProvider)?.name} API Key
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder={AI_PROVIDERS.find(p => p.id === aiProvider)?.placeholder}
                          value={customApiKey}
                          onChange={(e) => setCustomApiKey(e.target.value)}
                          className="font-mono flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!customApiKey.trim()) {
                              toast({ title: "خطأ", description: "أدخل مفتاح API أولاً", variant: "destructive" });
                              return;
                            }
                            toast({ title: "جاري الاختبار...", description: "يرجى الانتظار" });
                            try {
                              const response = await supabase.functions.invoke('generate-article', {
                                body: {
                                  keyword: "test connection",
                                  category: "General",
                                  language: "English",
                                  writingStyle: "professional",
                                  includeTableOfContents: false,
                                  includeFAQSection: false,
                                  includeImagePlaceholders: false,
                                  includeComparisonTable: false,
                                  aiProvider,
                                  customApiKey,
                                  model: selectedModel
                                }
                              });
                              if (response.error) {
                                throw new Error(response.error.message);
                              }
                              toast({ 
                                title: "✅ الاتصال ناجح!", 
                                description: `مفتاح ${AI_PROVIDERS.find(p => p.id === aiProvider)?.name} يعمل بشكل صحيح`
                              });
                            } catch (error: any) {
                              toast({ 
                                title: "❌ فشل الاتصال", 
                                description: error.message || "تحقق من صحة مفتاح API",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          اختبار
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          🔒 محفوظ محليًا في المتصفح
                        </span>
                        {customApiKey && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            محفوظ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.find(p => p.id === aiProvider)?.models.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {aiProvider !== "lovable" && customApiKey && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <Check className="h-3 w-3" />
                    <span>جاهز للاستخدام مع {AI_PROVIDERS.find(p => p.id === aiProvider)?.name}</span>
                  </div>
                )}
                
                {aiProvider !== "lovable" && !customApiKey && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    <Key className="h-3 w-3" />
                    <span>أدخل مفتاح API لاستخدام {AI_PROVIDERS.find(p => p.id === aiProvider)?.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO Agent Pro toggle — multi-step learning pipeline */}
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  SEO Agent Pro
                </CardTitle>
                <CardDescription>
                  Multi-step pipeline (Competitor analysis → Strategy → Article → CTR) with persistent learning memory.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="agent-pro" className="cursor-pointer">
                    Use SEO Agent Pro pipeline
                  </Label>
                  <Switch id="agent-pro" checked={useAgentPro} onCheckedChange={setUseAgentPro} />
                </div>
                {useAgentPro && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ✓ Each article runs the full agent pipeline and feeds the memory store for continuous improvement.
                  </p>
                )}
              </CardContent>
            </Card>

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

                  {/* Author Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Author Name
                    </Label>
                    <Input
                      placeholder="e.g. John Smith"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Displayed as the article author (saved for next use)
                    </p>
                  </div>

                  {/* Featured Image URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Featured Image URL
                    </Label>
                    <Input
                      placeholder="https://images.unsplash.com/photo-..."
                      value={featuredImage}
                      onChange={(e) => setFeaturedImage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      External image URL for article hero image
                    </p>
                  </div>

                  {/* Featured Video URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Featured Video URL
                    </Label>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={featuredVideo}
                      onChange={(e) => setFeaturedVideo(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      YouTube or MP4 link shown at the top of the article
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
                    <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>📅 Start Date</Label>
                          <Input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>⏰ Start Time</Label>
                          <Input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>📊 Articles/Day</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={articlesPerDay}
                            onChange={(e) => setArticlesPerDay(parseInt(e.target.value) || 2)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>⏱️ Hours Between</Label>
                          <Input
                            type="number"
                            min={1}
                            max={24}
                            value={hoursBetweenArticles}
                            onChange={(e) => setHoursBetweenArticles(parseInt(e.target.value) || 4)}
                          />
                        </div>
                      </div>

                      {/* Schedule Preview */}
                      {selectedCount > 0 && scheduleDate && (
                        <div className="pt-3 border-t space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">📋 Schedule Preview</Label>
                          <div className="bg-background rounded-md p-2 max-h-32 overflow-y-auto text-xs space-y-1">
                            {Array.from({ length: Math.min(selectedCount, 5) }).map((_, i) => {
                              const baseD = new Date(scheduleDate);
                              const [h, m] = scheduleTime.split(':').map(Number);
                              baseD.setHours(h, m, 0, 0);
                              const dayIndex = Math.floor(i / articlesPerDay);
                              const slotIndex = i % articlesPerDay;
                              const articleDate = new Date(baseD.getTime());
                              articleDate.setDate(articleDate.getDate() + dayIndex);
                              articleDate.setHours(articleDate.getHours() + (slotIndex * hoursBetweenArticles));
                              
                              return (
                                <div key={i} className="flex justify-between text-muted-foreground">
                                  <span>Article {i + 1}</span>
                                  <span>{articleDate.toLocaleDateString()} {articleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              );
                            })}
                            {selectedCount > 5 && (
                              <div className="text-muted-foreground text-center">... +{selectedCount - 5} more</div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ✅ {Math.ceil(selectedCount / articlesPerDay)} days total
                          </div>
                        </div>
                      )}
                    </div>
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
