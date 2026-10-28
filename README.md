# KreativeZero

AI-powered autonomous marketing campaign and brand creative generator. Paste any website URL → get an editable Brand DNA, on-brand campaign concepts, platform-specific creatives, AI product photography, and short-form videos. Self-hosted, single-user, no cloud queues — runs locally on SQLite.

## Features

- **Brand DNA extraction** — paste a URL, Playwright scrapes the site, extracting colors, fonts, typography, logo, and core brand personality into an editable brand profile.
- **Editable DNA review** — chips for tone / personality / messages, native color pickers for primary and secondary palettes.
- **Campaign generation** — pick a goal (product launch, lead gen, awareness, engagement, thought leadership, sales) → 4 distinct on-brand concepts.
- **Platform-specific asset generation** — one click produces ready-to-post creatives across **8 formats** (Instagram feed/story, LinkedIn, Facebook ad, X/Twitter, web banner, email header, YouTube thumbnail), each with its own aspect ratio, copy word-caps, and tone.
- **In-browser canvas editor** — every generated asset opens an editor with a 9-position grid for headline / body / CTA blocks, controls for size / color / background / font / alignment.
- **AI Photo Studio** — **6 categories × 5 styles = 30 product-photography presets** (Studio white, marble clean, urban street, golden hour, restaurant plated, scandi living, dark techy, …).
- **Animate** — turn any asset, photoshoot, or fresh upload into a 3–12 second video. 480p / 720p / 1080p.

## Quickstart

```bash
git clone https://github.com/KreativeZero.git
cd KreativeZero

cp .env.example .env
npm install
npx playwright install chromium
npx prisma db push
npm run dev
```

Open http://localhost:3000 and paste a website URL.

## Stack

- **Framework**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
- **Storage**: SQLite via Prisma (single `dev.db` file, zero-config)
- **Scraping**: Playwright (headless Chromium)
- **AI provider**: MuAPI / Local Fallback Multi-model Engine

## License

MIT
