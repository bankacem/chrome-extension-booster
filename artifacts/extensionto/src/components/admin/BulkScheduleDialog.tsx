import { useState, useMemo } from "react";
import { CalendarClock, CalendarDays, Clock, CheckSquare, X, AlertTriangle, Loader2 } from "lucide-react";
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
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "scheduled">("all");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [distributionMode, setDistributionMode] = useState<DistributionMode>("even");
  const [customInterval, setCustomInterval] = useState(4);
  const [articlesPerDay, setArticlesPerDay] = useState(2);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);

  const [scheduling, setScheduling] = useState(false);

  const schedulableArticles = useMemo(() => {
    return articles.filter((a) => {
      if (a.status === "published") return false;
      if (filterStatus === "all") return true;
      return a.status === filterStatus;
    });
  }, [articles, filterStatus]);

  const schedulePreview = useMemo(() => {
    if (selectedIds.size === 0 || !startDate) return [];
    const selectedArticles = schedulableArticles.filter((a) => selectedIds.has(a.id));
    const start = new Date(startDate);
    const preview: { article: Article; scheduledAt: Date }[] = [];

    if (distributionMode === "even" && endDate) {
      const end = new Date(endDate);
      const totalMs = end.getTime() - start.getTime();
      const intervalMs = selectedArticles.length > 1 ? totalMs / (selectedArticles.length - 1) : 0;
      selectedArticles.forEach((article, index) => {
        preview.push({ article, scheduledAt: new Date(start.getTime() + intervalMs * index) });
      });
    } else if (distributionMode === "daily") {
      let currentDate = new Date(start);
      currentDate.setHours(startHour, 0, 0, 0);
      let articlesThisDay = 0;
      const hoursSpread = endHour - startHour;
      const intervalHours = hoursSpread / Math.max(articlesPerDay - 1, 1);
      selectedArticles.forEach((article) => {
        if (articlesThisDay >= articlesPerDay) {
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
      selectedArticles.forEach((article, index) => {
        preview.push({ article, scheduledAt: new Date(start.getTime() + index * customInterval * 60 * 60 * 1000) });
      });
    }
    return preview.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }, [selectedIds, schedulableArticles, startDate, endDate, distributionMode, customInterval, articlesPerDay, startHour, endHour]);

  const scheduleSummary = useMemo(() => {
    if (schedulePreview.length === 0) return null;
    const first = schedulePreview[0]?.scheduledAt;
    const last = schedulePreview[schedulePreview.length - 1]?.scheduledAt;
    const days = first && last
      ? Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;
    return { count: schedulePreview.length, firstDate: first, lastDate: last, totalDays: days };
  }, [schedulePreview]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.size === schedulableArticles.length
        ? new Set()
        : new Set(schedulableArticles.map((a) => a.id))
    );
  };

  const handleSchedule = async () => {
    if (schedulePreview.length === 0) {
      toast({ title: "No articles selected", description: "Select at least one article to schedule", variant: "destructive" });
      return;
    }
    setScheduling(true);
    let successCount = 0;
    const errors: string[] = [];

    try {
      for (const { article, scheduledAt } of schedulePreview) {
        try {
          await adminApi.schedule(article.slug, scheduledAt.toISOString());
          successCount++;
        } catch (e: unknown) {
          errors.push(`${article.title.slice(0, 30)}: ${String(e)}`);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Bulk Schedule Complete",
          description: `Scheduled ${successCount} article${successCount > 1 ? "s" : ""}${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
        });
        onSuccess();
        onOpenChange(false);
        setSelectedIds(new Set());
      } else {
        toast({ title: "Scheduling Failed", description: errors[0] || "Failed to schedule articles", variant: "destructive" });
      }
    } catch (e: unknown) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Bulk Schedule Articles
          </DialogTitle>
          <DialogDescription>
            Schedule multiple articles at once with smart distribution — no database required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Article selection */}
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
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
                      selectedIds.has(article.id) ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                    }`}
                    onClick={() => toggleSelect(article.id)}
                  >
                    <Checkbox checked={selectedIds.has(article.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{article.title}</p>
                      <span className={`mt-0.5 inline-block rounded px-1 text-[10px] font-medium ${
                        article.status === "draft" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                      }`}>
                        {article.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Schedule settings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Schedule Settings</h3>
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                {distributionMode === "even" && (
                  <div className="space-y-2">
                    <Label>End Date & Time</Label>
                    <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Distribution Mode</Label>
                <Select value={distributionMode} onValueChange={(v) => setDistributionMode(v as DistributionMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input type="number" min={1} max={24} value={articlesPerDay} onChange={(e) => setArticlesPerDay(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Hour</Label>
                    <Input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Hour</Label>
                    <Input type="number" min={0} max={23} value={endHour} onChange={(e) => setEndHour(parseInt(e.target.value) || 23)} />
                  </div>
                </div>
              )}

              {distributionMode === "custom" && (
                <div className="space-y-2">
                  <Label>Hours Between Articles</Label>
                  <Input type="number" min={1} max={168} value={customInterval} onChange={(e) => setCustomInterval(parseInt(e.target.value) || 1)} />
                  <p className="text-xs text-muted-foreground">Each article scheduled {customInterval}h after the previous</p>
                </div>
              )}
            </div>

            {scheduleSummary && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-primary">Schedule Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Articles: </span><span className="font-medium">{scheduleSummary.count}</span></div>
                  <div><span className="text-muted-foreground">Days: </span><span className="font-medium">{scheduleSummary.totalDays}</span></div>
                  <div><span className="text-muted-foreground">First: </span><span className="font-medium">{scheduleSummary.firstDate && fmtDate(scheduleSummary.firstDate)}</span></div>
                  <div><span className="text-muted-foreground">Last: </span><span className="font-medium">{scheduleSummary.lastDate && fmtDate(scheduleSummary.lastDate)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {schedulePreview.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" />
              Schedule Preview ({schedulePreview.length} articles)
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedulePreview.map((item, i) => (
                    <TableRow key={item.article.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="max-w-xs truncate font-medium">{item.article.title}</TableCell>
                      <TableCell className="text-sm">{fmtDate(item.scheduledAt)}</TableCell>
                      <TableCell className="text-sm">{fmtTime(item.scheduledAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={scheduling}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={scheduling || schedulePreview.length === 0}>
            {scheduling
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</>
              : <><CheckSquare className="mr-2 h-4 w-4" /> Schedule {schedulePreview.length} Articles</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkScheduleDialog;
