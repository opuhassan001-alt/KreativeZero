import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DnaEditor, type EditableDNA } from "./editor";
import { CAMPAIGN_GOALS } from "@/lib/campaign-generator";
import { getBrandFromMemory, createFallbackBrand } from "@/lib/brand-store";

export const dynamic = "force-dynamic";

function parseList(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let dna: any = null;
  let campaigns: any[] = [];

  try {
    const [dbDna, dbCampaigns] = await Promise.all([
      prisma.brandDNA.findUnique({ where: { id } }).catch(() => null),
      prisma.campaign.findMany({
        where: { brandId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => []),
    ]);
    dna = dbDna;
    campaigns = dbCampaigns ?? [];
  } catch (err) {
    console.warn("DB lookup failed, checking resilient memory store:", err);
  }

  // Check memory store if DB returned nothing
  if (!dna) {
    dna = getBrandFromMemory(id);
  }

  // Graceful fallback brand so the page NEVER crashes or 404s
  if (!dna) {
    dna = createFallbackBrand(id);
  }

  const initial: EditableDNA = {
    brandName: dna.brandName ?? "",
    industry: dna.industry ?? "",
    tagline: dna.tagline ?? "",
    valueProposition: dna.valueProposition ?? "",
    targetAudience: dna.targetAudience ?? "",
    imageryStyle: dna.imageryStyle ?? "",
    layoutStyle: dna.layoutStyle ?? "",
    logoUrl: dna.logoUrl ?? null,
    screenshotUrl: dna.screenshotUrl ?? null,
    toneOfVoice: parseList(dna.toneOfVoice),
    brandPersonality: parseList(dna.brandPersonality),
    keyMessages: parseList(dna.keyMessages),
    fonts: parseList(dna.fonts),
    primaryColors: parseList(dna.primaryColors),
    secondaryColors: parseList(dna.secondaryColors),
  };

  return (
    <>
      <DnaEditor id={dna.id} sourceUrl={dna.url} initial={initial} />
      {campaigns.length > 0 && (
        <section className="mx-auto mt-12 max-w-5xl px-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
            Recent campaigns ({campaigns.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((c) => {
              const goalLabel = CAMPAIGN_GOALS.find((g) => g.value === c.goal)?.label ?? c.goal;
              return (
                <Link
                  key={c.id}
                  href={`/campaign/${c.id}`}
                  className="group rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition hover:border-neutral-700 hover:bg-neutral-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-neutral-400">{goalLabel}</span>
                    <span className="text-xs text-neutral-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {c.prompt && <p className="mt-2 line-clamp-2 text-sm text-neutral-300">{c.prompt}</p>}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
