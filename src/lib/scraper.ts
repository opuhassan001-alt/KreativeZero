export type ScrapedSite = {
  url: string;
  title: string;
  description: string;
  bodyText: string;
  ogImage: string | null;
  favicon: string | null;
  logoCandidates: string[];
  fonts: string[];
  rawColors: string[];
  screenshot: Buffer;
  screenshotUrl?: string | null;
};

// 1x1 transparent PNG fallback buffer
const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

function extractRegex(content: string, regex: RegExp): string {
  const match = content.match(regex);
  return match && match[1] ? match[1].trim() : "";
}

function extractAllRegex(content: string, regex: RegExp): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    if (m[1]) matches.push(m[1].trim());
  }
  return matches;
}

/**
 * Universal Serverless Scraper
 * Works seamlessly on Vercel, Docker, and Localhost without requiring Playwright Chromium binaries.
 */
export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const targetUrl = url.startsWith("http") ? url : `https://${url}`;
  const hostname = new URL(targetUrl).hostname.replace(/^www\./, "");
  const fallbackTitle = hostname.charAt(0).toUpperCase() + hostname.slice(1);

  // Strategy 1: Fast Cloud Metadata & Screenshot (Microlink API)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const microRes = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (microRes.ok) {
      const json = await microRes.json();
      if (json.status === "success" && json.data) {
        const d = json.data;
        const screenshotUrl = d.screenshot?.url || null;
        let screenshotBuffer = EMPTY_PNG;

        if (screenshotUrl) {
          try {
            const imgRes = await fetch(screenshotUrl, { signal: AbortSignal.timeout(4000) });
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              screenshotBuffer = Buffer.from(arrayBuf);
            }
          } catch {
            // Keep empty PNG fallback
          }
        }

        const logoCandidates: string[] = [];
        if (d.logo?.url) logoCandidates.push(d.logo.url);
        if (d.image?.url) logoCandidates.push(d.image.url);

        // Fetch markdown content via Jina for deep body understanding
        let bodyText = d.description || "";
        try {
          const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
            headers: { Accept: "text/plain" },
            signal: AbortSignal.timeout(3500),
          });
          if (jinaRes.ok) {
            const md = await jinaRes.text();
            bodyText = md.slice(0, 8000);
          }
        } catch {}

        return {
          url: targetUrl,
          title: d.title || fallbackTitle,
          description: d.description || `Official website of ${fallbackTitle}`,
          bodyText,
          ogImage: d.image?.url || null,
          favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
          logoCandidates,
          fonts: ["Inter", "system-ui", "sans-serif"],
          rawColors: ["#0f172a", "#2563eb", "#ffffff"],
          screenshot: screenshotBuffer,
          screenshotUrl,
        };
      }
    }
  } catch (err) {
    console.warn("Cloud scraper layer 1 failed, trying layer 2:", err);
  }

  // Strategy 2: Direct HTTP Fetch with Desktop Browser Headers
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();

      const title =
        extractRegex(html, /<title[^>]*>([^<]+)<\/title>/i) ||
        extractRegex(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        fallbackTitle;

      const description =
        extractRegex(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        extractRegex(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
        `Welcome to ${title}`;

      const ogImage =
        extractRegex(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || null;

      // Extract raw hex colors from CSS
      const colorMatches = html.match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g) || [];
      const rawColors = Array.from(new Set(colorMatches)).slice(0, 30);

      // Clean body text
      const cleanBody = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      // Free fallback screenshot from WordPress mshots
      const wpScreenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=1200&h=800`;
      let screenshotBuffer = EMPTY_PNG;
      try {
        const sRes = await fetch(wpScreenshotUrl, { signal: AbortSignal.timeout(3000) });
        if (sRes.ok) {
          screenshotBuffer = Buffer.from(await sRes.arrayBuffer());
        }
      } catch {}

      return {
        url: targetUrl,
        title,
        description,
        bodyText: cleanBody || description,
        ogImage,
        favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
        logoCandidates: ogImage ? [ogImage] : [],
        fonts: ["Inter", "system-ui", "sans-serif"],
        rawColors: rawColors.length ? rawColors : ["#0f172a", "#3b82f6", "#ffffff"],
        screenshot: screenshotBuffer,
        screenshotUrl: wpScreenshotUrl,
      };
    }
  } catch (err) {
    console.warn("Direct fetch layer 2 failed:", err);
  }

  // Strategy 3: Ultimate Fallback (Never throws 500 error)
  const cleanTitle = fallbackTitle;
  return {
    url: targetUrl,
    title: cleanTitle,
    description: `Modern digital products and services engineered by ${cleanTitle}.`,
    bodyText: `Official digital experience for ${cleanTitle}. Delivering high-grade solutions worldwide.`,
    ogImage: null,
    favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
    logoCandidates: [],
    fonts: ["Inter", "sans-serif"],
    rawColors: ["#0f172a", "#2563eb", "#ffffff"],
    screenshot: EMPTY_PNG,
    screenshotUrl: null,
  };
}
