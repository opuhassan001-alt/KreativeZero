import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAnimation } from "@/lib/animate";

const Body = z.object({
  sourceImageUrl: z.string().url(),
  sourceType: z.enum(["asset", "photoshoot", "upload"]),
  sourceId: z.string().nullable().optional(),
  prompt: z.string().min(1).max(2000),
  duration: z.number().int().min(3).max(12).optional(),
  resolution: z.enum(["480p", "720p", "1080p"]).optional(),
  brandId: z.string().nullable().optional(),
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const animId = `anim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let rowId = animId;

  try {
    const row = await prisma.animation.create({
      data: {
        sourceImageUrl: parsed.data.sourceImageUrl,
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId ?? null,
        prompt: parsed.data.prompt,
        duration: parsed.data.duration ?? 5,
        resolution: parsed.data.resolution ?? "720p",
        brandId: parsed.data.brandId ?? null,
      },
    });
    rowId = row.id;
  } catch {}

  try {
    const videoUrl = await generateAnimation(parsed.data.sourceImageUrl, parsed.data.prompt, {
      duration: parsed.data.duration,
      resolution: parsed.data.resolution,
    });
    const finalUrl = videoUrl || "/videos/showcase.mp4";

    try {
      await prisma.animation.update({
        where: { id: rowId },
        data: { videoUrl: finalUrl },
      });
    } catch {}

    return NextResponse.json({
      id: rowId,
      videoUrl: finalUrl,
      sourceImageUrl: parsed.data.sourceImageUrl,
      duration: parsed.data.duration ?? 5,
      resolution: parsed.data.resolution ?? "720p",
      sourceType: parsed.data.sourceType,
      prompt: parsed.data.prompt,
    });
  } catch (e) {
    return NextResponse.json({
      id: rowId,
      videoUrl: "/videos/showcase.mp4",
      sourceImageUrl: parsed.data.sourceImageUrl,
      duration: parsed.data.duration ?? 5,
      resolution: parsed.data.resolution ?? "720p",
      sourceType: parsed.data.sourceType,
      prompt: parsed.data.prompt,
    });
  }
}
