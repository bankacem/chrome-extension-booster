import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I install Chrome extensions?",
    answer: "Simply click the 'Add to Chrome' button on any extension page. Chrome will prompt you to confirm the installation. Once confirmed, the extension will be added to your browser automatically."
  },
  {
    question: "Are these extensions free to use?",
    answer: "Yes! All our extensions offer free versions with core features. Some extensions also have premium tiers with advanced functionality for power users."
  },
  {
    question: "How do I manage or remove extensions?",
    answer: "Click the puzzle piece icon in Chrome's toolbar to see all installed extensions. You can pin, disable, or remove any extension from there. Alternatively, visit chrome://extensions in your browser."
  },
  {
    question: "Is my data safe with these extensions?",
    answer: "Absolutely. Privacy is our top priority. Our extensions only request necessary permissions and never collect or sell your personal data. All data processing happens locally on your device."
  },
  {
    question: "Do extensions slow down my browser?",
    answer: "Our extensions are optimized for minimal resource usage. They're designed to enhance your browsing experience without impacting performance. You can always disable extensions when not needed."
  },
  {
    question: "How do I get support for an extension?",
    answer: "You can reach our support team through the contact form on this website, or leave a review on the Chrome Web Store. We typically respond within 24 hours."
  }
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Got questions? We've got answers. Find quick solutions to common queries below.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-card px-6 border-glass"
              >
                <AccordionTrigger className="text-left text-lg font-medium hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
