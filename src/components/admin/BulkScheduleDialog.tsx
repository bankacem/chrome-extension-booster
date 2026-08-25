import { useState, useMemo } from "react";
import { CalendarClock, CalendarDays, Clock, CheckSquare, X, AlertTriangle } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errorMessage";

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}

interface BulkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: Article[];
  onSuccess: () => void;
}

type DistributionMode = "even" | "daily" | "custom";

const BulkScheduleDialog = ({
  open,
  onOpenChange,
  articles,
  onSuccess,
}: BulkScheduleDialogProps) => {
  const { toast } = useToast();
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "scheduled">("all");
  
  // Schedule settings
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [distributionMode, setDistributionMode] = useState<DistributionMode>("even");
  const [customInterval, setCustomInterval] = useState(4); // hours
  const [articlesPerDay, setArticlesPerDay] = useState(3);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  
  const [scheduling, setScheduling] = useState(false);

  // Filter articles that can be scheduled (draft or scheduled)
  const schedulableArticles = useMemo(() => {
    return articles.filter((a) => {
      if (a.status === "published") return false;
      if (filterStatus === "all") return true;
      return a.status === filterStatus;
    });
  }, [articles, filterStatus]);

  // Calculate schedule preview
  const schedulePreview = useMemo(() => {
    if (selectedIds.size === 0 || !startDate) return [];
    
    const selectedArticles = schedulableArticles.filter((a) => selectedIds.has(a.id));
    const start = new Date(startDate);
    const preview: { article: Article; scheduledAt: Date }[] = [];
    
    if (distributionMode === "even" && endDate) {
      // Distribute evenly between start and end
      const end = new Date(endDate);
      const totalMs = end.getTime() - start.getTime();
      const intervalMs = selectedArticles.length > 1 
        ? totalMs / (selectedArticles.length - 1)
        : 0;
      
      selectedArticles.forEach((article, index) => {
        const scheduledAt = new Date(start.getTime() + intervalMs * index);
        preview.push({ article, scheduledAt });
      });
    } else if (distributionMode === "daily") {
      // Distribute X articles per day within working hours
      const currentDate = new Date(start);
      currentDate.setHours(startHour, 0, 0, 0);
      let articlesThisDay = 0;
      const hoursSpread = endHour - startHour;
      const intervalHours = hoursSpread / Math.max(articlesPerDay - 1, 1);
      
      selectedArticles.forEach((article) => {
        if (articlesThisDay >= articlesPerDay) {
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(startHour, 0, 0, 0);
          articlesThisDay = 0;
        }
        
        const scheduledAt = new Date(currentDate);
        if (articlesThisDay > 0) {
          scheduledAt.setHours(startHour + Math.round(intervalHours * articlesThisDay));
        }
        
        preview.push({ article, scheduledAt });
        articlesThisDay++;
      });
    } else {
      // Custom interval (hours between each)
      selectedArticles.forEach((article, index) => {
        const scheduledAt = new Date(start.getTime() + index * customInterval * 60 * 60 * 1000);
        preview.push({ article, scheduledAt });
      });
    }
    
    return preview.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }, [selectedIds, schedulableArticles, startDate, endDate, distributionMode, customInterval, articlesPerDay, startHour, endHour]);

  // Get summary info
  const scheduleSummary = useMemo(() => {
    if (schedulePreview.length === 0) return null;
    
    const first = schedulePreview[0]?.scheduledAt;
    const last = schedulePreview[schedulePreview.length - 1]?.scheduledAt;
    const days = first && last 
      ? Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;
    
    return {
      count: schedulePreview.length,
      firstDate: first,
      lastDate: last,
      totalDays: days,
    };
  }, [schedulePreview]);

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
    if (selectedIds.size === schedulableArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(schedulableArticles.map((a) => a.id)));
    }
  };

  const handleSchedule = async () => {
    if (schedulePreview.length === 0) {
      toast({
        title: "No articles selected",
        description: "Please select at least one article to schedule",
        variant: "destructive",
      });
      return;
    }

    setScheduling(true);
    let successCount = 0;
    const errors: string[] = [];

    try {
      for (const { article, scheduledAt } of schedulePreview) {
        const { error } = await supabase
          .from("articles")
          .update({
            status: "scheduled",
            scheduled_at: scheduledAt.toISOString(),
          })
          .eq("id", article.id);

        if (error) {
          errors.push(`${article.title.substring(0, 30)}...: ${error.message}`);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Scheduling Complete",
          description: `Successfully scheduled ${successCount} articles${
            errors.length > 0 ? ` (${errors.length} failed)` : ""
          }`,
        });
        onSuccess();
        onOpenChange(false);
        setSelectedIds(new Set());
      } else {
        toast({
          title: "Scheduling Failed",
          description: errors[0] || "Failed to schedule articles",
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
      setScheduling(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Bulk Schedule Articles
          </DialogTitle>
          <DialogDescription>
            Schedule multiple articles at once with smart distribution
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Select Articles</h3>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "draft" | "scheduled")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === schedulableArticles.length && schedulableArticles.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <Label className="cursor-pointer" onClick={toggleSelectAll}>
                Select All ({selectedIds.size}/{schedulableArticles.length})
              </Label>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {schedulableArticles.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No schedulable articles found</span>
                </div>
              ) : (
                schedulableArticles.map((article) => (
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
                          article.status === "draft" 
                            ? "bg-yellow-500/10 text-yellow-500" 
                            : "bg-blue-500/10 text-blue-500"
                        }`}>
                          {article.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Schedule Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Schedule Settings</h3>

            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                {distributionMode === "even" && (
                  <div className="space-y-2">
                    <Label>End Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Distribution Mode</Label>
                <Select value={distributionMode} onValueChange={(v) => setDistributionMode(v as DistributionMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="even">Even Distribution (Start → End)</SelectItem>
                    <SelectItem value="daily">Daily Limit (X articles/day)</SelectItem>
                    <SelectItem value="custom">Custom Interval (hours apart)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {distributionMode === "daily" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Articles/Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={articlesPerDay}
                      onChange={(e) => setArticlesPerDay(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Hour</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={startHour}
                      onChange={(e) => setStartHour(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Hour</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={endHour}
                      onChange={(e) => setEndHour(parseInt(e.target.value) || 23)}
                    />
                  </div>
                </div>
              )}

              {distributionMode === "custom" && (
                <div className="space-y-2">
                  <Label>Hours Between Articles</Label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={customInterval}
                    onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Each article will be scheduled {customInterval}h after the previous one
                  </p>
                </div>
              )}
            </div>

            {/* Summary */}
            {scheduleSummary && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-primary">Schedule Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Articles:</span>{" "}
                    <span className="font-medium">{scheduleSummary.count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days:</span>{" "}
                    <span className="font-medium">{scheduleSummary.totalDays}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">First:</span>{" "}
                    <span className="font-medium">
                      {scheduleSummary.firstDate && formatDate(scheduleSummary.firstDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last:</span>{" "}
                    <span className="font-medium">
                      {scheduleSummary.lastDate && formatDate(scheduleSummary.lastDate)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Preview Table */}
        {schedulePreview.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule Preview
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedulePreview.map((item, index) => (
                    <TableRow key={item.article.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="max-w-xs truncate font-medium">
                        {item.article.title}
                      </TableCell>
                      <TableCell>{formatDate(item.scheduledAt)}</TableCell>
                      <TableCell>{formatTime(item.scheduledAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={scheduling}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={scheduling || schedulePreview.length === 0}>
            {scheduling ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Scheduling...
              </>
            ) : (
              <>
                <CheckSquare className="mr-2 h-4 w-4" />
                Schedule {schedulePreview.length} Articles
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkScheduleDialog;
