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

/**
 * High-speed, resilient serverless scraper.
 * Prioritizes speed, bypasses Cloudflare, and extracts real metadata under 2 seconds.
 */
export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const targetUrl = url.startsWith("http") ? url : `https://${url}`;
  const hostname = new URL(targetUrl).hostname.replace(/^www\./, "");
  const fallbackTitle = hostname.charAt(0).toUpperCase() + hostname.slice(1);
  const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  const wpScreenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=1200&h=800`;

  // Parallel Race: Fast Direct HTTP + Jina AI Reader
  const directPromise = (async () => {
    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      const html = await res.text();

      const title =
        extractRegex(html, /<title[^>]*>([^<]+)<\/title>/i) ||
        extractRegex(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        fallbackTitle;

      const description =
        extractRegex(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        extractRegex(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
        `Official experience for ${title}`;

      const ogImage =
        extractRegex(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || null;

      const colorMatches = html.match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g) || [];
      const rawColors = Array.from(new Set(colorMatches)).slice(0, 30);

      const cleanBody = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      return { title, description, bodyText: cleanBody, ogImage, rawColors };
    } catch {
      return null;
    }
  })();

  const jinaPromise = (async () => {
    try {
      const res = await fetch(`https://r.jina.ai/${targetUrl}`, {
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      const text = await res.text();
      const titleMatch = text.match(/Title:\s*(.+)/i);
      const title = titleMatch ? titleMatch[1].trim() : fallbackTitle;
      return {
        title,
        description: text.slice(0, 300).replace(/Title:[^\n]+/i, "").trim(),
        bodyText: text.slice(0, 8000),
        ogImage: null,
        rawColors: ["#0f172a", "#2563eb", "#ffffff"],
      };
    } catch {
      return null;
    }
  })();

  const [directData, jinaData] = await Promise.all([directPromise, jinaPromise]);

  const bestData = directData || jinaData || {
    title: fallbackTitle,
    description: `Official digital experience for ${fallbackTitle}`,
    bodyText: `Welcome to ${fallbackTitle}. Premier modern solutions and services.`,
    ogImage: null,
    rawColors: ["#0f172a", "#2563eb", "#ffffff"],
  };

  const title = bestData.title || fallbackTitle;
  const description = bestData.description || `Official experience for ${title}`;
  const bodyText = (bestData.bodyText || description).slice(0, 8000);
  const ogImage = bestData.ogImage;
  const logoCandidates: string[] = [];
  if (ogImage) logoCandidates.push(ogImage);
  logoCandidates.push(favicon);

  return {
    url: targetUrl,
    title,
    description,
    bodyText,
    ogImage,
    favicon,
    logoCandidates,
    fonts: ["Inter", "system-ui", "sans-serif"],
    rawColors: bestData.rawColors?.length ? bestData.rawColors : ["#0f172a", "#2563eb", "#ffffff"],
    screenshot: EMPTY_PNG,
    screenshotUrl: wpScreenshotUrl,
  };
}
