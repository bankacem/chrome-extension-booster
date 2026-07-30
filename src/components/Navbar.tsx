import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Chrome } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { lang = "en" } = useParams<{ lang?: string }>();
  const isHome = location.pathname === "/" || location.pathname === `/${lang}`;

  const langPrefix = lang === "en" ? "" : `/${lang}`;

  const t: Record<string, string> = lang === "ar" ? {
    home: "الرئيسية",
    extensions: "الإضافات",
    blog: "المدونة",
    contact: "اتصل بنا",
    getStarted: "ابدأ الآن",
  } : {
    home: "Home",
    extensions: "Extensions",
    blog: "Blog",
    contact: "Contact",
    getStarted: "Get Started",
  };

  const navItems = [
    { label: t.home, href: langPrefix === "" ? "/" : langPrefix, isRoute: true },
    { label: t.extensions, href: isHome ? "#extensions" : `${langPrefix}/#extensions`, isRoute: !isHome },
    { label: t.blog, href: `${langPrefix}/blog`, isRoute: true },
    { label: t.contact, href: isHome ? "#contact" : `${langPrefix}/#contact`, isRoute: !isHome },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between" dir={lang === "ar" ? "rtl" : "ltr"}>
          <Link to={langPrefix === "" ? "/" : langPrefix} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Chrome className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold">ExtensionTo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              item.isRoute ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              )
            ))}
            <ThemeToggle />
            <Button variant="hero" size="sm">
              {t.getStarted}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/50 py-4 lg:hidden"
            dir={lang === "ar" ? "rtl" : "ltr"}
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              ))}
              <Button variant="hero" size="sm" className="w-fit">
                {t.getStarted}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
