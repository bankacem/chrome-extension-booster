import { motion } from "framer-motion";
import LegalPage from "@/components/LegalPage";
import { PRIVACY_SECTIONS, LAST_UPDATED, CONTACT_EMAIL } from "@/lib/legalContent";

const Privacy = () => (
  <LegalPage
    title="Privacy Policy"
    description="How extensionto.com handles information: analytics, advertising cookies, localStorage, the contact email, and your rights."
    canonicalPath="/privacy"
    heading="Privacy Policy"
    sections={PRIVACY_SECTIONS}
    lastUpdated={LAST_UPDATED}
    contactEmail={CONTACT_EMAIL}
  />
);

export default Privacy;
