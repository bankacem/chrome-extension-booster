import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ExternalLink, Zap, Shield, Layout, Clock, Palette, FileSearch } from "lucide-react";

const extensions = [
  {
    icon: Zap,
    name: "Productivity Booster",
    description: "Smart tab management, keyboard shortcuts, and workflow automation to supercharge your productivity.",
    users: "15K+",
    rating: "4.9",
    color: "from-primary to-cyan-400",
  },
  {
    icon: Shield,
    name: "Privacy Guard",
    description: "Advanced ad blocking, tracker protection, and secure browsing with zero data collection.",
    users: "12K+",
    rating: "4.8",
    color: "from-emerald-500 to-green-400",
  },
  {
    icon: Layout,
    name: "DevTools Enhancer",
    description: "Real-time code insights, performance analyzer, and debugging tools for developers.",
    users: "8K+",
    rating: "4.9",
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: Clock,
    name: "Focus Mode Pro",
    description: "Distraction blocker with timed focus sessions and productivity analytics dashboard.",
    users: "10K+",
    rating: "4.7",
    color: "from-orange-500 to-amber-400",
  },
  {
    icon: Palette,
    name: "Theme Studio",
    description: "Create and apply custom browser themes with dark mode, colors, and dynamic wallpapers.",
    users: "6K+",
    rating: "4.8",
    color: "from-pink-500 to-rose-400",
  },
  {
    icon: FileSearch,
    name: "Quick Search",
    description: "Lightning-fast universal search across tabs, bookmarks, history, and web with AI suggestions.",
    users: "9K+",
    rating: "4.9",
    color: "from-blue-500 to-indigo-400",
  },
];

const ExtensionsSection = () => {
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
            Our Extensions
          </span>
          <h2 className="mb-4 font-heading text-3xl font-bold md:text-5xl">
            Powerful Tools for Every Need
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Each extension is carefully crafted with performance and user experience in mind. 
            Install multiple to create your perfect browsing setup.
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
              <h3 className="mb-2 font-heading text-xl font-semibold">
                {extension.name}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {extension.description}
              </p>

              {/* Stats */}
              <div className="mb-4 flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{extension.users}</strong> users
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">★ {extension.rating}</strong>
                </span>
              </div>

              {/* CTA */}
              <Button variant="glass" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                <ExternalLink className="h-4 w-4" />
                Add to Chrome
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExtensionsSection;
