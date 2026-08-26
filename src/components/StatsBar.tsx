import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Download, Users, Star, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

const statKeys = [
  { icon: Download, value: 500000, suffix: "+", key: "downloads", decimals: 0 },
  { icon: Users, value: 50000, suffix: "+", key: "active_users", decimals: 0 },
  { icon: Star, value: 4.9, suffix: "", key: "average_rating", decimals: 1 },
  { icon: Clock, value: 24, suffix: "/7", key: "support", decimals: 0 }
] as const;

const AnimatedCounter = ({ 
  value, 
  suffix, 
  decimals = 0 
}: { 
  value: number; 
  suffix: string; 
  decimals?: number;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const stepValue = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += stepValue;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  const formatNumber = (num: number) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + "K";
    }
    return Math.floor(num).toString();
  };

  return (
    <span ref={ref} className="gradient-text font-bold text-3xl md:text-4xl">
      {formatNumber(count)}{suffix}
    </span>
  );
};

const StatsBar = () => {
  const { t } = useTranslation();
  return (
    <section className="py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 md:p-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {statKeys.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <AnimatedCounter 
                  value={stat.value} 
                  suffix={stat.suffix} 
                  decimals={stat.decimals}
                />
                <p className="text-muted-foreground mt-2 text-sm md:text-base">
                  {t(`stats.${stat.key}`)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsBar;
