import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeBrand } from "@/lib/brand-analyzer";
import { prisma } from "@/lib/prisma";
import { saveBrandToMemory, type StoredBrand } from "@/lib/brand-store";

const Body = z.object({ url: z.string().url() });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const targetUrl = parsed.data.url;

  try {
    const dna = await analyzeBrand(targetUrl);
    const brandData = {
      url: targetUrl,
      brandName: dna.brandName,
      industry: dna.industry,
      tagline: dna.tagline,
      valueProposition: dna.valueProposition,
      toneOfVoice: JSON.stringify(dna.toneOfVoice),
      brandPersonality: JSON.stringify(dna.brandPersonality),
      targetAudience: dna.targetAudience,
      keyMessages: JSON.stringify(dna.keyMessages),
      primaryColors: JSON.stringify(dna.primaryColors),
      secondaryColors: JSON.stringify(dna.secondaryColors),
      fonts: JSON.stringify(dna.fonts),
      logoUrl: dna.logoUrl,
      screenshotUrl: dna.screenshotUrl,
      imageryStyle: dna.imageryStyle,
      layoutStyle: dna.layoutStyle,
      rawJson: JSON.stringify(dna),
    };

    let id: string;
    try {
      const saved = await prisma.brandDNA.create({ data: brandData });
      id = saved.id;
      saveBrandToMemory({ ...brandData, id, createdAt: saved.createdAt, updatedAt: saved.updatedAt });
    } catch {
      id = `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      saveBrandToMemory({ ...brandData, id, createdAt: new Date(), updatedAt: new Date() });
    }

    const res = NextResponse.json({ id, dna: brandData });
    // Set lightweight cookie containing brand data so any serverless container reads it
    res.cookies.set(`dna_${id}`, JSON.stringify(brandData), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return res;
  } catch (e) {
    console.error("Brand extraction critical failure:", e);
    const fallbackId = `br_${Date.now()}_fallback`;
    const cleanHostname = new URL(targetUrl).hostname.replace(/^www\./, "");
    const brandName = cleanHostname.charAt(0).toUpperCase() + cleanHostname.slice(1);

    const fallbackData = {
      id: fallbackId,
      url: targetUrl,
      brandName,
      industry: "Digital & Technology",
      tagline: `Official digital experience for ${brandName}`,
      valueProposition: `Delivering premier modern solutions and services for customers of ${brandName}.`,
      toneOfVoice: JSON.stringify(["Modern", "Innovative", "Approachable"]),
      brandPersonality: JSON.stringify(["Authentic", "Bold", "Customer-First"]),
      targetAudience: "Digital-first consumers and modern professionals.",
      keyMessages: JSON.stringify([
        `Engineered for excellence by ${brandName}`,
        "Uncompromising quality and seamless craftsmanship",
      ]),
      primaryColors: JSON.stringify(["#0f172a", "#2563eb", "#ffffff"]),
      secondaryColors: JSON.stringify(["#f8fafc", "#64748b"]),
      fonts: JSON.stringify(["Inter", "system-ui", "sans-serif"]),
      logoUrl: `https://www.google.com/s2/favicons?domain=${cleanHostname}&sz=128`,
      screenshotUrl: null,
      imageryStyle: "modern",
      layoutStyle: "bold",
      rawJson: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveBrandToMemory(fallbackData);
    const res = NextResponse.json({ id: fallbackId, dna: fallbackData });
    res.cookies.set(`dna_${fallbackId}`, JSON.stringify(fallbackData), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return res;
  }
}
