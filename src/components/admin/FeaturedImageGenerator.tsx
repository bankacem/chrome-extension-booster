import { useState } from "react";
import { Image, ImageOff, Wand2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorMessage";

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  featured_image: string | null;
  status: string;
}

interface Props {
  articles: Article[];
  onSuccess: () => void;
}

export default function FeaturedImageGenerator({ articles, onSuccess }: Props) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState("");
  const [results, setResults] = useState<{ title: string; success: boolean; url?: string }[]>([]);
  const { toast } = useToast();

  // Find articles missing featured images
  const missingImageArticles = articles.filter(
    (a) => a.status === "published" && (!a.featured_image || a.featured_image === "" || a.featured_image === "null")
  );

  const generateSingleImage = async (article: Article) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-featured-image", {
        body: {
          articleId: article.id,
          title: article.title,
          category: article.category,
          slug: article.slug,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { title: article.title, success: true, url: data.imageUrl };
    } catch (err: unknown) {
      console.error(`Failed for "${article.title}":`, getErrorMessage(err));
      return { title: article.title, success: false };
    }
  };

  const handleGenerateAll = async () => {
    if (missingImageArticles.length === 0) {
      toast({ title: "✅ جميع المقالات لديها صور", description: "لا توجد مقالات بدون صور مميزة" });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setResults([]);

    const newResults: { title: string; success: boolean; url?: string }[] = [];

    for (let i = 0; i < missingImageArticles.length; i++) {
      const article = missingImageArticles[i];
      setCurrentArticle(article.title);
      setProgress(Math.round(((i) / missingImageArticles.length) * 100));

      const result = await generateSingleImage(article);
      newResults.push(result);
      setResults([...newResults]);

      // Small delay between requests to avoid rate limiting
      if (i < missingImageArticles.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setProgress(100);
    setGenerating(false);
    setCurrentArticle("");

    const successCount = newResults.filter((r) => r.success).length;
    toast({
      title: `تم توليد ${successCount}/${missingImageArticles.length} صورة`,
      description: successCount > 0 ? "تم تحديث المقالات بنجاح" : "حدث خطأ أثناء التوليد",
      variant: successCount > 0 ? "default" : "destructive",
    });

    if (successCount > 0) onSuccess();
  };

  return (
    <div className="glass-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image className="h-8 w-8 text-amber-500" />
          <div>
            <h3 className="font-heading text-lg font-semibold">مولد الصور المميزة</h3>
            <p className="text-sm text-muted-foreground">
              توليد صور WebP احترافية تلقائياً لجميع المقالات بدون صور
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {missingImageArticles.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-500">
              <ImageOff className="mr-1 inline h-3.5 w-3.5" />
              {missingImageArticles.length} بدون صور
            </span>
          )}
          <Button onClick={handleGenerateAll} disabled={generating || missingImageArticles.length === 0}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري التوليد...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                توليد الصور ({missingImageArticles.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {generating && (
        <div className="mb-4 space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground truncate">
            ⏳ {currentArticle}
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-3">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {r.success ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
              )}
              <span className="truncate">{r.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 text-sm text-muted-foreground space-y-1">
        <p>• يستخدم AI لتوليد صور مع عنوان المقال بشكل واضح</p>
        <p>• الصور بصيغة WebP المفضلة لدى Google</p>
        <p>• الألوان تتغير حسب تصنيف المقال</p>
        <p>• يتم تحديث قاعدة البيانات تلقائياً</p>
      </div>
    </div>
  );
}
