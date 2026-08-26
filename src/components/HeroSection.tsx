import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();
  return (
    <section className="relative min-h-screen overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute right-1/4 top-1/3 h-[300px] w-[300px] rounded-full bg-accent/20 blur-[100px]" />

      <div className="container relative mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-4 py-2 backdrop-blur-sm"
          >
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("hero.badge")}
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 font-heading text-4xl font-bold leading-tight md:text-6xl lg:text-7xl"
          >
            {t("hero.title_start")} {" "}
            <span className="gradient-text">{t("hero.title_highlight")}</span>{" "}
            {t("hero.title_end")}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            {t("hero.description")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button variant="hero" size="xl">
              <Download className="h-5 w-5" />
              {t("hero.browse_extensions")}
            </Button>
            <Button variant="glass" size="xl">
              {t("hero.learn_more")}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {[
              { value: "50K+", label: t("hero.active_users") },
              { value: "12", label: t("hero.extensions") },
              { value: "4.9", label: t("hero.average_rating") },
              { value: "99%", label: t("hero.satisfaction") },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-heading text-3xl font-bold text-foreground md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
