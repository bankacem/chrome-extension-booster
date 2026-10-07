import { CheckCircle2, BookOpen, ShieldCheck, FlaskConical, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const principles = [
  {
    icon: FlaskConical,
    title: "Practical evaluation",
    body: "We assess extensions against the use case described by the article, including setup friction, core workflow, performance impact, and limitations.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy and permissions",
    body: "When privacy is relevant, we examine the permissions requested, the stated data practices, and the difference between a useful feature and an unnecessary permission.",
  },
  {
    icon: BookOpen,
    title: "Evidence before claims",
    body: "We distinguish documented facts, observed behavior, and editorial opinion. Product claims should be checked against official documentation or the Chrome Web Store where possible.",
  },
  {
    icon: RefreshCw,
    title: "Maintenance and updates",
    body: "Browser extensions change. We review important pages when a product, browser policy, or material claim changes and show publication or update dates where available.",
  },
];

const EditorialPolicy = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Editorial Policy and Review Methodology"
      description="Learn how ExtensionTo researches, reviews, and maintains Chrome extension guides and product pages."
      canonicalPath="/editorial-policy"
    />
    <Navbar />
    <main className="pt-24 pb-16">
      <div className="container mx-auto max-w-4xl px-4">
        <header className="mb-12">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">ExtensionTo standards</p>
          <h1 className="mb-5 font-heading text-4xl font-bold md:text-5xl">Editorial Policy and Review Methodology</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Our goal is to publish practical, transparent guides that help readers choose and use Chrome extensions with a clear understanding of their benefits, trade-offs, and limitations.
          </p>
        </header>

        <section className="mb-12 grid gap-5 md:grid-cols-2" aria-label="Review principles">
          {principles.map(({ icon: Icon, title, body }) => (
            <article key={title} className="glass-card p-6">
              <Icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mb-2 font-heading text-xl font-semibold">{title}</h2>
              <p className="leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section id="reviewers" className="prose prose-lg dark:prose-invert max-w-none">
          <h2>Who writes and reviews our content?</h2>
          <p>
            Articles credited to James Mitchell are written as practical Chrome extension reviews and guides. Articles credited to the ExtensionTo Editorial Team are researched and maintained by the site team. Author labels describe editorial responsibility; they are not a substitute for evidence, and readers should use the methodology and cited documentation to evaluate each claim.
          </p>
          <h2>What we do not promise</h2>
          <p>
            We do not claim that every extension is suitable for every user, that a product will remain unchanged, or that a recommendation is an endorsement by Google. Readers should review current permissions, publisher information, pricing, and privacy terms before installing software.
          </p>
          <h2>Corrections and feedback</h2>
          <p>
            If you find an inaccurate claim, an outdated product detail, or a broken link, please contact the ExtensionTo team through the website. Material corrections should be reflected in the article and its update date when appropriate.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-border/50 pt-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-primary hover:underline">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Read the latest guides
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">Explore extensions</Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default EditorialPolicy;
