import { progressBar, sleep, fakeEmail, fakeIP, fakeToken, fakeMac, fakePassword, fakeHash, FAKE_CITIES, FAKE_ISP } from "./visual.js";
import type { Context } from "telegraf";

export interface Method {
  key: string;
  emoji: string;
  name: string;
  prompt: string;
  run: (ctx: Context, target: string) => Promise<void>;
}

async function animateProgress(
  ctx: Context,
  msgId: number,
  chatId: number,
  stages: { label: string; percent: number; delay: number }[],
  header: string
) {
  for (const stage of stages) {
    const bar = progressBar(stage.percent, 100, 18);
    const text =
      `${header}\n\n` +
      `<code>▸ ${stage.label}</code>\n\n` +
      `<code>[${bar}] ${stage.percent}%</code>`;
    try {
      await ctx.telegram.editMessageText(chatId, msgId, undefined, text, {
        parse_mode: "HTML",
      });
    } catch {}
    await sleep(stage.delay);
  }
}

export const METHODS: Method[] = [
  // --- EMAIL BOMBER ---
  {
    key: "email",
    emoji: "📧",
    name: "Email Bomber",
    prompt: "Введи целевой email:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `📧 <b>EMAIL BOMBER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Инициализация...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Загрузка SMTP-серверов...", percent: 10, delay: 800 },
        { label: "Генерация шаблонов писем...", percent: 25, delay: 700 },
        { label: "Подключение к прокси-цепочке...", percent: 40, delay: 900 },
        { label: "Запуск бомбардировки...", percent: 60, delay: 1000 },
        { label: "Обход спам-фильтров...", percent: 78, delay: 800 },
        { label: "Финальный залп...", percent: 92, delay: 700 },
        { label: "Завершение операции...", percent: 100, delay: 500 },
      ], header);

      const count = 500 + Math.floor(Math.random() * 4500);
      const result =
        `📧 <b>EMAIL BOMBER — УСПЕХ</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n` +
        `📨 Отправлено писем: <b>${count.toLocaleString()}</b>\n` +
        `📬 Доставлено: <b>${Math.floor(count * 0.87).toLocaleString()}</b>\n` +
        `🚫 Заблокировано: <b>${Math.floor(count * 0.13).toLocaleString()}</b>\n` +
        `🌐 SMTP-шлюзов использовано: <b>${2 + Math.floor(Math.random() * 8)}</b>\n` +
        `⏱ Время операции: <b>${(1.2 + Math.random() * 3).toFixed(1)}с</b>\n\n` +
        `<code>✅ Почтовый ящик перегружен</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- COOKIE STEALER ---
  {
    key: "cookie",
    emoji: "🍪",
    name: "Cookie Stealer",
    prompt: "Введи URL сайта или email жертвы:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🍪 <b>COOKIE STEALER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Подготовка вектора атаки...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Внедрение XSS-пейлоада...", percent: 12, delay: 900 },
        { label: "Активация MITM-перехвата...", percent: 28, delay: 800 },
        { label: "Сбор Cookie-файлов...", percent: 50, delay: 1100 },
        { label: "Парсинг сессионных токенов...", percent: 70, delay: 900 },
        { label: "Расшифровка данных...", percent: 88, delay: 700 },
        { label: "Сохранение результатов...", percent: 100, delay: 500 },
      ], header);

      const result =
        `🍪 <b>COOKIE STEALER — УСПЕХ</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n\n` +
        `<b>Перехваченные данные:</b>\n` +
        `<code>session_id=${fakeToken().slice(0, 32)}</code>\n` +
        `<code>auth_token=${fakeToken().slice(0, 24)}</code>\n` +
        `<code>csrf_token=${fakeToken().slice(0, 16)}</code>\n` +
        `<code>user_id=${Math.floor(Math.random() * 9999999)}</code>\n\n` +
        `🌐 Обнаружено аккаунтов: <b>${1 + Math.floor(Math.random() * 5)}</b>\n` +
        `🔓 Доступ получен: <b>Да</b>\n\n` +
        `<code>✅ Куки успешно перехвачены</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- SESSION GRABBER ---
  {
    key: "session",
    emoji: "🔑",
    name: "Session Grabber",
    prompt: "Введи username или email цели:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🔑 <b>SESSION GRABBER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Поиск активных сессий...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Сканирование WebSocket-каналов...", percent: 15, delay: 800 },
        { label: "Перехват HTTP-трафика...", percent: 35, delay: 900 },
        { label: "Извлечение Bearer-токенов...", percent: 55, delay: 1000 },
        { label: "Валидация сессий...", percent: 75, delay: 800 },
        { label: "Клонирование сессии...", percent: 92, delay: 700 },
        { label: "Готово...", percent: 100, delay: 400 },
      ], header);

      const sessCount = 1 + Math.floor(Math.random() * 4);
      const platforms = ["Telegram", "VK", "Instagram", "Steam", "Discord", "Google"];
      const grabbed = platforms.slice(0, sessCount);
      const result =
        `🔑 <b>SESSION GRABBER — УСПЕХ</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n\n` +
        `<b>Активные сессии:</b>\n` +
        grabbed.map((p, i) =>
          `${i + 1}. <b>${p}</b>\n   <code>token: ${fakeToken().slice(0, 28)}...</code>`
        ).join("\n") + "\n\n" +
        `📍 IP сессии: <code>${fakeIP()}</code>\n` +
        `🖥 MAC: <code>${fakeMac()}</code>\n` +
        `⏱ Сессий захвачено: <b>${sessCount}</b>\n\n` +
        `<code>✅ Сессии успешно клонированы</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- IP TRACER ---
  {
    key: "ip",
    emoji: "🌐",
    name: "IP Tracer",
    prompt: "Введи IP-адрес, домен или username:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🌐 <b>IP TRACER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Запуск трассировки...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "DNS-резолюция...", percent: 20, delay: 700 },
        { label: "Определение геолокации...", percent: 45, delay: 900 },
        { label: "Анализ провайдера...", percent: 65, delay: 800 },
        { label: "Сканирование портов...", percent: 82, delay: 1000 },
        { label: "Проверка VPN/Proxy...", percent: 95, delay: 700 },
        { label: "Завершение...", percent: 100, delay: 400 },
      ], header);

      const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
      const isp = FAKE_ISP[Math.floor(Math.random() * FAKE_ISP.length)];
      const ip = fakeIP();
      const result =
        `🌐 <b>IP TRACER — РЕЗУЛЬТАТ</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n` +
        `🌍 IP: <code>${ip}</code>\n` +
        `📍 Страна: <b>Россия</b> 🇷🇺\n` +
        `🏙 Город: <b>${city}</b>\n` +
        `📡 Провайдер: <b>${isp}</b>\n` +
        `🔌 ASN: <code>AS${12000 + Math.floor(Math.random() * 30000)}</code>\n` +
        `🛡 VPN/Proxy: <b>${Math.random() > 0.5 ? "Обнаружен ⚠️" : "Не найден ✅"}</b>\n` +
        `🖥 ОС: <b>${["Windows 11", "Ubuntu 22.04", "macOS Sonoma"][Math.floor(Math.random() * 3)]}</b>\n` +
        `🌐 Открытые порты: <code>80, 443${Math.random() > 0.5 ? ", 22" : ""}${Math.random() > 0.7 ? ", 3306" : ""}</code>\n\n` +
        `<code>✅ Трассировка завершена</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- BRUTE FORCE ---
  {
    key: "brute",
    emoji: "💪",
    name: "Brute Force",
    prompt: "Введи username/email для брута:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `💪 <b>BRUTE FORCE</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Загрузка словаря...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Загрузка базы паролей (2.7M)...", percent: 8, delay: 700 },
        { label: "Запуск перебора...", percent: 22, delay: 800 },
        { label: `Проверено: ${(150000).toLocaleString()} комбинаций...`, percent: 40, delay: 900 },
        { label: `Проверено: ${(890000).toLocaleString()} комбинаций...`, percent: 62, delay: 1000 },
        { label: "Совпадение найдено! Верификация...", percent: 85, delay: 800 },
        { label: "Подтверждение доступа...", percent: 100, delay: 600 },
      ], header);

      const pwd = fakePassword();
      const result =
        `💪 <b>BRUTE FORCE — ВЗЛОМАН!</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n\n` +
        `<b>🔓 Пароль найден:</b>\n` +
        `<code>${pwd}</code>\n\n` +
        `📊 Проверено комбинаций: <b>${(1200000 + Math.floor(Math.random() * 1500000)).toLocaleString()}</b>\n` +
        `⏱ Время брута: <b>${(8 + Math.random() * 22).toFixed(1)}с</b>\n` +
        `🔥 Скорость: <b>${(80000 + Math.floor(Math.random() * 120000)).toLocaleString()} п/с</b>\n\n` +
        `<code>✅ Доступ получен</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- WAF BYPASS ---
  {
    key: "waf",
    emoji: "🛡️",
    name: "WAF Bypass",
    prompt: "Введи URL целевого сайта:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🛡️ <b>WAF BYPASS</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Анализ защиты...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Fingerprint WAF-системы...", percent: 15, delay: 800 },
        { label: "Генерация bypass-пейлоадов...", percent: 30, delay: 900 },
        { label: "Тестирование векторов обхода...", percent: 50, delay: 1100 },
        { label: "Обход Cloudflare...", percent: 68, delay: 1000 },
        { label: "Инъекция SQL-пейлоада...", percent: 85, delay: 800 },
        { label: "Экфильтрация данных...", percent: 100, delay: 600 },
      ], header);

      const wafTypes = ["Cloudflare", "AWS WAF", "ModSecurity", "Imperva"];
      const waf = wafTypes[Math.floor(Math.random() * wafTypes.length)];
      const result =
        `🛡️ <b>WAF BYPASS — ПРОБИТ!</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n` +
        `🔍 WAF-система: <b>${waf}</b>\n` +
        `⚡ Вектор обхода: <code>Unicode-encode + chunked transfer</code>\n\n` +
        `<b>📋 Данные из БД:</b>\n` +
        `<code>id=1 | admin | ${fakeEmail()} | ${fakeHash()}</code>\n` +
        `<code>id=2 | user  | ${fakeEmail()} | ${fakeHash()}</code>\n` +
        `<code>id=3 | moder | ${fakeEmail()} | ${fakeHash()}</code>\n\n` +
        `🗃 Таблиц найдено: <b>${3 + Math.floor(Math.random() * 10)}</b>\n` +
        `📦 Записей слито: <b>${100 + Math.floor(Math.random() * 900)}</b>\n\n` +
        `<code>✅ WAF успешно обойден</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- OSINT SCANNER ---
  {
    key: "osint",
    emoji: "🔍",
    name: "OSINT Scanner",
    prompt: "Введи ФИО, username или email:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🔍 <b>OSINT SCANNER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Запуск разведки...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Поиск в открытых источниках...", percent: 12, delay: 800 },
        { label: "Сканирование социальных сетей...", percent: 28, delay: 900 },
        { label: "Анализ форумов и утечек...", percent: 48, delay: 1000 },
        { label: "Корреляция данных...", percent: 68, delay: 900 },
        { label: "Построение профиля...", percent: 88, delay: 700 },
        { label: "Финализация отчёта...", percent: 100, delay: 500 },
      ], header);

      const socials = ["VK ✅", "Telegram ✅", "Instagram ✅", "Facebook ✅", "GitHub ❌", "LinkedIn ✅"].slice(0, 3 + Math.floor(Math.random() * 3));
      const result =
        `🔍 <b>OSINT — ПРОФИЛЬ ПОСТРОЕН</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n\n` +
        `<b>📱 Социальные сети:</b>\n${socials.map(s => `  • ${s}`).join("\n")}\n\n` +
        `<b>📊 Найдено данных:</b>\n` +
        `  • Email: <code>${fakeEmail()}</code>\n` +
        `  • Телефон: <code>+7 9${Math.floor(Math.random() * 90 + 10)}${Math.floor(Math.random() * 9000000 + 1000000)}</code>\n` +
        `  • IP-адрес: <code>${fakeIP()}</code>\n` +
        `  • Город: <b>${FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)]}</b>\n\n` +
        `📁 Упоминаний в сети: <b>${50 + Math.floor(Math.random() * 450)}</b>\n` +
        `💾 Утечек с данными: <b>${Math.floor(Math.random() * 5)}</b>\n\n` +
        `<code>✅ OSINT-разведка завершена</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- PHONE TRACKER ---
  {
    key: "phone",
    emoji: "📱",
    name: "Phone Tracker",
    prompt: "Введи номер телефона (+7...):",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `📱 <b>PHONE TRACKER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Инициализация трекинга...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Запрос к SS7-сети...", percent: 18, delay: 900 },
        { label: "Триангуляция вышек...", percent: 38, delay: 1100 },
        { label: "Получение координат...", percent: 60, delay: 1000 },
        { label: "Определение оператора...", percent: 78, delay: 800 },
        { label: "Запись местоположения...", percent: 95, delay: 600 },
        { label: "Готово...", percent: 100, delay: 400 },
      ], header);

      const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
      const isp = FAKE_ISP[Math.floor(Math.random() * FAKE_ISP.length)];
      const lat = (55.0 + Math.random() * 5).toFixed(6);
      const lon = (37.0 + Math.random() * 10).toFixed(6);
      const result =
        `📱 <b>PHONE TRACKER — ЛОКАЦИЯ НАЙДЕНА</b>\n\n` +
        `🎯 Номер: <code>${target}</code>\n` +
        `📡 Оператор: <b>${isp}</b>\n` +
        `🏙 Регион: <b>${city}</b>\n\n` +
        `<b>📍 Координаты:</b>\n` +
        `<code>Широта:  ${lat}</code>\n` +
        `<code>Долгота: ${lon}</code>\n\n` +
        `🗼 Вышек использовано: <b>${3 + Math.floor(Math.random() * 5)}</b>\n` +
        `📶 Точность: <b>~${50 + Math.floor(Math.random() * 150)}м</b>\n` +
        `🔋 Статус: <b>${Math.random() > 0.3 ? "Онлайн 🟢" : "Последний раз 12 мин назад 🟡"}</b>\n\n` +
        `<code>✅ Местоположение установлено</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- DB LEAKER ---
  {
    key: "db",
    emoji: "🗄️",
    name: "DB Leaker",
    prompt: "Введи адрес сервера или домен:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🗄️ <b>DB LEAKER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Поиск открытых портов БД...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Сканирование портов 3306/5432...", percent: 14, delay: 800 },
        { label: "Подбор credentials...", percent: 30, delay: 900 },
        { label: "Подключение к БД...", percent: 50, delay: 1000 },
        { label: "Перечисление таблиц...", percent: 68, delay: 900 },
        { label: "Экспорт данных...", percent: 85, delay: 1100 },
        { label: "Сжатие и сохранение...", percent: 100, delay: 500 },
      ], header);

      const dbType = ["MySQL 8.0", "PostgreSQL 15", "MongoDB 7", "MariaDB 10.6"][Math.floor(Math.random() * 4)];
      const tables = ["users", "orders", "payments", "sessions", "logs", "admin", "products"];
      const selected = tables.slice(0, 3 + Math.floor(Math.random() * 4));
      const result =
        `🗄️ <b>DB LEAKER — БАЗА СЛИТА</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n` +
        `🛢 СУБД: <b>${dbType}</b>\n` +
        `🔑 Credentials: <code>root:${fakePassword()}</code>\n\n` +
        `<b>📋 Таблицы:</b>\n${selected.map(t => `  • ${t} (${100 + Math.floor(Math.random() * 9900)} строк)`).join("\n")}\n\n` +
        `📦 Размер дампа: <b>${(0.5 + Math.random() * 9.5).toFixed(1)} MB</b>\n` +
        `🗃 Всего записей: <b>${(5000 + Math.floor(Math.random() * 95000)).toLocaleString()}</b>\n\n` +
        `<code>✅ База данных успешно слита</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- SOCIAL ENGINEERING ---
  {
    key: "social",
    emoji: "🧠",
    name: "Social Eng.",
    prompt: "Введи цель (username/email/ФИО):",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🧠 <b>SOCIAL ENGINEERING</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Построение психологического профиля...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Сбор открытых данных о цели...", percent: 15, delay: 900 },
        { label: "Анализ поведенческих паттернов...", percent: 30, delay: 1000 },
        { label: "Подбор легенды...", percent: 48, delay: 900 },
        { label: "Создание фишинговой страницы...", percent: 65, delay: 1000 },
        { label: "Отправка сообщения-приманки...", percent: 82, delay: 800 },
        { label: "Ожидание реакции...", percent: 100, delay: 600 },
      ], header);

      const result =
        `🧠 <b>SOCIAL ENG. — УСПЕХ</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n\n` +
        `<b>🎭 Использованная легенда:</b>\n` +
        `<code>Сотрудник техподдержки банка</code>\n\n` +
        `<b>📊 Результат:</b>\n` +
        `  • Цель перешла по ссылке ✅\n` +
        `  • Ввела логин/пароль ✅\n` +
        `  • Код из SMS получен ✅\n\n` +
        `🔑 Полученные данные:\n` +
        `<code>login: ${fakeEmail()}</code>\n` +
        `<code>pass:  ${fakePassword()}</code>\n` +
        `<code>otp:   ${Math.floor(100000 + Math.random() * 900000)}</code>\n\n` +
        `<code>✅ Цель скомпрометирована</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- NET SNIFFER ---
  {
    key: "sniffer",
    emoji: "📡",
    name: "Net Sniffer",
    prompt: "Введи IP-адрес или диапазон сети:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `📡 <b>NET SNIFFER</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Запуск перехвата трафика...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "ARP-poisoning...", percent: 18, delay: 900 },
        { label: "Перехват пакетов...", percent: 38, delay: 1100 },
        { label: `Захвачено пакетов: ${(Math.floor(Math.random() * 5000 + 1000)).toLocaleString()}`, percent: 58, delay: 1000 },
        { label: "Декодирование протоколов...", percent: 76, delay: 800 },
        { label: "Извлечение credentials...", percent: 92, delay: 700 },
        { label: "Формирование отчёта...", percent: 100, delay: 500 },
      ], header);

      const result =
        `📡 <b>NET SNIFFER — ПАКЕТЫ ПЕРЕХВАЧЕНЫ</b>\n\n` +
        `🎯 Сеть: <code>${target}</code>\n` +
        `📦 Пакетов перехвачено: <b>${(5000 + Math.floor(Math.random() * 45000)).toLocaleString()}</b>\n\n` +
        `<b>🔑 Перехваченные credentials:</b>\n` +
        `<code>FTP  → ${fakeEmail()}:${fakePassword()}</code>\n` +
        `<code>HTTP → ${fakeEmail()}:${fakePassword()}</code>\n\n` +
        `<b>📋 Активные хосты:</b>\n` +
        Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => `  <code>${fakeIP()}</code>`).join("\n") + "\n\n" +
        `<code>✅ Сниффинг завершён</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- HASH CRACKER ---
  {
    key: "hash",
    emoji: "🔐",
    name: "Hash Cracker",
    prompt: "Введи MD5/SHA хэш:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `🔐 <b>HASH CRACKER</b>\n🎯 Хэш: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Анализ хэша...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Определение алгоритма хэширования...", percent: 12, delay: 700 },
        { label: "Поиск в Rainbow Tables...", percent: 30, delay: 900 },
        { label: "Brute-force атака...", percent: 52, delay: 1100 },
        { label: "Dictionary attack...", percent: 72, delay: 900 },
        { label: "Совпадение найдено!", percent: 92, delay: 700 },
        { label: "Расшифровка...", percent: 100, delay: 500 },
      ], header);

      const algo = target.length === 32 ? "MD5" : target.length === 40 ? "SHA-1" : "SHA-256";
      const result =
        `🔐 <b>HASH CRACKER — ВЗЛОМАН!</b>\n\n` +
        `📋 Хэш: <code>${target.slice(0, 20)}...</code>\n` +
        `🔎 Алгоритм: <b>${algo}</b>\n\n` +
        `<b>🔓 Исходный текст:</b>\n` +
        `<code>${fakePassword()}</code>\n\n` +
        `📊 Метод: <b>Rainbow Table + Dict</b>\n` +
        `⏱ Время: <b>${(0.3 + Math.random() * 4).toFixed(2)}с</b>\n` +
        `🔢 Комбинаций: <b>${(1000000 + Math.floor(Math.random() * 9000000)).toLocaleString()}</b>\n\n` +
        `<code>✅ Хэш успешно расшифрован</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- DEEP OSINT ---
  {
    key: "deep_osint",
    emoji: "👁️",
    name: "Deep OSINT",
    prompt: "Введи ФИО или ID для глубокого досье:",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `👁️ <b>DEEP OSINT</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Запуск глубокой разведки...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Поиск в государственных реестрах...", percent: 10, delay: 1000 },
        { label: "Анализ судебных баз данных...", percent: 25, delay: 1100 },
        { label: "Сканирование даркнета...", percent: 42, delay: 1200 },
        { label: "Поиск по утечкам данных...", percent: 60, delay: 1000 },
        { label: "Сбор финансовой информации...", percent: 78, delay: 900 },
        { label: "Построение связей и графа...", percent: 92, delay: 800 },
        { label: "Компиляция досье...", percent: 100, delay: 600 },
      ], header);

      const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
      const result =
        `👁️ <b>DEEP OSINT — ДОСЬЕ ГОТОВО</b>\n\n` +
        `🎯 Субъект: <code>${target}</code>\n\n` +
        `<b>📋 Личные данные:</b>\n` +
        `  📍 Адрес: <b>г. ${city}, ул. Ленина ${Math.floor(Math.random() * 200) + 1}</b>\n` +
        `  📞 Телефон: <code>+7 9${Math.floor(Math.random() * 90 + 10)}${Math.floor(Math.random() * 9000000 + 1000000)}</code>\n` +
        `  📧 Email: <code>${fakeEmail()}</code>\n` +
        `  🆔 СНИЛС: <code>${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 90 + 10)}</code>\n\n` +
        `<b>💰 Финансы:</b>\n` +
        `  🏦 Банк: <b>${["Сбербанк", "ВТБ", "Тинькофф", "Альфа-Банк"][Math.floor(Math.random() * 4)]}</b>\n` +
        `  💳 Карта: <code>4*** **** **** ${Math.floor(Math.random() * 9000 + 1000)}</code>\n\n` +
        `🌐 Найдено упоминаний: <b>${100 + Math.floor(Math.random() * 900)}</b>\n` +
        `🕸 В даркнете: <b>${Math.random() > 0.6 ? "Найдены данные ⚠️" : "Не найдено ✅"}</b>\n\n` +
        `<code>✅ Полное досье сформировано</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },

  // --- CLOUD BYPASS ---
  {
    key: "cloud",
    emoji: "☁️",
    name: "Cloud Bypass",
    prompt: "Введи домен или email (облачный аккаунт):",
    run: async (ctx, target) => {
      const chatId = ctx.chat!.id;
      const header = `☁️ <b>CLOUD BYPASS</b>\n🎯 Цель: <code>${target}</code>`;
      const msg = await ctx.reply(`${header}\n\n<code>Анализ облачной инфраструктуры...</code>`, { parse_mode: "HTML" });
      await animateProgress(ctx, msg.message_id, chatId, [
        { label: "Fingerprint облачного провайдера...", percent: 14, delay: 800 },
        { label: "Поиск открытых S3-бакетов...", percent: 30, delay: 900 },
        { label: "Перебор IAM-ролей...", percent: 48, delay: 1000 },
        { label: "Эксплойт SSRF уязвимости...", percent: 65, delay: 1100 },
        { label: "Получение IAM credentials...", percent: 82, delay: 900 },
        { label: "Расширение привилегий...", percent: 100, delay: 600 },
      ], header);

      const clouds = ["AWS", "Google Cloud", "Azure", "Yandex Cloud"];
      const cloud = clouds[Math.floor(Math.random() * clouds.length)];
      const result =
        `☁️ <b>CLOUD BYPASS — ДОСТУП ПОЛУЧЕН</b>\n\n` +
        `🎯 Цель: <code>${target}</code>\n` +
        `☁️ Провайдер: <b>${cloud}</b>\n\n` +
        `<b>🔑 IAM Credentials:</b>\n` +
        `<code>Access Key: AKIA${fakeToken().slice(0, 16).toUpperCase()}</code>\n` +
        `<code>Secret Key: ${fakeToken().slice(0, 32)}</code>\n\n` +
        `<b>📦 Найдено ресурсов:</b>\n` +
        `  • Бакеты/хранилища: <b>${2 + Math.floor(Math.random() * 8)}</b>\n` +
        `  • VM-инстанций: <b>${1 + Math.floor(Math.random() * 10)}</b>\n` +
        `  • БД: <b>${1 + Math.floor(Math.random() * 5)}</b>\n` +
        `  • Суммарно данных: <b>${(1 + Math.random() * 99).toFixed(1)} GB</b>\n\n` +
        `<code>✅ Полный доступ к облаку получен</code>`;
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, { parse_mode: "HTML" });
    },
  },
];

export const METHOD_MAP: Record<string, Method> = Object.fromEntries(
  METHODS.map((m) => [m.key, m])
);
