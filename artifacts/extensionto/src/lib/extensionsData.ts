import { Camera, Moon, Shield, Cpu, XCircle, Calculator, Key, WifiOff, Cookie, LucideIcon } from "lucide-react";

export interface Extension {
  id: string;
  icon: LucideIcon;
  name: string;
  description: string;
  longDescription: string;
  users: string;
  rating: string;
  color: string;
  storeUrl: string;
  slug: string;
  features: string[];
  category: string;
  keywords: string[];
}

export const extensions: Extension[] = [
  {
    id: "quick-screenshot-lite",
    icon: Camera,
    name: "Quick Screenshot Lite",
    description: "Capture full page or visible area screenshots instantly. Save, copy, or download with one click.",
    longDescription: "Quick Screenshot Lite is the ultimate screen capture tool for Chrome. Capture full pages, visible areas, or selected regions with just one click. Perfect for designers, developers, and anyone who needs to quickly grab and share screen content.",
    users: "2K+",
    rating: "4.9",
    color: "from-primary to-cyan-400",
    storeUrl: "https://chromewebstore.google.com/detail/quick-screenshot-lite/hddickadgkbfpcelmckpjhcfnoeognee",
    slug: "quick-screenshot-lite",
    features: [
      "Full page screenshot capture",
      "Visible area capture",
      "One-click save and download",
      "Copy to clipboard",
      "Multiple format support (PNG, JPG)",
      "No permissions required for basic use"
    ],
    category: "Productivity",
    keywords: ["screenshot", "screen capture", "full page screenshot", "capture tool"]
  },
  {
    id: "auto-dark-mode-switcher",
    icon: Moon,
    name: "Auto Dark Mode Switcher",
    description: "Automatically switch between dark and light modes based on time or system preferences.",
    longDescription: "Auto Dark Mode Switcher intelligently manages your browser's appearance. It automatically switches between dark and light modes based on your system preferences or a custom schedule, reducing eye strain and saving battery on OLED screens.",
    users: "3K+",
    rating: "4.8",
    color: "from-violet-500 to-purple-400",
    storeUrl: "https://chromewebstore.google.com/detail/auto-dark-mode-switcher-u/obbhliekbfgpcdippngphefofiicgjml",
    slug: "auto-dark-mode-switcher",
    features: [
      "Automatic dark/light mode switching",
      "System preference sync",
      "Custom schedule support",
      "Per-site settings",
      "Battery saving on OLED screens",
      "Reduces eye strain"
    ],
    category: "Appearance",
    keywords: ["dark mode", "light mode", "theme switcher", "eye strain", "night mode"]
  },
  {
    id: "redirect-shield",
    icon: Shield,
    name: "Redirect Shield",
    description: "Stop automatic redirects and protect yourself from malicious redirect chains.",
    longDescription: "Redirect Shield is your first line of defense against malicious redirects. It blocks automatic redirects, prevents redirect chains, and keeps you safe from phishing attempts that try to trick you with multiple redirects.",
    users: "5K+",
    rating: "4.9",
    color: "from-emerald-500 to-green-400",
    storeUrl: "https://chromewebstore.google.com/detail/redirect-shield-stop-auto/pofolffdhjffglfphiagpbnlegjbnbhp",
    slug: "redirect-shield",
    features: [
      "Block automatic redirects",
      "Prevent redirect chains",
      "Phishing protection",
      "Whitelist trusted sites",
      "Notification alerts",
      "Lightweight and fast"
    ],
    category: "Security",
    keywords: ["redirect blocker", "security", "phishing protection", "safe browsing"]
  },
  {
    id: "protab-suspender",
    icon: Cpu,
    name: "ProTab Suspender",
    description: "Automatically suspend inactive tabs to save memory and boost browser performance.",
    longDescription: "ProTab Suspender intelligently manages your browser's memory by suspending inactive tabs. It dramatically reduces Chrome's memory usage while keeping your tabs organized and ready to restore when needed.",
    users: "4K+",
    rating: "4.7",
    color: "from-orange-500 to-amber-400",
    storeUrl: "https://chromewebstore.google.com/detail/protab-suspender-memory-s/gghjdfjjffegohpjhmcmgeonmcomilgj",
    slug: "protab-suspender",
    features: [
      "Automatic tab suspension",
      "Memory usage reduction",
      "Custom timeout settings",
      "Whitelist important tabs",
      "Quick tab restore",
      "Battery life improvement"
    ],
    category: "Performance",
    keywords: ["tab suspender", "memory saver", "performance", "tab manager"]
  },
  {
    id: "light-popup-blocker",
    icon: XCircle,
    name: "Light Popup Blocker",
    description: "Block annoying popups and intrusive ads for a cleaner, faster browsing experience.",
    longDescription: "Light Popup Blocker provides a clean, distraction-free browsing experience. It blocks annoying popups, overlay ads, and intrusive notifications while maintaining website functionality.",
    users: "6K+",
    rating: "4.8",
    color: "from-red-500 to-rose-400",
    storeUrl: "https://chromewebstore.google.com/detail/light-popup-blocker-ad-de/oimngcokgckajdlphggpjpbeljoakpii",
    slug: "light-popup-blocker",
    features: [
      "Block popup windows",
      "Remove overlay ads",
      "Stop intrusive notifications",
      "Whitelist trusted sites",
      "Minimal resource usage",
      "Easy toggle on/off"
    ],
    category: "Ad Blocking",
    keywords: ["popup blocker", "ad blocker", "clean browsing", "block ads"]
  },
  {
    id: "formula-builder-pro",
    icon: Calculator,
    name: "Formula Builder Pro",
    description: "Build and calculate complex formulas right in your browser. Perfect for students and professionals.",
    longDescription: "Formula Builder Pro is the ultimate calculator tool for Chrome. Build complex mathematical formulas, perform scientific calculations, and save your work for later. Perfect for students, engineers, and professionals.",
    users: "1.5K+",
    rating: "4.9",
    color: "from-blue-500 to-indigo-400",
    storeUrl: "https://chromewebstore.google.com/detail/formula-builder-pro/ecmfloopolmkamoklcepdonahkigjlnn",
    slug: "formula-builder-pro",
    features: [
      "Complex formula builder",
      "Scientific calculations",
      "Save formulas for later",
      "History tracking",
      "Multiple number formats",
      "Keyboard shortcuts"
    ],
    category: "Productivity",
    keywords: ["calculator", "formula builder", "math", "scientific calculator"]
  },
  {
    id: "securakey-pro",
    icon: Key,
    name: "SecuraKey Pro",
    description: "Secure password manager with encryption. Generate and store strong passwords safely.",
    longDescription: "SecuraKey Pro is a secure password manager that helps you generate, store, and manage strong passwords. With military-grade encryption, your passwords are always safe and accessible only to you.",
    users: "3.5K+",
    rating: "4.9",
    color: "from-pink-500 to-fuchsia-400",
    storeUrl: "https://chromewebstore.google.com/detail/securakey-pro-password-ma/omeencccnkninlofbggfcfiohapajhgi",
    slug: "securakey-pro",
    features: [
      "Secure password storage",
      "Strong password generator",
      "Military-grade encryption",
      "Auto-fill support",
      "Cross-device sync",
      "Two-factor authentication"
    ],
    category: "Security",
    keywords: ["password manager", "security", "password generator", "encryption"]
  },
  {
    id: "offline-reader-pro",
    icon: WifiOff,
    name: "Offline Reader Pro",
    description: "Save web pages for offline reading. Access your favorite content anywhere, anytime.",
    longDescription: "Offline Reader Pro lets you save any web page for offline reading. Perfect for commutes, flights, or areas with poor connectivity. Keep your favorite articles accessible anytime, anywhere.",
    users: "2.5K+",
    rating: "4.8",
    color: "from-teal-500 to-cyan-400",
    storeUrl: "https://chromewebstore.google.com/detail/offline-reader-pro/bgbojccanmjdniomhccefkakjaedajhf",
    slug: "offline-reader-pro",
    features: [
      "Save pages for offline reading",
      "Clean reader mode",
      "Organize saved articles",
      "Search saved content",
      "Export options",
      "Cloud sync support"
    ],
    category: "Productivity",
    keywords: ["offline reader", "save pages", "read later", "offline mode"]
  },
  {
    id: "cookie-banner-blocker",
    icon: Cookie,
    name: "Cookie Banner Blocker",
    description: "Automatically dismiss annoying cookie consent banners for seamless browsing.",
    longDescription: "Cookie Banner Blocker automatically handles those annoying cookie consent popups. It dismisses or accepts cookie banners based on your preferences, giving you a cleaner browsing experience.",
    users: "7K+",
    rating: "4.9",
    color: "from-amber-500 to-yellow-400",
    storeUrl: "https://chromewebstore.google.com/detail/cookie-banner-blocker-pri/mlmiefaloipcahfcgfbccadnnjgpipge",
    slug: "cookie-banner-blocker",
    features: [
      "Auto-dismiss cookie banners",
      "Custom preference settings",
      "Privacy-focused options",
      "Whitelist specific sites",
      "Works on most websites",
      "Lightweight and fast"
    ],
    category: "Privacy",
    keywords: ["cookie banner", "gdpr", "privacy", "consent popup"]
  }
];

export const getExtensionBySlug = (slug: string): Extension | undefined => {
  return extensions.find(ext => ext.slug === slug);
};

export const getExtensionById = (id: string): Extension | undefined => {
  return extensions.find(ext => ext.id === id);
};

export const findExtensionByKeyword = (keyword: string): Extension | undefined => {
  const lowerKeyword = keyword.toLowerCase();
  return extensions.find(ext => 
    ext.name.toLowerCase().includes(lowerKeyword) ||
    ext.keywords.some(k => lowerKeyword.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerKeyword)) ||
    ext.slug.includes(lowerKeyword.replace(/\s+/g, '-'))
  );
};

export const getExtensionNames = (): string[] => {
  return extensions.map(ext => ext.name);
};
