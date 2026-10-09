import LegalPage from "@/components/LegalPage";
import { Link } from "react-router-dom";
import { ABOUT_SECTIONS, CONTACT_EMAIL } from "@/lib/legalContent";

const About = () => (
  <LegalPage
    title="About ExtensionTo"
    description="ExtensionTo publishes nine free Chrome extensions and a large library of practical guides — compiled from public documentation, with an explicit editorial method."
    canonicalPath="/about"
    heading="About ExtensionTo"
    sections={ABOUT_SECTIONS}
    contactEmail={CONTACT_EMAIL}
  >
    <p>
      Read the <Link to="/editorial-policy" className="text-primary hover:underline">Editorial Policy</Link>,{" "}
      the <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, or{" "}
      <Link to="/contact" className="text-primary hover:underline">contact us</Link>.
    </p>
  </LegalPage>
);

export default About;
