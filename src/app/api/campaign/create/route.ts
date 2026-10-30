import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateCampaign, type CampaignGoal } from "@/lib/campaign-generator";
import {
  getBrandFromMemory,
  createFallbackBrand,
  saveCampaignToMemory,
  type StoredBrand,
} from "@/lib/brand-store";

const Body = z.object({
  brandId: z.string().min(1),
  goal: z.enum([
    "product_launch",
    "lead_generation",
    "brand_awareness",
    "engagement",
    "thought_leadership",
    "sales",
  ]),
  prompt: z.string().max(2000).optional().nullable(),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  let brand: any = null;
  try {
    brand = await prisma.brandDNA.findUnique({ where: { id: parsed.data.brandId } }).catch(() => null);
  } catch {}

  if (!brand) {
    brand = getBrandFromMemory(parsed.data.brandId);
  }

  if (!brand) {
    brand = createFallbackBrand(parsed.data.brandId);
  }

  try {
    const concepts = await generateCampaign(
      brand,
      parsed.data.goal as CampaignGoal,
      parsed.data.prompt ?? null,
    );

    const campaignData = {
      brandId: brand.id,
      goal: parsed.data.goal,
      prompt: parsed.data.prompt ?? null,
      concepts: JSON.stringify(concepts),
    };

    let id: string;
    try {
      const saved = await prisma.campaign.create({
        data: campaignData,
      });
      id = saved.id;
      saveCampaignToMemory({
        ...campaignData,
        id,
        createdAt: saved.createdAt,
        assets: [],
        brand,
      });
    } catch (dbErr) {
      console.warn("DB save failed for campaign, using memory store:", dbErr);
      id = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      saveCampaignToMemory({
        ...campaignData,
        id,
        createdAt: new Date(),
        assets: [],
        brand,
      });
    }

    return NextResponse.json({ id });
  } catch (e) {
    console.error("Campaign generation error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
