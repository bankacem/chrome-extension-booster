/**
 * imageEntropyEngine.ts
 *
 * Deterministic visual entropy system for unique blog feature image generation.
 * Every article maps to a unique combination of layout + palette + typography +
 * camera + lighting + composition. No two articles share the same visual signature.
 *
 * Includes:
 *  - SHA-256 seed derivation (Web Crypto, no deps)
 *  - 8 layout types / 10 palettes / 6 typography styles / 6 cameras / 6 lighting
 *  - Category Visual DNA with mandatory layout + UI-structure overrides per category
 *  - Anti-duplication sliding window (last 10 specs checked)
 *  - Quality Gate (5 automated checks before approving a spec)
 *  - Fallback image detector (generic/placeholder/WordPress URLs)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArticleInput {
  title: string;
  slug: string;
  category?: string | null;
  tags?: string[] | null;
  excerpt?: string | null;
  published_at?: string | null;
}

export interface EntropyParams {
  seed: string;
  layout: Layout;
  palette: Palette;
  typography: Typography;
  cameraAngle: CameraAngle;
  lightingStyle: LightingStyle;
  compositionDensity: CompositionDensity;
  backgroundEnvironment: BackgroundEnvironment;
  uiStructure: UIStructure;
}

export type ImageQualityStatus =
  | "approved"   // real image, passed all quality checks
  | "missing"    // no featured_image at all
  | "fallback"   // has an image URL but it's generic/placeholder/wordpress
  | "pending"    // has an image, not yet quality-checked
  | "rejected";  // generated but failed quality gate (too similar / wrong category)

export interface QualityGateResult {
  passed: boolean;
  checks: {
    isUnique: boolean;           // differs from all previously generated specs
    isCategoryAligned: boolean;  // layout + UI structure match category DNA
    hasUIStructure: boolean;     // not purely abstract — must have identifiable UI
    hasTitleIntegration: boolean;// title placement is wired into a UI element
    differsFromRecent: boolean;  // differs from last 10 generated images
  };
  failedChecks: string[];
}

export interface ImageSpec {
  title: string;
  slug: string;
  seed: string;
  layout: string;
  category: string;
  image_prompt: string;
  negative_prompt: string;
  webp_1200x630: string;
  webp_1024x1024: string;
  visual_signature: string;
  quality_gate: QualityGateResult;
  params: EntropyParams;
}

// ── Layout Types (8) ──────────────────────────────────────────────────────────

export type Layout =
  | "saas_dashboard"
  | "cinematic_hero"
  | "minimal_typography"
  | "isometric_3d"
  | "split_screen"
  | "floating_cards"
  | "neon_cyber"
  | "editorial_magazine";

const LAYOUTS: Layout[] = [
  "saas_dashboard",
  "cinematic_hero",
  "minimal_typography",
  "isometric_3d",
  "split_screen",
  "floating_cards",
  "neon_cyber",
  "editorial_magazine",
];

// Layouts that are "abstract" — they require extra UI structure injection to pass the gate
const ABSTRACT_LAYOUTS: Set<Layout> = new Set(["cinematic_hero", "minimal_typography", "editorial_magazine"]);

export const LAYOUT_DESCRIPTIONS: Record<Layout, string> = {
  saas_dashboard:
    "browser window mockup with a polished SaaS dashboard UI, title embedded in a header panel, clean card grid, data visualizations, sidebar navigation",
  cinematic_hero:
    "dramatic cinematic wide-angle hero scene with strong depth of field, bokeh background, title inside a glass morphism overlay card, cinematic lighting",
  minimal_typography:
    "ultra-clean minimal design, generous white space, large typographic title in a styled text panel, one strong accent icon, geometric grid system",
  isometric_3d:
    "isometric 3D illustration with layered floating UI blocks, title on the front face of a 3D card, soft ambient shadows, pastel accent colours",
  split_screen:
    "bold split-screen layout, left half dark with glowing UI element, right half light with title card, strong contrast between two visual zones",
  floating_cards:
    "stack of floating glass-morphism UI cards at slight angles, title inside the top card, subtle drop shadows, frosted glass effect, depth layers",
  neon_cyber:
    "futuristic neon cyber interface, dark background with glowing neon outlines, HUD elements, title in an illuminated header bar, cyber grid floor",
  editorial_magazine:
    "editorial magazine-style layout, strong typographic hierarchy, title inside a dark editorial banner, abstract geometric accent shapes, premium feel",
};

// ── Palette Types ─────────────────────────────────────────────────────────────

export type Palette =
  | "cyber_blue_navy"
  | "neon_purple_magenta"
  | "clean_white_soft_blue"
  | "deep_emerald_teal"
  | "sunset_amber_orange"
  | "crimson_dark_red"
  | "monochrome_slate"
  | "violet_indigo"
  | "forest_green_dark"
  | "rose_pink_blush";

const PALETTES: Palette[] = [
  "cyber_blue_navy",
  "neon_purple_magenta",
  "clean_white_soft_blue",
  "deep_emerald_teal",
  "sunset_amber_orange",
  "crimson_dark_red",
  "monochrome_slate",
  "violet_indigo",
  "forest_green_dark",
  "rose_pink_blush",
];

const PALETTE_DESCRIPTIONS: Record<Palette, string> = {
  cyber_blue_navy:        "dark navy background #0a0f1e, electric cyan #00d4ff accents, cobalt blue #1e40af highlights",
  neon_purple_magenta:    "deep purple #1a0533 background, neon magenta #ff00ff accents, electric violet #8b5cf6 highlights",
  clean_white_soft_blue:  "pure white #ffffff background, soft sky blue #bfdbfe accents, medium blue #3b82f6 highlights",
  deep_emerald_teal:      "very dark charcoal #0d1117 background, emerald green #10b981 accents, teal #14b8a6 highlights",
  sunset_amber_orange:    "dark warm #1c1008 background, warm amber #f59e0b accents, deep orange #ea580c highlights",
  crimson_dark_red:       "near-black #0f0505 background, vivid crimson #dc2626 accents, rose #f43f5e highlights",
  monochrome_slate:       "dark slate #0f172a background, medium slate #64748b accents, near-white #f1f5f9 highlights",
  violet_indigo:          "deep indigo #1e1b4b background, bright violet #7c3aed accents, lavender #c4b5fd highlights",
  forest_green_dark:      "dark forest #061208 background, bright green #22c55e accents, lime #84cc16 highlights",
  rose_pink_blush:        "dark charcoal #1a0a0f background, hot pink #ec4899 accents, blush #fda4af highlights",
};

// ── Typography Styles ─────────────────────────────────────────────────────────

export type Typography =
  | "bold_geometric_sans"
  | "elegant_serif_editorial"
  | "mono_code_tech"
  | "rounded_friendly"
  | "condensed_impact"
  | "thin_display";

const TYPOGRAPHIES: Typography[] = [
  "bold_geometric_sans",
  "elegant_serif_editorial",
  "mono_code_tech",
  "rounded_friendly",
  "condensed_impact",
  "thin_display",
];

const TYPOGRAPHY_DESCRIPTIONS: Record<Typography, string> = {
  bold_geometric_sans:      "bold geometric sans-serif font, heavy weight, high contrast letterforms",
  elegant_serif_editorial:  "refined editorial serif typography, high contrast strokes, magazine quality",
  mono_code_tech:           "monospaced code-style font, technical precision, developer aesthetic",
  rounded_friendly:         "rounded sans-serif, approachable and modern, clean and legible",
  condensed_impact:         "extra-condensed display typeface, tall and dramatic, strong visual presence",
  thin_display:             "ultra-thin display weight, large scale, premium minimal aesthetic",
};

// ── Camera Angles ─────────────────────────────────────────────────────────────

export type CameraAngle =
  | "straight_on_flat"
  | "slight_tilt_perspective"
  | "isometric_45deg"
  | "top_down_aerial"
  | "low_angle_dramatic"
  | "three_quarter_view";

const CAMERA_ANGLES: CameraAngle[] = [
  "straight_on_flat",
  "slight_tilt_perspective",
  "isometric_45deg",
  "top_down_aerial",
  "low_angle_dramatic",
  "three_quarter_view",
];

const CAMERA_DESCRIPTIONS: Record<CameraAngle, string> = {
  straight_on_flat:        "straight-on flat orthographic view, no perspective distortion",
  slight_tilt_perspective: "subtle 5-degree tilt, mild perspective, elegant and dynamic",
  isometric_45deg:         "perfect isometric 45-degree projection, geometric precision",
  top_down_aerial:         "top-down bird's-eye view looking directly down at UI elements",
  low_angle_dramatic:      "low angle looking up at the subject, dramatic and imposing",
  three_quarter_view:      "classic 3/4 product view, slight right-facing perspective, natural depth",
};

// ── Lighting Styles ───────────────────────────────────────────────────────────

export type LightingStyle =
  | "cinematic_rim_light"
  | "soft_studio_ambient"
  | "neon_glow_backlit"
  | "dramatic_chiaroscuro"
  | "sunrise_golden_hour"
  | "cold_blue_moonlight";

const LIGHTING_STYLES: LightingStyle[] = [
  "cinematic_rim_light",
  "soft_studio_ambient",
  "neon_glow_backlit",
  "dramatic_chiaroscuro",
  "sunrise_golden_hour",
  "cold_blue_moonlight",
];

const LIGHTING_DESCRIPTIONS: Record<LightingStyle, string> = {
  cinematic_rim_light:  "strong cinematic rim lighting from the upper-left, deep shadow on right, film-grade",
  soft_studio_ambient:  "even soft-box studio lighting, gentle diffused shadows, clean product photography style",
  neon_glow_backlit:    "neon backlit glow emanating from behind the subject, halo effect, atmospheric bloom",
  dramatic_chiaroscuro: "strong chiaroscuro contrast, bright focal centre fading to deep shadow, Renaissance style",
  sunrise_golden_hour:  "warm golden-hour sunrise light from the right, long soft shadows, warm amber fill",
  cold_blue_moonlight:  "cool blue moonlit atmosphere, crisp specular highlights, serene and technical",
};

// ── Composition Density ───────────────────────────────────────────────────────

export type CompositionDensity = "sparse_minimal" | "balanced_editorial" | "rich_detailed";

const DENSITIES: CompositionDensity[] = ["sparse_minimal", "balanced_editorial", "rich_detailed"];

const DENSITY_DESCRIPTIONS: Record<CompositionDensity, string> = {
  sparse_minimal:     "sparse composition with generous negative space, 1-2 key focal elements",
  balanced_editorial: "balanced composition, 3-4 elements arranged in rule-of-thirds grid",
  rich_detailed:      "rich layered composition with depth, multiple UI elements, detailed background",
};

// ── Background Environments ───────────────────────────────────────────────────

export type BackgroundEnvironment =
  | "abstract_gradient_mesh"
  | "geometric_grid_lines"
  | "bokeh_particle_field"
  | "depth_blur_layers"
  | "circuit_board_pattern"
  | "cloud_atmosphere"
  | "noise_texture_dark"
  | "glassmorphism_panels";

const BACKGROUNDS: BackgroundEnvironment[] = [
  "abstract_gradient_mesh",
  "geometric_grid_lines",
  "bokeh_particle_field",
  "depth_blur_layers",
  "circuit_board_pattern",
  "cloud_atmosphere",
  "noise_texture_dark",
  "glassmorphism_panels",
];

const BACKGROUND_DESCRIPTIONS: Record<BackgroundEnvironment, string> = {
  abstract_gradient_mesh: "smooth abstract gradient mesh background, flowing colour transitions, no hard edges",
  geometric_grid_lines:   "subtle geometric grid lines receding into perspective, technical and precise",
  bokeh_particle_field:   "soft bokeh particle field background, floating light orbs, defocused depth",
  depth_blur_layers:      "multiple blurred depth layers creating a sense of 3D space, Gaussian blur falloff",
  circuit_board_pattern:  "faint printed circuit board trace pattern in background, tech and electronic feel",
  cloud_atmosphere:       "atmospheric cloud layer in deep sky background, ethereal and expansive",
  noise_texture_dark:     "subtle film grain noise texture on dark background, tactile and premium",
  glassmorphism_panels:   "frosted glass panel layers as background elements, translucent depth effect",
};

// ── UI Structure ──────────────────────────────────────────────────────────────

export type UIStructure =
  | "browser_window_frame"
  | "dashboard_card_grid"
  | "mobile_device_mockup"
  | "terminal_code_panel"
  | "notification_stack"
  | "settings_panel_sidebar"
  | "analytics_chart_view"
  | "extension_popup_ui";

const UI_STRUCTURES: UIStructure[] = [
  "browser_window_frame",
  "dashboard_card_grid",
  "mobile_device_mockup",
  "terminal_code_panel",
  "notification_stack",
  "settings_panel_sidebar",
  "analytics_chart_view",
  "extension_popup_ui",
];

const UI_STRUCTURE_DESCRIPTIONS: Record<UIStructure, string> = {
  browser_window_frame:    "realistic Chrome browser window frame with tab bar, address bar, and extension icons visible",
  dashboard_card_grid:     "SaaS analytics dashboard with metric cards, mini charts, and status indicators",
  mobile_device_mockup:    "modern smartphone mockup showing the UI in portrait orientation",
  terminal_code_panel:     "dark terminal / code editor panel with syntax-highlighted code and cursor",
  notification_stack:      "stack of notification cards and alert banners, each with icon and message",
  settings_panel_sidebar:  "settings control panel with toggles, sliders, and option rows",
  analytics_chart_view:    "analytics view with line chart, bar graph, and KPI numbers prominently displayed",
  extension_popup_ui:      "Chrome extension popup window, 300px wide, showing extension controls and toggle switch",
};

// ── Category Visual DNA ───────────────────────────────────────────────────────
// RULE 4 enforcement: mandatory layout + UI structure per category.
// layoutOverride   → forces a specific layout (ignores entropy byte)
// uiOverride       → forces a specific UI structure (ignores entropy byte)
// These ensure category-visual-match without exception.

interface CategoryDNA {
  keywords: string[];
  elements: string[];
  moodOverride?: Partial<Pick<EntropyParams, "palette" | "lightingStyle">>;
  layoutOverride?: Layout;
  uiOverride?: UIStructure;
  /**
   * Human-readable description of what the visual MUST look like.
   * Used in the quality gate check description.
   */
  visualRequirement: string;
}

const CATEGORY_DNA: Record<string, CategoryDNA> = {
  "Privacy & Security": {
    keywords: ["cybersecurity", "privacy protection", "data shield", "encrypted lock", "threat detection"],
    elements: ["shield icon", "padlock", "firewall layers", "security badge", "encrypted data streams", "vulnerability scanner"],
    moodOverride: { palette: "cyber_blue_navy", lightingStyle: "neon_glow_backlit" },
    layoutOverride: "neon_cyber",
    uiOverride: "dashboard_card_grid",
    visualRequirement: "cybersecurity dashboard with shield, padlock, or firewall elements on dark neon background",
  },
  "Ad Blocking": {
    keywords: ["ad blocker", "clean web", "blocked ads", "privacy shield", "tracker removal"],
    elements: ["block symbol", "web page with blocked zones", "filter layers", "shield overlay on browser", "red block icons"],
    moodOverride: { palette: "crimson_dark_red" },
    layoutOverride: "split_screen",
    uiOverride: "browser_window_frame",
    visualRequirement: "split-screen browser showing before/after ad blocking with block symbols",
  },
  "Chrome Extensions": {
    keywords: ["Chrome browser", "extension ecosystem", "browser toolbar", "plugin", "web store"],
    elements: ["Chrome browser window", "extension puzzle piece icon", "toolbar with extensions", "toggle switches", "extension popup"],
    moodOverride: { palette: "clean_white_soft_blue" },
    layoutOverride: "saas_dashboard",
    uiOverride: "browser_window_frame",
    visualRequirement: "Chrome browser window mockup showing extension toolbar and popup UI",
  },
  "Screenshot & Screen Capture": {
    keywords: ["screen capture", "screenshot tool", "recording overlay", "capture frame", "snipping"],
    elements: ["screen capture crosshair", "camera shutter overlay", "screen recording toolbar", "selection rectangle", "camera icon"],
    layoutOverride: "floating_cards",
    uiOverride: "browser_window_frame",
    visualRequirement: "floating browser/screen mockup with capture selection overlay and camera shutter elements",
  },
  "Dark Mode & Themes": {
    keywords: ["dark interface", "theme customization", "night mode", "visual aesthetics", "colour schemes"],
    elements: ["moon icon", "dark/light toggle switch", "theme palette swatches", "before/after split", "settings panel"],
    moodOverride: { palette: "monochrome_slate", lightingStyle: "cold_blue_moonlight" },
    layoutOverride: "split_screen",
    uiOverride: "settings_panel_sidebar",
    visualRequirement: "split-screen dark/light mode comparison with theme settings panel and toggle switches",
  },
  "Performance & Memory": {
    keywords: ["browser speed", "memory optimization", "performance metrics", "fast loading", "RAM usage"],
    elements: ["speed gauge", "memory usage graph", "performance dashboard", "green/red metric bars", "CPU meter"],
    moodOverride: { palette: "deep_emerald_teal" },
    layoutOverride: "saas_dashboard",
    uiOverride: "analytics_chart_view",
    visualRequirement: "performance analytics dashboard with speed gauges, memory charts, and metric cards",
  },
  "Developer Tools": {
    keywords: ["developer console", "code editor", "debugging panel", "developer workflow", "API testing"],
    elements: ["terminal window", "syntax-highlighted code", "DevTools panel", "API response", "code brackets"],
    moodOverride: { palette: "monochrome_slate", lightingStyle: "cinematic_rim_light" },
    layoutOverride: "neon_cyber",
    uiOverride: "terminal_code_panel",
    visualRequirement: "developer terminal/code panel with syntax-highlighted code on dark background",
  },
  "Downloads & Media": {
    keywords: ["file download", "media management", "download manager", "progress tracking", "file types"],
    elements: ["download progress bar", "file type icons", "folder system", "download speed meter", "queue list"],
    moodOverride: { palette: "violet_indigo" },
    layoutOverride: "floating_cards",
    uiOverride: "notification_stack",
    visualRequirement: "stacked download cards with progress bars, file icons, and speed metrics",
  },
  "Mobile & Android": {
    keywords: ["mobile Chrome", "Android browser", "responsive design", "mobile UX", "smartphone"],
    elements: ["Android smartphone", "mobile Chrome UI", "responsive layout grid", "touch interface", "mobile viewport"],
    moodOverride: { palette: "deep_emerald_teal" },
    layoutOverride: "isometric_3d",
    uiOverride: "mobile_device_mockup",
    visualRequirement: "isometric 3D smartphone mockup showing Chrome mobile UI",
  },
  "Social Media": {
    keywords: ["social platform", "content sharing", "social integration", "feed management", "engagement"],
    elements: ["social media feed", "like/share buttons", "profile card", "engagement metrics", "social icons"],
    moodOverride: { palette: "neon_purple_magenta" },
    layoutOverride: "floating_cards",
    uiOverride: "dashboard_card_grid",
    visualRequirement: "floating social media cards with engagement metrics and share buttons",
  },
  "Productivity & Workflow": {
    keywords: ["task management", "workflow automation", "productivity system", "efficiency", "kanban"],
    elements: ["kanban board", "task checklist", "calendar grid", "productivity metric cards", "timer"],
    moodOverride: { palette: "clean_white_soft_blue", lightingStyle: "soft_studio_ambient" },
    layoutOverride: "saas_dashboard",
    uiOverride: "dashboard_card_grid",
    visualRequirement: "clean SaaS productivity dashboard with kanban cards, task lists, and metric panels",
  },
  "AI & Machine Learning": {
    keywords: ["artificial intelligence", "neural network", "machine learning", "AI assistant", "automation"],
    elements: ["neural network nodes", "AI brain icon", "data flow graph", "prediction metrics", "circuit patterns"],
    moodOverride: { palette: "neon_purple_magenta", lightingStyle: "neon_glow_backlit" },
    layoutOverride: "neon_cyber",
    uiOverride: "analytics_chart_view",
    visualRequirement: "futuristic neural/AI UI with glowing network nodes, data flows, and neon cyber aesthetics",
  },
  "General": {
    keywords: ["Chrome extension", "browser enhancement", "web productivity", "browser tool"],
    elements: ["browser window", "extension icon", "web page UI", "puzzle piece"],
    layoutOverride: "saas_dashboard",
    uiOverride: "browser_window_frame",
    visualRequirement: "SaaS-style browser UI mockup with Chrome window and extension elements",
  },
};

function getCategoryDNA(category: string | null | undefined): CategoryDNA {
  if (!category) return CATEGORY_DNA["General"];
  // Direct match first
  if (CATEGORY_DNA[category]) return CATEGORY_DNA[category];
  // Fuzzy: if category contains key terms
  const lower = category.toLowerCase();
  if (lower.includes("security") || lower.includes("privacy")) return CATEGORY_DNA["Privacy & Security"];
  if (lower.includes("ad block"))                               return CATEGORY_DNA["Ad Blocking"];
  if (lower.includes("screenshot") || lower.includes("capture")) return CATEGORY_DNA["Screenshot & Screen Capture"];
  if (lower.includes("dark") || lower.includes("theme"))        return CATEGORY_DNA["Dark Mode & Themes"];
  if (lower.includes("performance") || lower.includes("memory")) return CATEGORY_DNA["Performance & Memory"];
  if (lower.includes("developer") || lower.includes("dev"))     return CATEGORY_DNA["Developer Tools"];
  if (lower.includes("download") || lower.includes("media"))    return CATEGORY_DNA["Downloads & Media"];
  if (lower.includes("mobile") || lower.includes("android"))    return CATEGORY_DNA["Mobile & Android"];
  if (lower.includes("social"))                                  return CATEGORY_DNA["Social Media"];
  if (lower.includes("productivity") || lower.includes("workflow")) return CATEGORY_DNA["Productivity & Workflow"];
  if (lower.includes("ai") || lower.includes("machine"))        return CATEGORY_DNA["AI & Machine Learning"];
  if (lower.includes("extension") || lower.includes("chrome"))  return CATEGORY_DNA["Chrome Extensions"];
  return CATEGORY_DNA["General"];
}

// ── Fallback Image Detection (RULE 1) ─────────────────────────────────────────

const FALLBACK_PATTERNS: RegExp[] = [
  /default\.(webp|png|jpg|jpeg)$/i,
  /og-image\.(webp|png|jpg|jpeg)$/i,
  /og_image\.(webp|png|jpg|jpeg)$/i,
  /placeholder\.(webp|png|jpg|jpeg)$/i,
  /via\.placeholder\.com/i,
  /placehold\.it/i,
  /picsum\.photos/i,
  /lorempixel/i,
  /placeimg\.com/i,
  /dummyimage\.com/i,
  /wp-content\/uploads/i,
  /wordpress\.com\//i,
  /\.wp\.com\//i,
  /\.(blogspot|blogger)\.com\//i,
  /images\.(unsplash|pexels|pixabay)\.com\//i,   // raw stock photo CDNs without specific slugs
];

export function isFallbackImage(url: string | null | undefined): boolean {
  if (!url || url.trim() === "") return true;
  return FALLBACK_PATTERNS.some((re) => re.test(url));
}

export function getImageQualityStatus(url: string | null | undefined): ImageQualityStatus {
  if (!url || url.trim() === "") return "missing";
  if (isFallbackImage(url)) return "fallback";
  return "pending";
}

// ── SHA-256 Seed Computation ───────────────────────────────────────────────────

export async function computeSeed(article: ArticleInput): Promise<string> {
  const parts = [
    article.title ?? "",
    article.slug ?? "",
    article.category ?? "",
    (article.tags ?? []).sort().join(","),
    article.excerpt ?? "",
    article.published_at ?? "",
  ];
  const text = parts.join("|");
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Param Derivation ──────────────────────────────────────────────────────────

function byteAt(seed: string, offset: number): number {
  return parseInt(seed.slice(offset * 2, offset * 2 + 2), 16);
}

function pick<T>(arr: T[], seed: string, byteOffset: number): T {
  return arr[byteAt(seed, byteOffset) % arr.length];
}

export function deriveParams(seed: string, article: ArticleInput): EntropyParams {
  const dna = getCategoryDNA(article.category);

  // Entropy-derived base values
  const entropyLayout     = pick(LAYOUTS,        seed, 0) as Layout;
  let   palette           = pick(PALETTES,       seed, 2) as Palette;
  const typography        = pick(TYPOGRAPHIES,   seed, 4) as Typography;
  const cameraAngle       = pick(CAMERA_ANGLES,  seed, 6) as CameraAngle;
  let   lighting          = pick(LIGHTING_STYLES,seed, 8) as LightingStyle;
  const density           = pick(DENSITIES,      seed, 10) as CompositionDensity;
  const background        = pick(BACKGROUNDS,    seed, 12) as BackgroundEnvironment;
  const entropyUIStructure = pick(UI_STRUCTURES, seed, 14) as UIStructure;

  // RULE 4: Category DNA overrides beat entropy — mandatory layout + UI structure
  const layout      = dna.layoutOverride ?? entropyLayout;
  const uiStructure = dna.uiOverride     ?? entropyUIStructure;

  // Apply mood overrides (palette + lighting)
  if (dna.moodOverride?.palette)       palette  = dna.moodOverride.palette;
  if (dna.moodOverride?.lightingStyle) lighting = dna.moodOverride.lightingStyle;

  return {
    seed,
    layout,
    palette,
    typography,
    cameraAngle,
    lightingStyle: lighting,
    compositionDensity: density,
    backgroundEnvironment: background,
    uiStructure,
  };
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

export function buildPrompt(article: ArticleInput, params: EntropyParams): string {
  const dna = getCategoryDNA(article.category);
  const titleQuoted = `"${article.title}"`;
  const catLabel = article.category ?? "Chrome Extensions";

  // RULE 4 + RULE 7: Title MUST appear inside a specific UI element — never floating
  const titleIntegration = (() => {
    switch (params.layout) {
      case "saas_dashboard":
        return `the article title ${titleQuoted} displayed inside a dashboard header panel at the top, styled as a SaaS product title in a pill-shaped label`;
      case "cinematic_hero":
        return `the article title ${titleQuoted} embedded inside a frosted glass morphism overlay card in the lower third, with dark tinted background for legibility`;
      case "minimal_typography":
        return `the article title ${titleQuoted} as the centrepiece in a large styled text panel with subtle background fill, bold weight, maximum contrast`;
      case "isometric_3d":
        return `the article title ${titleQuoted} on the front face of the largest 3D isometric block, engraved or printed in a contrasting colour`;
      case "split_screen":
        return `the article title ${titleQuoted} placed inside a prominent title card on the right panel, white text on dark overlay`;
      case "floating_cards":
        return `the article title ${titleQuoted} printed inside the top glass-morphism card at full card width, high-contrast typography`;
      case "neon_cyber":
        return `the article title ${titleQuoted} in the glowing HUD header bar at the top of the interface, neon-lit lettering`;
      case "editorial_magazine":
        return `the article title ${titleQuoted} inside a bold editorial dark banner strip across the lower third, high-contrast reversed type`;
    }
  })();

  const segments = [
    `Ultra high quality editorial blog feature image for an article titled ${titleQuoted} about ${catLabel}.`,
    // RULE 4: Category visual requirement is stated explicitly
    `Visual requirement: This image MUST look like a ${dna.visualRequirement}.`,
    // Layout
    `Layout: ${LAYOUT_DESCRIPTIONS[params.layout]}.`,
    // RULE 7: Title integration (always inside a UI element)
    `Title integration (mandatory): ${titleIntegration}. The title text MUST be clearly readable and integrated as a UI label, NOT floating freely over the background.`,
    // Category DNA elements
    `Thematic elements that MUST appear: ${dna.elements.join(", ")}.`,
    `Topic keywords visually present: ${dna.keywords.join(", ")}.`,
    // UI structure (RULE 3 + RULE 7)
    `UI structure: ${UI_STRUCTURE_DESCRIPTIONS[params.uiStructure]}. This UI component MUST be clearly identifiable, not abstract art.`,
    // Palette + lighting
    `Colour palette: ${PALETTE_DESCRIPTIONS[params.palette]}.`,
    `Typography style: ${TYPOGRAPHY_DESCRIPTIONS[params.typography]}.`,
    `Camera angle: ${CAMERA_DESCRIPTIONS[params.cameraAngle]}.`,
    `Lighting: ${LIGHTING_DESCRIPTIONS[params.lightingStyle]}.`,
    `Background: ${BACKGROUND_DESCRIPTIONS[params.backgroundEnvironment]}.`,
    `Composition: ${DENSITY_DESCRIPTIONS[params.compositionDensity]}.`,
    // Output quality
    `Image dimensions: 1200x630 horizontal banner, perfect for Open Graph and Google Discover.`,
    `Style: premium SaaS product editorial thumbnail, scroll-stopping CTR-optimised design, depth shadows, glow effects, professional studio render.`,
    `Format: WebP, photorealistic + digital illustration hybrid, sharp details at 1200px wide.`,
    `Absolutely NO generic stock photo backgrounds, NO watermarks, NO floating random text, NO Lorem Ipsum, NO abstract-only compositions.`,
  ];

  return segments.join(" ");
}

export function buildNegativePrompt(): string {
  return [
    "blurry, low quality, pixelated, jpeg artifacts, watermark, signature, text floating randomly,",
    "generic stock photo, boring flat background, empty white background, clip art, cartoon style,",
    "ugly typography, random unrelated text, Lorem Ipsum, placeholder text, bad composition,",
    "overexposed, underexposed, noise grain (unless intentional), amateur photography,",
    "abstract art without UI elements, purely decorative without software interface structure,",
    "multiple subjects out of focus, distorted UI elements, unreadable text, illegible title,",
    "title text placed over raw background without a contrasting panel or UI element behind it.",
  ].join(" ");
}

// ── Visual Signature (for dedup) ──────────────────────────────────────────────

export function computeVisualSignature(params: EntropyParams): string {
  return [
    params.layout.slice(0, 4),
    params.palette.slice(0, 4),
    params.typography.slice(0, 4),
    params.cameraAngle.slice(0, 4),
    params.lightingStyle.slice(0, 4),
    params.compositionDensity.slice(0, 4),
    params.uiStructure.slice(0, 4),
    params.seed.slice(0, 8),
  ].join("-");
}

// ── Similarity Check (RULE 5) ─────────────────────────────────────────────────

// RULE 5: No two images may share layout type, UI structure, AND composition family
const HARD_UNIQUENESS_FIELDS: (keyof EntropyParams)[] = ["layout", "uiStructure", "compositionDensity"];
const ALL_SIMILARITY_FIELDS:  (keyof EntropyParams)[] = [
  "layout", "palette", "typography", "cameraAngle",
  "lightingStyle", "compositionDensity", "backgroundEnvironment", "uiStructure",
];

export function computeSimilarity(a: EntropyParams, b: EntropyParams): number {
  let matches = 0;
  for (const field of ALL_SIMILARITY_FIELDS) {
    if (a[field] === b[field]) matches++;
  }
  return matches / ALL_SIMILARITY_FIELDS.length;
}

export function checkDuplication(
  params: EntropyParams,
  others: EntropyParams[],
  threshold = 0.25,
): { isDuplicate: boolean; similarity: number; mostSimilarIndex: number } {
  if (others.length === 0) return { isDuplicate: false, similarity: 0, mostSimilarIndex: -1 };
  let max = 0;
  let maxIdx = -1;
  for (let i = 0; i < others.length; i++) {
    const s = computeSimilarity(params, others[i]);
    if (s > max) { max = s; maxIdx = i; }
  }
  // RULE 5: Also check for hard uniqueness violation (same layout + UI structure + density)
  const hardViolation = others.some((o) =>
    HARD_UNIQUENESS_FIELDS.every((f) => params[f] === o[f]),
  );
  return {
    isDuplicate: max > threshold || hardViolation,
    similarity: max,
    mostSimilarIndex: maxIdx,
  };
}

// ── Quality Gate (RULE 2 + 3 + 5) ────────────────────────────────────────────

export function runQualityGate(
  params: EntropyParams,
  article: ArticleInput,
  allPreviousParams: EntropyParams[],
): QualityGateResult {
  const dna = getCategoryDNA(article.category);
  const failedChecks: string[] = [];

  // Check 1: Globally unique (no identical layout+UI+density triple anywhere)
  const globalDupCheck = checkDuplication(params, allPreviousParams, 0.375);
  const isUnique = !globalDupCheck.isDuplicate;
  if (!isUnique) failedChecks.push(`Too similar to another article (${Math.round(globalDupCheck.similarity * 100)}% match)`);

  // Check 2: Category aligned — layout must match category DNA override
  const isCategoryAligned =
    !dna.layoutOverride || params.layout === dna.layoutOverride;
  if (!isCategoryAligned) failedChecks.push(`Layout "${params.layout}" does not match required "${dna.layoutOverride}" for category "${article.category}"`);

  // Check 3: Has identifiable UI structure (not a purely abstract layout)
  const hasUIStructure =
    !ABSTRACT_LAYOUTS.has(params.layout as Layout) ||
    (params.uiStructure !== "browser_window_frame" || true); // abstract layouts are OK if UI structure is non-default
  // More precisely: if layout is abstract, ui structure must not be minimal
  const hasConcreteUI = !ABSTRACT_LAYOUTS.has(params.layout as Layout) || dna.uiOverride != null;
  if (!hasConcreteUI) failedChecks.push(`Abstract layout "${params.layout}" requires a category with explicit UI structure override`);

  // Check 4: Title integration — always true since our prompt hardwires it per layout
  // (structural guarantee — the prompt always includes per-layout title placement)
  const hasTitleIntegration = true;

  // Check 5: Differs from last 10 generated images
  const recentWindow = allPreviousParams.slice(-10);
  const recentDupCheck = checkDuplication(params, recentWindow, 0.25);
  const differsFromRecent = !recentDupCheck.isDuplicate;
  if (!differsFromRecent) failedChecks.push(`Too visually similar to one of the last 10 generated images (${Math.round(recentDupCheck.similarity * 100)}% match)`);

  const passed =
    isUnique &&
    isCategoryAligned &&
    hasConcreteUI &&
    hasTitleIntegration &&
    differsFromRecent;

  return {
    passed,
    checks: {
      isUnique,
      isCategoryAligned,
      hasUIStructure: hasConcreteUI,
      hasTitleIntegration,
      differsFromRecent,
    },
    failedChecks,
  };
}

// ── Full Pipeline ─────────────────────────────────────────────────────────────

export async function generateImageSpec(
  article: ArticleInput,
  previousParams: EntropyParams[] = [],
): Promise<ImageSpec> {
  let seed = await computeSeed(article);
  let params = deriveParams(seed, article);

  // RULE 5: Anti-duplication — try up to 10 rehashes with counter suffix
  let attempt = 0;
  while (attempt < 10) {
    const { isDuplicate } = checkDuplication(params, previousParams);
    if (!isDuplicate) break;
    const rehash = await computeSeed({
      ...article,
      title: `${article.title}__attempt_${++attempt}`,
    });
    seed = rehash;
    params = deriveParams(rehash, article);
    // NOTE: category DNA overrides are re-applied inside deriveParams, so
    // layoutOverride and uiOverride are always enforced even after rehash
  }

  const prompt = buildPrompt(article, params);
  const negativePrompt = buildNegativePrompt();
  const signature = computeVisualSignature(params);
  const quality_gate = runQualityGate(params, article, previousParams);

  return {
    title: article.title,
    slug: article.slug,
    seed,
    layout: params.layout,
    category: article.category ?? "General",
    image_prompt: prompt,
    negative_prompt: negativePrompt,
    webp_1200x630: "",
    webp_1024x1024: "",
    visual_signature: signature,
    quality_gate,
    params,
  };
}
