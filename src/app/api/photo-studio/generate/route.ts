import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findStyle } from "@/lib/photo-styles";
import { generatePhotoshoot } from "@/lib/photo-studio";
import { getBrandFromMemory } from "@/lib/brand-store";

const Body = z.object({
  productImageUrl: z.string().url(),
  category: z.string().min(1),
  styleId: z.string().min(1),
  prompt: z.string().max(2000).nullable().optional(),
  brandId: z.string().nullable().optional(),
  resolution: z.enum(["1k", "2k", "4k"]).optional(),
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  let found = findStyle(parsed.data.category, parsed.data.styleId);
  if (!found) {
    found = findStyle("general", "studio_white") || {
      category: { id: "general", label: "General", description: "", styles: [] },
      style: {
        id: "studio_white",
        label: "Studio white",
        prompt: "Clean white seamless studio background, soft diffused key light, subtle floor shadow, hero centered.",
        aspect: "1:1",
      },
    };
  }

  let brand: any = null;
  if (parsed.data.brandId) {
    try {
      brand = await prisma.brandDNA.findUnique({ where: { id: parsed.data.brandId } }).catch(() => null);
    } catch {}
    if (!brand) {
      brand = getBrandFromMemory(parsed.data.brandId);
    }
  }

  try {
    const url = await generatePhotoshoot(
      parsed.data.productImageUrl,
      found.style,
      brand,
      parsed.data.prompt ?? null,
      { aspect: found.style.aspect, resolution: parsed.data.resolution },
    );

    let saved: any;
    try {
      saved = await prisma.photoshoot.create({
        data: {
          brandId: brand?.id ?? null,
          productImageUrl: parsed.data.productImageUrl,
          category: found.category.id,
          styleId: found.style.id,
          styleLabel: found.style.label,
          prompt: parsed.data.prompt ?? null,
          imageUrl: url,
          aspect: found.style.aspect,
          resolution: parsed.data.resolution ?? "2k",
        },
      });
    } catch (e) {
      saved = {
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        imageUrl: url,
        styleLabel: found.style.label,
        category: found.category.id,
        styleId: found.style.id,
        aspect: found.style.aspect,
      };
    }

    return NextResponse.json({
      id: saved.id,
      imageUrl: saved.imageUrl,
      styleLabel: saved.styleLabel,
      category: saved.category,
      styleId: saved.styleId,
      aspect: saved.aspect,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
