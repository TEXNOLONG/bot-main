// ─── ИНСТРУМЕНТЫ — визуальные методы ─────────────────────────────────────────
import { progressBar, sleep, fakeEmail, fakeIP, fakeToken, fakeMac, fakePassword, fakeHash, fakeUserAgent, FAKE_CITIES } from "./visual.js";
import type { Context } from "telegraf";

export interface Tool {
  key: string;
  emoji: string;
  name: string;
  prompt: string;
  run: (ctx: Context, target: string, endMarkup?: any) => Promise<void>;
}

async function animProg(
  ctx: Context,
  chatId: number,
  msgId: number,
  header: string,
  stages: { label: string; pct: number; delay: number }[]
) {
  for (const s of stages) {
    const bar = progressBar(s.pct, 100, 18);
    try {
      await ctx.telegram.editMessageText(
        chatId, msgId, undefined,
        `${header}\n\n<code>▸ ${s.label}</code>\n\n<code>[${bar}] ${s.pct}%</code>`,
        { parse_mode: "HTML" }
      );
    } catch {}
    await sleep(s.delay);
  }
}

export const TOOLS: Tool[] = [
  {
    key: "email",
    emoji: "▣",
    name: "Email Bomber",
    prompt: "Введи целевой Email:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▣ <b>EMAIL BOMBER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Инициализация...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Загрузка SMTP-серверов...", pct: 10, delay: 800 },
        { label: "Генерация шаблонов писем...", pct: 25, delay: 700 },
        { label: "Подключение к прокси-цепочке...", pct: 42, delay: 900 },
        { label: "Запуск бомбардировки...", pct: 62, delay: 1000 },
        { label: "Обход спам-фильтров...", pct: 80, delay: 800 },
        { label: "Финальный залп...", pct: 95, delay: 700 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      const count = 500 + Math.floor(Math.random() * 4500);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `▣ <b>EMAIL BOMBER — ГОТОВО</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `▸ Отправлено: <b>${count.toLocaleString()}</b>\n` +
        `✓ Доставлено: <b>${Math.floor(count * 0.87).toLocaleString()}</b>\n` +
        `✗ Отклонено: <b>${Math.floor(count * 0.13).toLocaleString()}</b>\n` +
        `◈ SMTP-шлюзов: <b>${2 + Math.floor(Math.random() * 8)}</b>\n` +
        `◆ Время: <b>${(1.2 + Math.random() * 3).toFixed(1)}с</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Почтовый ящик перегружен</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "cookie",
    emoji: "◆",
    name: "Cookie Stealer",
    prompt: "Введи URL сайта или email жертвы:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◆ <b>COOKIE STEALER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка атаки...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Внедрение XSS-пейлоада...", pct: 12, delay: 900 },
        { label: "Активация MITM-перехвата...", pct: 30, delay: 800 },
        { label: "Сбор Cookie-файлов...", pct: 52, delay: 1100 },
        { label: "Парсинг сессионных токенов...", pct: 72, delay: 900 },
        { label: "Расшифровка данных...", pct: 90, delay: 700 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◆ <b>COOKIE STEALER — УСПЕХ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n\n` +
        `<b>▸ Перехваченные данные:</b>\n` +
        `<code>session_id=${fakeToken().slice(0, 32)}</code>\n` +
        `<code>auth_token=${fakeToken().slice(0, 24)}</code>\n` +
        `<code>csrf_token=${fakeToken().slice(0, 16)}</code>\n` +
        `<code>user_id=${Math.floor(Math.random() * 9999999)}</code>\n\n` +
        `◇ Доступ: <b>Получен</b>\n` +
        `◉ Аккаунтов: <b>${1 + Math.floor(Math.random() * 5)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Куки успешно перехвачены</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "session",
    emoji: "◇",
    name: "Session Grabber",
    prompt: "Введи username или email цели:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◇ <b>SESSION GRABBER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Поиск сессий...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Сканирование WebSocket-каналов...", pct: 15, delay: 800 },
        { label: "Перехват HTTP-трафика...", pct: 35, delay: 900 },
        { label: "Извлечение Bearer-токенов...", pct: 58, delay: 1000 },
        { label: "Валидация сессий...", pct: 78, delay: 800 },
        { label: "Клонирование...", pct: 95, delay: 700 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      const platforms = ["Telegram", "VK", "Steam", "Discord", "Google"];
      const cnt = 1 + Math.floor(Math.random() * 3);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◇ <b>SESSION GRABBER — УСПЕХ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n\n` +
        `<b>▸ Активные сессии (${cnt}):</b>\n` +
        platforms.slice(0, cnt).map((p, i) =>
          `${i + 1}. <b>${p}</b>\n   <code>${fakeToken().slice(0, 28)}...</code>`
        ).join("\n") + "\n\n" +
        `◈ IP: <code>${fakeIP()}</code>\n` +
        `▣ MAC: <code>${fakeMac()}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Сессии клонированы</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "brute",
    emoji: "⊕",
    name: "Brute Force",
    prompt: "Введи username/email для брута:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `⊕ <b>BRUTE FORCE</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Загрузка словаря...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Загрузка базы паролей (2.7M)...", pct: 8, delay: 700 },
        { label: "Запуск перебора...", pct: 25, delay: 800 },
        { label: "Проверено: 150,000 комбинаций...", pct: 45, delay: 900 },
        { label: "Проверено: 890,000 комбинаций...", pct: 65, delay: 1000 },
        { label: "Совпадение найдено! Верификация...", pct: 88, delay: 800 },
        { label: "Подтверждение доступа...", pct: 100, delay: 600 },
      ]);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `⊕ <b>BRUTE FORCE — ВЗЛОМАН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n\n` +
        `<b>◇ Пароль найден:</b>\n<code>${fakePassword()}</code>\n\n` +
        `▸ Проверено: <b>${(1200000 + Math.floor(Math.random() * 1500000)).toLocaleString()}</b>\n` +
        `◆ Время: <b>${(8 + Math.random() * 22).toFixed(1)}с</b>\n` +
        `◈ Скорость: <b>${(80000 + Math.floor(Math.random() * 120000)).toLocaleString()} п/с</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Доступ получен</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "waf",
    emoji: "◇",
    name: "WAF Bypass",
    prompt: "Введи URL целевого сайта:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◇ <b>WAF BYPASS</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Анализ защиты...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Fingerprint WAF-системы...", pct: 15, delay: 800 },
        { label: "Генерация bypass-пейлоадов...", pct: 32, delay: 900 },
        { label: "Тестирование векторов обхода...", pct: 52, delay: 1100 },
        { label: "Обход Cloudflare...", pct: 70, delay: 1000 },
        { label: "Инъекция SQL-пейлоада...", pct: 87, delay: 800 },
        { label: "Экфильтрация данных...", pct: 100, delay: 600 },
      ]);
      const waf = ["Cloudflare", "AWS WAF", "ModSecurity", "Imperva"][Math.floor(Math.random() * 4)];
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◇ <b>WAF BYPASS — ПРОБИТ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `◈ WAF: <b>${waf}</b>\n` +
        `▸ Вектор: <code>Unicode-encode + chunked transfer</code>\n\n` +
        `<b>▸ Данные из БД:</b>\n` +
        `<code>admin | ${fakeEmail()} | ${fakeHash()}</code>\n` +
        `<code>user  | ${fakeEmail()} | ${fakeHash()}</code>\n\n` +
        `▣ Таблиц: <b>${3 + Math.floor(Math.random() * 10)}</b>\n` +
        `◆ Записей: <b>${100 + Math.floor(Math.random() * 900)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>WAF обойден</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "hash",
    emoji: "◈",
    name: "Hash Cracker",
    prompt: "Введи MD5/SHA хэш для расшифровки:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◈ <b>HASH CRACKER</b>\n◎ Хэш: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Анализ хэша...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Определение алгоритма...", pct: 12, delay: 700 },
        { label: "Поиск в Rainbow Tables...", pct: 32, delay: 900 },
        { label: "Brute-force атака...", pct: 54, delay: 1100 },
        { label: "Dictionary attack...", pct: 74, delay: 900 },
        { label: "Совпадение найдено!", pct: 94, delay: 700 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      const algo = target.length === 32 ? "MD5" : target.length === 40 ? "SHA-1" : target.length === 64 ? "SHA-256" : "SHA-512";
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◈ <b>HASH CRACKER — ВЗЛОМАН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `▸ Хэш: <code>${target.slice(0, 20)}...</code>\n` +
        `◆ Алгоритм: <b>${algo}</b>\n\n` +
        `<b>◇ Исходный текст:</b>\n<code>${fakePassword()}</code>\n\n` +
        `◈ Метод: <b>Rainbow Table + Dict</b>\n` +
        `◆ Время: <b>${(0.3 + Math.random() * 4).toFixed(2)}с</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Хэш расшифрован</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "sniffer",
    emoji: "◈",
    name: "Net Sniffer",
    prompt: "Введи IP-адрес или диапазон сети (напр. 192.168.1.0/24):",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◈ <b>NET SNIFFER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Запуск перехвата трафика...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "ARP-poisoning...", pct: 18, delay: 900 },
        { label: "Перехват пакетов...", pct: 40, delay: 1100 },
        { label: `Захвачено пакетов: ${Math.floor(Math.random() * 5000 + 1000)}`, pct: 60, delay: 1000 },
        { label: "Декодирование протоколов...", pct: 78, delay: 800 },
        { label: "Извлечение credentials...", pct: 94, delay: 700 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◈ <b>NET SNIFFER — ПЕРЕХВАТ ВЫПОЛНЕН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Сеть: <code>${target}</code>\n` +
        `▸ Пакетов: <b>${(5000 + Math.floor(Math.random() * 45000)).toLocaleString()}</b>\n\n` +
        `<b>▸ Перехваченные credentials:</b>\n` +
        `<code>FTP  → ${fakeEmail()}:${fakePassword()}</code>\n` +
        `<code>HTTP → ${fakeEmail()}:${fakePassword()}</code>\n\n` +
        `<b>▸ Активные хосты:</b>\n` +
        Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => `  <code>${fakeIP()}</code>`).join("\n") + "\n" +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Сниффинг завершён</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "cloud",
    emoji: "○",
    name: "Cloud Bypass",
    prompt: "Введи домен или email (облачный аккаунт):",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `○ <b>CLOUD BYPASS</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Анализ облачной инфраструктуры...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Fingerprint облачного провайдера...", pct: 14, delay: 800 },
        { label: "Поиск открытых S3-бакетов...", pct: 30, delay: 900 },
        { label: "Перебор IAM-ролей...", pct: 50, delay: 1000 },
        { label: "Эксплойт SSRF уязвимости...", pct: 68, delay: 1100 },
        { label: "Получение IAM credentials...", pct: 85, delay: 900 },
        { label: "Готово", pct: 100, delay: 600 },
      ]);
      const cloud = ["AWS", "Google Cloud", "Azure", "Yandex Cloud"][Math.floor(Math.random() * 4)];
      const buckets = 2 + Math.floor(Math.random() * 5);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `○ <b>CLOUD BYPASS — ДОСТУП ПОЛУЧЕН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `◈ Провайдер: <b>${cloud}</b>\n\n` +
        `<b>▸ IAM Credentials:</b>\n` +
        `<code>AccessKey: AKIA${fakeToken().slice(0, 16).toUpperCase()}</code>\n` +
        `<code>SecretKey: ${fakeToken().slice(0, 32)}</code>\n\n` +
        `<b>▸ Открытые бакеты (${buckets}):</b>\n` +
        Array.from({ length: buckets }, (_, i) => `  <code>bucket-${i + 1}-${fakeHash().slice(0, 8)}</code>`).join("\n") + "\n" +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Облачный доступ получен</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  // ── NEW TOOLS ──────────────────────────────────────────────────────────────
  {
    key: "ddos",
    emoji: "◉",
    name: "DDoS Simulator",
    prompt: "Введи IP-адрес или домен цели:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◉ <b>DDoS SIMULATOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка атаки...</code>`, { parse_mode: "HTML" });
      const methods = ["UDP Flood", "SYN Flood", "HTTP Flood", "ICMP Flood", "Slowloris"];
      const method = methods[Math.floor(Math.random() * methods.length)];
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Набор ботнета (1337 узлов)...", pct: 10, delay: 900 },
        { label: "Синхронизация атакующих...", pct: 22, delay: 800 },
        { label: `Запуск ${method}...`, pct: 38, delay: 700 },
        { label: `Трафик: ${(1 + Math.random() * 9).toFixed(1)} Гбит/с`, pct: 55, delay: 1000 },
        { label: "Сервер перегружен...", pct: 72, delay: 900 },
        { label: "Обход CDN-защиты...", pct: 88, delay: 800 },
        { label: "Цель недоступна", pct: 100, delay: 600 },
      ]);
      const bots = 800 + Math.floor(Math.random() * 3200);
      const gbps = (2 + Math.random() * 18).toFixed(2);
      const rps = (50000 + Math.floor(Math.random() * 950000)).toLocaleString();
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◉ <b>DDoS — ЦЕЛЬ НЕДОСТУПНА</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `◆ Метод: <b>${method}</b>\n\n` +
        `<b>▸ Статистика атаки:</b>\n` +
        `▣ Ботов в атаке: <b>${bots.toLocaleString()}</b>\n` +
        `◈ Трафик: <b>${gbps} Гбит/с</b>\n` +
        `◆ Запросов/сек: <b>${rps}</b>\n` +
        `✗ Статус цели: <b>DOWN (503)</b>\n` +
        `◉ Пинг: <b>timeout</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Сервер недоступен</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "phishing",
    emoji: "▶",
    name: "Phishing Kit",
    prompt: "Введи домен или название сервиса для клонирования:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▶ <b>PHISHING KIT GENERATOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка фишингового набора...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Клонирование страницы входа...", pct: 15, delay: 900 },
        { label: "Адаптация HTML/CSS шаблона...", pct: 30, delay: 800 },
        { label: "Встройка PHP-обработчика...", pct: 48, delay: 900 },
        { label: "Настройка редиректа жертвы...", pct: 65, delay: 800 },
        { label: "Деплой на хостинг...", pct: 82, delay: 1000 },
        { label: "Генерация ссылки...", pct: 100, delay: 500 },
      ]);
      const fakeDomain = `${target.replace(/\W/g, "").slice(0, 8)}-secure-login.xyz`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `▶ <b>PHISHING KIT — ГОТОВ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Клон: <code>${target}</code>\n\n` +
        `<b>▸ Фишинговая ссылка:</b>\n` +
        `<code>https://${fakeDomain}/login</code>\n\n` +
        `<b>▸ Данные жертв пойдут на:</b>\n` +
        `<code>hxxps://c2.${fakeHash().slice(0, 8)}.pw/gate.php</code>\n\n` +
        `◈ Тип: <b>Credential Harvester</b>\n` +
        `▸ Шаблон: <b>OAuth2 + 2FA bypass</b>\n` +
        `◆ Хостинг: <b>Bulletproof (RU)</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Фишинг-кит развёрнут</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "keylogger",
    emoji: "▪",
    name: "Keylogger",
    prompt: "Введи IP или домен целевой машины:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▪ <b>KEYLOGGER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Установка перехватчика...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Внедрение .dll инъекции...", pct: 20, delay: 900 },
        { label: "Перехват WinAPI (SetWindowsHookEx)...", pct: 40, delay: 1000 },
        { label: "Активация keylogger-модуля...", pct: 60, delay: 900 },
        { label: "Сбор нажатий клавиш...", pct: 80, delay: 1100 },
        { label: "Передача логов на C2...", pct: 100, delay: 600 },
      ]);
      const platforms = ["Chrome", "Telegram Desktop", "Word", "VK Desktop"];
      const keys = Math.floor(Math.random() * 3000 + 500);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `▪ <b>KEYLOGGER — АКТИВЕН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Хост: <code>${target}</code>\n\n` +
        `<b>▸ Перехваченные данные:</b>\n` +
        `◆ Нажатий: <b>${keys.toLocaleString()}</b>\n` +
        `▣ Активных окон: <b>${platforms.length}</b>\n\n` +
        platforms.map((p, i) =>
          `${i + 1}. <b>${p}</b>: <code>${fakePassword().slice(0, 12)}...</code>`
        ).join("\n") + "\n\n" +
        `◈ C2-сервер: <code>${fakeIP()}:4444</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Логи передаются в реальном времени</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "sqlinject",
    emoji: "◆",
    name: "SQL Injector",
    prompt: "Введи URL уязвимого сайта (напр. site.com/page?id=1):",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◆ <b>SQL INJECTOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Сканирование параметров...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Обнаружение точек инъекции...", pct: 12, delay: 800 },
        { label: "Тест UNION-based injection...", pct: 28, delay: 900 },
        { label: "Boolean-based blind SQL...", pct: 46, delay: 1000 },
        { label: "Time-based blind injection...", pct: 64, delay: 1100 },
        { label: "Дамп таблицы users...", pct: 82, delay: 900 },
        { label: "Извлечение паролей...", pct: 100, delay: 600 },
      ]);
      const dbtype = ["MySQL 8.0", "PostgreSQL 14", "MSSQL 2019", "SQLite 3"][Math.floor(Math.random() * 4)];
      const rows = 100 + Math.floor(Math.random() * 5000);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◆ <b>SQL INJECT — ДАМП ПОЛУЧЕН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `◈ СУБД: <b>${dbtype}</b>\n` +
        `▸ Тип: <b>UNION-based</b>\n\n` +
        `<b>▸ Дамп таблицы users:</b>\n` +
        `<code>id | login | password_hash</code>\n` +
        `<code>1  | admin | ${fakeHash()}</code>\n` +
        `<code>2  | ${fakeEmail().split("@")[0]} | ${fakeHash()}</code>\n` +
        `<code>3  | ${fakeEmail().split("@")[0]} | ${fakeHash()}</code>\n\n` +
        `◆ Всего строк: <b>${rows}</b>\n` +
        `▣ Таблиц: <b>${3 + Math.floor(Math.random() * 12)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>База данных взломана</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "ransomware",
    emoji: "◈",
    name: "Ransomware Sim",
    prompt: "Введи IP или имя жертвы для симуляции:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◈ <b>RANSOMWARE SIMULATOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка шифрования...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Сканирование файловой системы...", pct: 10, delay: 800 },
        { label: `Найдено файлов: ${2000 + Math.floor(Math.random() * 8000)}`, pct: 25, delay: 900 },
        { label: "Генерация ключа AES-256...", pct: 38, delay: 700 },
        { label: "Шифрование documents/...", pct: 55, delay: 1000 },
        { label: "Шифрование desktop/...", pct: 70, delay: 900 },
        { label: "Шифрование backup/...", pct: 85, delay: 1100 },
        { label: "Создание README_DECRYPT.txt...", pct: 100, delay: 600 },
      ]);
      const btcAddr = `1${fakeToken().slice(0, 33)}`;
      const files = 2000 + Math.floor(Math.random() * 8000);
      const ransom = (0.05 + Math.random() * 0.45).toFixed(3);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◈ <b>RANSOMWARE — ШИФРОВАНИЕ ЗАВЕРШЕНО</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Жертва: <code>${target}</code>\n\n` +
        `<b>▸ Зашифровано:</b>\n` +
        `◆ Файлов: <b>${files.toLocaleString()}</b> (.locked)\n` +
        `◈ Алгоритм: <b>AES-256 + RSA-4096</b>\n\n` +
        `<b>▸ Требование выкупа:</b>\n` +
        `<code>${ransom} BTC</code>\n` +
        `▸ BTC-адрес:\n<code>${btcAddr}</code>\n\n` +
        `◉ Дедлайн: <b>72 часа</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Файлы зашифрованы</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "token",
    emoji: "◇",
    name: "Token Grabber",
    prompt: "Введи username или платформу цели:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◇ <b>TOKEN GRABBER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Поиск токенов...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Сканирование AppData/Roaming...", pct: 18, delay: 800 },
        { label: "Парсинг Discord LevelDB...", pct: 35, delay: 900 },
        { label: "Извлечение токенов браузеров...", pct: 55, delay: 1000 },
        { label: "Декриптование Chrome Cookies...", pct: 75, delay: 900 },
        { label: "Передача на C2...", pct: 100, delay: 600 },
      ]);
      const services = ["Discord", "Steam", "GitHub", "Telegram Web"];
      const found = 1 + Math.floor(Math.random() * 3);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◇ <b>TOKEN GRABBER — УСПЕХ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n\n` +
        `<b>▸ Найденные токены (${found}):</b>\n` +
        services.slice(0, found).map((s, i) =>
          `${i + 1}. <b>${s}</b>:\n   <code>${fakeToken().slice(0, 59)}.</code>`
        ).join("\n\n") + "\n\n" +
        `◈ IP жертвы: <code>${fakeIP()}</code>\n` +
        `▣ User-Agent: <code>${fakeUserAgent()}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Токены перехвачены</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "deauth",
    emoji: "◎",
    name: "WiFi Deauth",
    prompt: "Введи BSSID (MAC точки доступа) или имя сети:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◎ <b>WiFi DEAUTH ATTACK</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Поиск сети...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Сканирование WiFi-сетей...", pct: 15, delay: 800 },
        { label: `Обнаружена цель: ${target}`, pct: 30, delay: 700 },
        { label: "Переключение в monitor mode...", pct: 45, delay: 900 },
        { label: "Отправка deauth-фреймов (802.11)...", pct: 65, delay: 1100 },
        { label: `Клиентов отключено: ${3 + Math.floor(Math.random() * 12)}`, pct: 85, delay: 900 },
        { label: "Захват handshake...", pct: 100, delay: 700 },
      ]);
      const clients = 3 + Math.floor(Math.random() * 12);
      const handshake = Math.random() > 0.3;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◎ <b>WiFi DEAUTH — ВЫПОЛНЕНО</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Сеть: <code>${target}</code>\n` +
        `▸ BSSID: <code>${fakeMac()}</code>\n` +
        `◈ Канал: <b>${1 + Math.floor(Math.random() * 13)}</b>\n\n` +
        `<b>▸ Результат:</b>\n` +
        `✗ Отключено клиентов: <b>${clients}</b>\n` +
        `${handshake ? "✓" : "✗"} Handshake: <b>${handshake ? "ЗАХВАЧЕН" : "не удалось"}</b>\n` +
        (handshake ? `▸ Файл: <code>handshake_${fakeHash().slice(0, 8)}.cap</code>\n` : "") +
        `\n◆ Следующий шаг: <b>aircrack-ng</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Сеть дестабилизирована</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "spoof",
    emoji: "▣",
    name: "IP Spoofer",
    prompt: "Введи IP жертвы для спуфинга:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▣ <b>IP SPOOFER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Настройка маскировки...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Генерация поддельного IP-заголовка...", pct: 20, delay: 800 },
        { label: "Настройка raw sockets...", pct: 40, delay: 900 },
        { label: "Отправка spoofed пакетов...", pct: 65, delay: 1000 },
        { label: "Верификация источника...", pct: 85, delay: 800 },
        { label: "Активен", pct: 100, delay: 500 },
      ]);
      const fakeSource = fakeIP();
      const packets = (50000 + Math.floor(Math.random() * 200000)).toLocaleString();
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `▣ <b>IP SPOOFER — АКТИВЕН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Реальный IP: <code>${target}</code>\n` +
        `✓ Подменный IP: <code>${fakeSource}</code>\n\n` +
        `<b>▸ Статистика:</b>\n` +
        `◆ Пакетов отправлено: <b>${packets}</b>\n` +
        `◈ Протокол: <b>TCP/UDP/ICMP</b>\n` +
        `▣ TTL подмены: <b>${64 + Math.floor(Math.random() * 64)}</b>\n\n` +
        `◇ Маршрут скрыт: <b>Да</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Источник замаскирован</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  // ── NEW TOOLS ──────────────────────────────────────────────────────────────
  {
    key: "reverse_shell",
    emoji: "⊕",
    name: "Reverse Shell Sim",
    prompt: "Введи IP:порт для подключения (напр. 10.0.0.1:4444):",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `⊕ <b>REVERSE SHELL SIMULATOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка payload...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Генерация payload (msfvenom)...", pct: 15, delay: 900 },
        { label: "Обход AV/EDR...", pct: 30, delay: 800 },
        { label: "Запуск listener на порту...", pct: 48, delay: 1000 },
        { label: "Ожидание подключения...", pct: 65, delay: 1200 },
        { label: "Подключение установлено!", pct: 82, delay: 900 },
        { label: "Получен shell...", pct: 100, delay: 600 },
      ]);
      const os = ["Windows 10 Pro", "Ubuntu 22.04 LTS", "Windows Server 2019", "Kali Linux"][Math.floor(Math.random() * 4)];
      const user = Math.random() > 0.5 ? "NT AUTHORITY\\SYSTEM" : "root";
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `⊕ <b>REVERSE SHELL — ПОДКЛЮЧЁН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `◆ OS: <b>${os}</b>\n` +
        `▸ User: <b>${user}</b>\n\n` +
        `<b>▸ Сессия:</b>\n` +
        `<code>msf6 > sessions -i 1</code>\n` +
        `<code>meterpreter > getuid</code>\n` +
        `<code>▸ ${user}</code>\n\n` +
        `<b>▸ Собранные данные:</b>\n` +
        `  ◈ IP: <code>${fakeIP()}</code>\n` +
        `  ▸ Hostname: <code>${["DESKTOP-ABC123", "server-prod-01", "workstation"][Math.floor(Math.random() * 3)]}</code>\n` +
        `  ◆ PID: <b>${1000 + Math.floor(Math.random() * 9000)}</b>\n\n` +
        `◇ Статус: <b>ACTIVE</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Shell получен</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "credential_phish",
    emoji: "▶",
    name: "Credential Harvester",
    prompt: "Введи название сервиса для кражи учётных данных (напр. Google, VK, Steam):",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▶ <b>CREDENTIAL HARVESTER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка перехватчика...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Клонирование страницы входа...", pct: 12, delay: 800 },
        { label: "Настройка PHP-ловушки...", pct: 28, delay: 900 },
        { label: "Обход 2FA-страницы...", pct: 45, delay: 1000 },
        { label: "Настройка C2-сервера...", pct: 62, delay: 900 },
        { label: "Генерация фишинговой ссылки...", pct: 80, delay: 800 },
        { label: "Активация...", pct: 100, delay: 500 },
      ]);
      const fakeDomain = `${target.toLowerCase().replace(/\s/g, "")}-login-secure.${["xyz", "pw", "cc", "top"][Math.floor(Math.random() * 4)]}`;
      const captured = Math.floor(Math.random() * 15) + 1;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `▶ <b>CREDENTIAL HARVESTER — АКТИВЕН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n\n` +
        `<b>▸ Фишинговая ссылка:</b>\n` +
        `<code>https://${fakeDomain}/auth</code>\n\n` +
        `<b>▸ Перехвачено учётных данных:</b>\n` +
        `  ✓ Логин: <code>${fakeEmail()}</code>\n` +
        `  ✓ Пароль: <code>${fakePassword()}</code>\n` +
        `  ✓ 2FA код: <code>${Math.floor(100000 + Math.random() * 900000)}</code>\n\n` +
        `◆ Всего перехвачено: <b>${captured}</b>\n` +
        `◈ C2: <code>${fakeIP()}:8443</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Данные передаются на C2</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "dns_spoof",
    emoji: "◎",
    name: "DNS Spoof / Cache Poisoning",
    prompt: "Введи целевой домен для DNS-спуфинга:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◎ <b>DNS SPOOFING</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка DNS-атаки...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Анализ DNS-сервера...", pct: 15, delay: 800 },
        { label: "Перехват DNS-запросов...", pct: 32, delay: 900 },
        { label: "Генерация поддельных ответов...", pct: 50, delay: 1000 },
        { label: "Отравление кэша...", pct: 70, delay: 900 },
        { label: "Перенаправление на C2...", pct: 90, delay: 800 },
        { label: "Успешно", pct: 100, delay: 500 },
      ]);
      const spoofedIP = fakeIP();
      const redirected = ["google.com", "vk.com", "mail.ru", "yandex.ru"][Math.floor(Math.random() * 4)];
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◎ <b>DNS SPOOF — УСПЕХ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `▸ Перенаправлен: <code>${redirected}</code>\n\n` +
        `<b>▸ DNS-записи:</b>\n` +
        `  A:  <code>${redirected}</code> → <code>${spoofedIP}</code> (было: <code>${fakeIP()}</code>)\n` +
        `  MX: <code>${redirected}</code> → <code>${spoofedIP}</code>\n\n` +
        `◆ Поддельный IP: <code>${spoofedIP}</code>\n` +
        `◈ C2-сервер: <code>${fakeIP()}:53</code>\n` +
        `▣ Записей отравлено: <b>${Math.floor(Math.random() * 500) + 10}</b>\n\n` +
        `◇ Статус: <b>ACTIVE</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Кэш отравлен</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "man_in_middle",
    emoji: "◈",
    name: "MITM Attack Simulator",
    prompt: "Введи IP-адрес жертвы для MITM-атаки:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◈ <b>MITM ATTACK SIMULATOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Позиционирование в сети...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "ARP-poisoning...", pct: 12, delay: 800 },
        { label: "Перехват трафика...", pct: 28, delay: 900 },
        { label: "Декодирование HTTP...", pct: 45, delay: 1000 },
        { label: "SSL-stripping...", pct: 62, delay: 1100 },
        { label: "Извлечение credentials...", pct: 80, delay: 900 },
        { label: "Готово", pct: 100, delay: 500 },
      ]);
      const protocols = ["HTTP", "FTP", "SMTP", "POP3", "IMAP"];
      const creds = Math.floor(Math.random() * 8) + 1;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◈ <b>MITM — ПЕРЕХВАТ ВЫПОЛНЕН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Жертва: <code>${target}</code>\n` +
        `◆ Протоколы: <b>${protocols.slice(0, 3).join(", ")}</b>\n\n` +
        `<b>▸ Перехваченный трафик:</b>\n` +
        protocols.slice(0, 3).map((p, i) =>
          `  ${i + 1}. <b>${p}</b>\n     <code>${fakeEmail()} : ${fakePassword()}</code>`
        ).join("\n\n") + "\n\n" +
        `◇ SSL Strip: <b>${Math.random() > 0.3 ? "УСПЕХ" : "НЕУДАЧА"}</b>\n` +
        `▣ Credentials: <b>${creds}</b>\n` +
        `◈ Пакетов: <b>${(10000 + Math.floor(Math.random() * 90000)).toLocaleString()}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Трафик перехвачен</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "wiretap",
    emoji: "▣",
    name: "Telegram Wiretap Sim",
    prompt: "Введи @username Telegram для симуляции перехвата:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▣ <b>TELEGRAM WIRETAP SIMULATOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка перехвата...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Анализ MTProto...", pct: 10, delay: 700 },
        { label: "Поиск уязвимостей...", pct: 25, delay: 800 },
        { label: "Подмена DNS...", pct: 40, delay: 900 },
        { label: "Перехват ключей...", pct: 58, delay: 1000 },
        { label: "Дешифровка сообщений...", pct: 78, delay: 900 },
        { label: "Извлечение данных...", pct: 95, delay: 800 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      const msgs = Math.floor(Math.random() * 500) + 10;
      const chats = Math.floor(Math.random() * 15) + 1;
      const files = Math.floor(Math.random() * 50) + 1;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `▣ <b>TELEGRAM WIRETAP — ПЕРЕХВАЧЕНО</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n\n` +
        `<b>▸ Перехвачено:</b>\n` +
        `  ◆ Сообщений: <b>${msgs.toLocaleString()}</b>\n` +
        `  ◈ Чатов: <b>${chats}</b>\n` +
        `  ▣ Файлов: <b>${files}</b>\n` +
        `  ○ Аудио: <b>${Math.floor(Math.random() * 30)}</b>\n\n` +
        `<b>▸ Примеры сообщений:</b>\n` +
        `  <i>"Привет, как дела?"</i>\n` +
        `  <i>"Отправь документы на почту"</i>\n` +
        `  <i>"Встреча в 18:00"</i>\n\n` +
        `◇ Метод: <b>MTProto downgrade + DNS spoof</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Сообщения расшифрованы</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "deepfake_detect",
    emoji: "⊕",
    name: "Deepfake Detector",
    prompt: "Введи URL видео или фото для анализа на deepfake:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `⊕ <b>DEEPFAKE DETECTOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Анализ медиав файла...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Загрузка файла...", pct: 10, delay: 600 },
        { label: "Анализ мимики и моргания...", pct: 25, delay: 800 },
        { label: "Проверка артефактов GAN...", pct: 42, delay: 900 },
        { label: "Анализ частотных аномалий...", pct: 60, delay: 1000 },
        { label: "Нейро-классификация...", pct: 80, delay: 900 },
        { label: "Готово", pct: 100, delay: 500 },
      ]);
      const isFake = Math.random() > 0.5;
      const confidence = (0.7 + Math.random() * 0.28).toFixed(3);
      const artifacts = ["inconsistent blinking", "lip sync mismatch", "frequency artifacts", "lighting mismatch", "edge artifacts"];
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `⊕ <b>DEEPFAKE DETECTOR</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n\n` +
        `<b>▸ Результат:</b>\n` +
        `  ${isFake ? "✗ <b>DEEPFAKE ОБНАРУЖЕН</b>" : "✓ <b>ОРИГИНАЛ</b>"}\n` +
        `  ◆ Уверенность: <b>${confidence}</b>\n\n` +
        `<b>▸ Обнаруженные артефакты:</b>\n` +
        (isFake ? artifacts.slice(0, 2 + Math.floor(Math.random() * 3)).map(a => `  ▸ ${a}`).join("\n") : "  Нет артефактов") + "\n\n" +
        `◇ Метод: <b>GAN fingerprint + temporal analysis</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Анализ завершён</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "data_broker",
    emoji: "▪",
    name: "Data Broker Search",
    prompt: "Введи имя человека (ФИО) для поиска в data broker базах:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▪ <b>DATA BROKER SEARCH</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Поиск в брокерах данных...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Whitepages.com...", pct: 12, delay: 700 },
        { label: "Spokeo...", pct: 25, delay: 800 },
        { label: "PeopleFinders...", pct: 38, delay: 900 },
        { label: "TruePeopleSearch...", pct: 52, delay: 1000 },
        { label: "FastPeopleSearch...", pct: 65, delay: 900 },
        { label: "ZabaSearch...", pct: 78, delay: 800 },
        { label: "Агрегация результатов...", pct: 100, delay: 500 },
      ]);
      const brokers = ["Whitepages", "Spokeo", "PeopleFinders", "TruePeopleSearch", "ZabaSearch", "FamilyTreeNow", "SmartPeople"];
      const found = brokers.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3));
      const records = Math.floor(Math.random() * 20) + 3;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `▪ <b>DATA BROKER: ${target}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◆ Найдено записей: <b>${records}</b>\n` +
        `◈ Брокеров: <b>${found.length}</b>\n\n` +
        `<b>▸ Обнаружен на:</b>\n` +
        found.map((b, i) => `  ${i + 1}. <b>${b}</b>\n     ▸ Адрес: <code>${fakeIP()}</code>, ${FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)]}`).join("\n\n") + "\n\n" +
        `<b>▸ Собранные данные:</b>\n` +
        `  ◈ Имена: <b>${Math.floor(Math.random() * 3) + 1}</b>\n` +
        `  ▸ Адреса: <b>${Math.floor(Math.random() * 5) + 1}</b>\n` +
        `  ◆ Телефоны: <b>${Math.floor(Math.random() * 5) + 1}</b>\n` +
        `  ○ Email: <b>${Math.floor(Math.random() * 4) + 1}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Данные агрегированы</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  // ── NEW TOOLS v2 ──────────────────────────────────────────────────────────
  {
    key: "portscan_pro",
    emoji: "◈",
    name: "Port Scanner Pro",
    prompt: "Введи IP или домен для глубокого сканирования портов:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◈ <b>PORT SCANNER PRO</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Глубокое сканирование...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "TCP SYN scan (top 1000)...", pct: 10, delay: 800 },
        { label: "UDP scan (top 100)...", pct: 25, delay: 900 },
        { label: "Service version detection...", pct: 42, delay: 1000 },
        { label: "OS fingerprinting (nmap)...", pct: 60, delay: 1100 },
        { label: "Vulnerability scan (Nessus)...", pct: 78, delay: 900 },
        { label: "Generating report...", pct: 95, delay: 700 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      const os = ["Ubuntu 22.04", "Windows Server 2022", "CentOS 8", "Debian 12"][Math.floor(Math.random() * 4)];
      const openPorts = 5 + Math.floor(Math.random() * 15);
      const filtered = Math.floor(Math.random() * 20);
      const closed = 1000 - openPorts - filtered;
      const vulns = Math.floor(Math.random() * 5);
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined,
        `◈ <b>PORT SCANNER PRO — ЗАВЕРШЁН</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `◆ OS: <b>${os}</b>\n\n` +
        `<b>▸ Статистика:</b>\n` +
        `  ✓ Открытых: <b>${openPorts}</b>\n` +
        `  ◈ Заблокированных: <b>${filtered}</b>\n` +
        `  ✗ Закрытых: <b>${closed}</b>\n` +
        `  ⚠ Уязвимостей: <b>${vulns}</b>\n\n` +
        `<b>▸ Top открытые порты:</b>\n` +
        `<code>22/tcp  open   ssh     OpenSSH 8.9</code>\n` +
        `<code>80/tcp  open   http    nginx 1.24</code>\n` +
        `<code>443/tcp open   https   nginx 1.24</code>\n` +
        `<code>3306/tcp open  mysql   MySQL 8.0</code>\n` +
        `<code>8080/tcp open  http-proxy Apache</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Сканирование завершено</code>`,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "xss",
    emoji: "⊕",
    name: "XSS Scanner",
    prompt: "Введи URL сайта для поиска XSS-уязвимостей:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `⊕ <b>XSS SCANNER</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Сканирование на XSS...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Парсинг параметров URL...", pct: 12, delay: 800 },
        { label: "Тестирование input fields...", pct: 28, delay: 900 },
        { label: "Reflected XSS check...", pct: 45, delay: 1000 },
        { label: "Stored XSS check...", pct: 62, delay: 900 },
        { label: "DOM-based XSS check...", pct: 80, delay: 800 },
        { label: "Генерация отчёта...", pct: 100, delay: 500 },
      ]);
      const xssFound = Math.floor(Math.random() * 4);
      const types = ["Reflected", "Stored", "DOM-based"];
      const payloads = ["<script>alert(1)</script>", "javascript:alert(1)", "\x3cimg src=x onerror=alert(1)\x3e", '""\x3csvg/onload=alert(1)\x3e'];
      let text =
        `⊕ <b>XSS SCANNER — РЕЗУЛЬТАТ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◎ Цель: <code>${target}</code>\n` +
        `◆ Найдено XSS: <b>${xssFound}</b>\n\n`;
      if (xssFound > 0) {
        text += `<b>▸ Обнаруженные уязвимости:</b>\n`;
        for (let i = 0; i < xssFound; i++) {
          const type = types[i % types.length];
          const payload = payloads[i % payloads.length];
          text += `  ${i + 1}. <b>${type}</b>\n`;
          text += `     Payload: <code>${payload}</code>\n`;
        }
      } else {
        text += `✓ XSS-уязвимости не найдены\n`;
      }
      text +=
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Сканирование завершено</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, text,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "subdomain_enum",
    emoji: "▣",
    name: "Subdomain Enumeration",
    prompt: "Введи домен для глубокого поиска субдоменов:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `▣ <b>SUBDOMAIN ENUMERATION</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Перебор субдоменов...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Брутфорс по словарю (150K)...", pct: 10, delay: 800 },
        { label: "Certificate Transparency logs...", pct: 25, delay: 900 },
        { label: "DNS resolution...", pct: 42, delay: 1000 },
        { label: "HTTP probing...", pct: 60, delay: 1100 },
        { label: "Агрегация результатов...", pct: 80, delay: 900 },
        { label: "Готово", pct: 100, delay: 500 },
      ]);
      const total = 50 + Math.floor(Math.random() * 200);
      const active = Math.floor(total * (0.2 + Math.random() * 0.3));
      const subs = ["www", "api", "admin", "mail", "dev", "staging", "cdn", "app", "portal", "dashboard", "vpn", "ftp", "git", "jenkins", "grafana"];
      const foundSubs = subs.sort(() => Math.random() - 0.5).slice(0, Math.min(8, active));
      let text =
        `▣ <b>SUBDOMAIN ENUM: ${target}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◆ Всего найдено: <b>${total}</b>\n` +
        `✓ Активных: <b>${active}</b>\n\n` +
        `<b>▸ Активные субдомены:</b>\n`;
      for (const s of foundSubs) {
        text += `  ▸ <code>${s}.${target}</code> → <code>${fakeIP()}</code>\n`;
      }
      text +=
        `\n<b>▸ Источники:</b>\n` +
        `  ◈ Sublist3r: <b>${Math.floor(active * 0.4)}</b>\n` +
        `  ○ CT Logs: <b>${Math.floor(active * 0.3)}</b>\n` +
        `  ◆ Amass: <b>${Math.floor(active * 0.3)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Enumerация завершена</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, text,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "reverse_ip",
    emoji: "◎",
    name: "Reverse IP / Shared Hosting",
    prompt: "Введи IP-адрес для поиска хостов на том же сервере:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◎ <b>REVERSE IP LOOKUP</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Поиск доменов на IP...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Запрос DNS-обратного поиска...", pct: 20, delay: 700 },
        { label: "Поиск в Reverse-IP базах...", pct: 40, delay: 900 },
        { label: "Анализ хостинг-провайдера...", pct: 60, delay: 1000 },
        { label: "Определение shared hosting...", pct: 80, delay: 800 },
        { label: "Готово", pct: 100, delay: 400 },
      ]);
      const domains = 10 + Math.floor(Math.random() * 100);
      const hosting = ["DigitalOcean", "AWS EC2", "Cloudflare", "Azure", "Vultr", "Linode"][Math.floor(Math.random() * 6)];
      const sampleDomains = Array.from({ length: 8 }, () => `${fakeHash().slice(0, 8)}.${["com", "net", "org", "io", "ru"][Math.floor(Math.random() * 5)]}`);
      let text =
        `◎ <b>REVERSE IP: ${target}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◆ Доменов на IP: <b>${domains}</b>\n` +
        `◈ Хостинг: <b>${hosting}</b>\n\n` +
        `<b>▸ Примеры доменов:</b>\n`;
      for (const d of sampleDomains) {
        text += `  ▸ <code>${d}</code>\n`;
      }
      text +=
        `\n<b>▸ Информация об IP:</b>\n` +
        `  ◆ ASN: <b>AS${10000 + Math.floor(Math.random() * 50000)}</b>\n` +
        `  ◈ Страна: <b>${["RU", "US", "DE", "NL", "GB"][Math.floor(Math.random() * 5)]}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>Reverse IP завершён</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, text,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
  {
    key: "api_enum",
    emoji: "◇",
    name: "API Endpoint Enumerator",
    prompt: "Введи URL сайта для поиска API endpoints:",
    run: async (ctx, target, endMarkup) => {
      const chatId = ctx.chat!.id;
      const header = `◇ <b>API ENDPOINT ENUMERATOR</b>\n◎ Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>▸ Поиск API endpoints...</code>`, { parse_mode: "HTML" });
      await animProg(ctx, chatId, msg.message_id, header, [
        { label: "Парсинг robots.txt / sitemap...", pct: 10, delay: 700 },
        { label: "Брутфорс common paths...", pct: 25, delay: 800 },
        { label: "Анализ JS-файлов...", pct: 42, delay: 900 },
        { label: "Проверка Swagger/OpenAPI...", pct: 60, delay: 1000 },
        { label: "Тестирование auth endpoints...", pct: 78, delay: 900 },
        { label: "Генерация отчёта...", pct: 100, delay: 500 },
      ]);
      const endpoints = 20 + Math.floor(Math.random() * 80);
      const publicEndpoints = Math.floor(endpoints * (0.3 + Math.random() * 0.4));
      const authEndpoints = Math.floor(endpoints * (0.2 + Math.random() * 0.3));
      const endpointsList = [
        { path: "/api/v1/users", method: "GET", auth: false },
        { path: "/api/v1/auth/login", method: "POST", auth: false },
        { path: "/api/v1/admin/settings", method: "GET", auth: true },
        { path: "/api/v1/users/profile", method: "PUT", auth: true },
        { path: "/api/v1/data/export", method: "GET", auth: true },
        { path: "/api/v2/search", method: "GET", auth: false },
      ];
      let text =
        `◇ <b>API ENUM: ${target}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `◆ Найдено endpoints: <b>${endpoints}</b>\n` +
        `✓ Публичных: <b>${publicEndpoints}</b>\n` +
        `◈ Требуют auth: <b>${authEndpoints}</b>\n\n` +
        `<b>▸ Обнаруженные endpoints:</b>\n`;
      for (const e of endpointsList) {
        text += `  ${e.auth ? "🔒" : "🌐"} <b>[${e.method}]</b> <code>${e.path}</code>\n`;
      }
      text +=
        `\n<b>▸ Swagger UI:</b>\n` +
        `  ${Math.random() > 0.5 ? `✓ <code>${target}/api/docs</code>` : `✗ Не найден`}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>API enum завершён</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, text,
        { parse_mode: "HTML", ...(endMarkup ?? {}) });
    },
  },
];

export const TOOLS_MAP: Record<string, Tool> = Object.fromEntries(
  TOOLS.map((t) => [t.key, t])
);
