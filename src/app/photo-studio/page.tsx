import { prisma } from "@/lib/prisma";
import { PhotoStudio } from "./studio";

export const dynamic = "force-dynamic";

export default async function PhotoStudioPage() {
  let recent: Array<{
    id: string;
    imageUrl: string | null;
    styleLabel: string;
    category: string;
    styleId: string;
  }> = [];

  try {
    const records = await prisma.photoshoot.findMany({
      where: { brandId: null },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    recent = records;
  } catch (err) {
    console.warn("Could not load recent photoshoots:", err);
  }

  return (
    <PhotoStudio
      brandId={null}
      brandName={null}
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
