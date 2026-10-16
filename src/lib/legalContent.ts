/**
 * Legal & static page content — single source of truth.
 *
 * Used by BOTH the React pages (src/pages/Privacy.tsx etc.) and the
 * prerender script (scripts/prerender-static-pages.ts) so the static HTML
 * and the hydrated page can never drift apart.
 *
 * Honesty rule (owner delegation 2026-10-09, ب-2): this content describes
 * ONLY what the code verifiably does. Nothing is claimed unless it can be
 * pointed to in the repository (analytics/ads scripts, localStorage keys,
 * the contact email). Statements about what the site does NOT do are
 * limited to what the code actually shows.
 */

export const LAST_UPDATED = "October 9, 2026";
export const CONTACT_EMAIL = "contact@extensionto.com";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "Introduction",
    paragraphs: [
      `ExtensionTo ("we", "us") publishes free Chrome browser extensions and practical guides about browser extensions, privacy, and productivity. This Privacy Policy explains what information the website at extensionto.com and its related services handle, how that information is used, and the choices available to you.`,
      `This policy describes only what this website verifiably does. If our practices change, this page will be updated and the "Last updated" date above will change accordingly.`,
    ],
  },
  {
    heading: "Scope",
    paragraphs: [
      "This policy covers the ExtensionTo website (including its language versions) and the nine browser extensions listed in the ExtensionTo catalog. Each extension is distributed through the Chrome Web Store, and its store listing describes what data that specific extension handles. Where an extension's store listing provides extension-specific privacy details, that listing is the authoritative source for that extension.",
    ],
  },
  {
    heading: "Information collected automatically",
    bullets: [
      "Analytics: the website loads Google Analytics 4 (gtag.js) to understand which pages are read and how the site is used. Google Analytics sets cookies such as _ga and _ga_* in your browser for this purpose. The measurement data (page views, approximate location derived from IP, device and browser type, visit duration) is processed by Google on our behalf.",
      "Advertising: the website loads the Google AdSense script. Google and its certification partners use cookies — including the DoubleClick DART cookie — to serve ads based on your prior visits to this or other websites. Ad personalization uses these cookies; you can opt out of personalized advertising in Google's Ad Settings or opt out of third-party vendor cookies at aboutads.info.",
    ],
  },
  {
    heading: "Information you provide",
    bullets: [
      `Email: if you write to us at ${CONTACT_EMAIL}, we receive whatever information you choose to send (typically your name, email address, and the content of your message). We use it only to respond.`,
      "Contact form: the contact form on this website currently does not transmit or store submissions on a server. Until that changes, email is the reliable way to reach us.",
      "Newsletter: the newsletter signup box on the website currently does not transmit or store email addresses. No mailing list is operated from this site at this time.",
    ],
  },
  {
    heading: "Local storage",
    paragraphs: [
      "The website stores your language preference in your browser's localStorage (key: i18nextLng) so pages can open in the language you last selected. This is a functional preference, not a tracking mechanism, and it is not transmitted to us.",
      "Site administrators authenticate through a separate, password-protected interface; their login sessions are kept in localStorage on the administrator's own device. This does not apply to regular visitors.",
    ],
  },
  {
    heading: "Chrome extensions",
    paragraphs: [
      "The extensions in the ExtensionTo catalog keep their settings on your device where possible. For example, the Quick Screenshot Lite listing states \u201cNo permissions required for basic use\u201d in our catalog. Because each extension differs, the Chrome Web Store listing for each extension — linked from its page on this site — is where the permissions and data-handling disclosures for that extension are published.",
    ],
  },
  {
    heading: "Cookies and how to control them",
    paragraphs: [
      "Cookies used by this site fall into three groups: Google Analytics measurement cookies (_ga, _ga_*), Google AdSense advertising cookies (including the DART cookie), and functional browser storage (the language preference described above).",
      "You can block or delete cookies in your browser settings at any time; the site remains readable with cookies blocked. To control ad personalization specifically, visit Google's Ad Settings (adssettings.google.com) or the industry opt-out page aboutads.info. Blocking analytics or advertising cookies does not remove the functional language preference unless you clear site data.",
    ],
  },
  {
    heading: "How information is used",
    bullets: [
      "Analytics data is used in aggregate to see which guides are useful and to prioritize maintenance and new content.",
      "Advertising keeps the catalog and the guides free; ad revenue is the site's only funding mechanism at this time.",
      "Email you send us is used to answer your question and, where relevant, to correct the guide you wrote about.",
    ],
  },
  {
    heading: "Sharing and sale of information",
    paragraphs: [
      "We do not sell personal information, and the website's code contains no mechanism for selling or renting visitor data. The processors involved in running the site are Google (Analytics measurement and AdSense advertising) and the hosting provider that serves the pages. Each processes data under its own terms: Google's use of information from sites that use its services is described at policies.google.com/technologies/partner-sites.",
    ],
  },
  {
    heading: "Retention",
    paragraphs: [
      "Analytics and advertising cookies live for the lifetimes set by their providers, and the associated measurement data is retained under Google's standard retention settings. Email correspondence is kept only as long as needed to handle your request and for reasonable record-keeping afterwards. The language preference stays in your browser until you clear it.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      `Depending on where you live, you may have rights to access, correct, or delete personal information, to object to or restrict certain processing, and to lodge a complaint with a supervisory authority (for example under the EU/UK GDPR, or the California Consumer Privacy Act). Because this site does not maintain user accounts or a visitor database, the main personal data we could hold is email correspondence. To exercise any right, write to ${CONTACT_EMAIL} and we will respond as required by the applicable law.`,
      "California users: the site does not sell or share personal information as those terms are defined by the CCPA, and you may use the contact email above to request disclosure of what information is held.",
    ],
  },
  {
    heading: "Children",
    paragraphs: [
      "The website and the catalog are directed at a general audience and are not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has sent us personal information, contact us and we will delete it.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "The site is served over HTTPS. No security measure is absolute; we do not promise perfect security, but we do not maintain databases of visitor information that could be breached, and we keep it that way by design.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      `This policy was last updated on ${LAST_UPDATED}. When it changes, the updated version will be posted on this page with a new date. Material changes will be summarized at the top of the page.`,
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      `Questions about this policy or about your data: ${CONTACT_EMAIL}. You can also reach us through the contact page on this site.`,
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "Acceptance",
    paragraphs: [
      `By using the ExtensionTo website you agree to these Terms of Service. If you do not agree, please do not use the site. These terms were last updated on ${LAST_UPDATED}.`,
    ],
  },
  {
    heading: "Nature of the guides",
    paragraphs: [
      "The guides and articles on this site are informational. They are compiled from public documentation, product listings, and editorial judgment — they are not independent laboratory tests, professional advice, or a guarantee of results. Always check a product's official Chrome Web Store listing before installing anything.",
    ],
  },
  {
    heading: "Extensions",
    paragraphs: [
      "Extensions listed in the catalog are distributed through the Chrome Web Store. They are provided by their listing \u201cas is\u201d; ExtensionTo does not warrant that any extension will be uninterrupted, error-free, or fit a particular purpose. Installation, permissions, and support requests are handled through the Chrome Web Store listing of each extension.",
    ],
  },
  {
    heading: "Third-party links",
    paragraphs: [
      "The site links to third-party websites and store listings (for example Chrome Web Store pages, developer documentation, and reference articles). We do not control those sites and are not responsible for their content, policies, or practices. Following a third-party link is at your own discretion.",
    ],
  },
  {
    heading: "Intellectual property",
    paragraphs: [
      "The guides on this site are the editorial work of ExtensionTo. Product names and trademarks mentioned in the guides belong to their respective owners; their use in a descriptive comparison context does not imply affiliation with or endorsement by those owners unless stated.",
    ],
  },
  {
    heading: "Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, ExtensionTo is not liable for indirect, incidental, or consequential damages arising from use of the site, the guides, or the extensions listed in the catalog. The site is provided free of charge, and nothing on it creates a professional relationship.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      `We may update these terms as the site evolves. The current version is always this page. Questions: ${CONTACT_EMAIL}.`,
    ],
  },
];

export const ABOUT_SECTIONS: LegalSection[] = [
  {
    heading: "What ExtensionTo is",
    paragraphs: [
      "ExtensionTo is a website about Chrome browser extensions. It publishes a catalog of nine free extensions — including a screenshot tool, a tab suspender, a popup blocker, a dark mode switcher, and more — alongside a large library of practical guides about Chrome, browser privacy, and productivity.",
      "Everything in the catalog is free to install and use. There are no premium tiers and no feature paywalls. The site is funded by advertising, which is what keeps the catalog and the guides free.",
    ],
  },
  {
    heading: "Who the site is for",
    paragraphs: [
      "The site is written for ordinary Chrome users: people who install a handful of extensions and want them to work without reading developer documentation. Most readers are not engineers, so guides explain settings in plain language and focus on what actually changes in your browser when you install something.",
      "It is also written for readers who care about privacy and permissions. Many guides spend as much time on what an extension asks for — and whether those requests make sense — as on what the extension does.",
    ],
  },
  {
    heading: "How the guides are made",
    paragraphs: [
      "The guides are research-based. A reviewer starts with the extension's Chrome Web Store listing and the developer's own documentation: what it claims to do, what permissions it requests, how it says it handles data, and what it costs. Then they compare that against what other sources say — the developer's privacy policy, the store's user reviews, and how similar extensions solve the same problem.",
      "When a guide includes hands-on steps, they are written so a reader can repeat them in their own browser. The goal is a checklist you can follow, not a black-box score you have to take on faith.",
      "ExtensionTo has no test lab and runs no performance benchmarks. If a guide quotes a number — a rating, a user count, a permission list — it comes from a cited source. Where a claim cannot be verified, the guide says so instead of inventing one.",
    ],
  },
  {
    heading: "Comparisons and opinions",
    paragraphs: [
      "Comparisons are framed around a concrete use case — “best ad blockers for slow computers,” not “best ad blockers” in the abstract. Each comparison guide states its criteria up front: stated features, pricing, permissions, and known limitations, so readers can see why one option ranked above another.",
      "Opinions are labeled as opinions. A sentence that says an extension “feels fast” is a reviewer's judgment from using it; a sentence that says it “requests three permissions” is a fact from the store listing. The site keeps the two apart.",
    ],
  },
  {
    heading: "Corrections",
    paragraphs: [
      "Extensions change and guides go stale. When a product updates, a browser policy changes, or a reader points out an error, the affected page is corrected and its update date is changed to reflect the fix. Minor typos are fixed silently; anything that changes what a reader would decide — a wrong price, a wrong permission, a feature that no longer exists — counts as a material correction.",
      `Readers are the best early-warning system this site has. If you spot a mistake, write to ${CONTACT_EMAIL}. Include the page URL and what is wrong, and it will be checked.`,
    ],
  },
  {
    heading: "Ownership and contact",
    paragraphs: [
      "ExtensionTo is owned and operated by the site owner, who also operates the extensions in the catalog. Articles are credited to the ExtensionTo editorial team, whose people and review standards are described on the Editorial Policy page.",
      "Advertising is the site's only funding mechanism. Advertisers do not write, review, or approve guides, and paid placement in reviews or comparisons is not offered.",
    ],
  },
];
