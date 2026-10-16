import { CheckCircle2, BookOpen, ShieldCheck, FlaskConical, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const principles = [
  {
    icon: FlaskConical,
    title: "Research-based comparisons",
    body: "We compare extensions against the use case described by the article using public information and product documentation, including setup steps, stated features, pricing, and limitations — not lab measurements.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy and permissions",
    body: "When privacy is relevant, we look at the permissions an extension requests and the data practices its developer states, and we spell out the difference between a useful feature and an unnecessary permission.",
  },
  {
    icon: BookOpen,
    title: "Evidence before claims",
    body: "We distinguish documented facts, product-documentation statements, and editorial opinion. Product claims should be checked against official documentation or the Chrome Web Store where possible.",
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
      title="Editorial Policy and Standards"
      description="How ExtensionTo compiles and maintains its Chrome extension guides from public information and product documentation."
      canonicalPath="/editorial-policy"
    />
    <Navbar />
    <main className="pt-24 pb-16">
      <div className="container mx-auto max-w-4xl px-4">
        <header className="mb-12">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">ExtensionTo standards</p>
          <h1 className="mb-5 font-heading text-4xl font-bold md:text-5xl">Editorial Policy and Standards</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Our goal is to publish practical, transparent guides that help readers choose and use Chrome extensions with a clear understanding of their benefits, trade-offs, and limitations.
          </p>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Our guides are research-based comparisons compiled from public information and product documentation. Unless a page says otherwise, ExtensionTo has not run independent lab tests.
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

        <section className="prose prose-lg dark:prose-invert max-w-none">
          <h2>How a review is actually put together</h2>
          <p>
            A review starts with the Chrome Web Store listing and the developer's own documentation: what the extension claims to do, which permissions it requests, what the privacy policy says about data handling, and what it costs. The reviewer then reads the store's user reviews and compares the extension against alternatives that solve the same problem.
          </p>
          <p>
            The comparison is always framed around a concrete use case — a tab manager for people with too many tabs open, for example — and the criteria are stated in the article: stated features, pricing, permissions, and known limitations. That way a reader can see why one option ranked above another instead of taking a verdict on faith. Numbers in a review — ratings, user counts, permission lists — come from cited sources, never from invented benchmarks. This site has no test lab and runs no performance tests, and it does not present its comparisons as measurements.
          </p>

          <h2>Editorial independence</h2>
          <p>
            The reviews and comparisons on this site are not for sale. Advertising is the site's funding, but advertisers do not write, review, or approve articles, and paid placement in rankings or comparison tables is not offered. Where a guide recommends an ExtensionTo extension from the site's own catalog, it says so; readers should weigh that recommendation accordingly.
          </p>
          <p>
            Opinions are labeled as opinions. A sentence that says an extension “feels fast” is a reviewer's judgment after using it; a sentence that says it “requests three permissions” is a fact from the store listing. Keeping the two apart is a standing rule, not a style preference.
          </p>

          <h2 id="reviewers">Who writes and reviews our content?</h2>
          <p>
            Articles are credited to members of the ExtensionTo editorial team. James Mitchell writes the practical Chrome extension reviews, Miccart Phen covers browser tools and workflows, and Frah Nssim focuses on productivity software and reproducible checks. A separate author page introduces each of them in more detail.
          </p>
          <p>
            Manus AI is part of the editorial workflow, not an author. It supports research and drafting — gathering documentation, structuring comparisons, drafting passages — and every AI-assisted draft is verified against its sources by a human before anything is published. No article goes live on AI output alone.
          </p>
          <p>
            Author labels describe editorial responsibility; they are not a substitute for evidence. Readers should use the methodology and the cited documentation to evaluate each claim.
          </p>

          <h2>What we do not promise</h2>
          <p>
            We do not claim that every extension is suitable for every user, that a product will remain unchanged, or that a recommendation is an endorsement by Google. Extensions update, developers change policies, and a review is a snapshot of what was documented at the time. Readers should review current permissions, publisher information, pricing, and privacy terms before installing anything.
          </p>

          <h2>Corrections policy</h2>
          <p>
            Errors get fixed, and the fix is dated. When a product updates, a browser policy changes, or a reader reports a mistake, the affected article is corrected and its update date is changed to reflect the correction. Material corrections — a wrong price, a wrong permission, a feature that no longer exists — are treated as seriously as the original review; typos and small wording fixes are handled without a new date.
          </p>
          <p>
            If you find an inaccurate claim, an outdated product detail, or a broken link, please contact the ExtensionTo team through the contact page with the article URL and what is wrong. Reports that check out lead to a correction.
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
