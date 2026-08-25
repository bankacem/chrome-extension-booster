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
    bio: "James evaluates Chrome extensions through practical workflow, privacy, performance, and usability criteria.",
    type: "Person",
    url: "/editorial-policy#reviewers",
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
