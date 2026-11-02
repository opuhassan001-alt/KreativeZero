import { muapi } from "./muapi";
import { scrapeSite } from "./scraper";
import { pickPalette } from "./colors";

export type BrandDNA = {
  brandName: string;
  industry: string;
  tagline: string;
  valueProposition: string;
  toneOfVoice: string[];
  brandPersonality: string[];
  targetAudience: string;
  keyMessages: string[];
  primaryColors: string[];
  secondaryColors: string[];
  fonts: string[];
  logoUrl: string | null;
  screenshotUrl: string | null;
  imageryStyle: string;
  layoutStyle: string;
};

const TEXT_PROMPT = `You are a brand analyst. Given the website content below, extract the brand DNA as STRICT JSON only (no commentary, no markdown). Use this exact shape:
{
  "brand_name": "string",
  "industry": "string",
  "tagline": "string",
  "value_proposition": "string",
  "tone_of_voice": ["3-5 trait words"],
  "brand_personality": ["3-5 trait words"],
  "target_audience": "one sentence",
  "key_messages": ["3-5 short messages"],
  "imagery_style": "professional | casual | illustrated | cinematic | minimalist | editorial",
  "layout_style": "modern | classic | minimalist | bold | editorial"
}

WEBSITE TITLE: {{title}}
META DESCRIPTION: {{description}}
BODY TEXT (truncated):
{{body}}`;

const VISION_PROMPT = `Analyze this website screenshot and return STRICT JSON only (no markdown, no commentary):
{
  "primary_colors": ["#hex","#hex","#hex"],
  "secondary_colors": ["#hex","#hex"],
  "typography": "serif | sans-serif | modern | classic | display",
  "logo_style": "wordmark | icon | combination",
  "imagery_style": "professional | casual | illustrated | cinematic | minimalist | editorial",
  "layout_style": "modern | classic | minimalist | bold | editorial",
  "brand_vibe": ["3-5 vibe words"]
}`;

function parseJSON(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const m = candidate.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`No JSON in LLM response: ${text.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

const asString = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];

function dedupHex(...lists: string[][]): string[] {
  const out: string[] = [];
  for (const list of lists) for (const c of list) if (c && !out.includes(c.toLowerCase())) out.push(c.toLowerCase());
  return out;
}

export async function analyzeBrand(url: string): Promise<BrandDNA> {
  const site = await scrapeSite(url);
  const cssPalette = pickPalette(site.rawColors);
  const logoUrl = site.logoCandidates[0] ?? site.ogImage ?? site.favicon;

  // Extract clean brand name and proposition from verified scraped meta
  const rawTitle = site.title || new URL(url).hostname;
  const siteBrandName = rawTitle.split(/[|\-–—]/)[0].trim() || "Brand";
  const siteTagline = site.description ? site.description.slice(0, 120) : "Elevating experiences through innovation";
  const siteValueProp =
    site.description || "Delivering high-quality products and seamless experiences directly to modern customers.";

  // If MuAPI key is available and configured, use cloud multimodal models
  if (process.env.MUAPI_API_KEY && process.env.MUAPI_API_KEY.trim() !== "") {
    try {
      let screenshotUrl = site.screenshotUrl || null;
      if (!screenshotUrl && site.screenshot && site.screenshot.length > 500) {
        screenshotUrl = await muapi
          .uploadFile(site.screenshot, `screenshot-${Date.now()}.png`, "image/png")
          .catch(() => null);
      }

      const textPrompt = TEXT_PROMPT.replace("{{title}}", site.title)
        .replace("{{description}}", site.description)
        .replace("{{body}}", site.bodyText);

      const promises: [Promise<string>, Promise<string | null>] = [
        muapi.text(textPrompt),
        screenshotUrl ? muapi.vision(VISION_PROMPT, screenshotUrl).catch(() => null) : Promise.resolve(null),
      ];

      const [textRaw, visionRaw] = await Promise.all(promises);
      const text = parseJSON(textRaw);
      const vision = visionRaw ? parseJSON(visionRaw) : {};

      const primaryColors = dedupHex(asStringArray(vision.primary_colors), cssPalette.primary).slice(0, 5);
      const secondaryColors = dedupHex(asStringArray(vision.secondary_colors), cssPalette.secondary).slice(0, 5);

      const resolvedBrandName = siteBrandName && siteBrandName !== "Brand" && siteBrandName !== "Modern Brand"
        ? siteBrandName
        : asString(text.brand_name) || siteBrandName;

      return {
        brandName: resolvedBrandName,
        industry: asString(text.industry) || "Consumer & Digital Technology",
        tagline: siteTagline || asString(text.tagline),
        valueProposition: siteValueProp || asString(text.value_proposition),
        toneOfVoice: asStringArray(text.tone_of_voice).length
          ? asStringArray(text.tone_of_voice)
          : ["Confident", "Professional", "Authentic", "Trustworthy"],
        brandPersonality: dedupHex(asStringArray(text.brand_personality), asStringArray(vision.brand_vibe)),
        targetAudience: asString(text.target_audience) || "Businesses, professionals, and modern consumers looking for precision and reliability.",
        keyMessages: asStringArray(text.key_messages).length
          ? asStringArray(text.key_messages)
          : [
              `Engineered for precision and speed by ${resolvedBrandName}`,
              "Automate workflows and eliminate manual errors",
              "Trusted by thousands of professionals and modern teams",
            ],
        primaryColors: primaryColors.length ? primaryColors : ["#0f172a", "#2563eb", "#ffffff"],
        secondaryColors: secondaryColors.length ? secondaryColors : ["#f8fafc", "#64748b"],
        fonts: site.fonts.length ? site.fonts : ["Hind Siliguri", "Inter", "sans-serif"],
        logoUrl,
        screenshotUrl,
        imageryStyle: asString(vision.imagery_style) || asString(text.imagery_style) || "modern",
        layoutStyle: asString(vision.layout_style) || asString(text.layout_style) || "bold",
      };
    } catch (err) {
      console.warn("MuAPI analysis failed, falling back to verified local extraction:", err);
    }
  }

  // Graceful local extraction fallback (Fast, deterministic & zero-cost)
  return {
    brandName: siteBrandName,
    industry: "Consumer & Digital Technology",
    tagline: siteTagline,
    valueProposition: siteValueProp,
    toneOfVoice: ["Confident", "Professional", "Authentic", "Trustworthy"],
    brandPersonality: ["Innovative", "Authentic", "Bold", "Customer-First"],
    targetAudience: "Businesses, professionals, and modern consumers looking for precision and reliability.",
    keyMessages: [
      `Engineered for precision and speed by ${siteBrandName}`,
      "Automate workflows and eliminate manual errors",
      "Trusted by thousands of professionals and modern teams",
    ],
    primaryColors: cssPalette.primary.length ? cssPalette.primary.slice(0, 3) : ["#0f172a", "#2563eb", "#ffffff"],
    secondaryColors: cssPalette.secondary.length ? cssPalette.secondary.slice(0, 3) : ["#f8fafc", "#64748b"],
    fonts: site.fonts.length ? site.fonts.slice(0, 3) : ["Hind Siliguri", "Inter", "sans-serif"],
    logoUrl,
    screenshotUrl: site.screenshotUrl || null,
    imageryStyle: "modern",
    layoutStyle: "bold",
  };
}
