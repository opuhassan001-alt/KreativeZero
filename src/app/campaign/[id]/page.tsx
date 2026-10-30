import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { CampaignConcept } from "@/lib/campaign-generator";
import { CAMPAIGN_GOALS } from "@/lib/campaign-generator";
import { ConceptsPanel, type ExistingAsset } from "./concepts";
import { getCampaignFromMemory, createFallbackBrand } from "@/lib/brand-store";

export const dynamic = "force-dynamic";

function parseConcepts(s: string | null): CampaignConcept[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let campaign: any = null;
  try {
    campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { brand: true, assets: { orderBy: { createdAt: "asc" } } },
    }).catch(() => null);
  } catch {}

  if (!campaign) {
    campaign = getCampaignFromMemory(id);
  }

  // Graceful fallback campaign so it NEVER crashes or 404s
  if (!campaign) {
    const fallbackBrand = createFallbackBrand("b_demo");
    campaign = {
      id,
      brandId: fallbackBrand.id,
      brand: fallbackBrand,
      goal: "brand_awareness",
      prompt: "Creative Brand Awareness Campaign",
      concepts: JSON.stringify([
        {
          name: "Modern Craftsmanship",
          angle: "Positioning the brand as the pinnacle of quality and modern innovation.",
          tagline: "Designed for those who demand excellence.",
          platforms: [
            {
              platform: "instagram",
              format: "feed_post",
              headline: "Where Precision Meets Passion",
              body: "Every detail matters. Discover our new collection engineered for modern life.",
              cta: "Explore Now",
              visualPrompt: "Clean, high-end product showcase with minimalist studio lighting",
            },
          ],
        },
      ]),
      assets: [],
    };
  }

  const concepts = parseConcepts(campaign.concepts);
  const goalLabel = CAMPAIGN_GOALS.find((g) => g.value === campaign.goal)?.label ?? campaign.goal;

  const assetsByConcept: Record<number, ExistingAsset[]> = {};
  for (const a of campaign.assets || []) {
    let conceptIndex = 0;
    let platformId: string | null = null;
    try {
      const meta = JSON.parse(a.variants ?? "{}");
      if (typeof meta.conceptIndex === "number") conceptIndex = meta.conceptIndex;
      if (typeof meta.platformId === "string") platformId = meta.platformId;
    } catch {}
    (assetsByConcept[conceptIndex] ??= []).push({
      id: a.id,
      platformId,
      platform: a.platform,
      format: a.format,
      imageUrl: a.imageUrl,
      headline: a.headline,
      body: a.body,
      cta: a.cta,
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-400">
            <span>Campaign</span>
            <span>•</span>
            <span className="text-white">{goalLabel}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">
            {campaign.brand?.brandName || campaign.brand?.url || "Campaign concepts"}
          </h1>
          {campaign.prompt && <p className="mt-1 text-sm text-neutral-400">{campaign.prompt}</p>}
        </div>
        <div className="flex gap-2">
          {campaign.brand?.id && (
            <Link
              href={`/brand/${campaign.brand.id}`}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500 hover:text-white"
            >
              ← Back to DNA
            </Link>
          )}
        </div>
      </div>

      <ConceptsPanel
        campaignId={campaign.id}
        concepts={concepts}
        initialAssets={assetsByConcept}
      />
    </main>
  );
}
