/**
 * sherlock.ts — Username search across 65+ platforms (inspired by sherlock-project/sherlock)
 * Checks profile URLs for existence via HTTP status codes / response body.
 */
import fetch from "node-fetch";

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

type NotFoundStrategy =
  | { kind: "status"; code: number }
  | { kind: "bodyContains"; text: string }
  | { kind: "redirectTo"; pattern: string };

interface Platform {
  name: string;
  category: string;
  url: (u: string) => string;
  notFound: NotFoundStrategy;
}

const PLATFORMS: Platform[] = [
  // ─── Social ──────────────────────────────────────────────────────────────
  {
    name: "Instagram",
    category: "Соцсети",
    url: (u) => `https://www.instagram.com/${u}/`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Twitter/X",
    category: "Соцсети",
    url: (u) => `https://x.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "TikTok",
    category: "Соцсети",
    url: (u) => `https://www.tiktok.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Pinterest",
    category: "Соцсети",
    url: (u) => `https://www.pinterest.com/${u}/`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Facebook",
    category: "Соцсети",
    url: (u) => `https://www.facebook.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "LinkedIn",
    category: "Соцсети",
    url: (u) => `https://www.linkedin.com/in/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Snapchat",
    category: "Соцсети",
    url: (u) => `https://www.snapchat.com/add/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "VK",
    category: "Соцсети",
    url: (u) => `https://vk.com/${u}`,
    notFound: { kind: "bodyContains", text: "not found" },
  },
  {
    name: "Odnoklassniki",
    category: "Соцсети",
    url: (u) => `https://ok.ru/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Mastodon",
    category: "Соцсети",
    url: (u) => `https://mastodon.social/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Bluesky",
    category: "Соцсети",
    url: (u) => `https://bsky.app/profile/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Threads",
    category: "Соцсети",
    url: (u) => `https://www.threads.net/@${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Мессенджеры ─────────────────────────────────────────────────────────
  {
    name: "Telegram",
    category: "Мессенджеры",
    url: (u) => `https://t.me/${u}`,
    notFound: { kind: "bodyContains", text: "If you have Telegram" },
  },

  // ─── Форумы ───────────────────────────────────────────────────────────────
  {
    name: "Reddit",
    category: "Форумы",
    url: (u) => `https://www.reddit.com/user/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Quora",
    category: "Форумы",
    url: (u) => `https://www.quora.com/profile/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "HackerNews",
    category: "Форумы",
    url: (u) => `https://news.ycombinator.com/user?id=${u}`,
    notFound: { kind: "bodyContains", text: "No such user" },
  },
  {
    name: "Ask.fm",
    category: "Форумы",
    url: (u) => `https://ask.fm/${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Разработка ───────────────────────────────────────────────────────────
  {
    name: "GitHub",
    category: "Разработка",
    url: (u) => `https://github.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "GitLab",
    category: "Разработка",
    url: (u) => `https://gitlab.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Bitbucket",
    category: "Разработка",
    url: (u) => `https://bitbucket.org/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Dev.to",
    category: "Разработка",
    url: (u) => `https://dev.to/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Codepen",
    category: "Разработка",
    url: (u) => `https://codepen.io/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Replit",
    category: "Разработка",
    url: (u) => `https://replit.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "npm",
    category: "Разработка",
    url: (u) => `https://www.npmjs.com/~${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "PyPI",
    category: "Разработка",
    url: (u) => `https://pypi.org/user/${u}/`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Docker Hub",
    category: "Разработка",
    url: (u) => `https://hub.docker.com/u/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Hashnode",
    category: "Разработка",
    url: (u) => `https://hashnode.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Keybase",
    category: "Разработка",
    url: (u) => `https://keybase.io/${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Игры ────────────────────────────────────────────────────────────────
  {
    name: "Twitch",
    category: "Игры",
    url: (u) => `https://www.twitch.tv/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Steam",
    category: "Игры",
    url: (u) => `https://steamcommunity.com/id/${u}`,
    notFound: { kind: "bodyContains", text: "The specified profile could not be found" },
  },
  {
    name: "Roblox",
    category: "Игры",
    url: (u) => `https://www.roblox.com/user.aspx?username=${u}`,
    notFound: { kind: "bodyContains", text: "Page Not Found" },
  },
  {
    name: "Chess.com",
    category: "Игры",
    url: (u) => `https://www.chess.com/member/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Minecraft",
    category: "Игры",
    url: (u) => `https://api.mojang.com/users/profiles/minecraft/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Faceit",
    category: "Игры",
    url: (u) => `https://www.faceit.com/en/players/${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Видео ───────────────────────────────────────────────────────────────
  {
    name: "YouTube",
    category: "Видео",
    url: (u) => `https://www.youtube.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Vimeo",
    category: "Видео",
    url: (u) => `https://vimeo.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Dailymotion",
    category: "Видео",
    url: (u) => `https://www.dailymotion.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Rutube",
    category: "Видео",
    url: (u) => `https://rutube.ru/channel/${u}/`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Музыка ──────────────────────────────────────────────────────────────
  {
    name: "SoundCloud",
    category: "Музыка",
    url: (u) => `https://soundcloud.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Spotify",
    category: "Музыка",
    url: (u) => `https://open.spotify.com/user/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Last.fm",
    category: "Музыка",
    url: (u) => `https://www.last.fm/user/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Mixcloud",
    category: "Музыка",
    url: (u) => `https://www.mixcloud.com/${u}/`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Bandcamp",
    category: "Музыка",
    url: (u) => `https://${u}.bandcamp.com`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Фото ────────────────────────────────────────────────────────────────
  {
    name: "Flickr",
    category: "Фото",
    url: (u) => `https://www.flickr.com/people/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "500px",
    category: "Фото",
    url: (u) => `https://500px.com/p/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Unsplash",
    category: "Фото",
    url: (u) => `https://unsplash.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "VSCO",
    category: "Фото",
    url: (u) => `https://vsco.co/${u}/gallery`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Дизайн / Арт ────────────────────────────────────────────────────────
  {
    name: "Behance",
    category: "Дизайн",
    url: (u) => `https://www.behance.net/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Dribbble",
    category: "Дизайн",
    url: (u) => `https://dribbble.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "DeviantArt",
    category: "Дизайн",
    url: (u) => `https://www.deviantart.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "ArtStation",
    category: "Дизайн",
    url: (u) => `https://www.artstation.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Блоги / Письмо ───────────────────────────────────────────────────────
  {
    name: "Medium",
    category: "Блоги",
    url: (u) => `https://medium.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Substack",
    category: "Блоги",
    url: (u) => `https://substack.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Tumblr",
    category: "Блоги",
    url: (u) => `https://${u}.tumblr.com`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Blogger",
    category: "Блоги",
    url: (u) => `https://${u}.blogspot.com`,
    notFound: { kind: "bodyContains", text: "Sorry, the blog at" },
  },
  {
    name: "Goodreads",
    category: "Книги",
    url: (u) => `https://www.goodreads.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Letterboxd",
    category: "Кино",
    url: (u) => `https://letterboxd.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Профессиональное ────────────────────────────────────────────────────
  {
    name: "Product Hunt",
    category: "Стартапы",
    url: (u) => `https://www.producthunt.com/@${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "AngelList",
    category: "Стартапы",
    url: (u) => `https://angel.co/${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Коммерция ───────────────────────────────────────────────────────────
  {
    name: "Etsy",
    category: "Магазины",
    url: (u) => `https://www.etsy.com/shop/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Fiverr",
    category: "Фриланс",
    url: (u) => `https://www.fiverr.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Patreon",
    category: "Донаты",
    url: (u) => `https://www.patreon.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Ko-fi",
    category: "Донаты",
    url: (u) => `https://ko-fi.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },

  // ─── Прочее ──────────────────────────────────────────────────────────────
  {
    name: "About.me",
    category: "Портфолио",
    url: (u) => `https://about.me/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Gravatar",
    category: "Аватары",
    url: (u) => `https://gravatar.com/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Linktree",
    category: "Ссылки",
    url: (u) => `https://linktr.ee/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Duolingo",
    category: "Образование",
    url: (u) => `https://www.duolingo.com/profile/${u}`,
    notFound: { kind: "status", code: 404 },
  },
  {
    name: "Strava",
    category: "Спорт",
    url: (u) => `https://www.strava.com/athletes/${u}`,
    notFound: { kind: "status", code: 404 },
  },
];

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
  const results: SherlockResult[] = [];
  const BATCH = 10;

  for (let i = 0; i < PLATFORMS.length; i += BATCH) {
    const slice = PLATFORMS.slice(i, i + BATCH);
    const batch = await Promise.all(
      slice.map(async (p): Promise<SherlockResult> => ({
        platform: p.name,
        category: p.category,
        url: p.url(username),
        found: await checkPlatform(p, username),
      }))
    );
    results.push(...batch);
    if (onProgress) onProgress(Math.min(i + BATCH, PLATFORMS.length), PLATFORMS.length);
  }

  return results;
}

export const SHERLOCK_TOTAL = PLATFORMS.length;
