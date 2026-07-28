/**
 * cameras.ts — Camera OSINT: Insecam open cams, RTSP ffmpeg snapshot, Windy Webcams API
 */
import { spawn } from "child_process";
import fetch from "node-fetch";
import https from "https";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { sleep, progressBar } from "./visual.js";
import type { Context } from "telegraf";
import {
  generateInsecamReport,
  generateRtspReport,
  generateWindyReport,
  sendHtmlReport,
} from "./report.js";

export interface CameraMethod {
  key: string;
  emoji: string;
  name: string;
  prompt: string;
  run: (ctx: Context, query: string, endMarkup?: any) => Promise<void>;
}

// ─── HTTP agents ─────────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36";

const noVerifyAgent = new https.Agent({ rejectUnauthorized: false });

async function safeFetch(
  url: string,
  opts: {
    headers?: Record<string, string>;
    timeout?: number;
    noVerify?: boolean;
  } = {}
): Promise<any> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeout ?? 10000);
    const res = await fetch(url, {
      signal: ctrl.signal as any,
      headers: { "User-Agent": UA, ...(opts.headers ?? {}) },
      agent: opts.noVerify ? noVerifyAgent : undefined,
    } as any);
    clearTimeout(t);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

// ─── Progress animation ───────────────────────────────────────────────────────

async function animStages(
  ctx: Context,
  chatId: number,
  msgId: number,
  header: string,
  stages: { label: string; pct: number; delay: number }[]
) {
  for (const s of stages) {
    try {
      await ctx.telegram.editMessageText(
        chatId,
        msgId,
        undefined,
        `${header}\n\n<code>▸ ${s.label}</code>\n\n<code>[${progressBar(s.pct, 100, 18)}] ${s.pct}%</code>`,
        { parse_mode: "HTML" }
      );
    } catch {}
    await sleep(s.delay);
  }
}

// ─── RTSP Screenshot via ffmpeg ───────────────────────────────────────────────

async function captureRtsp(rtspUrl: string): Promise<Buffer | null> {
  const tmpFile = path.join(
    os.tmpdir(),
    `rtsp_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  );

  return new Promise((resolve) => {
    const proc = spawn(
      "ffmpeg",
      [
        "-rtsp_transport", "tcp",
        "-timeout",        "10000000",
        "-i",              rtspUrl,
        "-vframes",        "1",
        "-q:v",            "2",
        "-f",              "image2",
        tmpFile,
        "-y",
      ],
      { stdio: "ignore" }
    );

    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (ok) {
        try {
          const buf = fs.readFileSync(tmpFile);
          fs.unlinkSync(tmpFile);
          resolve(buf.length > 0 ? buf : null);
        } catch {
          resolve(null);
        }
      } else {
        try { fs.unlinkSync(tmpFile); } catch {}
        resolve(null);
      }
    };

    proc.on("close", (code) => done(code === 0));
    proc.on("error", () => done(false));
    setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} done(false); }, 13000);
  });
}

// ─── Insecam scraper ──────────────────────────────────────────────────────────

const COUNTRY_MAP: Record<string, string> = {
  ru: "RU", russia: "RU", россия: "RU",
  us: "US", usa: "US", "united states": "US", сша: "US",
  de: "DE", germany: "DE", германия: "DE",
  jp: "JP", japan: "JP", япония: "JP",
  cn: "CN", china: "CN", китай: "CN",
  ua: "UA", ukraine: "UA", украина: "UA",
  gb: "GB", uk: "GB", britain: "GB",
  fr: "FR", france: "FR", франция: "FR",
  it: "IT", italy: "IT", италия: "IT",
  kr: "KR", korea: "KR", корея: "KR",
  br: "BR", brazil: "BR", бразилия: "BR",
  ca: "CA", canada: "CA", канада: "CA",
  se: "SE", sweden: "SE", швеция: "SE",
  nl: "NL", netherlands: "NL", нидерланды: "NL",
  pl: "PL", poland: "PL", польша: "PL",
  es: "ES", spain: "ES", испания: "ES",
  tr: "TR", turkey: "TR", турция: "TR",
  kz: "KZ", kazakhstan: "KZ", казахстан: "KZ",
  th: "TH", thailand: "TH", таиланд: "TH",
  in: "IN", india: "IN", индия: "IN",
};

interface InsecamCam { id: string; viewUrl: string; }

async function scrapeInsecam(input: string): Promise<InsecamCam[]> {
  const key = input.trim().toLowerCase();
  const code = COUNTRY_MAP[key] ?? (key.length === 2 ? key.toUpperCase() : null);

  const url = code
    ? `https://www.insecam.org/en/bycountry/${code}/`
    : `https://www.insecam.org/en/search/?q=${encodeURIComponent(input)}`;

  const html = await safeFetch(url, {
    noVerify: true,
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.insecam.org/",
    },
  });

  if (!html || typeof html !== "string") return [];

  const cams: InsecamCam[] = [];
  const seen = new Set<string>();
  const re = /href="(\/en\/view\/(\d+)\/?)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && cams.length < 10) {
    if (!seen.has(m[2])) {
      seen.add(m[2]);
      cams.push({ viewUrl: `https://www.insecam.org${m[1]}`, id: m[2] });
    }
  }
  return cams;
}

// ─── Windy Webcams ────────────────────────────────────────────────────────────

async function geocodeCity(
  city: string
): Promise<{ lat: number; lon: number; display: string } | null> {
  const data = await safeFetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
    { headers: { "Accept-Language": "ru,en;q=0.8" } }
  );
  if (!Array.isArray(data) || !data.length) return null;
  const r = data[0];
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    display: (r.display_name as string).split(",").slice(0, 2).join(", "),
  };
}

async function fetchWindyWebcams(lat: number, lon: number): Promise<any[]> {
  const key = process.env["WINDY_API_KEY"];
  if (!key) return [];
  const data = await safeFetch(
    `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lon},50&limit=10&include=location,urls,images&lang=ru`,
    { headers: { "x-windy-api-key": key } }
  );
  if (!data || typeof data !== "object" || !Array.isArray(data.webcams)) return [];
  return data.webcams;
}

// ─── Camera OSINT Methods ─────────────────────────────────────────────────────

export const CAMERA_METHODS: CameraMethod[] = [

  // ── 1. Insecam ─────────────────────────────────────────────────────────────
  {
    key: "insecam",
    emoji: "●",
    name: "Insecam — открытые камеры",
    prompt:
      "Введи код страны для поиска открытых камер:\n\n" +
      "<code>RU</code>  Россия     <code>US</code>  США\n" +
      "<code>DE</code>  Германия   <code>JP</code>  Япония\n" +
      "<code>CN</code>  Китай      <code>UA</code>  Украина\n" +
      "<code>TR</code>  Турция     <code>TH</code>  Таиланд\n" +
      "<code>GB</code>  Британия   <code>IN</code>  Индия",
    run: async (ctx, query, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `● <b>INSECAM — ОТКРЫТЫЕ КАМЕРЫ</b>\n◎ Страна: <code>${query.toUpperCase()}</code>`;
      const msg = await ctx.reply(
        `${header}\n\n<code>▸ Инициализация сканирования...</code>\n\n<code>[${progressBar(0, 100, 18)}] 0%</code>`,
        { parse_mode: "HTML" }
      );

      const scrapePromise = scrapeInsecam(query);

      await animStages(ctx, chatId, msg.message_id, header, [
        { label: "Подключение к insecam.org (TLS bypass)...", pct: 15, delay: 700 },
        { label: "Загрузка страницы с камерами...", pct: 40, delay: 800 },
        { label: "Парсинг IP-камер без авторизации...", pct: 65, delay: 900 },
        { label: "Фильтрация результатов...", pct: 85, delay: 600 },
        { label: "Готово", pct: 100, delay: 300 },
      ]);

      const cams = await scrapePromise;

      if (!cams.length) {
        await ctx.telegram.editMessageText(
          chatId, msg.message_id, undefined,
          `${header}\n\n` +
          `✗ <b>Камеры не найдены.</b>\n\n` +
          `<i>Попробуй: RU, US, DE, JP, CN, UA, TR, TH</i>`,
          { parse_mode: "HTML", ...(endMarkup ?? {}) }
        );
        return;
      }

      await ctx.telegram.editMessageText(
        chatId, msg.message_id, undefined,
        `● <b>INSECAM — Найдено ${cams.length} камер</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        cams.map((c, i) => `${i + 1}. ▸ <a href="${c.viewUrl}">Камера #${c.id}</a>`).join("\n") +
        `\n\n<i>Генерация HTML-отчёта...</i>`,
        { parse_mode: "HTML", disable_web_page_preview: true, ...(endMarkup ?? {})} as any
      );

      const html = generateInsecamReport(cams, query);
      const filename = `insecam_${query.toUpperCase()}_${Date.now()}.html`;
      await sendHtmlReport(ctx, html, filename);
    },
  },

  // ── 2. RTSP Screenshot ────────────────────────────────────────────────────
  {
    key: "rtsp",
    emoji: "○",
    name: "RTSP Снимок (ffmpeg)",
    prompt:
      "Введи RTSP-адрес IP-камеры:\n\n" +
      "<code>rtsp://192.168.1.1:554/live</code>\n" +
      "<code>rtsp://user:pass@host:554/stream</code>\n\n" +
      "[i] Захват занимает до 15 секунд.",
    run: async (ctx, query, endMarkup) => {
      const chatId = ctx.chat!.id;
      const url = query.trim();

      if (!url.startsWith("rtsp://") && !url.startsWith("rtsps://")) {
        await ctx.reply(
          `✗ <b>Неверный формат.</b>\nURL должен начинаться с <code>rtsp://</code>`,
          { parse_mode: "HTML" }
        );
        return;
      }

      const displayUrl = url.replace(/:\/\/([^@]+)@/, "://***:***@");
      const short = displayUrl.length > 55 ? displayUrl.slice(0, 55) + "…" : displayUrl;
      const header = `○ <b>RTSP SNAPSHOT</b>\n◎ <code>${short}</code>`;

      const msg = await ctx.reply(
        `${header}\n\n<code>▸ Подключение к камере...</code>\n\n<code>[${progressBar(0, 100, 18)}] 0%</code>`,
        { parse_mode: "HTML" }
      );

      const capturePromise = captureRtsp(url);

      await animStages(ctx, chatId, msg.message_id, header, [
        { label: "TCP handshake с камерой...",        pct: 18, delay: 1100 },
        { label: "RTSP DESCRIBE / SETUP...",          pct: 38, delay: 1200 },
        { label: "Получение видеопотока...",          pct: 60, delay: 1100 },
        { label: "Декодирование первого кадра...",    pct: 82, delay: 900  },
        { label: "Сохранение JPEG...",                pct: 95, delay: 500  },
      ]);

      const imgBuf = await capturePromise;
      const success = imgBuf !== null;

      if (!success) {
        await ctx.telegram.editMessageText(
          chatId, msg.message_id, undefined,
          `${header}\n\n✗ <b>Не удалось захватить кадр.</b>\n\n` +
          `<i>▸ Камера недоступна / закрыта файрволом\n` +
          `▸ Неверный логин/пароль\n` +
          `▸ Тайм-аут (>13с)\n` +
          `▸ Неподдерживаемый кодек</i>`,
          { parse_mode: "HTML", ...(endMarkup ?? {}) }
        );
      } else {
        await ctx.telegram.editMessageText(
          chatId, msg.message_id, undefined,
          `${header}\n\n<code>[${progressBar(100, 100, 18)}] 100%</code>\n\n✓ <b>Кадр захвачен — отправляю...</b>`,
          { parse_mode: "HTML" }
        );

        await ctx.replyWithPhoto(
          { source: imgBuf! },
          {
            caption:
              `○ <b>RTSP Snapshot</b>\n` +
              `◎ <code>${short}</code>\n\n` +
              `<code>✓ ffmpeg — кадр захвачен</code>`,
            parse_mode: "HTML",
            ...(endMarkup ?? {}),
          } as any
        );
      }

      await sleep(300);
      const html = generateRtspReport(imgBuf, url);
      const filename = `rtsp_report_${Date.now()}.html`;
      await sendHtmlReport(ctx, html, filename);
    },
  },

  // ── 3. Windy Webcams ──────────────────────────────────────────────────────
  {
    key: "windy",
    emoji: "◎",
    name: "Windy Webcams",
    prompt:
      "Введи название города или страны:\n\n" +
      "<code>Москва</code> / <code>Paris</code> / <code>Tokyo</code> / <code>Dubai</code>",
    run: async (ctx, query, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◎ <b>WINDY WEBCAMS</b>\n◎ <code>${query}</code>`;
      const msg = await ctx.reply(
        `${header}\n\n<code>▸ Геокодирование...</code>`,
        { parse_mode: "HTML" }
      );

      if (!process.env["WINDY_API_KEY"]) {
        await ctx.telegram.editMessageText(
          chatId, msg.message_id, undefined,
          `${header}\n\n✗ <b>WINDY_API_KEY не задан.</b>\n\n` +
          `Добавь секрет <code>WINDY_API_KEY</code> в Replit Secrets.\n` +
          `Ключ: <a href="https://api.windy.com/keys">api.windy.com/keys</a>`,
          { parse_mode: "HTML", disable_web_page_preview: true, ...(endMarkup ?? {})} as any
        );
        return;
      }

      const geoPromise = geocodeCity(query);

      await animStages(ctx, chatId, msg.message_id, header, [
        { label: "Геокодирование через Nominatim...", pct: 20, delay: 700 },
        { label: "Запрос Windy Webcams API v3...",   pct: 55, delay: 800 },
        { label: "Обработка данных камер...",         pct: 85, delay: 600 },
        { label: "Готово",                            pct: 100, delay: 300 },
      ]);

      const geo = await geoPromise;

      if (!geo) {
        await ctx.telegram.editMessageText(
          chatId, msg.message_id, undefined,
          `${header}\n\n✗ <b>Локация не найдена.</b>\nПроверь название и попробуй снова.`,
          { parse_mode: "HTML", ...(endMarkup ?? {}) }
        );
        return;
      }

      const webcams = await fetchWindyWebcams(geo.lat, geo.lon);

      if (!webcams.length) {
        await ctx.telegram.editMessageText(
          chatId, msg.message_id, undefined,
          `${header}\n\n▸ <b>${geo.display}</b>\n\n✗ <b>Камеры не найдены в радиусе 50 км.</b>`,
          { parse_mode: "HTML", ...(endMarkup ?? {}) }
        );
        return;
      }

      await ctx.telegram.editMessageText(
        chatId, msg.message_id, undefined,
        `◎ <b>WINDY WEBCAMS — ${webcams.length} камер</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `▸ <b>${geo.display}</b>\n\n` +
        webcams.slice(0, 8).map((w, i) => {
          const viewUrl = w.urls?.detail ?? `https://windy.com/webcams/${w.webcamId}`;
          return `${i + 1}. ▸ <a href="${viewUrl}">${w.title ?? `Webcam ${i + 1}`}</a>`;
        }).join("\n") +
        (webcams.length > 8 ? `\n<i>...и ещё ${webcams.length - 8}</i>` : "") +
        `\n\n<i>Генерация HTML-отчёта...</i>`,
        { parse_mode: "HTML", disable_web_page_preview: true, ...(endMarkup ?? {})} as any
      );

      const html = generateWindyReport(webcams, geo, query);
      const filename = `windy_${query.replace(/\s+/g, "_")}_${Date.now()}.html`;
      await sendHtmlReport(ctx, html, filename);
    },
  },
];

export const CAMERA_MAP: Record<string, CameraMethod> = Object.fromEntries(
  CAMERA_METHODS.map((m) => [m.key, m])
);
