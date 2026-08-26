import { motion } from "framer-motion";
import { Sparkles, Lock, Rocket, Users, Code2, HeartHandshake } from "lucide-react";
import { useTranslation } from "react-i18next";

const featureKeys = [
  [Sparkles, "lightweight_fast"],
  [Lock, "privacy_first"],
  [Rocket, "regular_updates"],
  [Users, "community_driven"],
  [Code2, "open_source"],
  [HeartHandshake, "free_forever"],
] as const;

const FeaturesSection = () => {
  const { t } = useTranslation();
  return (
    <section id="features" className="relative py-24">
      {/* Background Effect */}
      <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />

      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="mb-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
              {t("features.eyebrow")}
            </span>
            <h2 className="mb-6 font-heading text-3xl font-bold md:text-5xl">
              {t("features.title_start")} {" "}
              <span className="gradient-text">{t("features.title_highlight")}</span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              {t("features.description")}
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm">{t("features.no_trackers")}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm">{t("features.under_1mb")}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-sm">{t("features.support")}</span>
              </div>
            </div>
          </motion.div>

          {/* Right Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {featureKeys.map(([Icon, key], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card p-5 transition-all duration-300 hover:border-primary/30"
              >
                <Icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-1 font-heading font-semibold">{t(`features.items.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`features.items.${key}.description`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
