async function verifyAll() {
  console.log("=== STARTING FULL PRODUCTION VERIFICATION ===");
  const base = "https://kreativezero.vercel.app";

  // Test 1: Brand DNA Extraction
  console.log("\n[Test 1] Testing Brand DNA Extraction with https://www.dolilos.com/ ...");
  const extractRes = await fetch(`${base}/api/brand/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://www.dolilos.com/" }),
  });
  const extractJson = await extractRes.json();
  console.log("Extraction Response status:", extractRes.status);
  console.log("Extracted Brand Name:", extractJson.dna?.brandName);
  console.log("Extracted Tagline:", extractJson.dna?.tagline);
  console.log("Extracted Logo:", extractJson.dna?.logoUrl);
  console.log("Extracted Screenshot:", extractJson.dna?.screenshotUrl);

  const brandId = extractJson.id;
  const brandDna = extractJson.dna;

  // Test 2: Brand Editor Route
  console.log(`\n[Test 2] Testing Brand Review Page /brand/${brandId} ...`);
  const brandPageRes = await fetch(`${base}/brand/${brandId}`);
  console.log("Brand page status:", brandPageRes.status);

  // Test 3: Campaign Generation
  console.log("\n[Test 3] Testing Campaign Generation for দলিল OS ...");
  const campRes = await fetch(`${base}/api/campaign/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandId,
      goal: "product_launch",
      prompt: "AI-driven automated deed generation in Bangladesh",
      brandDna,
    }),
  });
  const campJson = await campRes.json();
  console.log("Campaign creation status:", campRes.status);
  console.log("Campaign ID:", campJson.id);
  console.log("Campaign Concepts Count:", campJson.concepts?.length);
  if (campJson.concepts?.[0]) {
    console.log("First Concept Title:", campJson.concepts[0].title);
    console.log("First Concept Key Message:", campJson.concepts[0].key_message);
  }

  const campaignId = campJson.id;

  // Test 4: Platform-Specific Creative Generation
  console.log("\n[Test 4] Testing Platform Creative Generation (instagram_square) ...");
  const assetRes = await fetch(`${base}/api/asset/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignId,
      conceptIndex: 0,
      platformId: "instagram_square",
    }),
  });
  const assetJson = await assetRes.json();
  console.log("Asset generation status:", assetRes.status);
  console.log("Generated Asset Image URL:", assetJson.imageUrl?.slice(0, 100) + "...");
  console.log("Generated Headline:", assetJson.headline);

  const assetId = assetJson.id;

  // Test 5: Canvas Editor Page
  console.log(`\n[Test 5] Testing Canvas Editor Page /asset/${assetId}/edit ...`);
  const editorRes = await fetch(`${base}/asset/${assetId}/edit`);
  console.log("Canvas editor page status:", editorRes.status);

  // Test 6: AI Photo Studio
  console.log("\n[Test 6] Testing Photo Studio Generation ...");
  const photoRes = await fetch(`${base}/api/photo-studio/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productImageUrl: brandDna.logoUrl || "https://www.dolilos.com/opengraph-image.jpg",
      category: "beauty",
      styleId: "marble_clean",
      prompt: "Clean luxury presentation",
      brandId,
    }),
  });
  const photoJson = await photoRes.json();
  console.log("Photo Studio status:", photoRes.status);
  console.log("Generated Photoshoot Image:", photoJson.imageUrl?.slice(0, 100) + "...");

  // Test 7: Action Studio (Animate)
  console.log("\n[Test 7] Testing Action Studio Animation ...");
  const animRes = await fetch(`${base}/api/animate/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceImageUrl: assetJson.imageUrl || brandDna.logoUrl,
      sourceType: "asset",
      prompt: "Smooth commercial parallax pan and zoom",
      duration: 5,
      resolution: "720p",
      brandId,
    }),
  });
  const animJson = await animRes.json();
  console.log("Action Studio status:", animRes.status);
  console.log("Generated Video URL:", animJson.videoUrl);

  console.log("\n=== FULL VERIFICATION COMPLETE ===");
}

verifyAll().catch(console.error);
