import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, ExternalLink, Star, Users, Check, 
  Download, Shield, Zap, Clock, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { getExtensionBySlug, extensions } from "@/lib/extensionsData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
}

const ExtensionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const extension = getExtensionBySlug(slug || "");
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);

  useEffect(() => {
    if (extension) {
      fetchRelatedArticles();
    }
  }, [extension]);

  const fetchRelatedArticles = async () => {
    if (!extension) return;
    
    // Fetch articles that mention this extension
    const { data } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, published_at")
      .eq("status", "published")
      .or(`title.ilike.%${extension.name}%,content.ilike.%${extension.name}%,keywords.cs.{${extension.keywords[0]}}`)
      .order("published_at", { ascending: false })
      .limit(5);

    if (data) {
      setRelatedArticles(data);
    }
  };

  if (!extension) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold mb-4">Extension Not Found</h1>
          <p className="text-muted-foreground mb-8">The extension you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/#extensions">View All Extensions</Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  const IconComponent = extension.icon;
  const otherExtensions = extensions.filter(ext => ext.id !== extension.id).slice(0, 3);

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={`${extension.name} - Chrome Extension`}
        description={extension.longDescription}
        keywords={extension.keywords.join(", ")}
        canonicalPath={`/extension/${extension.slug}`}
      />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/#extensions" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 group">
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Extensions
            </Link>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Info */}
              <div>
                <div className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${extension.color} mb-6 shadow-lg`}>
                  <IconComponent className="h-10 w-10 text-white" />
                </div>

                <Badge variant="outline" className="mb-4">{extension.category}</Badge>
                
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{extension.name}</h1>
                
                <p className="text-xl text-muted-foreground mb-6">
                  {extension.longDescription}
                </p>

                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{extension.users}</span>
                    <span className="text-muted-foreground">users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{extension.rating}</span>
                    <span className="text-muted-foreground">rating</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={() => window.open(extension.storeUrl, '_blank')}
                  >
                    <Download className="h-5 w-5" />
                    Add to Chrome - Free
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open(extension.storeUrl, '_blank')}
                  >
                    <ExternalLink className="h-5 w-5" />
                    View in Web Store
                  </Button>
                </div>
              </div>

              {/* Right: Features */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Key Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {extension.features.map((feature, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Shield, label: "Secure & Private", desc: "No data collection" },
              { icon: Zap, label: "Lightweight", desc: "Minimal resources" },
              { icon: Clock, label: "Regular Updates", desc: "Always improving" },
              { icon: Users, label: "Active Support", desc: "Help when needed" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((article) => (
                <Card key={article.id} className="glass-card hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 line-clamp-2">
                      <Link to={`/blog/${article.slug}`} className="hover:text-primary">
                        {article.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {article.excerpt}
                    </p>
                    <Link 
                      to={`/blog/${article.slug}`}
                      className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Read more <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other Extensions */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Explore More Extensions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {otherExtensions.map((ext) => (
              <Card key={ext.id} className="glass-card hover:border-primary/30 transition-all group">
                <CardContent className="p-6">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${ext.color} mb-4`}>
                    <ext.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{ext.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{ext.description}</p>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/extension/${ext.slug}`}>Learn More</Link>
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(ext.storeUrl, '_blank')}
                    >
                      Add to Chrome
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to enhance your browsing?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Add {extension.name} to Chrome for free and experience the difference.
          </p>
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => window.open(extension.storeUrl, '_blank')}
          >
            <Download className="h-5 w-5" />
            Add {extension.name} to Chrome
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ExtensionPage;
