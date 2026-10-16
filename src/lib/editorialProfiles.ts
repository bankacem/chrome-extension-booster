export type EditorialProfile = {
  name: string;
  role: string;
  bio: string;
  type: "Person" | "Organization";
  url: string;
  image: string;
};

const profiles: Record<string, EditorialProfile> = {
  "James Mitchell": {
    name: "James Mitchell",
    role: "Chrome extension reviewer",
    bio: "James Mitchell reviews Chrome extensions for ExtensionTo. He spends most of his working day installing new tools, reading their permission requests line by line, and checking whether what a developer promises on the store page matches what the extension actually does in the browser.\n\nHis reviews start with the basics: what the extension claims to do, which permissions it asks for, and whether those two things line up. From there he reads the privacy policy the way most people never do — looking for vague data-collection language, third-party sharing clauses, and retention terms that raise more questions than they answer. He also keeps an eye on user reviews in the Chrome Web Store, not for the star ratings but for the patterns in the one-star complaints: broken updates, features that quietly stopped working, support that went silent.\n\nJames doesn't do hype. If an extension is average, he says so. If a feature works well in testing but the privacy policy is thin, both facts end up in the same review. His goal is practical: give readers enough of the checkable details — documented features, permission models, privacy policies, and real user feedback — that they can decide for themselves whether a tool is worth installing.\n\nHe covers productivity, security, and browsing tools, and every verdict on this site carries his name because he stands behind it.",
    type: "Person",
    url: "/authors/james-mitchell",
    image: "/content/images/authors/james-mitchell.png",
  },
  "Miccart Phen": {
    name: "Miccart Phen",
    role: "Technology and browser-tools writer",
    bio: "Miccart covers browser tools and practical workflows with a focus on clarity, usability, and responsible product comparisons.",
    type: "Person",
    url: "/editorial-policy#reviewers",
    image: "/content/images/authors/miccart-phen.png",
  },
  "Frah Nssim": {
    name: "Frah Nssim",
    role: "Research and productivity writer",
    bio: "Frah researches productivity software and browser workflows, emphasizing reproducible checks, privacy context, and reader-friendly guidance.",
    type: "Person",
    url: "/editorial-policy#reviewers",
    image: "/content/images/authors/frah-nssim.png",
  },
  "Manus AI": {
    name: "Manus AI",
    role: "Editorial team",
    bio: "Manus AI supports ExtensionTo research and drafting while the editorial team verifies sources, structure, and publishing quality.",
    type: "Organization",
    url: "/editorial-policy",
    image: "/content/images/authors/manus-ai.webp",
  },
  "ExtensionTo": {
    name: "ExtensionTo",
    role: "Editorial team",
    bio: "The ExtensionTo editorial team researches browser tools, verifies core claims against available documentation, and maintains the site's publishing standards.",
    type: "Organization",
    url: "/editorial-policy",
    image: "/content/images/authors/extensionto.png",
  },
  Admin: {
    name: "ExtensionTo Editorial Team",
    role: "Editorial team",
    bio: "The ExtensionTo editorial team researches browser tools, verifies core claims against available documentation, and maintains the site’s publishing standards.",
    type: "Organization",
    url: "/editorial-policy",
    image: "/og-image.png",
  },
};

export const defaultEditorialProfile = profiles.Admin;

export function getEditorialProfile(author?: string): EditorialProfile {
  return profiles[author || ""] || {
    ...defaultEditorialProfile,
    name: author || defaultEditorialProfile.name,
    type: author ? "Person" : defaultEditorialProfile.type,
  };
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Look up a profile by its URL slug, e.g. "james-mitchell" for James Mitchell. */
export function getEditorialProfileBySlug(slug: string): EditorialProfile | undefined {
  const needle = slug.toLowerCase();
  return Object.values(profiles).find((p) => slugifyName(p.name) === needle);
}
