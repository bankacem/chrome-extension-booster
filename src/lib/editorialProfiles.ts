export type EditorialProfile = {
  name: string;
  role: string;
  bio: string;
  type: "Person" | "Organization";
  url: string;
};

const profiles: Record<string, EditorialProfile> = {
  "James Mitchell": {
    name: "James Mitchell",
    role: "Chrome extension reviewer",
    bio: "James evaluates Chrome extensions through practical workflow, privacy, performance, and usability criteria.",
    type: "Person",
    url: "/editorial-policy#reviewers",
  },
  Admin: {
    name: "ExtensionTo Editorial Team",
    role: "Editorial team",
    bio: "The ExtensionTo editorial team researches browser tools, verifies core claims against available documentation, and maintains the site’s publishing standards.",
    type: "Organization",
    url: "/editorial-policy",
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
