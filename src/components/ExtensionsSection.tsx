import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight } from "lucide-react";
import { extensions } from "@/lib/extensionsData";
import { useTranslation } from "react-i18next";
import { useLang } from "@/hooks/useLang";

const ExtensionsSection = () => {
  const { t } = useTranslation();
  const activeLang = useLang();
  const routePrefix = activeLang === "en" ? "" : `/${activeLang}`;
  return (
    <section id="extensions" className="relative py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            {t("extensions_section.eyebrow")}
          </span>
          <h2 className="mb-4 font-heading text-3xl font-bold md:text-5xl">
            {t("extensions_section.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t("extensions_section.description")}
          </p>
        </motion.div>

        {/* Extensions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {extensions.map((extension, index) => (
            <motion.div
              key={extension.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group glass-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
            >
              {/* Icon */}
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${extension.color}`}>
                <extension.icon className="h-6 w-6 text-white" />
              </div>

              {/* Content */}
              <Link to={`${routePrefix}/extension/${extension.slug}`}>
                <h3 className="mb-2 font-heading text-xl font-semibold hover:text-primary transition-colors">
                  {extension.name}
                </h3>
              </Link>
              <p className="mb-4 text-sm text-muted-foreground">
                {extension.description}
              </p>

              {/* Stats */}
              <div className="mb-4 flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{extension.users}</strong> {t("extensions_section.users")}
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">★ {extension.rating}</strong>
                </span>
              </div>

              {/* CTAs */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  asChild
                >
                  <Link to={`${routePrefix}/extension/${extension.slug}`}>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    {t("extensions_section.details")}
                  </Link>
                </Button>
                <Button 
                  variant="glass" 
                  size="sm" 
                  className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground"
                  onClick={() => window.open(extension.storeUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  {t("extensions_section.add_to_chrome")}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExtensionsSection;
