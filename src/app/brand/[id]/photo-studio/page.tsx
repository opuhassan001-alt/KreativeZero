import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PhotoStudio } from "@/app/photo-studio/studio";

export const dynamic = "force-dynamic";

export default async function BrandPhotoStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let brand = null;
  try {
    brand = await prisma.brandDNA.findUnique({ where: { id } });
  } catch (err) {
    console.warn("Could not find brand:", err);
  }

  if (!brand) notFound();

  let recent: Array<{
    id: string;
    imageUrl: string | null;
    styleLabel: string;
    category: string;
    styleId: string;
  }> = [];

  try {
    const records = await prisma.photoshoot.findMany({
      where: { brandId: id },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    recent = records;
  } catch (err) {
    console.warn("Could not load recent brand photoshoots:", err);
  }

  return (
    <PhotoStudio
      brandId={brand.id}
      brandName={brand.brandName ?? brand.url}
      initialShots={recent.map((s) => ({
        id: s.id,
        imageUrl: s.imageUrl,
        styleLabel: s.styleLabel,
        category: s.category,
        styleId: s.styleId,
        status: "done" as const,
      }))}
    />
  );
}
