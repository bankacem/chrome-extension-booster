import { Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ContactSection from "@/components/ContactSection";
import { motion } from "framer-motion";
import { CONTACT_EMAIL } from "@/lib/legalContent";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact ExtensionTo"
        description={`Reach the ExtensionTo team by email at ${CONTACT_EMAIL} or through the site contact form.`}
        canonicalPath="/contact"
      />
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-6 font-heading text-4xl font-bold">Contact Us</h1>
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            <p>
              Questions about a guide, an extension, a correction, or your data? The
              most reliable way to reach the ExtensionTo team is email.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-5 mb-12">
            <div className="p-2 rounded-lg bg-secondary/50">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </motion.div>
      </main>

      <div className="pb-16">
        <ContactSection />
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
