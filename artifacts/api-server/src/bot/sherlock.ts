/**
 * sherlock.ts — Username search across 500+ built-in platforms
 *              + Maigret database (~3500 sites, cached on disk).
 *
 * On first run fetches the Maigret data.json from GitHub and caches it
 * to ./sherlock-cache.json next to snos_data.json. Falls back to built-in
 * platforms if the fetch fails.
 */
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { BUILTIN_PLATFORMS, type Platform, type NotFoundStrategy } from "./sherlock-sites.js";

export interface SherlockResult {
  platform: string;
  category: string;
  url: string;
  found: boolean | null; // null = blocked / timeout
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const TIMEOUT = 7000;

// ─── Maigret integration ──────────────────────────────────────────────────────

const MAIGRET_URL =
  "https://raw.githubusercontent.com/soxoj/maigret/main/maigret/resources/data.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(__dirname, "../../sherlock-cache.json");
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let _merged: Platform[] | null = null;

interface MaigretSite {
  tags?: string[];
  disabled?: boolean;
  data?: {
    mainUrl?: string;
    url?: string;
    urlMain?: string;
    errorType?: string;
    errorCode?: number;
    errorMsg?: string | null;
    regexCheck?: string;
  };
}

function maigretToPlatform(name: string, site: MaigretSite): Platform | null {
  try {
    if (site.disabled) return null;
    const d = site.data ?? {};
    const urlTpl = d.url ?? d.mainUrl ?? d.urlMain;
    if (!urlTpl || !urlTpl.includes("{username}")) return null;

    // Determine notFound strategy
    let notFound: NotFoundStrategy;
    if (d.errorType === "status_code") {
      notFound = { kind: "status", code: d.errorCode ?? 404 };
    } else if (d.errorType === "message" && d.errorMsg) {
      notFound = { kind: "bodyContains", text: d.errorMsg };
    } else if (d.errorType === "response_url" && d.errorMsg) {
      notFound = { kind: "redirectTo", pattern: d.errorMsg };
    } else {
      notFound = { kind: "status", code: 404 };
    }

    // Pick a readable category from tags
    const tags = site.tags ?? [];
    const category = categFromTags(tags) ?? "Прочее";

    const urlFn = (u: string) => urlTpl.replace(/\{username\}/g, u);

    return { name, category, url: urlFn, notFound };
  } catch {
    return null;
  }
}

function categFromTags(tags: string[]): string | null {
  const map: Record<string, string> = {
    social:     "Соцсети",
    gaming:     "Игры",
    game:       "Игры",
    photo:      "Фото",
    video:      "Видео",
    music:      "Музыка",
    forum:      "Форумы",
    blog:       "Блоги",
    dev:        "Разработка",
    code:       "Разработка",
    dating:     "Дейтинг",
    crypto:     "Крипто",
    finance:    "Финансы",
    shopping:   "Магазины",
    education:  "Образование",
    sport:      "Спорт",
    fitness:    "Спорт",
    travel:     "Путешествия",
    art:        "Дизайн",
    design:     "Дизайн",
    news:       "Новости",
    messenger:  "Мессенджеры",
    chat:       "Мессенджеры",
    food:       "Еда",
    career:     "Работа",
    freelance:  "Фриланс",
    russian:    "Соцсети RU",
    nsfw:       "18+",
    adult:      "18+",
    anime:      "Аниме",
    streaming:  "Видео",
    podcast:    "Подкасты",
    portfolio:  "Портфолио",
    review:     "Отзывы",
  };
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (map[key]) return map[key];
  }
  return null;
}

/** Load Maigret database (from cache or network). Returns extra platforms. */
async function loadMaigretPlatforms(): Promise<Platform[]> {
  // Try cache first
  try {
    const stat = await fs.stat(CACHE_FILE);
    if (Date.now() - stat.mtimeMs < CACHE_MAX_AGE_MS) {
      const raw = await fs.readFile(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, MaigretSite>;
      return convertMaigret(parsed);
    }
  } catch {
    // cache miss or parse error — fall through to network fetch
  }

  // Fetch from GitHub
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(MAIGRET_URL, {
      signal: ctrl.signal as any,
      headers: { "User-Agent": UA },
    });
    clearTimeout(t);

    if (!res.ok) return [];

    const data = (await res.json()) as Record<string, MaigretSite>;

    // Persist cache
    try {
      await fs.writeFile(CACHE_FILE, JSON.stringify(data), "utf-8");
    } catch {}

    return convertMaigret(data);
  } catch {
    return [];
  }
}

function convertMaigret(data: Record<string, MaigretSite>): Platform[] {
  const results: Platform[] = [];
  for (const [name, site] of Object.entries(data)) {
    const p = maigretToPlatform(name, site);
    if (p) results.push(p);
  }
  return results;
}

/** Merge built-in + Maigret, deduplicate by name. */
async function getMergedPlatforms(): Promise<Platform[]> {
  if (_merged) return _merged;

  const maigret = await loadMaigretPlatforms();

  // Dedup: built-in takes priority
  const seen = new Set(BUILTIN_PLATFORMS.map(p => p.name.toLowerCase()));
  const extra = maigret.filter(p => !seen.has(p.name.toLowerCase()));

  _merged = [...BUILTIN_PLATFORMS, ...extra];
  return _merged;
}

// ─── HTTP check ──────────────────────────────────────────────────────────────

async function checkPlatform(p: Platform, username: string): Promise<boolean | null> {
  const url = p.url(username);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);

    const res = await fetch(url, {
      signal: ctrl.signal as any,
      redirect: p.notFound.kind === "bodyContains" ? "follow" : "manual",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    clearTimeout(t);

    const s = p.notFound;

    if (s.kind === "status") {
      if (res.status === s.code) return false;
      if (res.status === 403 || res.status === 429) return null;
      if (res.status === 200 || res.status === 301 || res.status === 302) return true;
      return null;
    }

    if (s.kind === "bodyContains") {
      if (res.status === 403 || res.status === 429) return null;
      const body = await res.text();
      return !body.includes(s.text);
    }

    if (s.kind === "redirectTo") {
      const location = res.headers.get("location") ?? "";
      return !location.includes(s.pattern);
    }
  } catch {
    // timeout or network error
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchUsername(
  username: string,
  onProgress?: (done: number, total: number) => void
): Promise<SherlockResult[]> {
  const platforms = await getMergedPlatforms();
  const results: SherlockResult[] = [];
  const BATCH = 20; // higher concurrency now that we have many more sites

  for (let i = 0; i < platforms.length; i += BATCH) {
    const slice = platforms.slice(i, i + BATCH);
    const batch = await Promise.all(
      slice.map(async (p): Promise<SherlockResult> => ({
        platform: p.name,
        category: p.category,
        url: p.url(username),
        found: await checkPlatform(p, username),
      }))
    );
    results.push(...batch);
    if (onProgress) onProgress(Math.min(i + BATCH, platforms.length), platforms.length);
  }

  return results;
}

/** Returns current total (may grow after Maigret loads). */
export async function getSherlockTotal(): Promise<number> {
  const platforms = await getMergedPlatforms();
  return platforms.length;
}

/** Sync approximate total before Maigret loads (for UI labels). */
export const SHERLOCK_TOTAL = BUILTIN_PLATFORMS.length;
