import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const partners = [
  { name: "Google", logo: "G" },
  { name: "Microsoft", logo: "M" },
  { name: "Apple", logo: "A" },
  { name: "Amazon", logo: "A" },
  { name: "Meta", logo: "M" },
  { name: "Netflix", logo: "N" }
];

const PartnersSection = () => {
  const { t } = useTranslation();
  return (
    <section className="py-16 relative overflow-hidden border-y border-glass">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground mb-8"
        >
          {t("partners.trusted")}
        </motion.p>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {partners.map((partner, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <span className="text-3xl font-bold font-heading">{partner.logo}</span>
              <span className="text-lg font-medium hidden sm:inline">{partner.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
