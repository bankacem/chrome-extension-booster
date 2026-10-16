import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import SchemaMarkup from "@/components/SchemaMarkup";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotFound from "@/pages/NotFound";
import { getEditorialProfileBySlug } from "@/lib/editorialProfiles";

const SITE_URL = "https://extensionto.com";

/**
 * Dedicated author page (e.g. /authors/james-mitchell).
 * Looks the author up in editorialProfiles.ts by the slugified name.
 */
const AuthorPage = () => {
  const { slug = "" } = useParams();
  const profile = getEditorialProfileBySlug(slug);

  if (!profile) {
    return <NotFound />;
  }

  const canonicalPath = `/authors/${slug.toLowerCase()}`;
  const imageUrl = profile.image.startsWith("http")
    ? profile.image
    : `${SITE_URL}${profile.image}`;
  const paragraphs = profile.bio.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const personSchema = {
    "@context": "https://schema.org",
    "@type": profile.type,
    name: profile.name,
    url: `${SITE_URL}${canonicalPath}`,
    image: imageUrl,
    description: profile.bio.replace(/\n\n+/g, " "),
    ...(profile.type === "Person"
      ? {
          jobTitle: profile.role,
          worksFor: {
            "@type": "Organization",
            name: "ExtensionTo",
            url: SITE_URL,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`About ${profile.name}`}
        description={profile.bio.replace(/\n\n+/g, " ").slice(0, 160)}
        canonicalPath={canonicalPath}
        ogImage={imageUrl}
      />
      <SchemaMarkup data={personSchema} />
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 pb-16 pt-28">
        <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <img
            src={profile.image}
            alt={`Portrait of ${profile.name}`}
            width={160}
            height={160}
            className="h-40 w-40 shrink-0 rounded-full border border-border/60 object-cover shadow-md"
          />
          <div>
            <h1 className="font-heading text-3xl font-bold md:text-4xl">{profile.name}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{profile.role}</p>
          </div>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-foreground/90">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/blog" className="text-primary hover:underline">
            Browse the blog &rarr;
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthorPage;
