import { Chrome, Github, Twitter, Linkedin, Mail, Settings } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const Footer = () => {
  const { lang = "en" } = useParams<{ lang?: string }>();
  const langPrefix = lang === "en" ? "" : `/${lang}`;

  const t: Record<string, string> = lang === "ar" ? {
    brandDesc: "نبني إضافات كروم قوية تعزز الإنتاجية، وتحمي الخصوصية، وتغير تجربة التصفح الخاصة بك.",
    product: "المنتج",
    allExtensions: "جميع الإضافات",
    pricing: "الأسعار",
    changelog: "سجل التغييرات",
    roadmap: "خارطة الطريق",
    resources: "المصادر",
    blog: "المدونة",
    documentation: "التوثيق",
    helpCenter: "مركز المساعدة",
    community: "المجتمع",
    company: "الشركة",
    about: "حول",
    contact: "اتصل بنا",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    rights: "© 2024 ExtensionTo. جميع الحقوق محفوظة.",
    madeWith: "صُنع بـ ❤️ لمستخدمي كروم حول العالم",
  } : {
    brandDesc: "Building powerful Chrome extensions that enhance productivity, protect privacy, and transform your browsing experience.",
    product: "Product",
    allExtensions: "All Extensions",
    pricing: "Pricing",
    changelog: "Changelog",
    roadmap: "Roadmap",
    resources: "Resources",
    blog: "Blog",
    documentation: "Documentation",
    helpCenter: "Help Center",
    community: "Community",
    company: "Company",
    about: "About",
    contact: "Contact",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    rights: "© 2024 ExtensionTo. All rights reserved.",
    madeWith: "Made with ❤️ for Chrome users worldwide",
  };

  const footerLinks = {
    product: [
      { label: t.allExtensions, href: `${langPrefix}/#extensions` },
      { label: t.pricing, href: "#" },
      { label: t.changelog, href: "#" },
      { label: t.roadmap, href: "#" },
    ],
    resources: [
      { label: t.blog, href: `${langPrefix}/blog` },
      { label: t.documentation, href: "#" },
      { label: t.helpCenter, href: "#" },
      { label: t.community, href: "#" },
    ],
    company: [
      { label: t.about, href: "#" },
      { label: t.contact, href: `${langPrefix}/#contact` },
      { label: t.privacy, href: "/privacy" },
      { label: t.terms, href: "/terms" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Mail, href: "#", label: "Email" },
  ];

  return (
    <footer className="border-t border-border/50 bg-card/50">
      <div className="container mx-auto px-4 py-12" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to={langPrefix === "" ? "/" : langPrefix} className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Chrome className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-heading text-xl font-bold">ExtensionTo</span>
            </Link>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              {t.brandDesc}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 font-heading font-semibold">{t.product}</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-semibold">{t.resources}</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-semibold">{t.company}</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            {t.rights}
          </p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t.madeWith}
            </p>
            <Link 
              to="/settings" 
              className="flex items-center gap-1 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              title="Settings"
            >
              <Settings className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
