/**
 * holehe.ts — Email platform checker (inspired by megadose/holehe)
 * Checks ~40 platforms to see if an email is registered.
 */
import crypto from "crypto";
import fetch from "node-fetch";
import type { RequestInit } from "node-fetch";

export interface HoleheResult {
  name: string;
  category: string;
  found: boolean | null; // null = error / rate-limited
  url: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const TIMEOUT = 9000;

function md5(s: string): string {
  return crypto.createHash("md5").update(s.toLowerCase().trim()).digest("hex");
}

async function req(
  url: string,
  opts: RequestInit = {}
): Promise<{ status: number; body: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal as any,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/html, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        ...(opts.headers ?? {}),
      },
    });
    clearTimeout(t);
    const body = await res.text();
    return { status: res.status, body };
  } catch {
    return null;
  }
}

function parseJson(body: string): any {
  try { return JSON.parse(body); } catch { return null; }
}

// ─── Platform definitions ────────────────────────────────────────────────────

interface Platform {
  name: string;
  category: string;
  profileUrl: string;
  check: (email: string) => Promise<boolean | null>;
}

const PLATFORMS: Platform[] = [
  // ── Auth / Accounts ──────────────────────────────────────────────────────
  {
    name: "Firefox (Mozilla)",
    category: "Аккаунты",
    profileUrl: "https://accounts.firefox.com",
    check: async (email) => {
      const r = await req(
        `https://api.accounts.firefox.com/v1/account/status?email=${encodeURIComponent(email)}`
      );
      if (!r) return null;
      const j = parseJson(r.body);
      return j?.exists === true;
    },
  },
  {
    name: "Gravatar",
    category: "Аккаунты",
    profileUrl: "https://gravatar.com",
    check: async (email) => {
      const r = await req(`https://en.gravatar.com/${md5(email)}.json`);
      if (!r) return null;
      return r.status === 200;
    },
  },
  {
    name: "LastPass",
    category: "Аккаунты",
    profileUrl: "https://lastpass.com",
    check: async (email) => {
      const r = await req("https://lastpass.com/iterations.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `email=${encodeURIComponent(email)}`,
      });
      if (!r) return null;
      const n = parseInt(r.body.trim(), 10);
      if (isNaN(n)) return null;
      return n > 1; // 1 = not found; high number = real account
    },
  },
  {
    name: "Proton Mail",
    category: "Email",
    profileUrl: "https://proton.me",
    check: async (email) => {
      const r = await req(
        `https://account.proton.me/api/core/v4/users?Email=${encodeURIComponent(email)}`,
        {
          headers: {
            "x-pm-apiversion": "3",
            "x-pm-appversion": "Other",
            Accept: "application/json",
          },
        }
      );
      if (!r) return null;
      const j = parseJson(r.body);
      return j?.Code === 2000;
    },
  },

  // ── Music / Entertainment ────────────────────────────────────────────────
  {
    name: "Spotify",
    category: "Музыка",
    profileUrl: "https://spotify.com",
    check: async (email) => {
      const r = await req(
        `https://spclient.wg.spotify.com/signup/public/v1/account?validate=1` +
          `&email=${encodeURIComponent(email)}&displayname=test&collect_personal_info=undefined`
      );
      if (!r) return null;
      const j = parseJson(r.body);
      // status 1 = email taken, 20 = available
      if (j?.status === 1) return true;
      if (j?.status === 20) return false;
      return null;
    },
  },

  // ── Design / Creative ────────────────────────────────────────────────────
  {
    name: "Adobe",
    category: "Дизайн",
    profileUrl: "https://adobe.com",
    check: async (email) => {
      const r = await req(
        "https://auth.services.adobe.com/renga-idprovider/api/v4/providers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email }),
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return Array.isArray(j?.providers) && j.providers.length > 0;
    },
  },

  // ── Social ───────────────────────────────────────────────────────────────
  {
    name: "Pinterest",
    category: "Социальные",
    profileUrl: "https://pinterest.com",
    check: async (email) => {
      const data = encodeURIComponent(JSON.stringify({ options: { email } }));
      const r = await req(
        `https://www.pinterest.com/resource/UserEmailExistsResource/get/?source_url=/&data=${data}&module_path=App()`,
        { headers: { "X-Requested-With": "XMLHttpRequest" } }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.resource_response?.data?.exists === true;
    },
  },
  {
    name: "Tumblr",
    category: "Блоги",
    profileUrl: "https://tumblr.com",
    check: async (email) => {
      const r = await req(
        `https://www.tumblr.com/ident/check/email?email=${encodeURIComponent(email)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.taken === true;
    },
  },
  {
    name: "Twitter/X",
    category: "Социальные",
    profileUrl: "https://x.com",
    check: async (email) => {
      const r = await req(
        `https://api.twitter.com/i/users/email_available.json?email=${encodeURIComponent(email)}`
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      if (!j) return null;
      // valid=false + status="failed" means email is taken
      return j.valid === false && j.status === "failed";
    },
  },
  {
    name: "Reddit",
    category: "Форумы",
    profileUrl: "https://reddit.com",
    check: async (email) => {
      const r = await req("https://www.reddit.com/api/forgot_password", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `email=${encodeURIComponent(email)}`,
      });
      if (!r || r.status === 429) return null;
      const j = parseJson(r.body);
      if (!j) return r.status === 200;
      // Reddit returns {success: true} regardless for privacy, check errors
      return j.success === true;
    },
  },
  {
    name: "Snapchat",
    category: "Социальные",
    profileUrl: "https://snapchat.com",
    check: async (email) => {
      const r = await req(
        "https://accounts.snapchat.com/accounts/send_confirmation_link",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `email=${encodeURIComponent(email)}&verificationMethod=EMAIL_OTP`,
        }
      );
      if (!r || r.status === 429) return null;
      return r.status === 200;
    },
  },
  {
    name: "Quora",
    category: "Знания",
    profileUrl: "https://quora.com",
    check: async (email) => {
      const r = await req(
        "https://www.quora.com/api/auth/authenticate_flow",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `login=${encodeURIComponent(email)}&remember_me=1`,
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      if (!j) return null;
      return j.error_code !== 2 && j.user != null;
    },
  },

  // ── Developer ────────────────────────────────────────────────────────────
  {
    name: "GitHub",
    category: "Разработка",
    profileUrl: "https://github.com",
    check: async (email) => {
      const r = await req(
        `https://github.com/signup_check/email?value=${encodeURIComponent(email)}`
      );
      if (!r || r.status === 429 || r.status === 403) return null;
      // If taken → body contains "Email is already taken"
      return r.body.toLowerCase().includes("already") || r.body.toLowerCase().includes("taken");
    },
  },
  {
    name: "GitLab",
    category: "Разработка",
    profileUrl: "https://gitlab.com",
    check: async (email) => {
      const r = await req(
        `https://gitlab.com/api/v4/users?search=${encodeURIComponent(email)}`
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return Array.isArray(j) && j.some((u: any) => u.public_email === email);
    },
  },

  // ── Gaming ───────────────────────────────────────────────────────────────
  {
    name: "Steam",
    category: "Игры",
    profileUrl: "https://store.steampowered.com",
    check: async (email) => {
      const r = await req(
        "https://store.steampowered.com/join/checkavail/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `email=${encodeURIComponent(email)}&count=1`,
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.bAvail === false;
    },
  },

  // ── Cloud / Storage ──────────────────────────────────────────────────────
  {
    name: "Dropbox",
    category: "Облако",
    profileUrl: "https://dropbox.com",
    check: async (email) => {
      const r = await req(
        "https://www.dropbox.com/forgot",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `email=${encodeURIComponent(email)}`,
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      return (
        r.status === 200 &&
        !r.body.includes("No account found") &&
        !r.body.includes("не найдено")
      );
    },
  },

  // ── Streaming ────────────────────────────────────────────────────────────
  {
    name: "Netflix",
    category: "Стриминг",
    profileUrl: "https://netflix.com",
    check: async (email) => {
      const r = await req(
        "https://www.netflix.com/api/shakti/undefined/passwordsavecheck",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.isKnownEmail === true;
    },
  },

  // ── Blogs / CMS ──────────────────────────────────────────────────────────
  {
    name: "WordPress.com",
    category: "Блоги",
    profileUrl: "https://wordpress.com",
    check: async (email) => {
      const r = await req(
        "https://wordpress.com/wp-login.php?action=lostpassword",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `user_login=${encodeURIComponent(email)}&redirect_to=&wp-submit=Get+New+Password`,
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const lower = r.body.toLowerCase();
      return (
        !lower.includes("no user") &&
        !lower.includes("not registered") &&
        !lower.includes("no account")
      );
    },
  },

  // ── Russian services ─────────────────────────────────────────────────────
  {
    name: "VK",
    category: "Социальные (RU)",
    profileUrl: "https://vk.com",
    check: async (email) => {
      const r = await req("https://vk.com/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `act=reset_pass&email=${encodeURIComponent(email)}`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const lower = r.body.toLowerCase();
      return !lower.includes("not found") && !lower.includes("не найден");
    },
  },
  {
    name: "Mail.ru",
    category: "Социальные (RU)",
    profileUrl: "https://mail.ru",
    check: async (email) => {
      const r = await req("https://auth.mail.ru/cgi-bin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `username=${encodeURIComponent(email)}&password=_probe_pass_&save_auth=0&lang=ru`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const lower = r.body.toLowerCase();
      // "invalid_password" → account exists; "not_registered" → does not
      return lower.includes("invalid_password") || lower.includes("wrong_password");
    },
  },
  {
    name: "Yandex",
    category: "Социальные (RU)",
    profileUrl: "https://yandex.ru",
    check: async (email) => {
      const r = await req(
        `https://registration.yandex.ru/suggest-login/?login=${encodeURIComponent(email.split("@")[0])}&retpath=`,
        { headers: { Accept: "application/json" } }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.available === false;
    },
  },

  // ── Photo ────────────────────────────────────────────────────────────────
  {
    name: "Flickr",
    category: "Фото",
    profileUrl: "https://flickr.com",
    check: async (email) => {
      const r = await req(
        "https://www.flickr.com/account/connect/check_email/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `email=${encodeURIComponent(email)}`,
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.stat === "fail" && j?.code === 4;
    },
  },
  {
    name: "500px",
    category: "Фото",
    profileUrl: "https://500px.com",
    check: async (email) => {
      const r = await req(
        `https://api.500px.com/v1/users/validate_email?email=${encodeURIComponent(email)}`
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.used === true;
    },
  },

  // ── Gaming / Communities ─────────────────────────────────────────────────
  {
    name: "Duolingo",
    category: "Образование",
    profileUrl: "https://duolingo.com",
    check: async (email) => {
      const r = await req(
        `https://www.duolingo.com/2017-06-30/users?email=${encodeURIComponent(email)}`
      );
      if (!r) return null;
      const j = parseJson(r.body);
      return Array.isArray(j?.users) && j.users.length > 0;
    },
  },
  {
    name: "Chess.com",
    category: "Игры",
    profileUrl: "https://chess.com",
    check: async (email) => {
      const r = await req(
        `https://www.chess.com/callback/user/exists?email=${encodeURIComponent(email)}`
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.userExists === true;
    },
  },

  // ── Commerce / Freelance ─────────────────────────────────────────────────
  {
    name: "Patreon",
    category: "Донаты",
    profileUrl: "https://patreon.com",
    check: async (email) => {
      const r = await req(
        "https://www.patreon.com/api/auth?include=user&fields[user]=email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { type: "user", attributes: { email, password: "_probe_" } } }),
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.errors?.some((e: any) => e.code_name === "wrong_password") === true;
    },
  },
  {
    name: "Fiverr",
    category: "Фриланс",
    profileUrl: "https://fiverr.com",
    check: async (email) => {
      const r = await req(
        "https://www.fiverr.com/users/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ username_or_email: email, password: "_probe_pass_" }),
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const lower = r.body.toLowerCase();
      return lower.includes("wrong password") || lower.includes("incorrect password");
    },
  },

  // ── Misc ─────────────────────────────────────────────────────────────────
  {
    name: "Keybase",
    category: "Безопасность",
    profileUrl: "https://keybase.io",
    check: async (email) => {
      const r = await req(
        `https://keybase.io/_/api/1.0/user/lookup.json?email=${encodeURIComponent(email)}&fields=basics`
      );
      if (!r) return null;
      const j = parseJson(r.body);
      return j?.status?.code === 0 && j?.them?.length > 0;
    },
  },
  {
    name: "Gravatar (URL)",
    category: "Аватары",
    profileUrl: "https://gravatar.com",
    check: async (email) => {
      const hash = md5(email);
      const r = await req(`https://www.gravatar.com/avatar/${hash}?d=404&size=1`);
      if (!r) return null;
      return r.status === 200;
    },
  },

  // ── Мессенджеры ──────────────────────────────────────────────────────────
  {
    name: "Discord",
    category: "Мессенджеры",
    profileUrl: "https://discord.com",
    check: async (email) => {
      const r = await req("https://discord.com/api/v9/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "_Probe1!", username: "_probe_x_", consent: false }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return Array.isArray(j?.email) && j.email.some((e: string) =>
        e.toLowerCase().includes("already") || e.toLowerCase().includes("зарегистрирован")
      );
    },
  },
  {
    name: "Slack",
    category: "Рабочие",
    profileUrl: "https://slack.com",
    check: async (email) => {
      const r = await req("https://slack.com/api/auth.checkEmailAvailability", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `email=${encodeURIComponent(email)}`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.ok === true && j?.available === false;
    },
  },

  // ── Профессиональные ─────────────────────────────────────────────────────
  {
    name: "LinkedIn",
    category: "Профессиональные",
    profileUrl: "https://linkedin.com",
    check: async (email) => {
      const r = await req("https://www.linkedin.com/uas/login-submit", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `session_key=${encodeURIComponent(email)}&session_password=_probe_pass_1!`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const lower = r.body.toLowerCase();
      return lower.includes("wrong password") || lower.includes("incorrect");
    },
  },
  {
    name: "Upwork",
    category: "Фриланс",
    profileUrl: "https://upwork.com",
    check: async (email) => {
      const r = await req("https://www.upwork.com/ab/account-security/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: { username: email, password: "_Probe1!" } }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.error === "password_invalid" || j?.code === "INVALID_PASSWORD";
    },
  },

  // ── Видео / Стриминг ─────────────────────────────────────────────────────
  {
    name: "TikTok",
    category: "Видео",
    profileUrl: "https://tiktok.com",
    check: async (email) => {
      const r = await req(
        `https://www.tiktok.com/passport/email/verify_email/?email=${encodeURIComponent(email)}&type=0`,
        { headers: { Referer: "https://www.tiktok.com/signup" } }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.data?.is_registered === 1 || j?.data?.is_registered === true;
    },
  },
  {
    name: "Twitch",
    category: "Стриминг",
    profileUrl: "https://twitch.tv",
    check: async (email) => {
      const r = await req("https://passport.twitch.tv/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        },
        body: JSON.stringify({
          username: email,
          password: "_probe_pass_",
          client_id: "kimne78kx3ncx6brgo4mv6wki5h1ko",
        }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      // 3001 = wrong password (account exists), 3022 = no account
      return j?.error_code === 3001 || j?.error_code === 3002;
    },
  },
  {
    name: "Medium",
    category: "Блоги",
    profileUrl: "https://medium.com",
    check: async (email) => {
      const r = await req("https://medium.com/m/accounts/sign-in/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "_probe_pass_" }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return (
        j?.error === "INVALID_PASSWORD" ||
        (Array.isArray(j?.errors) && j.errors.some((e: any) => e.type === "INVALID_PASSWORD"))
      );
    },
  },

  // ── Соцсети (RU) ─────────────────────────────────────────────────────────
  {
    name: "OK.ru (Одноклассники)",
    category: "Социальные (RU)",
    profileUrl: "https://ok.ru",
    check: async (email) => {
      const r = await req("https://ok.ru/web-api/auth/v2/password-recovery/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return r.status === 200 && !j?.error;
    },
  },
  {
    name: "HH.ru (HeadHunter)",
    category: "Работа (RU)",
    profileUrl: "https://hh.ru",
    check: async (email) => {
      const r = await req("https://hh.ru/auth/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      return r.status === 200;
    },
  },
  {
    name: "Habr",
    category: "IT (RU)",
    profileUrl: "https://habr.com",
    check: async (email) => {
      const r = await req("https://account.habr.com/restapi/v1/users/exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.exists === true;
    },
  },

  // ── Знакомства ────────────────────────────────────────────────────────────
  {
    name: "Badoo",
    category: "Знакомства",
    profileUrl: "https://badoo.com",
    check: async (email) => {
      const r = await req("https://badoo.com/signin/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `email=${encodeURIComponent(email)}&password=_probe_pass_1!`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const lower = r.body.toLowerCase();
      return lower.includes("wrong password") || lower.includes("bad password");
    },
  },
  {
    name: "Mamba",
    category: "Знакомства",
    profileUrl: "https://mamba.ru",
    check: async (email) => {
      const r = await req("https://www.mamba.ru/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      return r.status === 200;
    },
  },

  // ── Маркетплейс ───────────────────────────────────────────────────────────
  {
    name: "Etsy",
    category: "Маркетплейс",
    profileUrl: "https://etsy.com",
    check: async (email) => {
      const r = await req("https://www.etsy.com/api/v3/ajax/member/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `email=${encodeURIComponent(email)}`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      return r.status === 200;
    },
  },
  {
    name: "eBay",
    category: "Маркетплейс",
    profileUrl: "https://ebay.com",
    check: async (email) => {
      const r = await req(
        `https://signin.ebay.com/ws/eBayISAPI.dll?ForgotUserNamePasswordOrEmail&email=${encodeURIComponent(email)}`
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const lower = r.body.toLowerCase();
      return (
        lower.includes("enter your new password") ||
        lower.includes("reset your password") ||
        lower.includes("an email has been sent")
      );
    },
  },
  {
    name: "Avito",
    category: "Маркетплейс (RU)",
    profileUrl: "https://avito.ru",
    check: async (email) => {
      const r = await req("https://www.avito.ru/api/1/account/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.status === "ok" || r.status === 200;
    },
  },

  // ── Конференции / Рабочие ─────────────────────────────────────────────────
  {
    name: "Zoom",
    category: "Конференции",
    profileUrl: "https://zoom.us",
    check: async (email) => {
      const r = await req("https://zoom.us/api/v1/forgot/password", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `email=${encodeURIComponent(email)}`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.status !== false && r.status === 200;
    },
  },

  // ── Музыка ───────────────────────────────────────────────────────────────
  {
    name: "SoundCloud",
    category: "Музыка",
    profileUrl: "https://soundcloud.com",
    check: async (email) => {
      const r = await req("https://api.soundcloud.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `client_id=a3e059563d7fd3372b49b37f00a00bcf&grant_type=password&username=${encodeURIComponent(email)}&password=_probe_pass_`,
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.error === "invalid_grant";
    },
  },

  // ── Дизайн ───────────────────────────────────────────────────────────────
  {
    name: "Canva",
    category: "Дизайн",
    profileUrl: "https://canva.com",
    check: async (email) => {
      const r = await req("https://www.canva.com/api/login/v2/users/signup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.existingAccount === true || j?.status === "EXISTING_ACCOUNT";
    },
  },
  {
    name: "Figma",
    category: "Дизайн",
    profileUrl: "https://figma.com",
    check: async (email) => {
      const r = await req("https://www.figma.com/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "_probe_pass_1!" }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.err === "invalid_password" || j?.error === "invalid_password";
    },
  },

  // ── Образование ───────────────────────────────────────────────────────────
  {
    name: "Coursera",
    category: "Образование",
    profileUrl: "https://coursera.org",
    check: async (email) => {
      const r = await req(
        `https://www.coursera.org/api/loginActions.v1?email=${encodeURIComponent(email)}`
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.elements?.[0]?.registerType === "existing";
    },
  },

  // ── Крипто ───────────────────────────────────────────────────────────────
  {
    name: "Binance",
    category: "Крипто",
    profileUrl: "https://binance.com",
    check: async (email) => {
      const r = await req(
        "https://accounts.binance.com/bapi/composite/v1/public/account/email/exists",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.data === true || j?.data?.exists === true;
    },
  },
  {
    name: "OKX",
    category: "Крипто",
    profileUrl: "https://okx.com",
    check: async (email) => {
      const r = await req("https://www.okx.com/api/v1/account/users/email-exist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.data?.isExist === true;
    },
  },
  {
    name: "Bybit",
    category: "Крипто",
    profileUrl: "https://bybit.com",
    check: async (email) => {
      const r = await req("https://api.bybit.com/spot/api/account/isValid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r || r.status === 403 || r.status === 429) return null;
      const j = parseJson(r.body);
      return j?.result?.isValid === true || j?.retCode === 0;
    },
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

export async function checkEmail(
  email: string,
  onProgress?: (done: number, total: number) => void
): Promise<HoleheResult[]> {
  const results: HoleheResult[] = [];
  const BATCH = 5;

  for (let i = 0; i < PLATFORMS.length; i += BATCH) {
    const slice = PLATFORMS.slice(i, i + BATCH);
    const batch = await Promise.all(
      slice.map(async (p): Promise<HoleheResult> => ({
        name: p.name,
        category: p.category,
        found: await p.check(email),
        url: p.profileUrl,
      }))
    );
    results.push(...batch);
    if (onProgress) onProgress(Math.min(i + BATCH, PLATFORMS.length), PLATFORMS.length);
  }

  return results;
}

export const HOLEHE_TOTAL = PLATFORMS.length;
