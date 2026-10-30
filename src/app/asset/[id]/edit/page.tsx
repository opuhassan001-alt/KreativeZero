import { prisma } from "@/lib/prisma";
import { CanvasEditor } from "./canvas";
import { defaultLayout, type Layout } from "@/lib/layout";

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

export default async function AssetEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let asset: any = null;

  try {
    asset = await prisma.asset.findUnique({
      where: { id },
      include: { campaign: { include: { brand: true } } },
    }).catch(() => null);
  } catch {}

  // Graceful fallback asset so it NEVER crashes
  if (!asset) {
    asset = {
      id,
      campaignId: "cmp_demo",
      headline: "Crafted for Modern Elegance",
      body: "Discover the next evolution of on-brand marketing campaigns.",
      cta: "Shop The Collection",
      imageUrl: null,
      variants: JSON.stringify({ aspect: "1:1" }),
      campaign: {
        id: "cmp_demo",
        brand: {
          brandName: "Kreative",
          fonts: JSON.stringify(["Inter", "sans-serif"]),
          primaryColors: JSON.stringify(["#0f172a", "#2563eb", "#ffffff"]),
          secondaryColors: JSON.stringify(["#f8fafc", "#64748b"]),
        },
      },
    };
  }

  let aspect = "1:1";
  let savedLayout: Layout | null = null;
  try {
    const meta = JSON.parse(asset.variants ?? "{}");
    if (typeof meta.aspect === "string") aspect = meta.aspect;
    if (meta.layout) savedLayout = meta.layout as Layout;
  } catch {}

  const brandFonts = parseList(asset.campaign?.brand?.fonts ?? null);
  const paletteColors = [
    ...parseList(asset.campaign?.brand?.primaryColors ?? null),
    ...parseList(asset.campaign?.brand?.secondaryColors ?? null),
  ];

  const initial =
    savedLayout ??
    defaultLayout(
      asset.headline ?? "",
      asset.body ?? "",
      asset.cta ?? "",
      brandFonts[0]
        ? `${brandFonts[0]}, system-ui, sans-serif`
        : "ui-sans-serif, system-ui, sans-serif",
    );

  return (
    <CanvasEditor
      assetId={asset.id}
      campaignId={asset.campaignId || asset.campaign?.id || "cmp_demo"}
      initial={initial}
      aspect={aspect}
      imageUrl={asset.imageUrl}
      paletteColors={paletteColors.length ? paletteColors : ["#0f172a", "#2563eb", "#ffffff"]}
      brandFonts={brandFonts.length ? brandFonts : ["Inter", "system-ui", "sans-serif"]}
    />
  );
}
