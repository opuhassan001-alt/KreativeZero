import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { NewCampaignForm } from "./form";
import { getBrandFromMemory, createFallbackBrand } from "@/lib/brand-store";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let brand: any = null;

  try {
    brand = await prisma.brandDNA.findUnique({ where: { id } }).catch(() => null);
  } catch {}

  if (!brand) {
    brand = getBrandFromMemory(id);
  }

  if (!brand) {
    brand = createFallbackBrand(id);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New campaign</h1>
          <p className="text-sm text-neutral-400">
            For <span className="text-white">{brand.brandName || brand.url}</span>
          </p>
        </div>
        <Link href={`/brand/${brand.id}`} className="text-sm text-neutral-400 hover:text-white">
          ← Back to DNA
        </Link>
      </div>

      <NewCampaignForm brandId={brand.id} />
    </main>
  );
}
