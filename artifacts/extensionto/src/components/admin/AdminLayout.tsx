/**
 * AdminLayout — Modern SaaS sidebar layout
 * Inspired by Notion / Vercel / Stripe dashboard aesthetics
 */
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FileText, PenLine, Sparkles, BarChart3,
  Globe, LogOut, ShieldCheck, Menu, X, ChevronRight,
  RefreshCw, Bell, ExternalLink, BookOpen, Cpu, ImagePlus, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/useAdminSession";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | string;
  external?: boolean;
}

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  draftCount?: number;
}

const SITE_URL = "https://www.extensionto.com";

export default function AdminLayout({ children, title, subtitle, actions, draftCount = 0 }: Props) {
  const { session, logout } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: "All Articles",
      href: "/admin/articles",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Drafts",
      href: "/admin/drafts",
      icon: <PenLine className="h-4 w-4" />,
      badge: draftCount || undefined,
    },
    {
      label: "CMS Creator",
      href: "/admin/cms",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      label: "Image Engine",
      href: "/admin/images",
      icon: <ImagePlus className="h-4 w-4" />,
    },
    {
      label: "SEO Dashboard",
      href: "/admin/seo",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "AI Generator",
      href: "/admin/ai",
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      label: "Scheduler",
      href: "/admin/scheduler",
      icon: <CalendarClock className="h-4 w-4" />,
    },
  ];

  const externalLinks: NavItem[] = [
    {
      label: "View Live Blog",
      href: SITE_URL + "/blog",
      icon: <Globe className="h-4 w-4" />,
      external: true,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  const isActive = (href: string) =>
    location.pathname === href || (href !== "/admin/dashboard" && location.pathname.startsWith(href));

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-white">ExtensionTo</p>
          <p className="mt-0.5 text-[10px] text-white/40">Admin Panel</p>
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-md p-1 text-white/40 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-2 pt-3">
        <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Content
        </div>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-primary" : "text-white/40 group-hover:text-white/70"}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight className="h-3 w-3 text-white/30" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          External
        </div>
        <ul className="space-y-0.5">
          {externalLinks.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span className="text-white/40 group-hover:text-white/70">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <ExternalLink className="h-3 w-3 text-white/30" />
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Session footer */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {session?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/80">{session?.email ?? "admin"}</p>
            <p className="text-[10px] text-white/30">8h session</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-56 shrink-0 overflow-hidden bg-[#111] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-56 bg-[#111] lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {title && (
              <>
                <span className="hidden text-sm text-muted-foreground lg:block">Admin</span>
                <ChevronRight className="hidden h-3 w-3 text-muted-foreground/40 lg:block" />
                <span className="truncate text-sm font-medium">{title}</span>
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {actions}
            <Button variant="ghost" size="sm" asChild>
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Site</span>
              </a>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
            {/* Page header */}
            {(title || subtitle) && (
              <div className="mb-6">
                {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
