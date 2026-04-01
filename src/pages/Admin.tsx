import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Plus, Edit, Trash2, Eye, Calendar, Clock, Search, 
  Download, Upload, FileText, Settings, BarChart3, Tag,
  Save, X, Image, Link as LinkIcon, Database, RefreshCw,
  LogOut, Globe, Archive, Shield, Copy, ExternalLink, CheckSquare, FileJson,
  CalendarClock, Settings2, Wand2, ImageOff, CalendarCheck, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import BulkScheduleDialog from "@/components/admin/BulkScheduleDialog";
import BulkUpdateDialog from "@/components/admin/BulkUpdateDialog";
import ArticleCategorizer from "@/components/admin/ArticleCategorizer";
import FeaturedImageGenerator from "@/components/admin/FeaturedImageGenerator";
import { processArticleWithLinks } from "@/lib/internalLinking";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  author: string | null;
  views: number | null;
  read_time: number | null;
  created_at: string;
  updated_at: string;
}

interface ImportedPost {
  id?: string;
  title: string;
  excerpt?: string;
  content: string;
  category?: string;
  tags?: string[] | string;
  keywords?: string[] | string;
  meta_description?: string;
  featured_image?: string;
  author?: string;
  read_time?: number | string;

  // Compatibility fields from other exporters
  image?: string;
  seoDesc?: string;
  seoKeywords?: string | string[];
  seoTitle?: string;
  readingTime?: number | string;
}

interface ImportData {
  posts?: ImportedPost[];
}

interface BackupData {
  version: string;
  exportedAt: string;
  website: string;
  articles: Article[];
  metadata: {
    totalArticles: number;
    publishedCount: number;
    draftCount: number;
    scheduledCount: number;
  };
}

const WEBSITE_URL = "https://www.extensionto.com";

const defaultArticle: Partial<Article> = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  featured_image: "",
  category: "General",
  tags: [],
  keywords: [],
  meta_description: "",
  status: "draft",
  author: "Admin",
  read_time: 5,
};

const Admin = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>(defaultArticle);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [tagsInput, setTagsInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");

  const [contentEditorMode, setContentEditorMode] = useState<"html" | "preview">("html");
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  
  // Bulk import states
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importedPosts, setImportedPosts] = useState<ImportedPost[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [bulkScheduleDate, setBulkScheduleDate] = useState("");
  const [bulkScheduleInterval, setBulkScheduleInterval] = useState(1); // hours between each article
  
  // Bulk management dialogs
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [applyingInternalLinks, setApplyingInternalLinks] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check Supabase auth session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/settings");
        return;
      }

      // Verify admin role
      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleError || role?.role !== "admin") {
        await supabase.auth.signOut();
        navigate("/settings");
        return;
      }

      fetchArticles();
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/settings");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    navigate("/settings");
  };

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    const base = (title ?? "")
      .normalize("NFKD")
      .toLowerCase()
      // keep letters/numbers (including Arabic), spaces and hyphens
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);

    return base || `post-${Date.now()}`;
  };

  const normalizeStringList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value === "string") {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const parseReadTimeMinutes = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.round(value));
    if (typeof value === "string") {
      const m = value.match(/\d+/);
      if (m) return Math.max(1, parseInt(m[0], 10));
    }
    return 5;
  };

  const deriveExcerptFromHtml = (html: string): string => {
    try {
      const doc = new DOMParser().parseFromString(html || "", "text/html");
      const text = (doc.body.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      return text.slice(0, 160);
    } catch {
      return "";
    }
  };

  const pickBestTitle = (rawTitle: string, htmlTitle?: string | null) => {
    const t = (rawTitle || "").trim();
    const h = (htmlTitle || "").trim();

    const looksLikePrompt =
      /\bto give you the best title\b/i.test(t) ||
      /\bhere are several\b/i.test(t) ||
      t.includes("###") ||
      t.includes("\n");

    if (h && (!t || looksLikePrompt || t.length > 120)) return h;

    // if title is multi-line, keep the first meaningful line
    if (t.includes("\n")) {
      const firstLine = t
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)[0];
      return firstLine || h || "Untitled";
    }

    return t || h || "Untitled";
  };

  const normalizeImportedPost = (raw: any): ImportedPost => {
    const rawContent = typeof raw?.content === "string" ? raw.content : "";

    let htmlTitle: string | null = null;
    try {
      const doc = new DOMParser().parseFromString(rawContent || "", "text/html");
      htmlTitle = doc.querySelector("h1")?.textContent?.trim() || doc.querySelector("title")?.textContent?.trim() || null;
    } catch {
      htmlTitle = null;
    }

    const title = pickBestTitle(typeof raw?.title === "string" ? raw.title : "", htmlTitle);

    const tags = normalizeStringList(raw?.tags);
    const keywords = normalizeStringList(raw?.keywords ?? raw?.seoKeywords);

    const featured_image =
      (typeof raw?.featured_image === "string" && raw.featured_image.trim())
        ? raw.featured_image.trim()
        : (typeof raw?.image === "string" && raw.image.trim())
          ? raw.image.trim()
          : undefined;

    const excerptRaw = typeof raw?.excerpt === "string" ? raw.excerpt : "";
    const excerpt = (excerptRaw && excerptRaw.length <= 500 ? excerptRaw : "") || deriveExcerptFromHtml(rawContent);

    const meta_description =
      (typeof raw?.meta_description === "string" ? raw.meta_description : "") ||
      (typeof raw?.seoDesc === "string" ? raw.seoDesc : "") ||
      excerpt;

    const read_time = parseReadTimeMinutes(raw?.read_time ?? raw?.readingTime);

    return {
      id: typeof raw?.id === "string" ? raw.id : undefined,
      title,
      excerpt,
      content: rawContent,
      category: typeof raw?.category === "string" ? raw.category : undefined,
      tags,
      keywords,
      meta_description,
      featured_image,
      author: typeof raw?.author === "string" ? raw.author : undefined,
      read_time,
    };
  };

  const handleSave = async () => {
    try {
      const slug = currentArticle.slug || generateSlug(currentArticle.title || "");
      const articleData = {
        title: currentArticle.title || "",
        content: currentArticle.content || "",
        slug,
        excerpt: currentArticle.excerpt,
        featured_image: currentArticle.featured_image,
        category: currentArticle.category,
        meta_description: currentArticle.meta_description,
        status: currentArticle.status,
        author: currentArticle.author,
        read_time: currentArticle.read_time,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        keywords: keywordsInput.split(",").map((k) => k.trim()).filter(Boolean),
        published_at: currentArticle.status === "published" ? new Date().toISOString() : null,
        scheduled_at: currentArticle.status === "scheduled" ? currentArticle.scheduled_at : null,
      };

      if (currentArticle.id) {
        const { error } = await supabase
          .from("articles")
          .update(articleData)
          .eq("id", currentArticle.id);
        if (error) throw error;
        toast({ title: "Success", description: "Article updated successfully" });
      } else {
        const { error } = await supabase.from("articles").insert([articleData]);
        if (error) throw error;
        toast({ title: "Success", description: "Article created successfully" });
      }

      setIsEditing(false);
      setCurrentArticle(defaultArticle);
      setTagsInput("");
      setKeywordsInput("");
      fetchArticles();
    } catch (error: any) {
      console.error("Error saving article:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save article",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (article: Article) => {
    setArticleToDelete(article);
  };

  const handleDelete = async () => {
    if (!articleToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("articles")
        .delete()
        .eq("id", articleToDelete.id)
        .select();
      
      if (error) {
        throw error;
      }
      
      toast({ title: "Success", description: "Article deleted successfully" });
      setArticleToDelete(null);
      fetchArticles();
    } catch (error: any) {
      console.error("Error deleting article:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete article. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (article: Article) => {
    setCurrentArticle(article);
    setTagsInput(article.tags?.join(", ") || "");
    setKeywordsInput(article.keywords?.join(", ") || "");
    setIsEditing(true);
  };

  // Full backup export
  const handleFullBackup = () => {
    const backupData: BackupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      website: WEBSITE_URL,
      articles: articles,
      metadata: {
        totalArticles: articles.length,
        publishedCount: articles.filter((a) => a.status === "published").length,
        draftCount: articles.filter((a) => a.status === "draft").length,
        scheduledCount: articles.filter((a) => a.status === "scheduled").length,
      },
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `extensionto-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ 
      title: "Backup Created", 
      description: `Full backup exported with ${articles.length} articles` 
    });
  };

  // Export articles only
  const handleExportArticles = () => {
    const dataStr = JSON.stringify(articles, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `articles-export-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Success", description: "Articles exported successfully" });
  };

  // Restore from backup
  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmRestore = confirm(
      "WARNING: This will replace ALL existing articles with the backup data. Are you sure you want to continue?"
    );
    if (!confirmRestore) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Check if it's a full backup or just articles array
      const articlesToRestore = backupData.articles || backupData;

      if (!Array.isArray(articlesToRestore)) {
        throw new Error("Invalid backup format");
      }

      // Delete all existing articles
      const { error: deleteError } = await supabase
        .from("articles")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (deleteError) throw deleteError;

      // Insert restored articles
      for (const article of articlesToRestore) {
        const { id, created_at, updated_at, ...articleData } = article;
        await supabase.from("articles").insert([articleData]);
      }

      toast({ 
        title: "Backup Restored", 
        description: `Successfully restored ${articlesToRestore.length} articles` 
      });
      fetchArticles();
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore backup. Check file format.",
        variant: "destructive",
      });
    }
  };

  // Import articles (add to existing) - legacy format
  const handleImportArticles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      const articlesToImport = importedData.articles || importedData;

      if (!Array.isArray(articlesToImport)) {
        throw new Error("Invalid import format");
      }

      let importedCount = 0;
      for (const article of articlesToImport) {
        const { id, created_at, updated_at, ...articleData } = article;
        
        // Check if article with same slug exists
        const { data: existing } = await supabase
          .from("articles")
          .select("id")
          .eq("slug", articleData.slug)
          .single();

        if (!existing) {
          await supabase.from("articles").insert([articleData]);
          importedCount++;
        }
      }

      toast({ 
        title: "Import Complete", 
        description: `Imported ${importedCount} new articles (${articlesToImport.length - importedCount} duplicates skipped)` 
      });
      fetchArticles();
    } catch (error: any) {
      console.error("Error importing articles:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import articles. Check file format.",
        variant: "destructive",
      });
    }
  };

  // Handle bulk JSON import with posts format
  const handleBulkJsonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ""; // Reset input

    try {
      const text = await file.text();
      const data: ImportData = JSON.parse(text);

      let postsToImport: ImportedPost[] = [];

      // Check for "posts" format first
      if (data.posts && Array.isArray(data.posts)) {
        postsToImport = data.posts;
      } else if (Array.isArray(data)) {
        postsToImport = data as ImportedPost[];
      } else {
        throw new Error("Invalid JSON format. Expected { posts: [...] } or array of articles");
      }

      if (postsToImport.length === 0) {
        throw new Error("No articles found in the file");
      }

      const normalized = postsToImport.map(normalizeImportedPost);

      setImportedPosts(normalized);
      setSelectedPosts(new Set(normalized.map((_, i) => i.toString())));
      setShowBulkImport(true);

      toast({
        title: "File Loaded",
        description: `Found ${normalized.length} articles ready for import`,
      });
    } catch (error: any) {
      console.error("Error parsing JSON:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to parse JSON file",
        variant: "destructive",
      });
    }
  };

  // Toggle post selection
  const togglePostSelection = (index: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPosts(newSelected);
  };

  // Select/deselect all posts
  const toggleSelectAll = () => {
    if (selectedPosts.size === importedPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(importedPosts.map((_, i) => i.toString())));
    }
  };

  // Process bulk import
  const processBulkImport = async () => {
    if (selectedPosts.size === 0) {
      toast({
        title: "No Articles Selected",
        description: "Please select at least one article to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    const selectedIndices = Array.from(selectedPosts)
      .map((i) => parseInt(i))
      .sort((a, b) => a - b);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    try {
      for (let idx = 0; idx < selectedIndices.length; idx++) {
        const rawPost = importedPosts[selectedIndices[idx]];
        const post = normalizeImportedPost(rawPost);
        const slug = generateSlug(post.title) || `post-${Date.now()}-${selectedIndices[idx]}`;

        // Check for duplicate
        const { data: existing } = await supabase
          .from("articles")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        // Calculate schedule date if scheduling
        let scheduledAt: string | null = null;
        let publishedAt: string | null = null;
        const articleStatus = bulkStatus;

        if (bulkStatus === "scheduled") {
          const baseDate = bulkScheduleDate ? new Date(bulkScheduleDate) : new Date();
          // Add interval for each successfully imported article
          const scheduledTime = new Date(
            baseDate.getTime() + importedCount * bulkScheduleInterval * 60 * 60 * 1000,
          );
          scheduledAt = scheduledTime.toISOString();
        } else if (bulkStatus === "published") {
          publishedAt = new Date().toISOString();
        }

        // Clean content - extract just the body content if full HTML
        let cleanContent = post.content || "";
        if (cleanContent.includes("<!DOCTYPE html>") || cleanContent.includes("<html")) {
          const bodyMatch = cleanContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch) {
            cleanContent = bodyMatch[1];
          }
        }

        const excerpt = (post.excerpt || deriveExcerptFromHtml(cleanContent) || "").substring(0, 160);
        const metaDescription = (post.meta_description || excerpt || "").substring(0, 160);

        // Create article
        const articleData = {
          title: (post.title || "Untitled").substring(0, 200),
          slug,
          content: cleanContent,
          excerpt,
          category: post.category || "General",
          tags: normalizeStringList(post.tags),
          keywords: normalizeStringList(post.keywords),
          meta_description: metaDescription,
          featured_image: post.featured_image || null,
          author: post.author || "Admin",
          read_time: parseReadTimeMinutes(post.read_time),
          status: articleStatus,
          published_at: publishedAt,
          scheduled_at: scheduledAt,
        };

        const { error } = await supabase.from("articles").insert([articleData]);
        if (error) {
          console.error("Insert error for", slug, error);
          errors.push(`${(post.title || slug).substring(0, 30)}... : ${error.message}`);
        } else {
          importedCount++;
        }
      }

      if (importedCount > 0) {
        toast({
          title: "Bulk Import Complete",
          description: `Successfully imported ${importedCount} articles${
            skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ""
          }${errors.length > 0 ? ` (${errors.length} errors)` : ""}`,
        });
      } else if (errors.length > 0) {
        toast({
          title: "Import Failed",
          description: errors[0],
          variant: "destructive",
        });
      } else {
        toast({
          title: "No Articles Imported",
          description: `All ${skippedCount} articles were duplicates`,
        });
      }

      setShowBulkImport(false);
      setImportedPosts([]);
      setSelectedPosts(new Set());
      fetchArticles();
    } catch (error: any) {
      console.error("Error during bulk import:", error);
      toast({
        title: "Import Error",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const generateSitemap = () => {
    const publishedArticles = articles.filter((a) => a.status === "published");
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${WEBSITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${WEBSITE_URL}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${publishedArticles
  .map(
    (article) => `  <url>
    <loc>${WEBSITE_URL}/blog/${article.slug}</loc>
    <lastmod>${new Date(article.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    const blob = new Blob([sitemap], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sitemap.xml";
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Success", description: "Sitemap generated for extensionto.com" });
  };

  const generateRobotsTxt = () => {
    const robots = `User-agent: *
Allow: /
Allow: /blog
Allow: /blog/*

Sitemap: ${WEBSITE_URL}/sitemap.xml

# Block admin pages
Disallow: /admin
Disallow: /admin/*`;

    const blob = new Blob([robots], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "robots.txt";
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Success", description: "robots.txt generated" });
  };

  const copyArticleUrl = (slug: string) => {
    const url = `${WEBSITE_URL}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: "Article URL copied to clipboard" });
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || article.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.status === "published").length,
    drafts: articles.filter((a) => a.status === "draft").length,
    scheduled: articles.filter((a) => a.status === "scheduled").length,
    totalViews: articles.reduce((sum, a) => sum + (a.views || 0), 0),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin Dashboard"
        noindex
        canonicalPath="/settings/manage"
      />
      {/* Admin Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-heading text-lg font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">extensionto.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {localStorage.getItem("admin_email")}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Action Buttons */}
          <div className="mb-8 flex flex-wrap gap-2">
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Button>
            <label>
              <Button variant="outline" asChild>
                <span>
                  <FileJson className="mr-2 h-4 w-4" />
                  Bulk Import JSON
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleBulkJsonUpload}
                className="hidden"
              />
            </label>
            <Button variant="outline" onClick={() => setShowBulkSchedule(true)}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Bulk Schedule
            </Button>
            <Button variant="outline" onClick={() => setShowBulkUpdate(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Bulk Update
            </Button>
            <Button variant="outline" onClick={handleExportArticles}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="secondary" onClick={handleFullBackup}>
              <Database className="mr-2 h-4 w-4" />
              Full Backup
            </Button>
            <label>
              <Button variant="secondary" asChild>
                <span>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restore
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
            </label>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-5">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Articles</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.published}</p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <Edit className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.drafts}</p>
                  <p className="text-sm text-muted-foreground">Drafts</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.scheduled}</p>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="articles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="links">Links Manager</TabsTrigger>
              <TabsTrigger value="seo">SEO Tools</TabsTrigger>
              <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            </TabsList>

            <TabsContent value="articles" className="space-y-4">
              {/* Article Categorizer */}
              <ArticleCategorizer 
                articles={articles} 
                onCategorized={fetchArticles} 
              />

              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Articles Table */}
              <div className="glass-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Publish Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredArticles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No articles found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredArticles.map((article) => (
                        <TableRow key={article.id}>
                          {/* Image Indicator */}
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {article.featured_image ? (
                                <div className="relative group">
                                  <div className="w-10 h-10 rounded-md overflow-hidden border border-border bg-muted">
                                    <img 
                                      src={article.featured_image} 
                                      alt="" 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                      }}
                                    />
                                  </div>
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <Image className="w-2.5 h-2.5 text-white" />
                                  </span>
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-md border border-dashed border-muted-foreground/30 bg-muted/50 flex items-center justify-center">
                                  <ImageOff className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium line-clamp-1">{article.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                /{article.slug}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{article.category}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                article.status === "published"
                                  ? "bg-green-500/10 text-green-500"
                                  : article.status === "scheduled"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-yellow-500/10 text-yellow-500"
                              }`}
                            >
                              {article.status}
                            </span>
                          </TableCell>
                          <TableCell>{article.views || 0}</TableCell>
                          {/* Publish Date Column */}
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              {article.status === "scheduled" && article.scheduled_at ? (
                                <div className="flex items-center gap-1.5 text-blue-500">
                                  <CalendarCheck className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">
                                    {new Date(article.scheduled_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              ) : article.status === "published" && article.published_at ? (
                                <div className="flex items-center gap-1.5 text-green-500">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">
                                    {new Date(article.published_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                Created: {new Date(article.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/settings/seo/${article.slug}`)}
                                title="SEO Analysis"
                                className="text-primary hover:text-primary"
                              >
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyArticleUrl(article.slug)}
                                title="Copy URL"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/blog/${article.slug}`, "_blank")}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(article)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(article)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Links Manager Tab */}
            <TabsContent value="links" className="space-y-4">
              {/* Auto Internal Linking Tool */}
              <div className="glass-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wand2 className="h-8 w-8 text-purple-500" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">Auto Internal Linking</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically add internal links to all published articles
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setApplyingInternalLinks(true);
                      try {
                        const publishedArticles = articles.filter(a => a.status === "published");
                        let updatedCount = 0;
                        
                        for (const article of publishedArticles) {
                          const processedContent = processArticleWithLinks(
                            {
                              id: article.id,
                              title: article.title,
                              slug: article.slug,
                              content: article.content,
                              category: article.category,
                              tags: article.tags,
                              keywords: article.keywords,
                            },
                            publishedArticles.map(a => ({
                              id: a.id,
                              title: a.title,
                              slug: a.slug,
                              content: a.content,
                              category: a.category,
                              tags: a.tags,
                              keywords: a.keywords,
                            })),
                            { maxInlineLinks: 5, addRelatedSection: false }
                          );
                          
                          // Only update if content changed
                          if (processedContent !== article.content) {
                            const { error } = await supabase
                              .from("articles")
                              .update({ content: processedContent })
                              .eq("id", article.id);
                            
                            if (!error) updatedCount++;
                          }
                        }
                        
                        toast({
                          title: "Internal Links Applied",
                          description: `Updated ${updatedCount} articles with internal links`,
                        });
                        fetchArticles();
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to apply internal links",
                          variant: "destructive",
                        });
                      } finally {
                        setApplyingInternalLinks(false);
                      }
                    }}
                    disabled={applyingInternalLinks || articles.filter(a => a.status === "published").length < 2}
                  >
                    {applyingInternalLinks ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Apply to All Articles
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Scans all published articles for keyword matches</p>
                  <p>• Adds up to 5 internal links per article</p>
                  <p>• Links are based on article titles, tags, and keywords</p>
                  <p>• Only the first occurrence of each keyword is linked</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Internal Links */}
                <div className="glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <LinkIcon className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">Internal Links</h3>
                      <p className="text-sm text-muted-foreground">
                        Links between your articles
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {articles.filter(a => a.status === "published").map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{article.title}</p>
                          <code className="text-xs text-muted-foreground">
                            /blog/{article.slug}
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const linkHtml = `<a href="/blog/${article.slug}">${article.title}</a>`;
                            navigator.clipboard.writeText(linkHtml);
                            toast({ title: "Copied", description: "Internal link HTML copied" });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {articles.filter(a => a.status === "published").length === 0 && (
                      <p className="py-4 text-center text-muted-foreground">No published articles</p>
                    )}
                  </div>
                </div>

                {/* External Links - Extensions */}
                <div className="glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <ExternalLink className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">Extension Links</h3>
                      <p className="text-sm text-muted-foreground">
                        Chrome Web Store extensions
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {[
                      { name: "Quick Screenshot Lite", id: "hddickadgkbfpcelmckpjhcfnoeognee" },
                      { name: "Auto Dark Mode Switcher", id: "obbhliekbfgpcdippngphefofiicgjml" },
                      { name: "Redirect Shield", id: "pofolffdhjffglfphiagpbnlegjbnbhp" },
                      { name: "ProTab Suspender", id: "gghjdfjjffegohpjhmcmgeonmcomilgj" },
                      { name: "Light Popup Blocker", id: "oimngcokgckajdlphggpjpbeljoakpii" },
                      { name: "Formula Builder Pro", id: "ecmfloopolmkamoklcepdonahkigjlnn" },
                      { name: "SecuraKey Pro", id: "omeencccnkninlofbggfcfiohapajhgi" },
                      { name: "Offline Reader Pro", id: "bgbojccanmjdniomhccefkakjaedajhf" },
                      { name: "Cookie Banner Blocker", id: "mlmiefaloipcahfcgfbccadnnjgpipge" },
                    ].map((ext) => (
                      <div
                        key={ext.id}
                        className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{ext.name}</p>
                          <code className="text-xs text-muted-foreground truncate block">
                            chrome.google.com/webstore/detail/{ext.id}
                          </code>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const linkHtml = `<a href="https://chromewebstore.google.com/detail/${ext.id}" target="_blank" rel="noopener">${ext.name}</a>`;
                              navigator.clipboard.writeText(linkHtml);
                              toast({ title: "Copied", description: "Extension link HTML copied" });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://chromewebstore.google.com/detail/${ext.id}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Link Generator */}
              <div className="glass-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <LinkIcon className="h-8 w-8 text-purple-500" />
                  <div>
                    <h3 className="font-heading text-lg font-semibold">Quick Link Generator</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate HTML links quickly
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block">Article to Link</Label>
                    <Select
                      onValueChange={(slug) => {
                        const article = articles.find(a => a.slug === slug);
                        if (article) {
                          const linkHtml = `<a href="/blog/${article.slug}">${article.title}</a>`;
                          navigator.clipboard.writeText(linkHtml);
                          toast({ title: "Link Copied!", description: `Internal link for "${article.title}" copied` });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select article to copy link" />
                      </SelectTrigger>
                      <SelectContent>
                        {articles.filter(a => a.status === "published").map((article) => (
                          <SelectItem key={article.id} value={article.slug}>
                            {article.title.length > 50 ? article.title.substring(0, 50) + "..." : article.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block">All Published Links (Markdown)</Label>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        const links = articles
                          .filter(a => a.status === "published")
                          .map(a => `- [${a.title}](/blog/${a.slug})`)
                          .join("\n");
                        navigator.clipboard.writeText(links);
                        toast({ title: "Copied!", description: "All article links copied as Markdown" });
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All Links (Markdown)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Related Articles Helper */}
              <div className="glass-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Tag className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-heading text-lg font-semibold">Related Articles by Category</h3>
                    <p className="text-sm text-muted-foreground">
                      Find articles to link between
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[...new Set(articles.map(a => a.category))].filter(Boolean).map((category) => (
                    <div key={category} className="rounded-lg border border-border p-3">
                      <h4 className="mb-2 font-medium">{category}</h4>
                      <div className="space-y-1">
                        {articles.filter(a => a.category === category && a.status === "published").slice(0, 3).map((article) => (
                          <button
                            key={article.id}
                            className="block w-full truncate rounded bg-muted/50 px-2 py-1 text-left text-xs hover:bg-muted"
                            onClick={() => {
                              const linkHtml = `<a href="/blog/${article.slug}">${article.title}</a>`;
                              navigator.clipboard.writeText(linkHtml);
                              toast({ title: "Copied", description: "Link copied to clipboard" });
                            }}
                          >
                            {article.title.length > 30 ? article.title.substring(0, 30) + "..." : article.title}
                          </button>
                        ))}
                        {articles.filter(a => a.category === category && a.status === "published").length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{articles.filter(a => a.category === category && a.status === "published").length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Globe className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">Sitemap Generator</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate XML sitemap for {WEBSITE_URL}
                      </p>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Includes {stats.published} published articles for search engine indexing.
                  </p>
                  <Button onClick={generateSitemap}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Sitemap
                  </Button>
                </div>
                <div className="glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Settings className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">Robots.txt Generator</h3>
                      <p className="text-sm text-muted-foreground">
                        Crawler instructions for search engines
                      </p>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Allows indexing of public pages and blocks admin areas.
                  </p>
                  <Button onClick={generateRobotsTxt}>
                    <Settings className="mr-2 h-4 w-4" />
                    Generate robots.txt
                  </Button>
                </div>
              </div>

              {/* URL Preview */}
              <div className="glass-card p-6">
                <h3 className="mb-4 font-heading text-lg font-semibold">Published Article URLs</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {articles
                    .filter((a) => a.status === "published")
                    .map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{article.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {WEBSITE_URL}/blog/{article.slug}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyArticleUrl(article.slug)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`${WEBSITE_URL}/blog/${article.slug}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {stats.published === 0 && (
                    <p className="text-center py-4 text-muted-foreground">
                      No published articles yet
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="backup" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Database className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">Full Backup</h3>
                      <p className="text-sm text-muted-foreground">
                        Download complete site backup
                      </p>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Exports all {stats.total} articles with metadata to a JSON file.
                    Use this to restore your site in case of data loss.
                  </p>
                  <Button onClick={handleFullBackup} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Full Backup
                  </Button>
                </div>

                <div className="glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <RefreshCw className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">Restore Backup</h3>
                      <p className="text-sm text-muted-foreground">
                        Restore from a backup file
                      </p>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    ⚠️ Warning: This will replace ALL existing articles with the backup data.
                  </p>
                  <label className="w-full">
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Backup File
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Archive className="h-8 w-8 text-purple-500" />
                  <div>
                    <h3 className="font-heading text-lg font-semibold">Import Articles</h3>
                    <p className="text-sm text-muted-foreground">
                      Add articles from JSON file
                    </p>
                  </div>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Import articles without deleting existing ones. Duplicates (same slug) will be skipped.
                </p>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <Button variant="secondary" className="w-full" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Import JSON
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportArticles}
                      className="hidden"
                    />
                  </label>
                  <Button variant="outline" onClick={handleExportArticles}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Articles
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Article Editor Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentArticle.id ? "Edit Article" : "New Article"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={currentArticle.title || ""}
                  onChange={(e) => {
                    setCurrentArticle({
                      ...currentArticle,
                      title: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  placeholder="Article title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <div className="space-y-1">
                  <Input
                    id="slug"
                    value={currentArticle.slug || ""}
                    onChange={(e) =>
                      setCurrentArticle({ ...currentArticle, slug: e.target.value })
                    }
                    placeholder="article-url-slug"
                  />
                  <p className="text-xs text-muted-foreground">
                    {WEBSITE_URL}/blog/{currentArticle.slug || "your-article-slug"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={currentArticle.category || "General"}
                  onValueChange={(value) =>
                    setCurrentArticle({ ...currentArticle, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Tutorial">Tutorial</SelectItem>
                    <SelectItem value="Tips">Tips & Tricks</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Chrome Extensions">Chrome Extensions</SelectItem>
                    <SelectItem value="Productivity">Productivity</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={currentArticle.status || "draft"}
                  onValueChange={(value) =>
                    setCurrentArticle({ ...currentArticle, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="read_time">Read Time (min)</Label>
                <Input
                  id="read_time"
                  type="number"
                  value={currentArticle.read_time || 5}
                  onChange={(e) =>
                    setCurrentArticle({
                      ...currentArticle,
                      read_time: parseInt(e.target.value) || 5,
                    })
                  }
                />
              </div>
            </div>

            {currentArticle.status === "scheduled" && (
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Schedule Date</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={currentArticle.scheduled_at?.slice(0, 16) || ""}
                  onChange={(e) =>
                    setCurrentArticle({ ...currentArticle, scheduled_at: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="featured_image">Featured Image URL</Label>
              <Input
                id="featured_image"
                value={currentArticle.featured_image || ""}
                onChange={(e) =>
                  setCurrentArticle({ ...currentArticle, featured_image: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={currentArticle.excerpt || ""}
                onChange={(e) =>
                  setCurrentArticle({ ...currentArticle, excerpt: e.target.value })
                }
                placeholder="Brief description of the article..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="content">Content</Label>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={contentEditorMode === "html" ? "default" : "outline"}
                    onClick={() => setContentEditorMode("html")}
                  >
                    HTML
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={contentEditorMode === "preview" ? "default" : "outline"}
                    onClick={() => setContentEditorMode("preview")}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>

                  <div className="hidden h-6 w-px bg-border md:block" />

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const el = contentTextareaRef.current;
                      if (!el) return;
                      const value = currentArticle.content || "";
                      const start = el.selectionStart ?? value.length;
                      const end = el.selectionEnd ?? value.length;
                      const selected = value.slice(start, end) || "Heading";
                      const next = `${value.slice(0, start)}<h1>${selected}</h1>${value.slice(end)}`;
                      setCurrentArticle((prev) => ({ ...prev, content: next }));
                      requestAnimationFrame(() => {
                        el.focus();
                        el.setSelectionRange(start + 4, start + 4 + selected.length);
                      });
                    }}
                  >
                    H1
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const el = contentTextareaRef.current;
                      if (!el) return;
                      const value = currentArticle.content || "";
                      const start = el.selectionStart ?? value.length;
                      const end = el.selectionEnd ?? value.length;
                      const selected = value.slice(start, end) || "Heading";
                      const next = `${value.slice(0, start)}<h2>${selected}</h2>${value.slice(end)}`;
                      setCurrentArticle((prev) => ({ ...prev, content: next }));
                      requestAnimationFrame(() => {
                        el.focus();
                        el.setSelectionRange(start + 4, start + 4 + selected.length);
                      });
                    }}
                  >
                    H2
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const el = contentTextareaRef.current;
                      if (!el) return;
                      const value = currentArticle.content || "";
                      const start = el.selectionStart ?? value.length;
                      const end = el.selectionEnd ?? value.length;
                      const selected = value.slice(start, end) || "Heading";
                      const next = `${value.slice(0, start)}<h3>${selected}</h3>${value.slice(end)}`;
                      setCurrentArticle((prev) => ({ ...prev, content: next }));
                      requestAnimationFrame(() => {
                        el.focus();
                        el.setSelectionRange(start + 4, start + 4 + selected.length);
                      });
                    }}
                  >
                    H3
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const el = contentTextareaRef.current;
                      if (!el) return;
                      const value = currentArticle.content || "";
                      const start = el.selectionStart ?? value.length;
                      const end = el.selectionEnd ?? value.length;
                      const selected = value.slice(start, end) || "Heading";
                      const next = `${value.slice(0, start)}<h4>${selected}</h4>${value.slice(end)}`;
                      setCurrentArticle((prev) => ({ ...prev, content: next }));
                      requestAnimationFrame(() => {
                        el.focus();
                        el.setSelectionRange(start + 4, start + 4 + selected.length);
                      });
                    }}
                  >
                    H4
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const el = contentTextareaRef.current;
                      if (!el) return;
                      const value = currentArticle.content || "";
                      const start = el.selectionStart ?? value.length;
                      const end = el.selectionEnd ?? value.length;
                      const table =
                        "<table>\n  <thead>\n    <tr>\n      <th>Title</th>\n      <th>Value</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Row 1</td>\n      <td>...</td>\n    </tr>\n  </tbody>\n</table>\n";
                      const next = `${value.slice(0, start)}${table}${value.slice(end)}`;
                      setCurrentArticle((prev) => ({ ...prev, content: next }));
                      requestAnimationFrame(() => {
                        el.focus();
                        el.setSelectionRange(start + table.length, start + table.length);
                      });
                    }}
                  >
                    Table
                  </Button>
                </div>
              </div>

              {contentEditorMode === "html" ? (
                <Textarea
                  id="content"
                  ref={contentTextareaRef}
                  value={currentArticle.content || ""}
                  onChange={(e) => setCurrentArticle({ ...currentArticle, content: e.target.value })}
                  placeholder="<h1>Title</h1>\n<p>Your article content in HTML...</p>"
                  rows={12}
                  className="font-mono text-sm"
                />
              ) : (
                <div className="max-h-[420px] overflow-y-auto rounded-md border border-border bg-background p-4">
                  <div
                    className="prose prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: (currentArticle.content || "").includes("<!DOCTYPE html>")
                        ? (currentArticle.content || "").replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")
                        : (currentArticle.content || ""),
                    }}
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                استعمل H1/H2/H3 والجداول داخل HTML، ثم اضغط Preview لمعاينة شكل المقال مثل ووردبريس.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="chrome, extension, productivity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">SEO Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="chrome extensions, browser tools"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={currentArticle.meta_description || ""}
                onChange={(e) =>
                  setCurrentArticle({ ...currentArticle, meta_description: e.target.value })
                }
                placeholder="SEO meta description (max 160 characters)"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                {(currentArticle.meta_description?.length || 0)}/160 characters
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setCurrentArticle(defaultArticle);
                  setTagsInput("");
                  setKeywordsInput("");
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Article
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Bulk Import Articles ({importedPosts.length} found)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Import Settings */}
            <div className="glass-card p-4">
              <h3 className="mb-4 font-semibold">Import Settings</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status for All Articles</Label>
                  <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {bulkStatus === "scheduled" && (
                  <>
                    <div className="space-y-2">
                      <Label>Start Schedule Date</Label>
                      <Input
                        type="datetime-local"
                        value={bulkScheduleDate}
                        onChange={(e) => setBulkScheduleDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hours Between Articles</Label>
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        value={bulkScheduleInterval}
                        onChange={(e) => setBulkScheduleInterval(parseInt(e.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Articles will be scheduled {bulkScheduleInterval}h apart
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedPosts.size === importedPosts.length}
                  onCheckedChange={toggleSelectAll}
                />
                <Label className="cursor-pointer" onClick={toggleSelectAll}>
                  Select All ({selectedPosts.size}/{importedPosts.length})
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedPosts.size} articles selected for import
              </p>
            </div>

            {/* Articles List */}
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {importedPosts.map((post, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    selectedPosts.has(index.toString())
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedPosts.has(index.toString())}
                    onCheckedChange={() => togglePostSelection(index.toString())}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-1 font-medium">
                      {post.title.length > 100 ? post.title.substring(0, 100) + "..." : post.title}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-secondary px-2 py-0.5">
                        {post.category || "General"}
                      </span>
                      <span>
                        {post.content?.length || 0} characters
                      </span>
                      {post.tags && post.tags.length > 0 && (
                        <span>{post.tags.length} tags</span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {post.excerpt.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkImport(false);
                  setImportedPosts([]);
                  setSelectedPosts(new Set());
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={processBulkImport} disabled={selectedPosts.size === 0 || importing}>
                {importing ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Import {selectedPosts.size} Articles
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{articleToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setArticleToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Schedule Dialog */}
      <BulkScheduleDialog
        open={showBulkSchedule}
        onOpenChange={setShowBulkSchedule}
        articles={articles}
        onSuccess={fetchArticles}
      />

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        open={showBulkUpdate}
        onOpenChange={setShowBulkUpdate}
        articles={articles}
        onSuccess={fetchArticles}
      />
    </div>
  );
};

export default Admin;
