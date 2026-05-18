/**
 * imageEntropyEngine.ts
 *
 * Deterministic visual entropy system for unique blog feature image generation.
 * Every article maps to a unique combination of layout + palette + typography +
 * camera + lighting + composition. No two articles share the same visual signature.
 *
 * Uses Web Crypto SHA-256 (browser-native, no dependency).
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
  cyber_blue_navy: "dark navy background #0a0f1e, electric cyan #00d4ff accents, cobalt blue #1e40af highlights",
  neon_purple_magenta: "deep purple #1a0533 background, neon magenta #ff00ff accents, electric violet #8b5cf6 highlights",
  clean_white_soft_blue: "pure white #ffffff background, soft sky blue #bfdbfe accents, medium blue #3b82f6 highlights",
  deep_emerald_teal: "very dark charcoal #0d1117 background, emerald green #10b981 accents, teal #14b8a6 highlights",
  sunset_amber_orange: "dark warm #1c1008 background, warm amber #f59e0b accents, deep orange #ea580c highlights",
  crimson_dark_red: "near-black #0f0505 background, vivid crimson #dc2626 accents, rose #f43f5e highlights",
  monochrome_slate: "dark slate #0f172a background, medium slate #64748b accents, near-white #f1f5f9 highlights",
  violet_indigo: "deep indigo #1e1b4b background, bright violet #7c3aed accents, lavender #c4b5fd highlights",
  forest_green_dark: "dark forest #061208 background, bright green #22c55e accents, lime #84cc16 highlights",
  rose_pink_blush: "dark charcoal #1a0a0f background, hot pink #ec4899 accents, blush #fda4af highlights",
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
  bold_geometric_sans: "bold geometric sans-serif font, heavy weight, high contrast letterforms",
  elegant_serif_editorial: "refined editorial serif typography, high contrast strokes, magazine quality",
  mono_code_tech: "monospaced code-style font, technical precision, developer aesthetic",
  rounded_friendly: "rounded sans-serif, approachable and modern, clean and legible",
  condensed_impact: "extra-condensed display typeface, tall and dramatic, strong visual presence",
  thin_display: "ultra-thin display weight, large scale, premium minimal aesthetic",
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
  straight_on_flat: "straight-on flat orthographic view, no perspective distortion",
  slight_tilt_perspective: "subtle 5-degree tilt, mild perspective, elegant and dynamic",
  isometric_45deg: "perfect isometric 45-degree projection, geometric precision",
  top_down_aerial: "top-down bird's-eye view looking directly down at UI elements",
  low_angle_dramatic: "low angle looking up at the subject, dramatic and imposing",
  three_quarter_view: "classic 3/4 product view, slight right-facing perspective, natural depth",
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
  cinematic_rim_light: "strong cinematic rim lighting from the upper-left, deep shadow on right, film-grade",
  soft_studio_ambient: "even soft-box studio lighting, gentle diffused shadows, clean product photography style",
  neon_glow_backlit: "neon backlit glow emanating from behind the subject, halo effect, atmospheric bloom",
  dramatic_chiaroscuro: "strong chiaroscuro contrast, bright focal centre fading to deep shadow, Renaissance style",
  sunrise_golden_hour: "warm golden-hour sunrise light from the right, long soft shadows, warm amber fill",
  cold_blue_moonlight: "cool blue moonlit atmosphere, crisp specular highlights, serene and technical",
};

// ── Composition Density ───────────────────────────────────────────────────────

export type CompositionDensity = "sparse_minimal" | "balanced_editorial" | "rich_detailed";

const DENSITIES: CompositionDensity[] = ["sparse_minimal", "balanced_editorial", "rich_detailed"];

const DENSITY_DESCRIPTIONS: Record<CompositionDensity, string> = {
  sparse_minimal: "sparse composition with generous negative space, 1-2 key focal elements",
  balanced_editorial: "balanced composition, 3-4 elements arranged in rule-of-thirds grid",
  rich_detailed: "rich layered composition with depth, multiple UI elements, detailed background",
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
  geometric_grid_lines: "subtle geometric grid lines receding into perspective, technical and precise",
  bokeh_particle_field: "soft bokeh particle field background, floating light orbs, defocused depth",
  depth_blur_layers: "multiple blurred depth layers creating a sense of 3D space, Gaussian blur falloff",
  circuit_board_pattern: "faint printed circuit board trace pattern in background, tech and electronic feel",
  cloud_atmosphere: "atmospheric cloud layer in deep sky background, ethereal and expansive",
  noise_texture_dark: "subtle film grain noise texture on dark background, tactile and premium",
  glassmorphism_panels: "frosted glass panel layers as background elements, translucent depth effect",
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
  browser_window_frame: "realistic Chrome browser window frame with tab bar, address bar, and extension icons visible",
  dashboard_card_grid: "SaaS analytics dashboard with metric cards, mini charts, and status indicators",
  mobile_device_mockup: "modern smartphone mockup showing the UI in portrait orientation",
  terminal_code_panel: "dark terminal / code editor panel with syntax-highlighted code and cursor",
  notification_stack: "stack of notification cards and alert banners, each with icon and message",
  settings_panel_sidebar: "settings control panel with toggles, sliders, and option rows",
  analytics_chart_view: "analytics view with line chart, bar graph, and KPI numbers prominently displayed",
  extension_popup_ui: "Chrome extension popup window, 300px wide, showing extension controls and toggle switch",
};

// ── Category Visual DNA ───────────────────────────────────────────────────────

interface CategoryDNA {
  keywords: string[];
  elements: string[];
  moodOverride?: Partial<Pick<EntropyParams, "palette" | "lightingStyle">>;
}

const CATEGORY_DNA: Record<string, CategoryDNA> = {
  "Privacy & Security": {
    keywords: ["cybersecurity", "privacy protection", "data shield", "encrypted lock"],
    elements: ["shield icon", "padlock", "firewall layers", "security badge", "encrypted data streams"],
    moodOverride: { palette: "cyber_blue_navy", lightingStyle: "neon_glow_backlit" },
  },
  "Ad Blocking": {
    keywords: ["ad blocker", "clean web", "blocked ads", "privacy shield"],
    elements: ["block symbol", "web page with blocked zones", "filter layers", "shield overlay on browser"],
    moodOverride: { palette: "crimson_dark_red" },
  },
  "Chrome Extensions": {
    keywords: ["Chrome browser", "extension ecosystem", "browser toolbar", "plugin"],
    elements: ["Chrome browser window", "extension puzzle piece icon", "toolbar with extensions", "toggle switches"],
    moodOverride: { palette: "clean_white_soft_blue" },
  },
  "Screenshot & Screen Capture": {
    keywords: ["screen capture", "screenshot tool", "recording overlay", "capture frame"],
    elements: ["screen capture crosshair", "camera shutter overlay", "screen recording toolbar", "selection rectangle"],
  },
  "Dark Mode & Themes": {
    keywords: ["dark interface", "theme customization", "night mode", "visual aesthetics"],
    elements: ["moon icon", "dark/light toggle switch", "theme palette swatches", "before/after split"],
    moodOverride: { palette: "monochrome_slate", lightingStyle: "cold_blue_moonlight" },
  },
  "Performance & Memory": {
    keywords: ["browser speed", "memory optimization", "performance metrics", "fast loading"],
    elements: ["speed gauge", "memory usage graph", "performance dashboard", "green/red metric bars"],
    moodOverride: { palette: "deep_emerald_teal" },
  },
  "Developer Tools": {
    keywords: ["developer console", "code editor", "debugging panel", "developer workflow"],
    elements: ["terminal window", "syntax-highlighted code", "DevTools panel", "API response"],
    moodOverride: { palette: "monochrome_slate", lightingStyle: "cinematic_rim_light" },
  },
  "Downloads & Media": {
    keywords: ["file download", "media management", "download manager", "progress tracking"],
    elements: ["download progress bar", "file type icons", "folder system", "download speed meter"],
    moodOverride: { palette: "violet_indigo" },
  },
  "Mobile & Android": {
    keywords: ["mobile Chrome", "Android browser", "responsive design", "mobile UX"],
    elements: ["Android smartphone", "mobile Chrome UI", "responsive layout grid", "touch interface"],
    moodOverride: { palette: "deep_emerald_teal" },
  },
  "Social Media": {
    keywords: ["social platform", "content sharing", "social integration", "feed management"],
    elements: ["social media feed", "like/share buttons", "profile card", "engagement metrics"],
    moodOverride: { palette: "neon_purple_magenta" },
  },
  "Productivity & Workflow": {
    keywords: ["task management", "workflow automation", "productivity system", "efficiency"],
    elements: ["kanban board", "task checklist", "calendar grid", "productivity metric cards"],
    moodOverride: { palette: "clean_white_soft_blue", lightingStyle: "soft_studio_ambient" },
  },
  "General": {
    keywords: ["Chrome extension", "browser enhancement", "web productivity"],
    elements: ["browser window", "extension icon", "web page UI"],
  },
};

function getCategoryDNA(category: string | null | undefined): CategoryDNA {
  if (!category) return CATEGORY_DNA["General"];
  return CATEGORY_DNA[category] ?? CATEGORY_DNA["General"];
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

  const layout      = pick(LAYOUTS,      seed, 0) as Layout;
  let   palette     = pick(PALETTES,     seed, 2) as Palette;
  const typography  = pick(TYPOGRAPHIES, seed, 4) as Typography;
  const cameraAngle = pick(CAMERA_ANGLES,seed, 6) as CameraAngle;
  let   lighting    = pick(LIGHTING_STYLES, seed, 8) as LightingStyle;
  const density     = pick(DENSITIES,    seed, 10) as CompositionDensity;
  const background  = pick(BACKGROUNDS,  seed, 12) as BackgroundEnvironment;
  const uiStructure = pick(UI_STRUCTURES,seed, 14) as UIStructure;

  // Apply category mood overrides (strong signal beats entropy)
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

  // Title must appear inside a UI element, not as floating text
  const titleIntegration = (() => {
    switch (params.layout) {
      case "saas_dashboard":
        return `the article title ${titleQuoted} displayed inside a dashboard header panel at the top, styled as a SaaS product title`;
      case "cinematic_hero":
        return `the article title ${titleQuoted} embedded inside a frosted glass morphism overlay card in the lower third`;
      case "minimal_typography":
        return `the article title ${titleQuoted} as the centrepiece in a large styled text panel with subtle background fill`;
      case "isometric_3d":
        return `the article title ${titleQuoted} on the front face of the largest 3D isometric block`;
      case "split_screen":
        return `the article title ${titleQuoted} placed inside a prominent title card on the right panel`;
      case "floating_cards":
        return `the article title ${titleQuoted} printed inside the top glass-morphism card at full card width`;
      case "neon_cyber":
        return `the article title ${titleQuoted} in the glowing HUD header bar at the top of the interface`;
      case "editorial_magazine":
        return `the article title ${titleQuoted} inside a bold editorial dark banner strip`;
    }
  })();

  const segments = [
    // Core quality and style
    `Ultra high quality editorial blog feature image for an article titled ${titleQuoted} about ${catLabel}.`,
    // Layout structure
    `Layout: ${LAYOUT_DESCRIPTIONS[params.layout]}.`,
    // Title placement (MUST be inside UI, not floating)
    `Title integration: ${titleIntegration}.`,
    // Category visual elements
    `Thematic elements: ${dna.elements.join(", ")}.`,
    `Topic keywords visually present: ${dna.keywords.join(", ")}.`,
    // Palette
    `Colour palette: ${PALETTE_DESCRIPTIONS[params.palette]}.`,
    // Typography
    `Typography style: ${TYPOGRAPHY_DESCRIPTIONS[params.typography]}.`,
    // Camera
    `Camera angle: ${CAMERA_DESCRIPTIONS[params.cameraAngle]}.`,
    // Lighting
    `Lighting: ${LIGHTING_DESCRIPTIONS[params.lightingStyle]}.`,
    // Background
    `Background: ${BACKGROUND_DESCRIPTIONS[params.backgroundEnvironment]}.`,
    // UI Structure
    `UI structure: ${UI_STRUCTURE_DESCRIPTIONS[params.uiStructure]}.`,
    // Composition
    `Composition: ${DENSITY_DESCRIPTIONS[params.compositionDensity]}.`,
    // Quality directives
    `Image dimensions: 1200x630 horizontal banner, perfect for Open Graph and Google Discover.`,
    `Style: premium SaaS product editorial thumbnail, scroll-stopping CTR-optimised design, depth shadows, glow effects, professional studio render.`,
    `Format: WebP, photorealistic + digital illustration hybrid, sharp details at 1200px wide.`,
    `Absolutely NO generic stock photo backgrounds, NO watermarks, NO random floating text, NO Lorem Ipsum.`,
  ];

  return segments.join(" ");
}

export function buildNegativePrompt(): string {
  return [
    "blurry, low quality, pixelated, jpeg artifacts, watermark, signature, text floating randomly,",
    "generic stock photo, boring flat background, empty white background, clip art, cartoon style,",
    "ugly typography, random unrelated text, Lorem Ipsum, placeholder text, bad composition,",
    "overexposed, underexposed, noise grain (unless intentional), amateur photography,",
    "multiple subjects out of focus, distorted UI elements, unreadable text, illegible title.",
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
    params.seed.slice(0, 8),
  ].join("-");
}

// ── Similarity Check (for anti-duplication) ───────────────────────────────────

export function computeSimilarity(a: EntropyParams, b: EntropyParams): number {
  let matches = 0;
  const fields: (keyof EntropyParams)[] = [
    "layout", "palette", "typography", "cameraAngle",
    "lightingStyle", "compositionDensity", "backgroundEnvironment", "uiStructure",
  ];
  for (const field of fields) {
    if (a[field] === b[field]) matches++;
  }
  return matches / fields.length;
}

export function checkDuplication(
  params: EntropyParams,
  others: EntropyParams[],
  threshold = 0.2,
): { isDuplicate: boolean; similarity: number; mostSimilarIndex: number } {
  if (others.length === 0) return { isDuplicate: false, similarity: 0, mostSimilarIndex: -1 };
  let max = 0;
  let maxIdx = -1;
  for (let i = 0; i < others.length; i++) {
    const s = computeSimilarity(params, others[i]);
    if (s > max) { max = s; maxIdx = i; }
  }
  return { isDuplicate: max > threshold, similarity: max, mostSimilarIndex: maxIdx };
}

// ── Full Pipeline ─────────────────────────────────────────────────────────────

export async function generateImageSpec(
  article: ArticleInput,
  previousParams: EntropyParams[] = [],
): Promise<ImageSpec> {
  let seed = await computeSeed(article);
  let params = deriveParams(seed, article);

  // Anti-duplication: if similarity > 0.2, modify seed with a counter suffix
  let attempt = 0;
  while (attempt < 10) {
    const { isDuplicate } = checkDuplication(params, previousParams);
    if (!isDuplicate) break;
    // Rehash with attempt counter to get different params
    const rehash = await computeSeed({
      ...article,
      title: `${article.title}__attempt_${++attempt}`,
    });
    seed = rehash;
    params = deriveParams(rehash, article);
  }

  const prompt = buildPrompt(article, params);
  const negativePrompt = buildNegativePrompt();
  const signature = computeVisualSignature(params);

  return {
    title: article.title,
    slug: article.slug,
    seed,
    layout: params.layout,
    category: article.category ?? "General",
    image_prompt: prompt,
    negative_prompt: negativePrompt,
    webp_1200x630: "",   // filled after AI generation
    webp_1024x1024: "",  // filled after AI generation
    visual_signature: signature,
    params,
  };
}
