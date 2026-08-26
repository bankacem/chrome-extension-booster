import { Chrome, Github, Twitter, Linkedin, Mail, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/hooks/useLang";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  const activeLang = useLang();
  const routePrefix = activeLang === "en" ? "" : `/${activeLang}`;
  const homePath = routePrefix || "/";
  const footerLinks = {
    product: [
      { label: t("footer.all_extensions"), href: `${homePath}#extensions` },
      { label: t("footer.pricing"), href: "#" },
      { label: t("footer.changelog"), href: "#" },
      { label: t("footer.roadmap"), href: "#" },
    ],
    resources: [
      { label: t("footer.blog"), href: `${routePrefix}/blog` },
      { label: t("footer.documentation"), href: "#" },
      { label: t("footer.help_center"), href: "#" },
      { label: t("footer.community"), href: "#" },
    ],
    company: [
      { label: t("footer.about"), href: "#" },
      { label: t("footer.contact"), href: `${homePath}#contact` },
      // Legal pages remain English-only until their localized content is added; keep these links valid.
      { label: t("footer.privacy"), href: "/privacy" },
      { label: t("footer.terms"), href: "/terms" },
      { label: t("footer.editorial_policy"), href: "/editorial-policy" },
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
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Chrome className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-heading text-xl font-bold">ExtensionTo</span>
            </a>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              {t("footer.description")}
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
            <h4 className="mb-4 font-heading font-semibold">{t("footer.product")}</h4>
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
            <h4 className="mb-4 font-heading font-semibold">{t("footer.resources")}</h4>
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
            <h4 className="mb-4 font-heading font-semibold">{t("footer.company")}</h4>
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
            © 2024 ExtensionTo. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t("footer.made_with")}
            </p>
            <Link 
              to="/settings" 
              className="flex items-center gap-1 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              title={t("footer.settings")}
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
