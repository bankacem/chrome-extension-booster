import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock, Globe, Clock, CheckCircle2, XCircle, Loader2,
  RefreshCw, Zap, Calendar, AlertCircle, ChevronRight, Eye,
  ListChecks, CalendarDays, Activity, TrendingUp, CalendarRange,
  SendHorizonal,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { getAllDrafts, invalidateCache, type Article } from "@/lib/content-store";
import BulkScheduleDialog from "@/components/admin/BulkScheduleDialog";

interface QueueItem {
  id: string;
  slug: string;
  title: string;
  category?: string;
  scheduled_at: string;
}

interface LogEntry {
  slug: string;
  title: string;
  published_at: string;
  triggered_by: string;
  status: string;
  error?: string;
}

interface ScheduleQueue {
  queue: QueueItem[];
  todayPublished: number;
}

const DAILY_LIMIT = 2;

function fmtDate(raw: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }).format(new Date(raw));
  } catch { return raw; }
}

function fmtDateTime(raw: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date(raw));
  } catch { return raw; }
}

function fmtRelative(raw: string): string {
  try {
    const diff = new Date(raw).getTime() - Date.now();
    const absMin = Math.round(Math.abs(diff) / 60000);
    if (absMin < 60) return diff < 0 ? `${absMin}m ago` : `in ${absMin}m`;
    const absHr = Math.round(absMin / 60);
    if (absHr < 24) return diff < 0 ? `${absHr}h ago` : `in ${absHr}h`;
    const absDays = Math.round(absHr / 24);
    return diff < 0 ? `${absDays}d ago` : `in ${absDays}d`;
  } catch { return ""; }
}

function groupByDay(items: QueueItem[]): Map<string, QueueItem[]> {
  const map = new Map<string, QueueItem[]>();
  for (const item of items) {
    const day = new Date(item.scheduled_at).toISOString().slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(item);
  }
  return map;
}

function isDue(scheduledAt: string): boolean {
  return new Date(scheduledAt).getTime() <= Date.now();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function AdminScheduler() {
  const { toast } = useToast();

  const [queueData, setQueueData] = useState<ScheduleQueue | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingLog, setLoadingLog] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [autoPublishing, setAutoPublishing] = useState(false);
  const [forcePublishing, setForcePublishing] = useState(false);
  const [forceLimit, setForceLimit] = useState(2);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [cancellingSlug, setCancellingSlug] = useState<string | null>(null);

  const loadQueue = useCallback(async (fresh = false) => {
    setLoadingQueue(true);
    try {
      if (fresh) invalidateCache();
      const data = await adminApi.getScheduleQueue();
      setQueueData(data);
    } catch (e) {
      toast({ title: "Failed to load queue", description: String(e), variant: "destructive" });
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const loadLog = useCallback(async () => {
    setLoadingLog(true);
    try {
      const data = await adminApi.getPublishLog();
      setLog(data);
    } catch { } finally {
      setLoadingLog(false);
    }
  }, []);

  const loadDrafts = useCallback(async (fresh = false) => {
    try {
      const data = await getAllDrafts(fresh);
      setDrafts(data);
    } catch { }
  }, []);

  useEffect(() => {
    loadQueue();
    loadLog();
    loadDrafts();
  }, [loadQueue, loadLog, loadDrafts]);

  const handleAutoPublish = async (triggeredBy: "auto" | "manual" = "manual") => {
    setAutoPublishing(true);
    try {
      const res = await adminApi.autoPublish(DAILY_LIMIT, triggeredBy);
      if (res.published.length > 0) {
        toast({
          title: `Published ${res.published.length} article${res.published.length > 1 ? "s" : ""}`,
          description: `Today: ${res.todayCount}/${res.dailyLimit} published`,
        });
        invalidateCache();
        await Promise.all([loadQueue(true), loadLog(), loadDrafts(true)]);
      } else {
        toast({
          title: res.message ?? "Nothing to publish",
          description: `Today's count: ${res.todayCount}/${res.dailyLimit}`,
        });
      }
    } catch (e) {
      toast({ title: "Auto-publish failed", description: String(e), variant: "destructive" });
    } finally {
      setAutoPublishing(false);
    }
  };

  const handlePublishNow = async (slug: string, title: string) => {
    setPublishing(true);
    try {
      await adminApi.publish(slug);
      toast({ title: "Published!", description: title });
      invalidateCache();
      await Promise.all([loadQueue(true), loadLog(), loadDrafts(true)]);
    } catch (e) {
      toast({ title: "Publish failed", description: String(e), variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const handleForcePublish = async () => {
    setForcePublishing(true);
    try {
      const res = await adminApi.forcePublish(forceLimit);
      if (res.published.length > 0) {
        toast({
          title: `✅ تم نشر ${res.published.length} مقال يدوياً`,
          description: res.published.map(s => `• ${s}`).join("\n"),
        });
        invalidateCache();
        await Promise.all([loadQueue(true), loadLog(), loadDrafts(true)]);
      } else {
        toast({
          title: res.message ?? "لا توجد مقالات مجدولة",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "فشل النشر", description: String(e), variant: "destructive" });
    } finally {
      setForcePublishing(false);
    }
  };

  const handleCancelSchedule = async (slug: string) => {
    setCancellingSlug(slug);
    try {
      await adminApi.unpublish(slug);
      toast({ title: "Schedule cancelled", description: `"${slug}" moved back to draft` });
      invalidateCache();
      await Promise.all([loadQueue(true), loadDrafts(true)]);
    } catch (e) {
      toast({ title: "Cancel failed", description: String(e), variant: "destructive" });
    } finally {
      setCancellingSlug(null);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const queue = queueData?.queue ?? [];
  const todayPublished = queueData?.todayPublished ?? 0;
  const todayQueue = queue.filter((q) => q.scheduled_at.slice(0, 10) === todayStr);
  const dueNow = queue.filter((q) => isDue(q.scheduled_at));
  const upcoming = queue.filter((q) => !isDue(q.scheduled_at));
  const grouped = groupByDay(queue);
  const remainingToday = Math.max(0, DAILY_LIMIT - todayPublished);

  return (
    <>
      <BulkScheduleDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        articles={drafts.map((d) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          status: d.status,
          scheduled_at: (d as { scheduled_at?: string }).scheduled_at ?? null,
          published_at: null,
          created_at: d.created_at ?? new Date().toISOString(),
        }))}
        onSuccess={() => { invalidateCache(); loadQueue(true); loadDrafts(true); }}
      />

      <AdminLayout
        title="Scheduler"
        subtitle="Automate when your content goes live"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { loadQueue(true); loadLog(); }}
              disabled={loadingQueue}
            >
              <RefreshCw className={`h-4 w-4 ${loadingQueue ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <CalendarRange className="mr-1.5 h-4 w-4" />
              Bulk Schedule
            </Button>
            <Button
              size="sm"
              onClick={() => handleAutoPublish("manual")}
              disabled={autoPublishing || dueNow.length === 0 || remainingToday === 0}
            >
              {autoPublishing
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Zap className="mr-1.5 h-4 w-4" />}
              Run Auto-Publish
            </Button>
          </div>
        }
      >
        <Helmet>
          <title>Scheduler | Admin — ExtensionTo</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<CalendarClock className="h-5 w-5" />}
              label="Total Scheduled"
              value={loadingQueue ? "—" : String(queue.length)}
              color="blue"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Due Now"
              value={loadingQueue ? "—" : String(dueNow.length)}
              color={dueNow.length > 0 ? "amber" : "default"}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Published Today"
              value={loadingQueue ? "—" : `${todayPublished} / ${DAILY_LIMIT}`}
              color="green"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Remaining Today"
              value={loadingQueue ? "—" : String(remainingToday)}
              color={remainingToday > 0 ? "primary" : "default"}
            />
          </div>

          {/* Due Now alert */}
          {dueNow.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1 text-sm">
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {dueNow.length} article{dueNow.length > 1 ? "s are" : " is"} due now
                </span>
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  — click "Run Auto-Publish" to release {Math.min(dueNow.length, remainingToday)} of them
                  {remainingToday === 0 ? " (daily limit reached)" : ""}.
                </span>
              </div>
              {remainingToday > 0 && (
                <Button size="sm" onClick={() => handleAutoPublish("manual")} disabled={autoPublishing}>
                  {autoPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                </Button>
              )}
            </motion.div>
          )}

          {/* ── Manual Force Publish ── */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <SendHorizonal className="h-4 w-4 text-primary" />
                  نشر يدوي فوري
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  انشر المقالات المجدولة التالية الآن بغض النظر عن وقت الجدولة
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background">
                  <button
                    onClick={() => setForceLimit(Math.max(1, forceLimit - 1))}
                    className="px-2 py-1 text-sm font-bold text-muted-foreground hover:text-foreground"
                  >−</button>
                  <span className="w-8 text-center text-sm font-semibold">{forceLimit}</span>
                  <button
                    onClick={() => setForceLimit(Math.min(10, forceLimit + 1))}
                    className="px-2 py-1 text-sm font-bold text-muted-foreground hover:text-foreground"
                  >+</button>
                </div>
                <Button
                  onClick={handleForcePublish}
                  disabled={forcePublishing || queue.length === 0}
                  className="gap-1.5"
                >
                  {forcePublishing
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <SendHorizonal className="h-4 w-4" />}
                  انشر {forceLimit} الآن
                </Button>
              </div>
            </div>
            {queue.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {queue.slice(0, forceLimit).map((q) => (
                  <span key={q.slug} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary truncate max-w-[200px]">
                    {q.title}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Daily limit info */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <Activity className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">
              الحد اليومي التلقائي: <span className="font-semibold text-foreground">{DAILY_LIMIT} مقالات/يوم</span>.
              النشر اليدوي الفوري لا يخضع للحد اليومي.
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Upcoming calendar-style queue */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Publication Queue
                </h2>
                <span className="text-xs text-muted-foreground">{queue.length} scheduled</span>
              </div>

              {loadingQueue ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
                  <Calendar className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">Queue is empty</p>
                  <p className="text-xs text-muted-foreground">Schedule articles from Drafts or use Bulk Schedule</p>
                  <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                    <CalendarClock className="mr-1.5 h-4 w-4" />
                    Bulk Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {Array.from(grouped.entries()).map(([day, items]) => (
                      <motion.div
                        key={day}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden rounded-xl border border-border bg-card"
                      >
                        {/* Day header */}
                        <div className={`flex items-center gap-3 border-b border-border px-4 py-2.5 ${
                          day === todayStr ? "bg-primary/5" : "bg-muted/30"
                        }`}>
                          <Calendar className={`h-3.5 w-3.5 ${day === todayStr ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-xs font-semibold ${day === todayStr ? "text-primary" : "text-muted-foreground"}`}>
                            {dayLabel(day)}
                          </span>
                          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {items.length} article{items.length > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Articles */}
                        <ul className="divide-y divide-border">
                          {items.map((item) => {
                            const due = isDue(item.scheduled_at);
                            const cancelling = cancellingSlug === item.slug;
                            return (
                              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  due
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                }`}>
                                  {due ? <Clock className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{item.title}</p>
                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                    {item.category && (
                                      <span className="rounded bg-muted px-1.5 py-0.5">{item.category}</span>
                                    )}
                                    <span>{fmtDateTime(item.scheduled_at)}</span>
                                    <span className={due ? "text-amber-500 font-medium" : "text-blue-500"}>
                                      {fmtRelative(item.scheduled_at)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <a
                                    href={`/blog/${item.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    title="Preview"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </a>
                                  <button
                                    onClick={() => handlePublishNow(item.slug, item.title)}
                                    disabled={publishing || cancelling}
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-green-500"
                                    title="Publish now"
                                  >
                                    {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleCancelSchedule(item.slug)}
                                    disabled={publishing || cancelling}
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                    title="Cancel schedule (move back to draft)"
                                  >
                                    {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Right: Publish log */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Publish Log
                </h2>
                <button onClick={loadLog} className="rounded p-1 text-muted-foreground hover:text-foreground">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingLog ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loadingLog ? (
                  <div className="space-y-px p-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : log.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <Activity className="h-8 w-8 opacity-20" />
                    <p className="text-xs">No publish history yet</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {log.slice(0, 20).map((entry, i) => (
                      <motion.li
                        key={`${entry.slug}-${entry.published_at}-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-start gap-3 px-3 py-2.5"
                      >
                        <div className="mt-0.5 shrink-0">
                          {entry.status === "success"
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium leading-tight">{entry.title || entry.slug}</p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className={`rounded px-1 py-px ${
                              entry.triggered_by === "manual"
                                ? "bg-primary/10 text-primary"
                                : entry.triggered_by === "auto"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-muted text-muted-foreground"
                            }`}>
                              {entry.triggered_by}
                            </span>
                            <span>{fmtDateTime(entry.published_at)}</span>
                          </div>
                          {entry.error && (
                            <p className="mt-0.5 text-[10px] text-destructive truncate">{entry.error}</p>
                          )}
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Quick schedule tip */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold text-foreground mb-1">How it works</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 shrink-0" />Schedule articles from Drafts or Bulk Schedule</li>
                  <li className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 shrink-0" />Auto-publish runs on each admin page load</li>
                  <li className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 shrink-0" />Max {DAILY_LIMIT} articles published per day</li>
                  <li className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 shrink-0" />Oldest due articles are published first</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "amber" | "green" | "primary" | "default";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    primary: "bg-primary/10 text-primary",
    default: "bg-muted text-muted-foreground",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </motion.div>
  );
}
