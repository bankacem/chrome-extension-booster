import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto max-w-4xl px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-8 font-heading text-4xl font-bold">Terms of Service</h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using ExtensionHub's website and Chrome extensions, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>

            <h2>2. Description of Services</h2>
            <p>
              ExtensionHub provides Chrome browser extensions designed to enhance your browsing experience. 
              Our extensions include tools for screenshots, dark mode, privacy protection, tab management, and more.
            </p>

            <h2>3. Use License</h2>
            <p>
              Permission is granted to download and use our Chrome extensions for personal, non-commercial use. This license does not include:
            </p>
            <ul>
              <li>Modifying or copying the extensions' source code</li>
              <li>Using the extensions for commercial purposes without permission</li>
              <li>Attempting to reverse engineer the extensions</li>
              <li>Removing any copyright or proprietary notations</li>
            </ul>

            <h2>4. Disclaimer</h2>
            <p>
              Our extensions are provided "as is" without warranties of any kind. We do not guarantee that:
            </p>
            <ul>
              <li>The extensions will meet your specific requirements</li>
              <li>The extensions will be uninterrupted, timely, or error-free</li>
              <li>Any errors will be corrected</li>
            </ul>

            <h2>5. Limitations of Liability</h2>
            <p>
              In no event shall ExtensionHub be liable for any damages arising out of the use or inability to use our extensions or website. 
              This includes, but is not limited to, direct, indirect, incidental, punitive, and consequential damages.
            </p>

            <h2>6. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul>
              <li>Use our extensions in compliance with all applicable laws</li>
              <li>Not use our extensions for any illegal or unauthorized purpose</li>
              <li>Not interfere with or disrupt our services</li>
              <li>Keep your browser and extensions updated for security</li>
            </ul>

            <h2>7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of our extensions and website are owned by ExtensionHub and are protected by 
              international copyright, trademark, and other intellectual property laws.
            </p>

            <h2>8. Updates and Modifications</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue any extension or feature at any time without notice. 
              We may also update these terms from time to time.
            </p>

            <h2>9. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites. We are not responsible for the content or privacy practices of these sites.
            </p>

            <h2>10. Termination</h2>
            <p>
              We may terminate or suspend your access to our services immediately, without prior notice, for any breach of these Terms.
            </p>

            <h2>11. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
            </p>

            <h2>12. Contact Information</h2>
            <p>
              For any questions regarding these terms, please contact us through our contact page.
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
