import { useState, useMemo } from "react";
import { RefreshCw, CheckSquare, X, AlertTriangle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorMessage";

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  author: string | null;
}

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: Article[];
  onSuccess: () => void;
}

type UpdateField = "status" | "category" | "author";
type FilterStatus = "all" | "draft" | "published" | "scheduled";
type NewStatus = "draft" | "published";
type ArticleUpdate = { status?: NewStatus; published_at?: string | null; scheduled_at?: string | null; category?: string; author?: string };

const BulkUpdateDialog = ({
  open,
  onOpenChange,
  articles,
  onSuccess,
}: BulkUpdateDialogProps) => {
  const { toast } = useToast();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  
  // Update settings
  const [updateField, setUpdateField] = useState<UpdateField>("status");
  const [newStatus, setNewStatus] = useState<NewStatus>("draft");
  const [newCategory, setNewCategory] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  
  const [updating, setUpdating] = useState(false);

  const filteredArticles = useMemo(() => {
    if (filterStatus === "all") return articles;
    return articles.filter((a) => a.status === filterStatus);
  }, [articles, filterStatus]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [articles]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArticles.map((a) => a.id)));
    }
  };

  const handleUpdate = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No articles selected",
        description: "Please select at least one article to update",
        variant: "destructive",
      });
      return;
    }

    const updateData: ArticleUpdate = {};
    
    if (updateField === "status") {
      updateData.status = newStatus;
      if (newStatus === "published") {
        updateData.published_at = new Date().toISOString();
        updateData.scheduled_at = null;
      } else if (newStatus === "draft") {
        updateData.published_at = null;
        updateData.scheduled_at = null;
      }
    } else if (updateField === "category" && newCategory) {
      updateData.category = newCategory;
    } else if (updateField === "author" && newAuthor) {
      updateData.author = newAuthor;
    }

    if (Object.keys(updateData).length === 0) {
      toast({
        title: "No changes",
        description: "Please specify a value to update",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    let successCount = 0;
    const errors: string[] = [];

    try {
      for (const id of selectedIds) {
        const { error } = await supabase
          .from("articles")
          .update(updateData)
          .eq("id", id);

        if (error) {
          const article = articles.find((a) => a.id === id);
          errors.push(`${article?.title.substring(0, 30)}...: ${error.message}`);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Update Complete",
          description: `Successfully updated ${successCount} articles${
            errors.length > 0 ? ` (${errors.length} failed)` : ""
          }`,
        });
        onSuccess();
        onOpenChange(false);
        setSelectedIds(new Set());
      } else {
        toast({
          title: "Update Failed",
          description: errors[0] || "Failed to update articles",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Bulk Update Articles
          </DialogTitle>
          <DialogDescription>
            Update multiple articles at once - change status, category, or author
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Select Articles</h3>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === filteredArticles.length && filteredArticles.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <Label className="cursor-pointer" onClick={toggleSelectAll}>
                Select All ({selectedIds.size}/{filteredArticles.length})
              </Label>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {filteredArticles.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No articles found</span>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className={`flex items-center gap-3 rounded-lg border p-2 transition-colors cursor-pointer ${
                      selectedIds.has(article.id)
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                    onClick={() => toggleSelect(article.id)}
                  >
                    <Checkbox checked={selectedIds.has(article.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{article.title}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className={`rounded px-1 ${
                          article.status === "published"
                            ? "bg-green-500/10 text-green-500"
                            : article.status === "scheduled"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-yellow-500/10 text-yellow-500"
                        }`}>
                          {article.status}
                        </span>
                        {article.category && (
                          <span className="rounded bg-secondary px-1">{article.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Update Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Update Settings</h3>

            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label>What to Update</Label>
                <Select value={updateField} onValueChange={(v) => setUpdateField(v as UpdateField)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="author">Author</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {updateField === "status" && (
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as NewStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {newStatus === "published" 
                      ? "Articles will be published immediately"
                      : "Articles will be moved to drafts"}
                  </p>
                </div>
              )}

              {updateField === "category" && (
                <div className="space-y-2">
                  <Label>New Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
              )}

              {updateField === "author" && (
                <div className="space-y-2">
                  <Label>New Author</Label>
                  <Input
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Author name"
                  />
                </div>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <p className="text-sm">
                  <span className="font-semibold text-primary">{selectedIds.size}</span> articles will be updated
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={updating || selectedIds.size === 0}>
            {updating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update {selectedIds.size} Articles
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateDialog;
