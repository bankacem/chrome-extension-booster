import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import type { LegalSection } from "@/lib/legalContent";

interface LegalPageProps {
  title: string;
  description: string;
  canonicalPath: string;
  heading: string;
  sections: LegalSection[];
  lastUpdated?: string;
  contactEmail?: string;
  children?: React.ReactNode;
}

const LegalPage = ({
  title,
  description,
  canonicalPath,
  heading,
  sections,
  lastUpdated,
  contactEmail,
  children,
}: LegalPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <SEO title={title} description={description} canonicalPath={canonicalPath} />
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-8 font-heading text-4xl font-bold">{heading}</h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            {lastUpdated && (
              <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
            )}
            {sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
                {s.paragraphs?.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {s.bullets && (
                  <ul>
                    {s.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            {contactEmail && (
              <p className="text-sm text-muted-foreground">Contact: {contactEmail}</p>
            )}
            {children}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
