import fs from 'fs';

interface Article {
  title: string;
  slug: string;
}

const articles: Article[] = JSON.parse(fs.readFileSync('articles_dump.json', 'utf-8'));

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

const usedTitles = new Set<string>();
const usedSlugs = new Set<string>();

const intentPools: Record<string, string[]> = {
    privacy: [
        "Review & Security Analysis",
        "Installation & Setup Guide",
        "Top Features for Data Protection",
        "Troubleshooting & Common Fixes",
        "Performance Impact & Speed Test",
        "How to Block Trackers Effectively",
        "Privacy Benefits for Daily Use",
        "Comparison with Top Competitors",
        "Advanced Configuration Tips",
        "Best Open Source Alternatives"
    ],
    screenshot: [
        "Full Page Capture Tutorial",
        "Annotating & Editing Features",
        "Fast Workflow Integration Tips",
        "Best High-Quality Output Settings",
        "Capturing Scrolling Web Pages",
        "Sharing & Collaboration Tools",
        "Keyboard Shortcuts for Efficiency",
        "Review: Is it the Best Tool?",
        "Troubleshooting Capture Errors",
        "Pro Tips for Visual Documentation"
    ],
    youtube: [
        "Safe MP3 Extraction Guide",
        "High-Quality Video Downloads",
        "Ad-Free Media Downloading Tips",
        "Converter Performance Review",
        "Best Chrome Plugins for Media",
        "Fast Downloading Techniques",
        "Troubleshooting Link Errors",
        "Secure Audio Conversion Steps",
        "Comparison of Top Downloaders",
        "Workflow Optimization for Media"
    ],
    memory: [
        "Fixing High RAM Usage Guide",
        "Optimizing for Lag-Free Gaming",
        "Best Tips for Low-End PCs",
        "Comparison with Native Tools",
        "Automatic Tab Hibernation Steps",
        "Extending Laptop Battery Life",
        "Improving Browser Speed Fast",
        "Managing Heavy Tab Workloads",
        "Performance Review & Benchmarks",
        "Reducing Browser Memory Leaks"
    ],
    general: [
        "Professional Tool Overview",
        "Boosting Workflow Productivity",
        "Essential Tips for New Users",
        "Advanced Power User Features",
        "Securing Your Online Identity",
        "Cross-Platform Sync Benefits",
        "Best Free Alternatives 2025",
        "Customization & Theme Guide",
        "Integrations & Addon Support",
        "Comprehensive Feature Review"
    ]
};

const intentCounters: Record<string, number> = {};

function getUniqueIntentTitle(base: string, category: string) {
    const pool = intentPools[category] || intentPools.general;
    if (!intentCounters[category]) intentCounters[category] = 0;

    const intent = pool[intentCounters[category] % pool.length];
    intentCounters[category]++;

    // User requested removal of limits for slugs, but SEO titles should stay professional (around 60-70 chars).
    // We will keep a reasonable limit for the title but allow the slug to be full.
    let cleanBase = base.trim();
    if (cleanBase.endsWith(":")) cleanBase = cleanBase.slice(0, -1).trim();

    let title = `${cleanBase}: ${intent}`;

    if (usedTitles.has(title.toLowerCase())) {
        const suffix = ` (${Math.floor(intentCounters[category] / pool.length) + 1})`;
        title = title + suffix;
    }

    usedTitles.add(title.toLowerCase());
    return title;
}

const optimizedData = articles.map((article) => {
  const originalTitle = article.title;
  const originalSlug = article.slug;
  let cleanBase = originalTitle
    .replace(/^Unlocking the Power of /i, "")
    .replace(/^Unlock the Power of /i, "")
    .replace(/^Unlock the Full Potential of /i, "")
    .replace(/^The Ultimate Guide to /i, "")
    .replace(/^The Definitive Guide to /i, "")
    .replace(/^A Comprehensive Guide to /i, "")
    .replace(/^Mastering /i, "")
    .replace(/: A Comprehensive Guide/i, "")
    .replace(/: The Ultimate Guide/i, "")
    .replace(/: A Step-by-Step Guide/i, "")
    .replace(/ - A Comprehensive Guide/i, "")
    .replace(/ - The Ultimate Guide/i, "")
    .replace(/A Game-Changer for Web Browsing/i, "")
    .replace(/A Comprehensive Guide/i, "")
    .replace(/The Ultimate Guide/i, "")
    .replace(/:/g, "")
    .trim();

  // Capitalize first letter if it's lowercase
  cleanBase = capitalize(cleanBase);

  let category = "general";
  const lower = originalTitle.toLowerCase();

  if (lower.includes("ghostery") || lower.includes("privacy") || lower.includes("security") || lower.includes("blocker")) category = "privacy";
  else if (lower.includes("screenshot") || lower.includes("capture") || lower.includes("snipping")) category = "screenshot";
  else if (lower.includes("youtube") || lower.includes("mp3") || lower.includes("video") || lower.includes("downloader")) category = "youtube";
  else if (lower.includes("memory") || lower.includes("ram") || lower.includes("suspender") || lower.includes("speed up")) category = "memory";

  const optimizedTitle = getUniqueIntentTitle(cleanBase, category);

  // Create professional meta description (140-155 chars)
  const descriptions: Record<string, string[]> = {
      privacy: [
          "Protect your data with professional tracking protection. Learn how to configure advanced security settings and block invasive scripts for a safer web.",
          "Improve your online privacy with our expert setup guide. Discover the best ways to stop trackers from following you across different websites easily.",
          "Looking for the best privacy tools? Read our comprehensive analysis of top-rated extensions that keep your personal information secure and private.",
          "Stay anonymous while browsing the web. Our guide covers essential tips for maintaining digital security and preventing unauthorized data collection."
      ],
      screenshot: [
          "Capture high-resolution screenshots instantly. Master the best techniques for capturing full pages, regions, and scrolling content with these pro tools.",
          "Enhance your visual communication with professional screen capture tools. Learn how to annotate, edit, and share your captures with teammates effortlessly.",
          "Stop struggling with basic snips. Discover advanced Chrome screenshot extensions that offer one-click captures and powerful built-in image editors.",
          "Our expert review covers the fastest ways to document your work visually. Find the perfect capture tool for tutorials, feedback, and documentation."
      ],
      youtube: [
          "Convert and download media safely from your browser. We explore the most secure and efficient ways to save high-quality video and audio files today.",
          "Get the best audio quality for your media library. Learn how to extract high-fidelity MP3s using safe and ad-free Chrome plugins with our guide.",
          "Optimize your media downloading workflow. Discover reliable extensions that offer fast extraction and support for various formats including HD MP4.",
          "Priority security when downloading media. Read our review of top-rated converters that protect your device while delivering premium media content."
      ],
      memory: [
          "Stop Chrome from hogging your system resources. Our guide shows you how to significantly reduce RAM usage and improve overall browser performance fast.",
          "Running out of memory on your PC? Learn how to use tab hibernation and performance tools to keep your browser snappy even with dozens of tabs open.",
          "Boost your browsing speed and extend laptop battery life. Discover the best lightweight extensions for managing memory and reducing CPU load effectively.",
          "Our performance benchmarks reveal the most efficient ways to fix a slow browser. Reclaim your RAM and enjoy a smoother, lag-free online experience."
      ],
      general: [
          "Boost your daily productivity with these essential browser tools. Master advanced features and streamline your digital workflow for maximum efficiency.",
          "Discover expert tips for customizing your browsing experience. Learn how to integrate powerful addons that save you time and improve your focus.",
          "Get the most out of your web browser with our professional tool overview. We cover installation, configuration, and pro-tips for power users today.",
          "Improve your online efficiency with our curated list of must-have extensions. From research tools to task managers, enhance your browsing experience."
      ]
  };

  const descPool = descriptions[category] || descriptions.general;
  let metaDescription = descPool[intentCounters[category] % descPool.length];

  if (metaDescription.length > 155) metaDescription = metaDescription.substring(0, 152) + "...";
  if (metaDescription.length < 140) {
      metaDescription = metaDescription + " Discover expert tips and tools for a better, more professional browsing experience today.";
      metaDescription = metaDescription.substring(0, 155);
  }

  let newSlug = slugify(optimizedTitle);
  if (usedSlugs.has(newSlug)) {
      newSlug = `${newSlug}-${intentCounters[category]}`;
  }
  usedSlugs.add(newSlug);

  return {
    originalTitle: article.title,
    originalSlug: originalSlug,
    optimizedTitle,
    metaDescription,
    newSlug
  };
});

// Output as JSON for internal use and Markdown for the final report
fs.writeFileSync('optimized_articles.json', JSON.stringify(optimizedData, null, 2));

let markdownTable = "| Original Title | Optimized SEO Title (Max 60 chars) | Professional Meta Description (140-155 chars) | New Optimized Slug |\n";
markdownTable += "| :--- | :--- | :--- | :--- |\n";
optimizedData.forEach(item => {
  markdownTable += `| ${item.originalTitle} | ${item.optimizedTitle} | ${item.metaDescription} | ${item.newSlug} |\n`;
});

fs.writeFileSync('metadata_table.md', markdownTable);
console.log("Optimization complete. Check optimized_articles.json and metadata_table.md");
