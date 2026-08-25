import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chrome, Mail, ArrowRight } from "lucide-react";

const CTASection = () => {
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
                <span className="text-sm font-medium">Ready to transform your browsing?</span>
              </div>
              <h2 className="mb-4 font-heading text-3xl font-bold md:text-4xl">
                Get Started in{" "}
                <span className="gradient-text">Seconds</span>
              </h2>
              <p className="mb-6 text-muted-foreground">
                Join 50,000+ users who have already upgraded their Chrome experience. 
                Install any extension with one click.
              </p>
              <Button variant="hero" size="xl">
                Browse All Extensions
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Right - Newsletter */}
            <div className="glass-card p-6 md:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-semibold">
                Stay Updated
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Subscribe to our newsletter for new extensions, updates, and productivity tips.
              </p>
              <form className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 bg-background/50"
                />
                <Button variant="hero">
                  Subscribe
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                No spam, ever. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
