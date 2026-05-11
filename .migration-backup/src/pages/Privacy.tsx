import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy"
        description="Learn how ExtensionTo protects your privacy. Our Chrome extensions are designed with privacy in mind - no data collection, local storage only."
        canonicalPath="/privacy"
      />
      <Navbar />
      
      <main className="container mx-auto max-w-4xl px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-8 font-heading text-4xl font-bold">Privacy Policy</h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>Introduction</h2>
            <p>
              Welcome to ExtensionTo. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy explains how we handle information when you use our Chrome extensions and visit our website.
            </p>

            <h2>Information We Collect</h2>
            <h3>Extensions</h3>
            <p>Our Chrome extensions are designed with privacy in mind:</p>
            <ul>
              <li><strong>No Personal Data Collection:</strong> We do not collect, store, or transmit any personal information.</li>
              <li><strong>Local Storage Only:</strong> All settings and preferences are stored locally on your device.</li>
              <li><strong>No Tracking:</strong> We do not use analytics or tracking tools within our extensions.</li>
              <li><strong>No Third-Party Sharing:</strong> We never share any data with third parties.</li>
            </ul>

            <h3>Website</h3>
            <p>When you visit our website, we may collect:</p>
            <ul>
              <li>Basic analytics data (page views, visit duration) using privacy-respecting tools</li>
              <li>Information you voluntarily provide through contact forms</li>
              <li>Newsletter subscription email addresses (with your consent)</li>
            </ul>

            <h2>How We Use Information</h2>
            <p>Any information collected is used solely for:</p>
            <ul>
              <li>Improving our extensions and website</li>
              <li>Responding to your inquiries</li>
              <li>Sending newsletters (only if subscribed)</li>
            </ul>

            <h2>Cookies</h2>
            <p>
              Our website uses essential cookies for basic functionality. We do not use advertising or tracking cookies.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access any personal data we hold about you</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of newsletters at any time</li>
              <li>Request data portability</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect any personal data we process.
            </p>

            <h2>Children's Privacy</h2>
            <p>
              Our services are not directed to children under 13. We do not knowingly collect personal information from children.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact us through our contact page.
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
