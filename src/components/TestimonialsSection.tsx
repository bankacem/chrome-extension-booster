import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Designer",
    content: "Productivity Booster has completely transformed how I manage my tabs. I went from 50+ chaotic tabs to organized workspaces. Game changer!",
    rating: 5,
    avatar: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "Software Developer",
    content: "DevTools Enhancer is now essential to my workflow. The real-time linting and performance insights have saved me countless debugging hours.",
    rating: 5,
    avatar: "MJ",
  },
  {
    name: "Emily Rodriguez",
    role: "Freelance Writer",
    content: "Focus Mode Pro helped me overcome my chronic procrastination. The timed sessions and distraction blocking keep me on track every day.",
    rating: 5,
    avatar: "ER",
  },
  {
    name: "David Kim",
    role: "Marketing Manager",
    content: "Privacy Guard gives me peace of mind. No more creepy ads following me around the internet. It's lightweight and just works.",
    rating: 5,
    avatar: "DK",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="relative py-24">
      <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />

      <div className="container relative mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Testimonials
          </span>
          <h2 className="mb-4 font-heading text-3xl font-bold md:text-5xl">
            Loved by Thousands
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            See what our users say about their experience with our Chrome extensions.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card relative p-6"
            >
              <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/20" />

              {/* Rating */}
              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Content */}
              <p className="mb-6 text-muted-foreground">"{testimonial.content}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
