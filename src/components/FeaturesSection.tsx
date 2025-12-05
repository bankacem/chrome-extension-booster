import { motion } from "framer-motion";
import { Sparkles, Lock, Rocket, Users, Code2, HeartHandshake } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Lightweight & Fast",
    description: "All extensions are optimized for minimal memory usage and maximum performance.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Zero data tracking. Your browsing data stays on your device, always.",
  },
  {
    icon: Rocket,
    title: "Regular Updates",
    description: "Frequent updates with new features based on community feedback.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Built with input from thousands of users to solve real problems.",
  },
  {
    icon: Code2,
    title: "Open Source",
    description: "Transparent development with code available for review and contribution.",
  },
  {
    icon: HeartHandshake,
    title: "Free Forever",
    description: "Core features are free. Premium features at affordable prices.",
  },
];

const FeaturesSection = () => {
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
              Why Choose Us
            </span>
            <h2 className="mb-6 font-heading text-3xl font-bold md:text-5xl">
              Built Different,{" "}
              <span className="gradient-text">Built Better</span>
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Unlike generic extensions that slow down your browser and harvest your data, 
              our tools are designed with performance and privacy at their core. 
              Every line of code serves a purpose.
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm">No trackers</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm">Under 1MB each</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-sm">24/7 support</span>
              </div>
            </div>
          </motion.div>

          {/* Right Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card p-5 transition-all duration-300 hover:border-primary/30"
              >
                <feature.icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-1 font-heading font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
