import { muapi } from "./muapi";
import type { BrandDNA } from "@prisma/client";
import type { CampaignConcept } from "./campaign-generator";
import type { PlatformSpec } from "./platforms";

export type GeneratedAsset = {
  imageUrl: string | null;
  headline: string;
  body: string;
  cta: string;
};

function parseList(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseJSON(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const m = candidate.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

function buildCopyPrompt(brand: BrandDNA, concept: CampaignConcept, spec: PlatformSpec): string {
  const tone = parseList(brand.toneOfVoice).join(", ") || "—";
  const personality = parseList(brand.brandPersonality).join(", ") || "—";

  return `You are writing on-brand marketing copy for a single asset. Return STRICT JSON only:
{
  "headline": "string (max ${spec.copy.headlineMaxWords} words)",
  "body": "string (max ${spec.copy.bodyMaxWords} words${spec.copy.bodyMaxWords === 0 ? " — return empty string" : ""})",
  "cta": "string (max ${spec.copy.ctaMaxWords} words${spec.copy.ctaMaxWords === 0 ? " — return empty string" : ""})"
}

PLATFORM: ${spec.label}
COPY TONE: ${spec.copy.tone}

BRAND
- Name: ${brand.brandName || "—"}
- Voice: ${tone}
- Personality: ${personality}

CAMPAIGN CONCEPT
- Title: ${concept.title}
- Theme: ${concept.theme}
- Hook: ${concept.hook}
- Key message: ${concept.key_message}
- Default CTA: ${concept.cta}
- Tone notes: ${concept.tone_notes}

Match the brand voice exactly. Stay under the word caps. Do not use hashtags in body. Do not add markdown.`;
}

function buildImagePrompt(
  brand: BrandDNA,
  concept: CampaignConcept,
  spec: PlatformSpec,
  headline: string,
  opts: { noText?: boolean } = {},
): string {
  const primary = parseList(brand.primaryColors).join(", ") || "brand colors";
  const secondary = parseList(brand.secondaryColors);
  const palette = secondary.length > 0 ? `Primary palette: ${primary}. Accent palette: ${secondary.join(", ")}.` : `Palette: ${primary}.`;

  const textRule = opts.noText
    ? `IMPORTANT: render NO text, NO words, NO letters, NO typography on this image. Pure visual background only — text will be overlaid afterward in HTML. Leave generous negative space where copy can go.`
    : `Overlay headline (large, on-brand typography): "${headline}"`;

  return `Marketing creative for ${spec.label}. ${spec.imageHint}

Concept: ${concept.title} — ${concept.theme}
Visual direction: ${concept.visual_direction}
Imagery style: ${brand.imageryStyle || "modern"}. Layout style: ${brand.layoutStyle || "modern"}.
${palette}

${textRule}

Composition rules: clean focal hierarchy, brand-consistent palette, no extraneous logos, no watermarks, no stock-photo aesthetic, no lorem ipsum. Make it feel native to the brand.`;
}

function getCuratedPlaceholderImage(aspect: string): string {
  if (aspect === "9:16") {
    return "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=720&q=80";
  }
  if (aspect === "16:9") {
    return "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1280&q=80";
  }
  return "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80";
}

export async function regenerateImage(
  brand: BrandDNA,
  concept: CampaignConcept,
  spec: PlatformSpec,
  headline: string,
  opts: { noText?: boolean } = {},
): Promise<string | null> {
  if (process.env.MUAPI_API_KEY && process.env.MUAPI_API_KEY.trim() !== "") {
    try {
      const imagePrompt = buildImagePrompt(brand, concept, spec, headline, opts);
      const refs: string[] = [];
      if (brand.logoUrl) refs.push(brand.logoUrl);
      return refs.length > 0
        ? muapi.imageEdit(imagePrompt, refs, spec.aspect)
        : muapi.image(imagePrompt, spec.aspect);
    } catch (err) {
      console.warn("MuAPI failed for regenerate image, using curated visual:", err);
    }
  }
  return getCuratedPlaceholderImage(spec.aspect);
}

export async function generateAsset(
  brand: BrandDNA,
  concept: CampaignConcept,
  spec: PlatformSpec,
): Promise<GeneratedAsset> {
  if (process.env.MUAPI_API_KEY && process.env.MUAPI_API_KEY.trim() !== "") {
    try {
      const copyPrompt = buildCopyPrompt(brand, concept, spec);
      const copyRaw = await muapi.text(copyPrompt);
      const copy = parseJSON(copyRaw);

      const headline = String(copy.headline ?? "").trim();
      const body = String(copy.body ?? "").trim();
      const cta = String(copy.cta ?? "").trim();

      const imagePrompt = buildImagePrompt(brand, concept, spec, headline);

      const refs: string[] = [];
      if (brand.logoUrl) refs.push(brand.logoUrl);

      const imageUrl = refs.length > 0
        ? await muapi.imageEdit(imagePrompt, refs, spec.aspect)
        : await muapi.image(imagePrompt, spec.aspect);

      return { imageUrl, headline, body, cta };
    } catch (err) {
      console.warn("MuAPI failed for asset, falling back to instant creative:", err);
    }
  }

  // Instant on-brand copy & curated visual fallback
  const brandName = brand.brandName || "Brand";
  return {
    headline: `${concept.hook}`,
    body: `${concept.key_message} Designed for those who appreciate premium quality and effortless performance.`,
    cta: `${concept.cta || "Shop Now"}`,
    imageUrl: brand.screenshotUrl || getCuratedPlaceholderImage(spec.aspect)
  };
}
