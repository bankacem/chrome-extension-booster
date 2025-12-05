import { motion } from "framer-motion";
import { Check, X, Zap, Shield, Palette, Clock } from "lucide-react";

const features = [
  { name: "Lightning Fast Performance", icon: Zap },
  { name: "Privacy-First Design", icon: Shield },
  { name: "Customizable Interface", icon: Palette },
  { name: "24/7 Support", icon: Clock },
  { name: "Regular Updates", icon: Check },
  { name: "Open Source", icon: Check }
];

const competitors = [
  { name: "Our Extensions", values: [true, true, true, true, true, true], highlight: true },
  { name: "Competitor A", values: [true, false, true, false, true, false], highlight: false },
  { name: "Competitor B", values: [false, true, false, true, false, false], highlight: false },
  { name: "Competitor C", values: [true, false, false, false, true, false], highlight: false }
];

const ComparisonSection = () => {
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
            Why Choose <span className="gradient-text">Us?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how our extensions stack up against the competition. Quality matters.
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
                <th className="text-left p-4 md:p-6 font-heading text-lg">Feature</th>
                {competitors.map((comp, i) => (
                  <th 
                    key={i} 
                    className={`p-4 md:p-6 text-center font-heading text-lg ${
                      comp.highlight ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {comp.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
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
                      <feature.icon className="w-5 h-5 text-primary" />
                      <span className="font-medium">{feature.name}</span>
                    </div>
                  </td>
                  {competitors.map((comp, j) => (
                    <td key={j} className="p-4 md:p-6 text-center">
                      {comp.values[i] ? (
                        <div className={`inline-flex p-1.5 rounded-full ${
                          comp.highlight ? "bg-primary/20" : "bg-muted"
                        }`}>
                          <Check className={`w-5 h-5 ${
                            comp.highlight ? "text-primary" : "text-muted-foreground"
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
