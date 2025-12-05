import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const posts = [
  {
    title: "Top 5 Reasons to Install Custom Chrome Extensions for Ultimate Productivity",
    excerpt: "Discover how smart tab management and custom shortcuts can transform your daily workflow and save hours.",
    date: "Dec 3, 2024",
    readTime: "5 min read",
    category: "Productivity",
  },
  {
    title: "How Chrome Extensions Revolutionize Web Development",
    excerpt: "From real-time code insights to performance analysis, learn how the right tools can supercharge your dev workflow.",
    date: "Nov 28, 2024",
    readTime: "7 min read",
    category: "Development",
  },
  {
    title: "Unlock Hidden Browser Powers: A Deep Dive Into Focus Mode",
    excerpt: "Master distraction-free browsing with timed focus sessions and analytics that help you understand your habits.",
    date: "Nov 20, 2024",
    readTime: "6 min read",
    category: "Tips & Tricks",
  },
];

const BlogSection = () => {
  return (
    <section id="blog" className="relative py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 flex flex-col items-center justify-between gap-4 md:flex-row"
        >
          <div>
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              Blog
            </span>
            <h2 className="font-heading text-3xl font-bold md:text-5xl">
              Latest Articles
            </h2>
          </div>
          <Button variant="glass">
            View All Posts
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Blog Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group glass-card overflow-hidden transition-all duration-300 hover:border-primary/30"
            >
              {/* Gradient Banner */}
              <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary" />

              <div className="p-6">
                {/* Meta */}
                <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </div>
                  <span>{post.readTime}</span>
                </div>

                {/* Title */}
                <h3 className="mb-2 font-heading text-lg font-semibold transition-colors group-hover:text-primary">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                  {post.excerpt}
                </p>

                {/* Read More */}
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-all group-hover:gap-2"
                >
                  Read More
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
