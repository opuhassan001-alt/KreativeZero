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

function buildImagePrompt(
  brand: BrandDNA,
  concept: CampaignConcept,
  spec: PlatformSpec,
  headline: string,
  opts: { noText?: boolean } = {},
): string {
  const brandName = brand.brandName || "modern brand";
  const primary = parseList(brand.primaryColors).join(", ") || "brand palette";
  return `commercial advertising photography for ${brandName}, theme: ${concept.title}, ${spec.imageHint}, studio lighting, award winning product presentation, elegant backdrop in ${primary}, 8k, photorealistic`;
}

export async function regenerateImage(
  brand: BrandDNA,
  concept: CampaignConcept,
  spec: PlatformSpec,
  headline: string,
  opts: { noText?: boolean } = {},
): Promise<string | null> {
  const imagePrompt = buildImagePrompt(brand, concept, spec, headline, opts);
  return muapi.image(imagePrompt, spec.aspect as any);
}

export async function generateAsset(
  brand: BrandDNA,
  concept: CampaignConcept,
  spec: PlatformSpec,
): Promise<GeneratedAsset> {
  const brandName = brand.brandName || "Brand";
  const headline = concept.hook || concept.title || "Experience Precision";
  const body = `${concept.key_message || concept.theme} Engineered for modern life with uncompromising attention to detail.`;
  const cta = concept.cta || "Discover Now";

  const imagePrompt = buildImagePrompt(brand, concept, spec, headline);
  const imageUrl = await muapi.image(imagePrompt, spec.aspect as any);

  return {
    headline,
    body,
    cta,
    imageUrl,
  };
}
