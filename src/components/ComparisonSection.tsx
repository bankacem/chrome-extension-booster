import { motion } from "framer-motion";
import { Check, X, Zap, Shield, Palette, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

const featureKeys = [
  ["performance", Zap],
  ["privacy", Shield],
  ["customizable", Palette],
  ["support", Clock],
  ["regular_updates", Check],
  ["open_source", Check],
] as const;

const competitorKeys = [
  ["our_extensions", [true, true, true, true, true, true], true],
  ["competitor_a", [true, false, true, false, true, false], false],
  ["competitor_b", [false, true, false, true, false, false], false],
  ["competitor_c", [true, false, false, false, true, false], false],
] as const;

const ComparisonSection = () => {
  const { t } = useTranslation();
  return (
    <section id="comparison" className="py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">
            {t("comparison.eyebrow")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("comparison.description")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto"
        >
          <table className="w-full glass-card">
            <thead>
              <tr className="border-b border-glass">
                <th className="text-start p-4 md:p-6 font-heading text-lg">{t("comparison.feature")}</th>
                {competitorKeys.map(([key, _values, highlight], i) => (
                  <th 
                    key={i} 
                    className={`p-4 md:p-6 text-center font-heading text-lg ${
                      highlight ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {t(`comparison.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureKeys.map(([key, Icon], i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="border-b border-glass last:border-0"
                >
                  <td className="p-4 md:p-6">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="font-medium">{t(`comparison.rows.${key}`)}</span>
                    </div>
                  </td>
                  {competitorKeys.map(([_key, values, highlight], j) => (
                    <td key={j} className="p-4 md:p-6 text-center">
                      {values[i] ? (
                        <div className={`inline-flex p-1.5 rounded-full ${
                          highlight ? "bg-primary/20" : "bg-muted"
                        }`}>
                          <Check className={`w-5 h-5 ${
                            highlight ? "text-primary" : "text-muted-foreground"
                          }`} />
                        </div>
                      ) : (
                        <div className="inline-flex p-1.5 rounded-full bg-destructive/10">
                          <X className="w-5 h-5 text-destructive/60" />
                        </div>
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};

export default ComparisonSection;
