import { muapi } from "./muapi";
import type { BrandDNA } from "@prisma/client";

export type CampaignGoal =
  | "product_launch"
  | "lead_generation"
  | "brand_awareness"
  | "engagement"
  | "thought_leadership"
  | "sales";

export const CAMPAIGN_GOALS: { value: CampaignGoal; label: string; description: string }[] = [
  { value: "product_launch", label: "Product launch", description: "Announce a new product or feature" },
  { value: "lead_generation", label: "Lead generation", description: "Capture qualified prospects" },
  { value: "brand_awareness", label: "Brand awareness", description: "Reach new audiences" },
  { value: "engagement", label: "Engagement", description: "Drive replies, shares, comments" },
  { value: "thought_leadership", label: "Thought leadership", description: "Establish authority and POV" },
  { value: "sales", label: "Direct sales", description: "Drive purchases or sign-ups" },
];

export type CampaignConcept = {
  title: string;
  theme: string;
  key_message: string;
  hook: string;
  cta: string;
  recommended_platforms: string[];
  tone_notes: string;
  visual_direction: string;
};

function parseList(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function buildPrompt(brand: BrandDNA, goal: CampaignGoal, userPrompt: string | null): string {
  const tone = parseList(brand.toneOfVoice).join(", ") || "—";
  const personality = parseList(brand.brandPersonality).join(", ") || "—";
  const messages = parseList(brand.keyMessages).join(" • ") || "—";
  const primary = parseList(brand.primaryColors).join(", ") || "—";

  const goalLabel = CAMPAIGN_GOALS.find((g) => g.value === goal)?.label ?? goal;

  return `You are a senior brand strategist. Generate exactly 4 distinct on-brand marketing campaign concepts for the brand below, tailored to the goal: "${goalLabel}".

Return STRICT JSON only — an array of 4 objects with this exact shape (no markdown, no commentary):
[
  {
    "title": "short evocative concept name (max 6 words)",
    "theme": "1 sentence — the strategic angle",
    "key_message": "1 sentence — what the audience should remember",
    "hook": "1 short line — the opening line of the lead asset",
    "cta": "2-4 word call to action",
    "recommended_platforms": ["instagram","linkedin","facebook","twitter","email","banner","youtube_thumb","google_ad"],
    "tone_notes": "how to write this concept — match the brand's voice",
    "visual_direction": "1-2 sentences — palette, imagery, layout cues"
  }
]

Keep concepts genuinely distinct in angle. Match the brand voice and palette. Be specific to the brand, not generic marketing fluff.

BRAND
- Name: ${brand.brandName || "—"}
- Industry: ${brand.industry || "—"}
- Tagline: ${brand.tagline || "—"}
- Value proposition: ${brand.valueProposition || "—"}
- Tone: ${tone}
- Personality: ${personality}
- Key messages: ${messages}
- Primary palette: ${primary}
- Imagery style: ${brand.imageryStyle || "modern"}
- Layout style: ${brand.layoutStyle || "modern"}

${userPrompt ? `USER DIRECTION (incorporate this):\n${userPrompt}\n` : ""}
Generate 4 concepts now:`;
}

function parseConcepts(raw: string): CampaignConcept[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const m = candidate.match(/\[[\s\S]*\]/);
  if (!m) throw new Error(`No JSON array in response: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(m[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Empty concepts array");
  }
  return parsed.slice(0, 4) as CampaignConcept[];
}

export async function generateCampaign(
  brand: BrandDNA,
  goal: CampaignGoal,
  userPrompt: string | null = null,
): Promise<CampaignConcept[]> {
  return generateCampaignConcepts(brand, goal, userPrompt);
}

export async function generateCampaignConcepts(
  brand: BrandDNA,
  goal: CampaignGoal,
  userPrompt: string | null = null,
): Promise<CampaignConcept[]> {
  if (process.env.MUAPI_API_KEY && process.env.MUAPI_API_KEY.trim() !== "") {
    try {
      const prompt = buildPrompt(brand, goal, userPrompt);
      const raw = await muapi.text(prompt);
      return parseConcepts(raw);
    } catch (err) {
      console.warn("MuAPI failed for campaign concepts, falling back to local strategist:", err);
    }
  }

  // High-converting tactical campaign concepts fallback
  const name = brand.brandName || "Our Brand";
  return [
    {
      title: `${name} Redefined`,
      theme: "Highlighting superior craftsmanship and daily transformation.",
      key_message: `Experience the next evolution of quality with ${name}.`,
      hook: "What if everyday performance felt extraordinary?",
      cta: "Explore Collection",
      recommended_platforms: ["instagram", "facebook", "banner", "email"],
      tone_notes: "Confident, inspirational, and sleek.",
      visual_direction: "Clean negative space, bold typography with primary brand contrast."
    },
    {
      title: "The Standard of Tomorrow",
      theme: "Positioning the brand as the category pioneer and trusted choice.",
      key_message: "Built for those who refuse to compromise on quality.",
      hook: "Never settle for average. Step up.",
      cta: "Shop Now",
      recommended_platforms: ["linkedin", "twitter", "facebook"],
      tone_notes: "Authoritative, direct, and energetic.",
      visual_direction: "Dramatic lighting, high-contrast focal product showcase."
    },
    {
      title: "Stories in Every Detail",
      theme: "Behind-the-scenes and emotional resonance with modern customers.",
      key_message: "Every single piece is designed with purpose and passion.",
      hook: "It’s not just a product. It’s an obsession.",
      cta: "Discover More",
      recommended_platforms: ["instagram", "youtube_thumb", "email"],
      tone_notes: "Warm, authentic, and evocative.",
      visual_direction: "Editorial lifestyle imagery with warm ambient glow."
    },
    {
      title: "Unstoppable Momentum",
      theme: "Driving high-urgency conversions and community buzz.",
      key_message: "Join the movement and unlock exclusive access.",
      hook: "Limited edition. Unlimited possibilities.",
      cta: "Claim Access",
      recommended_platforms: ["instagram", "facebook", "banner"],
      tone_notes: "Punchy, fast-paced, and compelling.",
      visual_direction: "Vibrant accents, kinetic angles, and bold CTA framing."
    }
  ];
}
