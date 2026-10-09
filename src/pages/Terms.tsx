import LegalPage from "@/components/LegalPage";
import { TERMS_SECTIONS, LAST_UPDATED, CONTACT_EMAIL } from "@/lib/legalContent";

const Terms = () => (
  <LegalPage
    title="Terms of Service"
    description="Terms for using extensionto.com: the guides are informational, extensions are provided as-is through the Chrome Web Store, and third-party links are outside our control."
    canonicalPath="/terms"
    heading="Terms of Service"
    sections={TERMS_SECTIONS}
    lastUpdated={LAST_UPDATED}
    contactEmail={CONTACT_EMAIL}
  />
);

export default Terms;
