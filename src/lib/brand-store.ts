export type StoredBrand = {
  id: string;
  url: string;
  brandName: string | null;
  industry: string | null;
  tagline: string | null;
  valueProposition: string | null;
  toneOfVoice: string | null;
  brandPersonality: string | null;
  targetAudience: string | null;
  keyMessages: string | null;
  primaryColors: string | null;
  secondaryColors: string | null;
  fonts: string | null;
  logoUrl: string | null;
  screenshotUrl: string | null;
  imageryStyle: string | null;
  layoutStyle: string | null;
  rawJson: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredCampaign = {
  id: string;
  brandId: string;
  goal: string;
  prompt: string | null;
  concepts: string | null;
  createdAt: Date;
  assets: any[];
  brand?: StoredBrand;
};

const globalForStore = globalThis as unknown as {
  brandStore?: Map<string, StoredBrand>;
  campaignStore?: Map<string, StoredCampaign>;
};

const brands = (globalForStore.brandStore ??= new Map<string, StoredBrand>());
const campaigns = (globalForStore.campaignStore ??= new Map<string, StoredCampaign>());

export function saveBrandToMemory(brand: StoredBrand) {
  brands.set(brand.id, brand);
}

export function getBrandFromMemory(id: string): StoredBrand | null {
  return brands.get(id) ?? null;
}

export function saveCampaignToMemory(campaign: StoredCampaign) {
  campaigns.set(campaign.id, campaign);
}

export function getCampaignFromMemory(id: string): StoredCampaign | null {
  return campaigns.get(id) ?? null;
}

export function getCampaignsForBrandFromMemory(brandId: string): StoredCampaign[] {
  return Array.from(campaigns.values()).filter((c) => c.brandId === brandId);
}

export function createFallbackBrand(id: string, url = "https://example.com"): StoredBrand {
  const brandName = "Kreative Brand";
  return {
    id,
    url,
    brandName,
    industry: "Consumer & Digital Technology",
    tagline: "Empowering next-generation creative excellence",
    valueProposition: "Transforming how modern teams craft automated, on-brand marketing campaigns worldwide.",
    toneOfVoice: JSON.stringify(["Visionary", "Precise", "Bold", "Approachable"]),
    brandPersonality: JSON.stringify(["Innovative", "Confident", "Modern", "Dynamic"]),
    targetAudience: "Creative directors, growth marketers, and modern enterprise leaders.",
    keyMessages: JSON.stringify([
      "AI-driven creative campaigns in minutes",
      "Consistent on-brand visual storytelling across every touchpoint",
      "Engineered for high-performing conversion and aesthetic precision",
    ]),
    primaryColors: JSON.stringify(["#0f172a", "#2563eb", "#ffffff"]),
    secondaryColors: JSON.stringify(["#f8fafc", "#64748b"]),
    fonts: JSON.stringify(["Inter", "system-ui", "sans-serif"]),
    logoUrl: null,
    screenshotUrl: null,
    imageryStyle: "modern",
    layoutStyle: "bold",
    rawJson: "{}",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
