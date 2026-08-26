import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chrome, Mail, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const CTASection = () => {
  const { t } = useTranslation();
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-card to-secondary p-8 md:p-16"
        >
          {/* Background Effects */}
          <div className="absolute left-1/4 top-0 h-[300px] w-[300px] rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 h-[200px] w-[200px] rounded-full bg-accent/20 blur-[80px]" />

          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            {/* Left Content */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
                <Chrome className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{t("cta.badge")}</span>
              </div>
              <h2 className="mb-4 font-heading text-3xl font-bold md:text-4xl">
                {t("cta.title_start")} {" "}
                <span className="gradient-text">{t("cta.title_highlight")}</span>
              </h2>
              <p className="mb-6 text-muted-foreground">
                {t("cta.description")}
              </p>
              <Button variant="hero" size="xl">
                {t("cta.browse_all")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Right - Newsletter */}
            <div className="glass-card p-6 md:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-semibold">
                {t("cta.stay_updated")}
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                {t("cta.newsletter_description")}
              </p>
              <form className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder={t("cta.email_placeholder")}
                  className="flex-1 bg-background/50"
                />
                <Button variant="hero">
                  {t("cta.subscribe")}
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                {t("cta.no_spam")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
