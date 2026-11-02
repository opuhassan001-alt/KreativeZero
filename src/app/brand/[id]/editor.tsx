"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type EditableDNA = {
  brandName: string;
  industry: string;
  tagline: string;
  valueProposition: string;
  targetAudience: string;
  imageryStyle: string;
  layoutStyle: string;
  logoUrl: string | null;
  screenshotUrl: string | null;
  toneOfVoice: string[];
  brandPersonality: string[];
  keyMessages: string[];
  fonts: string[];
  primaryColors: string[];
  secondaryColors: string[];
};

export function DnaEditor({ id, initial, sourceUrl }: { id: string; initial: EditableDNA; sourceUrl: string }) {
  const [d, setD] = useState<EditableDNA>(initial);
  const [currentUrl, setCurrentUrl] = useState(sourceUrl);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Synchronize client storage immediately on mount so extracted data is NEVER lost
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`brand_dna_${id}`) || localStorage.getItem(`brand_dna_${id}`);
      if (stored) {
        const p = JSON.parse(stored);
        setD((prev) => ({
          ...prev,
          brandName: p.brandName || prev.brandName,
          industry: p.industry || prev.industry,
          tagline: p.tagline || prev.tagline,
          valueProposition: p.valueProposition || prev.valueProposition,
          targetAudience: p.targetAudience || prev.targetAudience,
          imageryStyle: p.imageryStyle || prev.imageryStyle,
          layoutStyle: p.layoutStyle || prev.layoutStyle,
          logoUrl: p.logoUrl || prev.logoUrl,
          screenshotUrl: p.screenshotUrl || prev.screenshotUrl,
          toneOfVoice:
            typeof p.toneOfVoice === "string"
              ? JSON.parse(p.toneOfVoice)
              : p.toneOfVoice || prev.toneOfVoice,
          brandPersonality:
            typeof p.brandPersonality === "string"
              ? JSON.parse(p.brandPersonality)
              : p.brandPersonality || prev.brandPersonality,
          keyMessages:
            typeof p.keyMessages === "string"
              ? JSON.parse(p.keyMessages)
              : p.keyMessages || prev.keyMessages,
          fonts: typeof p.fonts === "string" ? JSON.parse(p.fonts) : p.fonts || prev.fonts,
          primaryColors:
            typeof p.primaryColors === "string"
              ? JSON.parse(p.primaryColors)
              : p.primaryColors || prev.primaryColors,
          secondaryColors:
            typeof p.secondaryColors === "string"
              ? JSON.parse(p.secondaryColors)
              : p.secondaryColors || prev.secondaryColors,
        }));
      }
      const storedUrl = sessionStorage.getItem(`brand_url_${id}`) || localStorage.getItem(`brand_url_${id}`);
      if (storedUrl) setCurrentUrl(storedUrl);
    } catch {}
  }, [id]);

  const set = <K extends keyof EditableDNA>(k: K, v: EditableDNA[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Save locally first
      try {
        sessionStorage.setItem(`brand_dna_${id}`, JSON.stringify(d));
        localStorage.setItem(`brand_dna_${id}`, JSON.stringify(d));
      } catch {}

      const res = await fetch(`/api/brand/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: d.brandName,
          industry: d.industry,
          tagline: d.tagline,
          valueProposition: d.valueProposition,
          targetAudience: d.targetAudience,
          imageryStyle: d.imageryStyle,
          layoutStyle: d.layoutStyle,
          logoUrl: d.logoUrl,
          toneOfVoice: d.toneOfVoice,
          brandPersonality: d.brandPersonality,
          keyMessages: d.keyMessages,
          fonts: d.fonts,
          primaryColors: d.primaryColors,
          secondaryColors: d.secondaryColors,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ? JSON.stringify(json.error) : `HTTP ${res.status}`);
      setSavedAt(Date.now());
    } catch (e) {
      // If server DB is unavailable, still consider saved in client storage
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {d.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.logoUrl} alt="logo" className="h-12 w-12 rounded bg-white object-contain p-1" />
          )}
          <div>
            <h1 className="text-3xl font-semibold">{d.brandName || currentUrl}</h1>
            <p className="text-sm text-neutral-400">{currentUrl}</p>
          </div>
        </div>
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">
          ← New
        </Link>
      </div>

      <Section title="Identity">
        <Field label="Brand name" value={d.brandName} onChange={(v) => set("brandName", v)} />
        <Field label="Industry" value={d.industry} onChange={(v) => set("industry", v)} />
        <Field label="Tagline" value={d.tagline} onChange={(v) => set("tagline", v)} />
        <Field
          label="Value proposition"
          value={d.valueProposition}
          onChange={(v) => set("valueProposition", v)}
          multiline
        />
        <Field
          label="Target audience"
          value={d.targetAudience}
          onChange={(v) => set("targetAudience", v)}
          multiline
        />
        <Field label="Imagery style" value={d.imageryStyle} onChange={(v) => set("imageryStyle", v)} />
        <Field label="Layout style" value={d.layoutStyle} onChange={(v) => set("layoutStyle", v)} />
        <Field
          label="Logo URL"
          value={d.logoUrl ?? ""}
          onChange={(v) => set("logoUrl", v || null)}
        />
      </Section>

      <Section title="Voice">
        <Chips label="Tone of voice" items={d.toneOfVoice} onChange={(v) => set("toneOfVoice", v)} />
        <Chips
          label="Brand personality"
          items={d.brandPersonality}
          onChange={(v) => set("brandPersonality", v)}
        />
      </Section>

      <Section title="Key messages">
        <Lines items={d.keyMessages} onChange={(v) => set("keyMessages", v)} />
      </Section>

      <Section title="Palette">
        <Swatches label="Primary" colors={d.primaryColors} onChange={(v) => set("primaryColors", v)} />
        <Swatches
          label="Secondary"
          colors={d.secondaryColors}
          onChange={(v) => set("secondaryColors", v)}
        />
      </Section>

      <Section title="Fonts">
        <Chips label="Detected fonts" items={d.fonts} onChange={(v) => set("fonts", v)} />
      </Section>

      {d.screenshotUrl && (
        <Section title="Screenshot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.screenshotUrl} alt="site" className="rounded-lg border border-neutral-800" />
        </Section>
      )}

      <div className="sticky bottom-4 mt-8 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur">
        <div className="text-sm">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : savedAt ? (
            <span className="text-emerald-400">Saved</span>
          ) : (
            <span className="text-neutral-500">Edit any field, then save.</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save DNA"}
          </button>
          <Link
            href={`/brand/${id}/photo-studio`}
            className="rounded-lg border border-neutral-700 px-5 py-2 text-sm hover:border-neutral-500"
          >
            Photo Studio →
          </Link>
          <Link
            href={`/brand/${id}/campaigns/new`}
            className="rounded-lg border border-neutral-700 px-5 py-2 text-sm hover:border-neutral-500"
          >
            Generate campaign →
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-300">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      )}
    </label>
  );
}

function Chips({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <span className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">{label}</span>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs"
          >
            {it}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-neutral-500 hover:text-red-400"
              aria-label={`Remove ${it}`}
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-neutral-600">None yet — add below.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add and press Enter"
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
        <button
          onClick={add}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function Lines({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <ul className="mb-2 space-y-1">
        {items.map((m, i) => (
          <li key={i} className="flex items-start gap-2 rounded bg-neutral-900 px-3 py-2 text-sm">
            <input
              value={m}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className="flex-1 bg-transparent outline-none"
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-neutral-500 hover:text-red-400"
              aria-label="Remove message"
            >
              ×
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-neutral-600">None yet — add below.</li>}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a key message"
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
        <button
          onClick={add}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function Swatches({
  label,
  colors,
  onChange,
}: {
  label: string;
  colors: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("#");

  const normalize = (raw: string): string | null => {
    const v = raw.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) return v;
    if (/^[0-9a-f]{6}$/.test(v)) return "#" + v;
    if (/^#[0-9a-f]{3}$/.test(v)) return "#" + v.slice(1).split("").map((c) => c + c).join("");
    return null;
  };

  const add = () => {
    const v = normalize(draft);
    if (!v || colors.includes(v)) return;
    onChange([...colors, v]);
    setDraft("#");
  };

  return (
    <div>
      <span className="mb-2 block text-xs uppercase tracking-wider text-neutral-500">{label}</span>
      <div className="mb-2 flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <div
            key={`${c}-${i}`}
            className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5"
          >
            <input
              type="color"
              value={c}
              onChange={(e) => onChange(colors.map((x, j) => (j === i ? e.target.value.toLowerCase() : x)))}
              className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label={`Edit ${c}`}
            />
            <span className="font-mono text-xs">{c}</span>
            <button
              onClick={() => onChange(colors.filter((_, j) => j !== i))}
              className="text-neutral-500 hover:text-red-400"
              aria-label={`Remove ${c}`}
            >
              ×
            </button>
          </div>
        ))}
        {colors.length === 0 && <span className="text-xs text-neutral-600">None yet — add below.</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="color"
          value={normalize(draft) ?? "#000000"}
          onChange={(e) => setDraft(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-neutral-800 bg-neutral-900 p-1"
        />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="#3366ff"
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-sm outline-none focus:border-neutral-500"
        />
        <button
          onClick={add}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
        >
          Add
        </button>
      </div>
    </div>
  );
}
