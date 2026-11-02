import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPlatform } from "@/lib/platforms";
import { generateAsset } from "@/lib/asset-generator";
import type { CampaignConcept } from "@/lib/campaign-generator";
import { getCampaignFromMemory, createFallbackBrand } from "@/lib/brand-store";

const Body = z.object({
  campaignId: z.string().min(1),
  conceptIndex: z.number().int().min(0),
  platformId: z.string().min(1),
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { campaignId, conceptIndex, platformId } = parsed.data;

  let campaign: any = null;
  try {
    campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { brand: true },
    }).catch(() => null);
  } catch {}

  if (!campaign) {
    campaign = getCampaignFromMemory(campaignId);
  }

  if (!campaign) {
    const fallbackBrand = createFallbackBrand("b_default");
    campaign = {
      id: campaignId,
      brandId: fallbackBrand.id,
      brand: fallbackBrand,
      concepts: JSON.stringify([
        {
          name: "High-Performance Modern Excellence",
          angle: "Precision engineering meets seamless user experience.",
          tagline: "The modern standard.",
          platforms: [],
        },
      ]),
    };
  }

  const spec = getPlatform(platformId);
  if (!spec) return NextResponse.json({ error: "unknown platform" }, { status: 400 });

  let concepts: CampaignConcept[] = [];
  try {
    const v = JSON.parse(campaign.concepts ?? "[]");
    if (Array.isArray(v)) concepts = v;
  } catch {}
  const concept = concepts[conceptIndex] || {
    name: "Modern Excellence",
    angle: "Leading digital innovation",
    tagline: "Empowering next-gen solutions",
    platforms: [],
  };

  try {
    const result = await generateAsset(campaign.brand, concept, spec);
    let saved: any;
    try {
      saved = await prisma.asset.create({
        data: {
          campaignId,
          platform: spec.platform,
          format: spec.format,
          imageUrl: result.imageUrl,
          headline: result.headline,
          body: result.body,
          cta: result.cta,
          variants: JSON.stringify({ conceptIndex, platformId: spec.id, aspect: spec.aspect }),
        },
      });
    } catch {
      saved = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        imageUrl: result.imageUrl,
        headline: result.headline,
        body: result.body,
        cta: result.cta,
      };
    }

    return NextResponse.json({
      id: saved.id,
      platformId: spec.id,
      imageUrl: saved.imageUrl,
      headline: saved.headline,
      body: saved.body,
      cta: saved.cta,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
