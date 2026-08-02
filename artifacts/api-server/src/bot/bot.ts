import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import fs from "fs";
import path from "path";
import dns from "dns";
import { indexFile, loadAllFromIndex, removeFile, getIndexedFiles, isInIndex } from "./local-db/syncer.js";
import { search, formatResults } from "./local-db/search.js";
import { getStats } from "./local-db/mem-db.js";
import {
  hasActiveSubscription,
  getSubscription,
  grantSubscription,
  revokeSubscription,
  getAllSubscriptions,
  getActiveSubscriptions,
  getWelcomeMedia,
  setWelcomeMedia,
  clearWelcomeMedia,
  trackUser,
  incrementOps,
  getUserStats,
  getAllUsers,
  flushStore,
  addSession,
  removeSession,
  getSessions,
  getAllSessions,
  clearSessions,
  acceptAgreement,
  getUserAgreement,
  hasAcceptedAgreement,
} from "./store.js";
import {
  mainKeyboard,
  snosKeyboard,
  snosReportsKeyboard,
  snosSessionsKeyboard,
  osintKeyboard,
  osintBasicKeyboard,
  osintEmailKeyboard,
  osintPhoneKeyboard,
  osintSocialKeyboard,
  osintNetworkKeyboard,
  osintCamerasKeyboard,
  osintDeepKeyboard,
  toolsKeyboard,
  toolsWebKeyboard,
  toolsNetworkKeyboard,
  toolsSecurityKeyboard,
  toolsTelegramKeyboard,
  backMainKeyboard,
  adminKeyboard,
} from "./keyboards.js";
import {
  AGREEMENT_ARTICLES,
  getAgreementKeyboard,
  getAgreementStatusKeyboard,
  AGREEMENT_VERSION,
} from "./agreements.js";
import { getCache, setCache, getCacheStats, cleanupCache, clearAllCache } from "./cache.js";
import { SNOS_METHODS, SNOS_MAP } from "./snos.js";
import { OSINT_METHODS, OSINT_MAP, handleDossierDone, runSmartOsint, safeFetch, type DossierEntry, TYPE_CONFIG, buildDossierNavigation } from "./osint.js";
import { TOOLS, TOOLS_MAP } from "./tools.js";
import { formatDate, timeLeft } from "./visual.js";
import { emailStressTest, addEmail, removeEmail, getEmails } from "./emailstress.js";
import { logger } from "../lib/logger.js";
import { listSessions, saveSession, getSessionStats } from "./session-manager.js";

// ─── Admin management ──────────────────────────────────────────────────────────
const ADMIN_IDS = new Set<number>();

function syncConfiguredAdmins(): void {
  const value = process.env.ADMIN_IDS || process.env.ADMIN_ID || "";
  for (const rawId of value.split(",")) {
    const adminId = Number(rawId.trim());
    if (Number.isSafeInteger(adminId) && adminId > 0) {
      ADMIN_IDS.add(adminId);
    }
  }
}

function isAdmin(userId: number): boolean {
  // index.ts loads .env after static module imports, therefore this check must
  // read the environment lazily instead of relying on module initialization.
  syncConfiguredAdmins();
  return ADMIN_IDS.has(userId);
}

// ─── State machine ─────────────────────────────────────────────────────────────
type State =
  | { tab: "snos"; key: string; step: "mode_select" }
  | { tab: "snos"; key: string; step: "input"; mode: "fake" | "session" }
  | { tab: "osint"; key: string; step: "input" }
  | { tab: "tools"; key: string; step: "input" }
  | { tab: "snos_multi"; key: string; step: "input" }
  | { tab: "admin"; key: "setphoto" | "broadcast" | "session_upload"; step: "input" }
  | { tab: "dbsearch"; step: "input" }
  | { tab: "agreement"; step: "reading" | "accept" };

const userStates = new Map<number, State>();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function noSub(id: number): string {
  const sub = getSubscription(id);
  const expired = sub && sub.expiresAt <= Date.now();
  return (
    `[ НЕТ ДОСТУПА ]\n\n` +
    (expired ? `[-] Подписка истекла.\n\n` : `Нет активной подписки.\n\n`) +
    `ID: <code>${id}</code>\n\n` +
    `Нажмите кнопку ниже чтобы получить доступ.`
  );
}

/** Check if user has accepted all required agreements. Returns true if accepted (or no articles required). */
function checkAgreements(userId: number): boolean {
  const required = AGREEMENT_ARTICLES.map((a) => a.id);
  return hasAcceptedAgreement(userId, required);
}

/** Send agreement prompt if not accepted */
async function ensureAgreements(ctx: any): Promise<boolean> {
  if (checkAgreements(ctx.from.id)) return true;
  userStates.delete(ctx.from.id);
  userStates.set(ctx.from.id, { tab: "agreement", step: "reading" });
  const article = AGREEMENT_ARTICLES[0];
  await ctx.reply(
    `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
    `Для использования бота необходимо принять соглашения.\n\n` +
    `${article.icon} <b>${article.title}</b>\n\n` +
    `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
    article.content.slice(0, 3000) +
    `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
    `<i>Это только начало. Нажмите «Далее» чтобы прочитать остальные.</i>`,
    { parse_mode: "HTML", ...getAgreementKeyboard() }
  );
  return false;
}

// ─── Audit log ────────────────────────────────────────────────────────────────
interface AuditEntry {
  timestamp: number;
  actorId: number;
  action: string;
  outcome: string;
}

const auditLog: AuditEntry[] = [];

function auditEvent(entry: Omit<AuditEntry, "timestamp">): void {
  auditLog.push({ ...entry, timestamp: Date.now() });
  if (auditLog.length > 500) auditLog.splice(0, auditLog.length - 500);
  logger.info({ actorId: entry.actorId, action: entry.action, outcome: entry.outcome }, "audit");
}

function getAuditEvents(limit = 30): AuditEntry[] {
  return auditLog.slice(-limit).reverse();
}

// ─── Feature gating ───────────────────────────────────────────────────────────
const RESTRICTED_FEATURES = new Set<string>();

function canUseRestrictedFeature(isAdminUser: boolean): boolean {
  return true;
}

function canUseOsint(userId: number, isAdminUser: boolean, methodKey: string): boolean {
  if (isAdminUser) return true;
  if (RESTRICTED_FEATURES.has(methodKey)) {
    return false;
  }
  return true;
}

const restrictedFeatureMessage =
  `[!] <b>Функция ограничена</b>\n\n` +
  `Этот метод временно недоступен.\n` +
  `Обратитесь к администратору для разблокировки.`;

async function editSafe(
  ctx: any,
  text: string,
  keyboard: ReturnType<typeof Markup.inlineKeyboard>
) {
  try {
    await (ctx as any).editMessageCaption(text, { parse_mode: "HTML", ...keyboard });
  } catch {
    try {
      await (ctx as any).editMessageText(text, { parse_mode: "HTML", ...keyboard });
    } catch {}
  }
}

function welcomeText(firstName?: string): string {
  return (
    `<b>⚡ 𝕾𝕹𝕺𝕾 𝕿𝕺𝕺𝕷𝕾</b>\n` +
    `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
    `[᛫] Привет${firstName ? `, <b>${firstName}</b>` : ""}.\n\n` +
    `<i>Полный спектр аналитики и противодействия.</i>\n\n` +
    `<b>▸ МОДУЛИ:</b>\n` +
    `▓ <b>СНОС</b> — ${SNOS_METHODS.length} схем\n` +
    `◈ <b>OSINT</b> — ${OSINT_METHODS.length} методов\n` +
    `◆ <b>ИНСТРУМЕНТАРИЙ</b> — ${TOOLS.length} инструментов\n\n` +
    `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n` +
    `<i>Доступ по ключу. /buy</i>`
  );
}

function profileText(userId: number, username?: string, firstName?: string): string {
  const sub = getSubscription(userId);
  const active = sub && sub.expiresAt > Date.now();
  const stats = getUserStats(userId);
  const subLine = active
    ? `✓ <b>Активна</b> — осталось <b>${timeLeft(sub!.expiresAt)}</b>\n   Истекает: <code>${formatDate(sub!.expiresAt)}</code>`
    : `✗ <b>Нет подписки</b>`;
  return (
    `◉ <b>Профиль</b>\n\n` +
    `ID: <code>${userId}</code>\n` +
    `Username: ${username ? `@${username}` : "—"}\n` +
    `Имя: ${firstName ?? "—"}\n\n` +
    `<b>▸ Подписка:</b>\n${subLine}\n\n` +
    (stats ? `<b>▸ Использование:</b>\n◆ Операций выполнено: <b>${stats.operations}</b>\n◈ Первый запуск: <b>${formatDate(stats.firstSeen)}</b>\n\n` : "") +
    (active ? `◇ Доступ: <b>Открыт</b>` : `[#] Доступ: <b>Закрыт</b>`)
  );
}

function myStatsText(userId: number): string {
  const stats = getUserStats(userId);
  const sub = getSubscription(userId);
  const active = sub && sub.expiresAt > Date.now();
  return (
    `📊 <b>Твоя статистика</b>\n\n` +
    `ID: <code>${userId}</code>\n\n` +
    `<b>▸ Подписка:</b> ${active ? `✓ Активна (${timeLeft(sub!.expiresAt)})` : "✗ Нет"}\n\n` +
    `<b>▸ Операции:</b>\n` +
    `◆ Всего выполнено: <b>${stats?.operations ?? 0}</b>\n` +
    `◈ Первый запуск: <b>${stats ? formatDate(stats.firstSeen) : "—"}</b>\n` +
    `▸ Последний визит: <b>${stats ? formatDate(stats.lastSeen) : "—"}</b>\n\n` +
    `<b>▸ Доступно разделов:</b>\n` +
    `▓ Снос: <b>${SNOS_METHODS.length}</b> методов\n` +
    `◈ OSINT: <b>${OSINT_METHODS.length}</b> методов\n` +
    `◆ Инструменты: <b>${TOOLS.length}</b> методов`
  );
}

function checkSub(ctx: any): boolean {
  return hasActiveSubscription(ctx.from?.id ?? 0);
}

const DB_CHANNEL_ID = process.env["DB_CHANNEL_ID"] ?? "";

// ─── Bot factory ───────────────────────────────────────────────────────────────
export function createBot(token: string): { bot: Telegraf; initDb: () => Promise<void> } {
  const bot = new Telegraf(token);
  syncConfiguredAdmins();
  if (ADMIN_IDS.size === 0) {
    logger.warn("ADMIN_ID or ADMIN_IDS is not configured; /admin will be unavailable");
  } else {
    logger.info({ admins: ADMIN_IDS.size }, "Admin access configured");
  }
  const requestBuckets = new Map<number, { count: number; resetAt: number }>();

  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();
    const now = Date.now();
    const current = requestBuckets.get(userId);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + 60_000 }
      : current;
    bucket.count += 1;
    requestBuckets.set(userId, bucket);
    if (bucket.count > 30) {
      auditEvent({ actorId: userId, action: "telegram_rate_limit", outcome: "denied" });
      if ("reply" in ctx) await ctx.reply("Слишком много запросов. Подождите минуту.");
      return;
    }
    const commandText = ctx.message && "text" in ctx.message ? ctx.message.text : undefined;
    if (commandText?.startsWith("/")) {
      const command = commandText.split(/\s+/, 1)[0]!.split("@")[0];
      auditEvent({ actorId: userId, action: `command:${command}`, outcome: "allowed" });
    }
    return next();
  });

  // ══ /start ══
  // Telegram can deliver callbacks that were created before a restart. They are
  // no longer answerable after Telegram's timeout and must not stop polling.
  bot.catch((err, ctx) => {
    logger.warn(
      { err, updateId: ctx.update.update_id },
      "Telegram update was not processed",
    );
  });

  bot.start(async (ctx) => {
    userStates.delete(ctx.from.id);
    trackUser(ctx.from.id, ctx.from.username, ctx.from.first_name);

    // Check agreements first
    if (!checkAgreements(ctx.from.id)) {
      userStates.set(ctx.from.id, { tab: "agreement", step: "reading" });
      const article = AGREEMENT_ARTICLES[0];
      await ctx.reply(
        `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
        `Для использования бота необходимо принять соглашения.\n\n` +
        `${article.icon} <b>${article.title}</b>\n\n` +
        `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        article.content.slice(0, 3000) +
        `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        `<i>Это только начало. Нажмите «Далее» чтобы прочитать остальные.</i>`,
        { parse_mode: "HTML", ...getAgreementKeyboard() }
      );
      return;
    }

    const text = welcomeText(ctx.from.first_name);
    const media = getWelcomeMedia();
    try {
      if (media?.type === "animation") {
        await ctx.replyWithAnimation(media.fileId, { caption: text, parse_mode: "HTML", ...mainKeyboard });
      } else if (media?.type === "photo") {
        await ctx.replyWithPhoto(media.fileId, { caption: text, parse_mode: "HTML", ...mainKeyboard });
      } else {
        await ctx.replyWithAnimation("https://i.imgur.com/9ZmHBJa.gif", {
          caption: text,
          parse_mode: "HTML",
          ...mainKeyboard,
        });
      }
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...mainKeyboard });
    }
  });

  // ══ /id ══  (доступно всем без подписки)
  bot.command("id", async (ctx) => {
    const { id, username, first_name } = ctx.from;
    trackUser(id, username, first_name);
    await ctx.reply(
      `◉ <b>Твой Telegram ID</b>\n\n` +
      `<code>${id}</code>\n\n` +
      `Username: ${username ? `@${username}` : "—"}\n` +
      `Имя: ${first_name ?? "—"}\n\n` +
      `<i>Отправь этот ID администратору для получения подписки.</i>`,
      { parse_mode: "HTML" }
    );
  });

  // ══ /cancel ══
  bot.command("cancel", async (ctx) => {
    userStates.delete(ctx.from.id);
    await ctx.reply("✗ Отменено.", backMainKeyboard);
  });

  // ══ /dossier_done — завершить составление досье ══
  bot.command("dossier_done", async (ctx) => {
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "osint" || state.key !== "dossier") {
      await ctx.reply("📋 Досье не собрано. Начни с /osint → 📋 Составить досье", backMainKeyboard);
      return;
    }
    const done = await handleDossierDone(ctx, state as any);
    if (done) userStates.delete(ctx.from.id);
  });

  // ══ /dossier_cancel — отменить составление досье ══
  bot.command("dossier_cancel", async (ctx) => {
    const state = userStates.get(ctx.from.id);
    if (state?.tab === "osint" && state.key === "dossier") {
      userStates.delete(ctx.from.id);
      await ctx.reply("❌ Составление досье отменено.", backMainKeyboard);
    } else {
      await ctx.reply("❌ Нет активного досье.", backMainKeyboard);
    }
  });

  // ══ /agreement ══
  bot.command("agreement", async (ctx) => {
    const ag = getUserAgreement(ctx.from.id);
    const accepted = ag ? ag.articles.map((id) => AGREEMENT_ARTICLES.find((a) => a.id === id)).filter(Boolean) : [];
    const lines = accepted.map((a) => `${a!.icon} <b>${a!.title}</b>`).join("\n");
    await ctx.reply(
      `<b>📋 Соглашения SNOS Tools</b>\n\n` +
      `Версия: <code>${AGREEMENT_VERSION}</code>\n\n` +
      `<b>Статьи:</b>\n` +
      AGREEMENT_ARTICLES.map((a) => `${a.icon} <b>${a.title}</b>`).join("\n") +
      (accepted.length ? `\n\n<b>Принятые:</b>\n${lines}` : `\n\n<i>Вы ещё не приняли соглашения. Нажмите на статью выше для чтения.</i>`) +
      `\n\n<i>Для использования бота необходимо принять все статьи.</i>`,
      { parse_mode: "HTML", ...getAgreementKeyboard() }
    );
  });

  // ══ /clearcache ══
  bot.command("clearcache", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("✗ Нет доступа");
      return;
    }
    const before = getCacheStats();
    clearAllCache();
    await ctx.reply(
      `✓ Кэш очищен.\n\n` +
      `Было записей: <b>${before.total}</b>\n` +
      `Из них просрочено: <b>${before.expired}</b>\n\n` +
      `Все OSINT-данные будут обновлены при следующем запросе.`,
      { parse_mode: "HTML", reply_markup: backMainKeyboard }
    );
  });

  // ══ /help ══
  bot.command("help", async (ctx) => {
    trackUser(ctx.from.id, ctx.from.username, ctx.from.first_name);
    await ctx.reply(
      `📖 <b>SNOS Tools — Помощь</b>\n\n` +
      `<b>Команды:</b>\n` +
      `/start — главное меню\n` +
      `/id — показать свой Telegram ID\n` +
      `/cancel — отменить текущее действие\n` +
      `/help — эта справка\n\n` +
      `<b>Разделы:</b>\n` +
      `▓ <b>СНОС</b> — ${SNOS_METHODS.length} типов жалоб\n` +
      `◈ <b>OSINT</b> — ${OSINT_METHODS.length} методов разведки\n` +
      `◆ <b>ИНСТРУМЕНТЫ</b> — ${TOOLS.length} методов\n\n` +
      `<b>Как получить подписку:</b>\n` +
      `1. Введи /id и скопируй свой ID\n` +
      `2. Передай ID администратору\n` +
      `3. Дождись активации и нажми /start\n\n` +
      `<i>Весь контент исключительно визуальный, для демонстраций.</i>`,
      { parse_mode: "HTML", reply_markup: backMainKeyboard }
    );
  });

  // ══ /admin ══
  bot.command("privacy", async (ctx) => {
    await ctx.reply(
      "<b>Конфиденциальность и правила доступа</b>\n\n" +
      "Бот хранит Telegram ID, username, имя, статус подписки, статистику и журнал действий. " +
      "Поисковые запросы и тексты сообщений в журнал не записываются.\n\n" +
      "Публично доступны только проверки инфраструктуры и открытых источников. Чувствительные функции отключены по умолчанию. " +
      "Запросить удаление своих данных можно у администратора.",
      { parse_mode: "HTML", reply_markup: backMainKeyboard },
    );
  });

  bot.command("audit", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const events = getAuditEvents(30);
    const lines = events.length
      ? events.map((event) => {
          const time = new Date(event.timestamp).toISOString().replace("T", " ").slice(0, 19);
          return `<code>${time}</code> — ${event.actorId} — ${event.action} — ${event.outcome}`;
        })
      : ["Журнал пока пуст."];
    await ctx.reply(`<b>Журнал действий</b>\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
  });

  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply(
        `⛔ <b>Нет доступа к панели администратора</b>\n\n` +
        `Ваш Telegram ID: <code>${ctx.from.id}</code>\n` +
        `Добавьте его в ADMIN_ID или ADMIN_IDS и перезапустите бота.`,
        { parse_mode: "HTML" },
      );
      return;
    }
    await ctx.reply(
      `▣ <b>Панель администратора</b>\n\n` +
      `<b>▸ Подписки:</b>\n` +
      `/grant &lt;id&gt; &lt;дней&gt; — выдать подписку\n` +
      `/revoke &lt;id&gt; — отозвать подписку\n` +
      `/extend &lt;id&gt; &lt;дней&gt; — продлить подписку\n` +
      `/subs — список активных подписок\n\n` +
      `<b>▸ Сессии:</b>\n` +
      `/addsession &lt;user_id&gt; &lt;device&gt; &lt;platform&gt; &lt;ip&gt; &lt;location&gt; — добавить сессию\n` +
      `/removesession &lt;user_id&gt; &lt;session_id&gt; — удалить сессию\n` +
      `/sessions &lt;user_id&gt; — список сессий\n` +
      `/nuksessions &lt;user_id&gt; — удалить все сессии\n\n` +
      `<b>▸ Почты:</b>\n` +
      `/addemail &lt;email&gt; &lt;пароль&gt; — добавить тестовую почту\n` +
      `/delemail &lt;email&gt; — удалить почту\n` +
      `/emails — список почт\n\n` +
      `<b>▸ Стресс:</b>\n` +
      `/stress &lt;email&gt; &lt;кол-во&gt; — стресс-тест email\n\n` +
      `<b>▸ Админы:</b>\n` +
      `/addadmin &lt;id&gt; — добавить админа\n` +
      `/removeadmin &lt;id&gt; — удалить админа\n` +
      `/admins — список админов\n\n` +
      `<b>▸ Прочее:</b>\n` +
      `/broadcast &lt;текст&gt; — рассылка всем\n\n` +
      `<i>Пример: /grant 123456789 30</i>`,
      { parse_mode: "HTML", ...adminKeyboard }
    );
  });

  // ══ /grant ══
  bot.command("grant", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 3) { await ctx.reply("✗ /grant &lt;id&gt; &lt;дней&gt;", { parse_mode: "HTML" }); return; }
    const targetId = Number(parts[1]);
    const days = Number(parts[2]);
    if (isNaN(targetId) || isNaN(days) || days <= 0) { await ctx.reply("✗ Неверные параметры."); return; }
    const sub = grantSubscription(targetId, undefined, undefined, days, ctx.from.id);
    await ctx.reply(
      `✓ <b>Подписка выдана</b>\n\nID: <code>${targetId}</code>\nДо: <code>${formatDate(sub.expiresAt)}</code>\nСрок: <b>${days} дн.</b>`,
      { parse_mode: "HTML" }
    );
    try {
      await bot.telegram.sendMessage(
        targetId,
        `✓ <b>Подписка активирована!</b>\n\nВыдана на <b>${days} дней</b>\nИстекает: <code>${formatDate(sub.expiresAt)}</code>\n\n/start для доступа`,
        { parse_mode: "HTML" }
      );
    } catch {}
  });

  // ══ /revoke ══
  bot.command("revoke", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) { await ctx.reply("✗ /revoke &lt;id&gt;", { parse_mode: "HTML" }); return; }
    const ok = revokeSubscription(Number(parts[1]));
    await ctx.reply(ok ? `✓ Подписка <code>${parts[1]}</code> отозвана.` : `✗ Подписки нет.`, { parse_mode: "HTML" });
  });

  // ══ /extend ══ (продлить поверх текущей)
  bot.command("extend", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 3) { await ctx.reply("✗ /extend &lt;id&gt; &lt;дней&gt;", { parse_mode: "HTML" }); return; }
    const targetId = Number(parts[1]);
    const days = Number(parts[2]);
    if (isNaN(targetId) || isNaN(days) || days <= 0) { await ctx.reply("✗ Неверные параметры."); return; }
    const existing = getSubscription(targetId);
    if (!existing) { await ctx.reply(`✗ Подписки нет. Используй /grant для выдачи.`); return; }
    const sub = grantSubscription(targetId, existing.username, existing.firstName, days, ctx.from.id);
    await ctx.reply(
      `✓ <b>Подписка продлена</b>\n\nID: <code>${targetId}</code>\nНовая дата: <code>${formatDate(sub.expiresAt)}</code>\nДобавлено: <b>${days} дн.</b>`,
      { parse_mode: "HTML" }
    );
    try {
      await bot.telegram.sendMessage(
        targetId,
        `✓ <b>Подписка продлена!</b>\n\nДобавлено <b>${days} дней</b>\nНовый срок: <code>${formatDate(sub.expiresAt)}</code>`,
        { parse_mode: "HTML" }
      );
    } catch {}
  });

  // ══ /subs ══
  bot.command("subs", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const active = getActiveSubscriptions();
    if (!active.length) { await ctx.reply("≡ Активных подписок нет."); return; }
    const lines = active.map((s, i) => {
      const u = s.username ? `@${s.username}` : `ID:${s.userId}`;
      return `${i + 1}. ${u} — до <code>${formatDate(s.expiresAt)}</code> (${timeLeft(s.expiresAt)})`;
    });
    await ctx.reply(`≡ <b>Активных: ${active.length}</b>\n\n` + lines.join("\n"), { parse_mode: "HTML" });
  });

  // ══ /broadcast ══
  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const text = ctx.message.text.replace(/^\/broadcast\s*/i, "").trim();
    if (!text) {
      await ctx.reply("✗ /broadcast &lt;текст сообщения&gt;", { parse_mode: "HTML" });
      return;
    }
    const users = getAllUsers();
    if (!users.length) {
      await ctx.reply("✗ Нет пользователей для рассылки.");
      return;
    }
    await ctx.reply(`📢 Рассылка <b>${users.length}</b> пользователям...`, { parse_mode: "HTML" });
    let sent = 0;
    let failed = 0;
    for (const u of users) {
      try {
        await bot.telegram.sendMessage(u.userId, `📢 <b>Сообщение от администратора:</b>\n\n${text}`, { parse_mode: "HTML" });
        sent++;
      } catch {
        failed++;
      }
      // Small delay to avoid flood limits
      await new Promise(r => setTimeout(r, 50));
    }
    await ctx.reply(`✓ Рассылка завершена\n\nОтправлено: <b>${sent}</b>\nОшибок: <b>${failed}</b>`, { parse_mode: "HTML" });
  });

  // ══ /addsession ══ (admin — добавить сессию для цели)
  bot.command("addsession", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 6) {
      await ctx.reply("✗ /addsession &lt;user_id&gt; &lt;device&gt; &lt;platform&gt; &lt;ip&gt; &lt;location&gt;", { parse_mode: "HTML" });
      return;
    }
    const userId = Number(parts[1]);
    const device = parts[2];
    const platform = parts[3];
    const ip = parts[4];
    const location = parts.slice(5).join(" ");
    const session = addSession(userId, device, platform, ip, location, ctx.from.id);
    await ctx.reply(
      `✓ <b>Сессия добавлена</b>\n\n` +
      `Цель: <code>${userId}</code>\n` +
      `Устройство: <b>${device}</b>\n` +
      `Платформа: <b>${platform}</b>\n` +
      `IP: <code>${ip}</code>\n` +
      `Локация: <b>${location}</b>`,
      { parse_mode: "HTML" }
    );
  });

  // ══ /removesession ══ (admin — удалить сессию)
  bot.command("removesession", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 3) {
      await ctx.reply("✗ /removesession &lt;user_id&gt; &lt;session_id&gt;", { parse_mode: "HTML" });
      return;
    }
    const userId = Number(parts[1]);
    const sessionId = parts[2];
    const ok = removeSession(userId, sessionId);
    await ctx.reply(ok ? `✓ Сессия <code>${sessionId}</code> удалена у <code>${userId}</code>.` : `✗ Сессия не найдена.`, { parse_mode: "HTML" });
  });

  // ══ /sessions ══ (admin — список сессий цели)
  bot.command("sessions", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply("✗ /sessions &lt;user_id&gt;", { parse_mode: "HTML" });
      return;
    }
    const userId = Number(parts[1]);
    const sessions = getSessions(userId);
    if (!sessions.length) {
      await ctx.reply(`≡ У пользователя <code>${userId}</code> сессий нет.`, { parse_mode: "HTML" });
      return;
    }
    const lines = sessions.map((s, i) =>
      `${i + 1}. <code>${s.sessionId}</code>\n   ▸ ${s.device} (${s.platform})\n   ◈ IP: <code>${s.ip}</code> | ${s.location}\n   ◆ Добавлена: ${formatDate(s.addedAt)}`
    );
    await ctx.reply(
      `📱 <b>Сессии пользователя ${userId} (${sessions.length}):</b>\n\n` + lines.join("\n\n"),
      { parse_mode: "HTML" }
    );
  });

  // ══ /nuksessions ══ (admin — удалить все сессии цели)
  bot.command("nuksessions", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply("✗ /nuksessions &lt;user_id&gt;", { parse_mode: "HTML" });
      return;
    }
    const userId = Number(parts[1]);
    const count = clearSessions(userId);
    await ctx.reply(
      `💥 <b>NUKE СЕССИЙ</b>\n\n` +
      `Цель: <code>${userId}</code>\n` +
      `Удалено сессий: <b>${count}</b>`,
      { parse_mode: "HTML" }
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CALLBACKS — navigation
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("back_main", async (ctx) => {
    await ctx.answerCbQuery();
    userStates.delete(ctx.from.id);
    await editSafe(ctx as any, welcomeText(ctx.from.first_name), mainKeyboard);
  });

  bot.action("profile", async (ctx) => {
    await ctx.answerCbQuery();
    const { id, username, first_name } = ctx.from;
    await editSafe(
      ctx as any,
      profileText(id, username, first_name),
      Markup.inlineKeyboard([[Markup.button.callback("◀ Назад", "back_main")]])
    );
  });

  bot.action("my_stats", async (ctx) => {
    await ctx.answerCbQuery();
    await editSafe(
      ctx as any,
      myStatsText(ctx.from.id),
      Markup.inlineKeyboard([[Markup.button.callback("◀ Назад", "back_main")]])
    );
  });

  bot.action("buy_sub", async (ctx) => {
    await ctx.answerCbQuery();
    const { id, username } = ctx.from;
    await editSafe(
      ctx as any,
      `▸ <b>Получить подписку</b>\n\n` +
      `Подписка выдаётся администратором вручную.\n\n` +
      `ID: <code>${id}</code>\n` +
      `Username: ${username ? `@${username}` : "—"}\n\n` +
      `Отправьте ID администратору и договоритесь о доступе.\n\n` +
      `<i>После активации вы получите уведомление.</i>`,
      Markup.inlineKeyboard([[Markup.button.callback("◀ Назад", "back_main")]])
    );
  });

  bot.action("about", async (ctx) => {
    await ctx.answerCbQuery();
    await editSafe(
      ctx as any,
      `[i] <b>О боте SNOS Tools</b>\n\n` +
      `<b>Разделы:</b>\n` +
      `▓ Снос — <b>${SNOS_METHODS.length}</b> типов жалоб\n` +
      `◈ OSINT — <b>${OSINT_METHODS.length}</b> методов разведки\n` +
      `◆ Инструменты — <b>${TOOLS.length}</b> методов\n\n` +
      `<b>Команды:</b>\n` +
      `/start /id /help /cancel\n\n` +
      `<b>Версия:</b> <code>4.0.0</code>\n` +
      `<b>Всего методов:</b> <code>${SNOS_METHODS.length + OSINT_METHODS.length + TOOLS.length}</code>\n\n` +
      `<i>Всё исключительно визуально. Для театра и демонстраций.</i>`,
      Markup.inlineKeyboard([[Markup.button.callback("◀ Назад", "back_main")]])
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1 — СНОС
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("tab_snos", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkAgreements(ctx.from.id)) {
      userStates.set(ctx.from.id, { tab: "snos", key: "pending", step: "input" });
      const article = AGREEMENT_ARTICLES[0];
      await ctx.reply(
        `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
        `Для использования раздела необходимо принять соглашения.\n\n` +
        `${article.icon} <b>${article.title}</b>\n\n` +
        `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        article.content.slice(0, 3000) +
        `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        `<i>Нажмите «Далее» чтобы прочитать остальные.</i>`,
        { parse_mode: "HTML", ...getAgreementKeyboard() }
      );
      return;
    }
    if (!canUseRestrictedFeature(isAdmin(ctx.from.id))) {
      auditEvent({ actorId: ctx.from.id, action: "tab_snos", outcome: "denied" });
      await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
      return;
    }
    if (!checkSub(ctx)) {
      await editSafe(
        ctx as any,
        noSub(ctx.from.id),
        Markup.inlineKeyboard([
          [Markup.button.callback("▸ Получить подписку", "buy_sub")],
          [Markup.button.callback("◀ Назад", "back_main")],
        ])
      );
      return;
    }
    const sub = getSubscription(ctx.from.id)!;
    await editSafe(
      ctx as any,
      `▓ <b>СНОС АККАУНТА</b>\n\n` +
      `Sub: <b>${timeLeft(sub.expiresAt)}</b>\n\n` +
      `Выбери тип жалобы (${SNOS_METHODS.length} методов):`,
      snosKeyboard
    );
  });

  for (const m of SNOS_METHODS) {
    bot.action(`snos_${m.key}`, async (ctx) => {
      await ctx.answerCbQuery();
      if (!checkAgreements(ctx.from.id)) {
        userStates.set(ctx.from.id, { tab: "snos", key: m.key, step: "input" });
        const article = AGREEMENT_ARTICLES[0];
        await ctx.reply(
          `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
          `Для использования метода необходимо принять соглашения.\n\n` +
          `${article.icon} <b>${article.title}</b>\n\n` +
          `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
          article.content.slice(0, 3000) +
          `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
          `<i>Нажмите «Далее» чтобы прочитать остальные.</i>`,
          { parse_mode: "HTML", ...getAgreementKeyboard() }
        );
        return;
      }
      if (!canUseRestrictedFeature(isAdmin(ctx.from.id))) {
        auditEvent({ actorId: ctx.from.id, action: `snos:${m.key}`, outcome: "denied" });
        await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
        return;
      }
      if (!checkSub(ctx)) {
        await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true });
        return;
      }
      // Show mode selection: fake (emails) vs session (real)
      const sessionStats = getSessionStats();
      const sessionInfo = sessionStats.active > 0
        ? `\n\n🔑 Доступно сессий: <b>${sessionStats.active}</b>`
        : `\n\n⚠ Нет загруженных сессий (загрузи через /admin → Session файлы)`;

      userStates.set(ctx.from.id, { tab: "snos", key: m.key, step: "mode_select" });
      await ctx.reply(
        `${m.emoji} <b>${m.name}</b>\n\n` +
        `Выбери метод отправки жалоб:${sessionInfo}\n\n` +
        `<b>📧 По почтам</b> — визуальная имитация (fake)\n` +
        `<b>🔑 По сессиям</b> — реальная отправка через Telegram сессии`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("📧 По почтам (fake)", `snos_mode_fake_${m.key}`),
              Markup.button.callback("🔑 По сессиям (real)", `snos_mode_session_${m.key}`),
            ],
            [Markup.button.callback("✗ Отмена", "cancel_state")],
          ]),
        }
      );
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SNOS MODE SELECTION — fake vs session
  // ══════════════════════════════════════════════════════════════════════════

  for (const m of SNOS_METHODS) {
    bot.action(`snos_mode_fake_${m.key}`, async (ctx) => {
      await ctx.answerCbQuery();
      userStates.set(ctx.from.id, { tab: "snos", key: m.key, step: "input", mode: "fake" });
      await ctx.reply(
        `${m.emoji} <b>${m.name}</b>\n\n` +
        `📧 Режим: <b>По почтам (fake)</b>\n\n` +
        `${m.promptLines}\n\n` +
        `<i>Формат: ID @username ссылка количество</i>`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([[Markup.button.callback("✗ Отмена", "cancel_state")]]),
        }
      );
    });

    bot.action(`snos_mode_session_${m.key}`, async (ctx) => {
      await ctx.answerCbQuery();
      const sessionStats = getSessionStats();
      if (sessionStats.active === 0) {
        await ctx.answerCbQuery("⚠ Нет загруженных сессий", { show_alert: true });
        await ctx.reply(
          `⚠ <b>Нет доступных сессий!</b>\n\n` +
          `Загрузи session файлы через:\n` +
          `/admin → Session файлы → /session_upload\n\n` +
          `Или отправь .session файл напрямую в чат с ботом.`,
          { parse_mode: "HTML" }
        );
        return;
      }
      userStates.set(ctx.from.id, { tab: "snos", key: m.key, step: "input", mode: "session" });
      await ctx.reply(
        `${m.emoji} <b>${m.name}</b>\n\n` +
        `🔑 Режим: <b>По сессиям (real)</b>\n\n` +
        `Доступно сессий: <b>${sessionStats.active}</b>\n\n` +
        `${m.promptLines}\n\n` +
        `<i>Формат: ID @username ссылка количество</i>`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([[Markup.button.callback("✗ Отмена", "cancel_state")]]),
        }
      );
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SNOS CATEGORY NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("snos_cat_reports", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "▓ <b>Жалобы</b>\n\nВыбери тип жалобы:", snosReportsKeyboard);
  });

  bot.action("snos_cat_sessions", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "▓ <b>Сессии</b>\n\nВыбери тип сессий:", snosSessionsKeyboard);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 2 — OSINT
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("tab_osint", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkAgreements(ctx.from.id)) {
      userStates.set(ctx.from.id, { tab: "osint", key: "pending", step: "input" });
      const article = AGREEMENT_ARTICLES[0];
      await ctx.reply(
        `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
        `Для использования раздела необходимо принять соглашения.\n\n` +
        `${article.icon} <b>${article.title}</b>\n\n` +
        `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        article.content.slice(0, 3000) +
        `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        `<i>Нажмите «Далее» чтобы прочитать остальные.</i>`,
        { parse_mode: "HTML", ...getAgreementKeyboard() }
      );
      return;
    }
    if (!checkSub(ctx)) {
      await editSafe(
        ctx as any,
        noSub(ctx.from.id),
        Markup.inlineKeyboard([
          [Markup.button.callback("▸ Получить подписку", "buy_sub")],
          [Markup.button.callback("◀ Назад", "back_main")],
        ])
      );
      return;
    }
    const sub = getSubscription(ctx.from.id)!;
    await editSafe(
      ctx as any,
      `◈ <b>OSINT / РАЗВЕДКА</b>\n\n` +
      `Sub: <b>${timeLeft(sub.expiresAt)}</b>\n\n` +
      `Выбери метод разведки (${OSINT_METHODS.length} методов):`,
      osintKeyboard
    );
  });

  for (const m of OSINT_METHODS) {
    bot.action(`osint_${m.key}`, async (ctx) => {
      await ctx.answerCbQuery();
      if (m.key === "insecam" || m.key === "rtsp") {
        await ctx.reply(
          "Этот пункт отключён. Раздел камер работает только с легальными публичными трансляциями через Windy Webcams.",
          backMainKeyboard,
        );
        return;
      }
      if (!checkAgreements(ctx.from.id)) {
        userStates.set(ctx.from.id, { tab: "osint", key: m.key, step: "input" });
        const article = AGREEMENT_ARTICLES[0];
        await ctx.reply(
          `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
          `Для использования метода необходимо принять соглашения.\n\n` +
          `${article.icon} <b>${article.title}</b>\n\n` +
          `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
          article.content.slice(0, 3000) +
          `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
          `<i>Нажмите «Далее» чтобы прочитать остальные.</i>`,
          { parse_mode: "HTML", ...getAgreementKeyboard() }
        );
        return;
      }
      if (!checkSub(ctx)) {
        await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true });
        return;
      }
      if (!canUseOsint(ctx.from.id, isAdmin(ctx.from.id), m.key)) {
        auditEvent({ actorId: ctx.from.id, action: `osint:${m.key}`, outcome: "denied" });
        await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
        return;
      }
      userStates.set(ctx.from.id, { tab: "osint", key: m.key, step: "input" });
      await ctx.reply(
        `${m.emoji} <b>${m.name}</b>\n\n${m.prompt}`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([[Markup.button.callback("✗ Отмена", "cancel_state")]]),
        }
      );
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OSINT CATEGORY NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("osint_cat_basic", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◎ <b>Основные</b>\n\nВыбери метод:", osintBasicKeyboard);
  });

  bot.action("osint_cat_email", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◎ <b>Email</b>\n\nВыбери метод:", osintEmailKeyboard);
  });

  bot.action("osint_cat_phone", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◎ <b>Телефон</b>\n\nВыбери метод:", osintPhoneKeyboard);
  });

  bot.action("osint_cat_social", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◎ <b>Соцсети</b>\n\nВыбери метод:", osintSocialKeyboard);
  });

  bot.action("osint_cat_network", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◎ <b>Сеть</b>\n\nВыбери метод:", osintNetworkKeyboard);
  });

  bot.action("osint_cat_cameras", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◎ <b>Камеры</b>\n\nВыбери метод:", osintCamerasKeyboard);
  });

  bot.action("osint_cat_deep", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◎ <b>Углублённый</b>\n\nВыбери метод:", osintDeepKeyboard);
  });

  bot.action("osint_dossier", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, 
      `╔══════════════════════════════╗
` +
      `║ 📋 <b>СОСТАВЛЕНИЕ ДОСЬЕ</b>        ║
` +
      `╚══════════════════════════════╝

` +
      `Введи данные по очереди:

` +
      `📧 Email
📱 Телефон
👤 Username
🌐 IP/Домен
📝 Заметки

` +
      `Отправь <code>/dossier_done</code> когда закончишь.
` +
      `Отправь <code>/dossier_cancel</code> для отмены.`,
      osintKeyboard
    );
    // Store dossier state in userStates (no session middleware in bot)
    userStates.set(ctx.from.id, { tab: "osint", key: "dossier", step: "input", entries: [] });
  });

  // ── Smart OSINT callback ──
  bot.action("osint_smart", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, 
      `🔍 <b>УМНЫЙ OSINT</b>\n\n` +
      `Напишите что угодно:\n` +
      `• email, телефон, username, IP, домен\n` +
      `• имя, фамилия, ник\n\n` +
      `Бот сам определит тип и начнёт поиск.`,
      osintKeyboard
    );
    userStates.set(ctx.from.id, { tab: "osint", key: "smart", step: "input" });
  });

  // ── Dossier navigation callbacks ──
  bot.action(/dossier_prev_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const state = userStates.get(ctx.from.id);
    if (!state?.entries || state.entries.length === 0) return;
    
    const idx = parseInt(ctx.match[1]) - 1;
    if (idx < 0 || idx >= state.entries.length) return;
    
    const entry = state.entries[idx];
    const config = TYPE_CONFIG[entry.type];
    
    let html = `╔══════════════════════════════════════╗\n`;
    html += `║ 📂 <b>ПРОФЕССИОНАЛЬНОЕ ДОСЬЕ</b>          ║\n`;
    html += `╠══════════════════════════════════════╣\n`;
    html += `║ 📊 Всего: <b>${state.entries.length}</b> записей              ║\n`;
    html += `╚══════════════════════════════════════╝\n\n`;
    html += `📍 Объект <b>${idx + 1}/${state.entries.length}</b>\n\n`;
    html += `┌─ <b>${config.icon} ${config.label}</b> ───────────────────┐\n`;
    html += `│ 🎯 <code>${entry.value}</code> │\n`;
    html += `├──────────────────────────────┤\n`;
    
    if (entry.results) {
      const lines = entry.results.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          const clean = trimmed
            .replace(/┌─|└─|├─|│/g, '')
            .replace(/^│\s*/, '│ ');
          html += `${clean}\n`;
        }
      }
    }
    
    html += `└──────────────────────────────┘`;
    
    await ctx.editMessageText(html, {
      parse_mode: "HTML",
      reply_markup: buildDossierNavigation(idx, state.entries.length)
    });
  });

  bot.action(/dossier_next_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const state = userStates.get(ctx.from.id);
    if (!state?.entries || state.entries.length === 0) return;
    
    const idx = parseInt(ctx.match[1]) + 1;
    if (idx < 0 || idx >= state.entries.length) return;
    
    const entry = state.entries[idx];
    const config = TYPE_CONFIG[entry.type];
    
    let html = `╔══════════════════════════════════════╗\n`;
    html += `║ 📂 <b>ПРОФЕССИОНАЛЬНОЕ ДОСЬЕ</b>          ║\n`;
    html += `╠══════════════════════════════════════╣\n`;
    html += `║ 📊 Всего: <b>${state.entries.length}</b> записей              ║\n`;
    html += `╚══════════════════════════════════════╝\n\n`;
    html += `📍 Объект <b>${idx + 1}/${state.entries.length}</b>\n\n`;
    html += `┌─ <b>${config.icon} ${config.label}</b> ───────────────────┐\n`;
    html += `│ 🎯 <code>${entry.value}</code> │\n`;
    html += `├──────────────────────────────┤\n`;
    
    if (entry.results) {
      const lines = entry.results.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          const clean = trimmed
            .replace(/┌─|└─|├─|│/g, '')
            .replace(/^│\s*/, '│ ');
          html += `${clean}\n`;
        }
      }
    }
    
    html += `└──────────────────────────────┘`;
    
    await ctx.editMessageText(html, {
      parse_mode: "HTML",
      reply_markup: buildDossierNavigation(idx, state.entries.length)
    });
  });

  bot.action("dossier_full", async (ctx) => {
    await ctx.answerCbQuery();
    const state = userStates.get(ctx.from.id);
    if (!state?.entries || state.entries.length === 0) return;
    
    const html = buildDossierChain(state.entries);
    await ctx.editMessageText(html, {
      parse_mode: "HTML",
      reply_markup: buildDossierNavigation(0, state.entries.length)
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 3 — ИНСТРУМЕНТЫ
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("tab_tools", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkAgreements(ctx.from.id)) {
      userStates.set(ctx.from.id, { tab: "tools", key: "pending", step: "input" });
      const article = AGREEMENT_ARTICLES[0];
      await ctx.reply(
        `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
        `Для использования раздела необходимо принять соглашения.\n\n` +
        `${article.icon} <b>${article.title}</b>\n\n` +
        `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        article.content.slice(0, 3000) +
        `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
        `<i>Нажмите «Далее» чтобы прочитать остальные.</i>`,
        { parse_mode: "HTML", ...getAgreementKeyboard() }
      );
      return;
    }
    if (!canUseRestrictedFeature(isAdmin(ctx.from.id))) {
      auditEvent({ actorId: ctx.from.id, action: "tab_tools", outcome: "denied" });
      await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
      return;
    }
    if (!checkSub(ctx)) {
      await editSafe(
        ctx as any,
        noSub(ctx.from.id),
        Markup.inlineKeyboard([
          [Markup.button.callback("▸ Получить подписку", "buy_sub")],
          [Markup.button.callback("◀ Назад", "back_main")],
        ])
      );
      return;
    }
    const sub = getSubscription(ctx.from.id)!;
    await editSafe(
      ctx as any,
      `◆ <b>ИНСТРУМЕНТЫ</b>\n\n` +
      `Sub: <b>${timeLeft(sub.expiresAt)}</b>\n\n` +
      `Выбери инструмент (${TOOLS.length} методов):`,
      toolsKeyboard
    );
  });

  for (const t of TOOLS) {
    bot.action(`tool_${t.key}`, async (ctx) => {
      await ctx.answerCbQuery();
      if (!canUseRestrictedFeature(isAdmin(ctx.from.id))) {
        auditEvent({ actorId: ctx.from.id, action: `tool:${t.key}`, outcome: "denied" });
        await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
        return;
      }
      if (!checkSub(ctx)) {
        await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true });
        return;
      }
      userStates.set(ctx.from.id, { tab: "tools", key: t.key, step: "input" });
      await ctx.reply(
        `${t.emoji} <b>${t.name}</b>\n\n${t.prompt}`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([[Markup.button.callback("✗ Отмена", "cancel_state")]]),
        }
      );
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TOOLS CATEGORY NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("tools_cat_web", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◇ <b>Web</b>\n\nВыбери инструмент:", toolsWebKeyboard);
  });

  bot.action("tools_cat_network", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◇ <b>Сеть</b>\n\nВыбери инструмент:", toolsNetworkKeyboard);
  });

  bot.action("tools_cat_security", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◇ <b>Безопасность</b>\n\nВыбери инструмент:", toolsSecurityKeyboard);
  });

  bot.action("tools_cat_telegram", async (ctx) => {
    await ctx.answerCbQuery();
    if (!checkSub(ctx)) { await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true }); return; }
    await editSafe(ctx as any, "◇ <b>Telegram</b>\n\nВыбери инструмент:", toolsTelegramKeyboard);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AGREEMENTS — reading flow
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("agree_terms", async (ctx) => {
    await ctx.answerCbQuery();
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "agreement") return;
    const idx = AGREEMENT_ARTICLES.findIndex((a) => a.id === "terms");
    const article = AGREEMENT_ARTICLES[Math.min(idx + 1, AGREEMENT_ARTICLES.length - 1)];
    await ctx.editMessageText(
      `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
      `${article.icon} <b>${article.title}</b>\n\n` +
      `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
      article.content.slice(0, 3000) +
      `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
      `<i>Это только начало. Нажмите «Далее» чтобы прочитать остальные.</i>`,
      { parse_mode: "HTML", ...getAgreementKeyboard() }
    );
  });

  bot.action("agree_privacy", async (ctx) => {
    await ctx.answerCbQuery();
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "agreement") return;
    const idx = AGREEMENT_ARTICLES.findIndex((a) => a.id === "privacy");
    const article = AGREEMENT_ARTICLES[Math.min(idx + 1, AGREEMENT_ARTICLES.length - 1)];
    await ctx.editMessageText(
      `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
      `${article.icon} <b>${article.title}</b>\n\n` +
      `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
      article.content.slice(0, 3000) +
      `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
      `<i>Это только начало. Нажмите «Далее» чтобы прочитать остальные.</i>`,
      { parse_mode: "HTML", ...getAgreementKeyboard() }
    );
  });

  bot.action("agree_acceptable", async (ctx) => {
    await ctx.answerCbQuery();
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "agreement") return;
    const idx = AGREEMENT_ARTICLES.findIndex((a) => a.id === "acceptable");
    const article = AGREEMENT_ARTICLES[Math.min(idx + 1, AGREEMENT_ARTICLES.length - 1)];
    await ctx.editMessageText(
      `<b>⚠ ДОСТУП ОГРАНИЧЕН</b>\n\n` +
      `${article.icon} <b>${article.title}</b>\n\n` +
      `<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
      article.content.slice(0, 3000) +
      `\n\n<code>━━━━━━━━━━━━━━━━━━━━━━</code>\n\n` +
      `<i>Это только начало. Нажмите «Далее» чтобы прочитать остальные.</i>`,
      { parse_mode: "HTML", ...getAgreementKeyboard() }
    );
  });

  bot.action("agree_accept_all", async (ctx) => {
    await ctx.answerCbQuery();
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "agreement") return;
    userStates.delete(ctx.from.id);
    acceptAgreement(ctx.from.id, AGREEMENT_ARTICLES.map((a) => a.id), AGREEMENT_VERSION);
    await ctx.editMessageText(
      `✓ <b>Соглашения приняты!</b>\n\n` +
      `Версия: <code>${AGREEMENT_VERSION}</code>\n` +
      `Принято: <b>${AGREEMENT_ARTICLES.length} статей</b>\n\n` +
      `Теперь вы можете использовать все функции бота.\n\n` +
      `<i>Вы всегда можете просмотреть соглашения в профиле.</i>`,
      { parse_mode: "HTML", ...mainKeyboard }
    );
  });

  bot.action("agree_view", async (ctx) => {
    await ctx.answerCbQuery();
    const ag = getUserAgreement(ctx.from.id);
    if (!ag) return;
    const accepted = ag.articles.map((id) => AGREEMENT_ARTICLES.find((a) => a.id === id)).filter(Boolean);
    const lines = accepted.map((a) => `${a!.icon} <b>${a!.title}</b>`).join("\n");
    await ctx.reply(
      `<b>📋 Принятые соглашения</b>\n\n` +
      `Версия: <code>${AGREEMENT_VERSION}</code>\n` +
      `Принято: <b>${formatDate(ag.acceptedAt)}</b>\n\n` +
      `<b>Принятые статьи:</b>\n${lines}\n\n` +
      `<i>Для просмотра нажмите на статью в меню.</i>`,
      { parse_mode: "HTML", ...getAgreementStatusKeyboard(true) }
    );
  });

  // ══ Cancel ══
  bot.action("cancel_state", async (ctx) => {
    await ctx.answerCbQuery();
    userStates.delete(ctx.from.id);
    try {
      await ctx.deleteMessage();
    } catch {}
    await ctx.reply("✗ Отменено.", backMainKeyboard);
  });

  // ══ Admin callbacks ══
  bot.action("admin_list", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    const active = getActiveSubscriptions();
    const text = !active.length
      ? "≡ Активных подписок нет."
      : `≡ <b>Активные (${active.length}):</b>\n\n` +
        active
          .map((s, i) => {
            const u = s.username ? `@${s.username}` : `ID:${s.userId}`;
            return `${i + 1}. <code>${s.userId}</code> (${u})\n   До: ${formatDate(s.expiresAt)} (${timeLeft(s.expiresAt)})`;
          })
          .join("\n\n");
    try { await ctx.editMessageText(text, { parse_mode: "HTML", ...adminKeyboard }); } catch {}
  });

  bot.action("admin_stats", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    const all = getAllSubscriptions();
    const active = getActiveSubscriptions();
    const users = getAllUsers();
    try {
      await ctx.editMessageText(
        `▤ <b>Статистика</b>\n\n` +
        `<b>▸ Подписки:</b>\n` +
        `◉ Всего с подписками: <b>${all.length}</b>\n` +
        `✓ Активных: <b>${active.length}</b>\n` +
        `✗ Истёкших: <b>${all.length - active.length}</b>\n\n` +
        `<b>▸ Пользователи:</b>\n` +
        `◈ Всего в базе: <b>${users.length}</b>\n` +
        `◆ Операций всего: <b>${users.reduce((a, u) => a + (u.operations ?? 0), 0)}</b>\n\n` +
        `<b>▸ Методов:</b>\n` +
        `▓ Снос: <b>${SNOS_METHODS.length}</b>\n` +
        `◈ OSINT: <b>${OSINT_METHODS.length}</b>\n` +
        `◆ Инструменты: <b>${TOOLS.length}</b>`,
        { parse_mode: "HTML", ...adminKeyboard }
      );
    } catch {}
  });

  bot.action("admin_users", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    const users = getAllUsers();
    if (!users.length) {
      try { await ctx.editMessageText("≡ Пользователей нет.", { parse_mode: "HTML", ...adminKeyboard }); } catch {}
      return;
    }
    const sorted = users.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 20);
    const lines = sorted.map((u, i) => {
      const name = u.username ? `@${u.username}` : (u.firstName ?? `id${u.userId}`);
      const hasSub = hasActiveSubscription(u.userId) ? "✓" : "✗";
      return `${i + 1}. ${hasSub} <code>${u.userId}</code> (${name}) — ${u.operations ?? 0} оп.`;
    });
    try {
      await ctx.editMessageText(
        `👥 <b>Пользователи (${users.length}):</b>\n\n` + lines.join("\n"),
        { parse_mode: "HTML", ...adminKeyboard }
      );
    } catch {}
  });

  bot.action("admin_broadcast", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    userStates.set(ctx.from.id, { tab: "admin", key: "broadcast", step: "input" });
    await ctx.reply(
      `📢 <b>Рассылка всем пользователям</b>\n\n` +
      `Введи текст сообщения. Поддерживается HTML.\n` +
      `Нажми /cancel для отмены.`,
      { parse_mode: "HTML" }
    );
  });

  // ══ Admin photo callbacks ══
  bot.action("admin_setphoto", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    userStates.set(ctx.from.id, { tab: "admin", key: "setphoto", step: "input" });
    await ctx.reply(
      `□ <b>Смена фото/GIF приветствия</b>\n\n` +
      `Отправь фото или анимированный GIF.\n` +
      `Это изображение будет показываться при команде /start.\n\n` +
      `<i>Для отмены нажми /cancel</i>`,
      { parse_mode: "HTML" }
    );
  });

  bot.action("admin_resetphoto", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    clearWelcomeMedia();
    try {
      await ctx.editMessageText(
        `✗ <b>Фото сброшено</b>\n\nВосстановлено стандартное изображение приветствия.`,
        { parse_mode: "HTML", ...adminKeyboard }
      );
    } catch {
      await ctx.reply(`✓ Фото сброшено — используется стандартное.`, adminKeyboard);
    }
  });

  // ══ Admin session upload callbacks ══
  bot.action("admin_sessions", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    const sessions = listSessions();
    const stats = getSessionStats();
    const list = sessions.length > 0
      ? sessions.map((s, i) => {
          const status = s.status === "active" ? "🟢" : "🔴";
          return `${i + 1}. ${status} <code>${s.filename}</code> — ID:${s.userId} — ${s.status}`;
        }).join("\n")
      : "Нет загруженных сессий";

    try {
      await ctx.editMessageText(
        `🔑 <b>Session файлы</b>\n\n` +
        `Всего: <b>${stats.total}</b> | Активных: <b>${stats.active}</b> | Ошибок: <b>${stats.errors}</b>\n\n` +
        `<b>Список:</b>\n${list}\n\n` +
        `<i>Отправь .session файл для загрузки или /session_upload для ввода токена</i>`,
        { parse_mode: "HTML", ...adminKeyboard }
      );
    } catch {
      await ctx.reply(
        `🔑 <b>Session файлы</b>\n\n` +
        `Всего: <b>${stats.total}</b> | Активных: <b>${stats.active}</b> | Ошибок: <b>${stats.errors}</b>\n\n` +
        `<b>Список:</b>\n${list}\n\n` +
        `<i>Отправь .session файл для загрузки или /session_upload для ввода токена</i>`,
        { parse_mode: "HTML", ...adminKeyboard }
      );
    }
  });

  bot.action("admin_session_stats", async (ctx) => {
    if (!isAdmin(ctx.from.id)) { await ctx.answerCbQuery("✗ Нет доступа"); return; }
    await ctx.answerCbQuery();
    const stats = getSessionStats();
    const sessions = listSessions();
    const list = sessions.map((s, i) => {
      const status = s.status === "active" ? "🟢" : "🔴";
      return `${i + 1}. ${status} <code>${s.filename}</code> — ID:${s.userId}`;
    }).join("\n") || "Нет сессий";

    await ctx.reply(
      `📊 <b>Статус сессий</b>\n\n` +
      `Всего: <b>${stats.total}</b>\n` +
      `Активных: <b>${stats.active}</b>\n` +
      `Ошибок: <b>${stats.errors}</b>\n\n` +
      `<b>Детали:</b>\n${list}`,
      { parse_mode: "HTML", ...adminKeyboard }
    );
  });

  // ══ Session file upload from admin (document) ══
  bot.on(message("document"), async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "admin" || state.key !== "session_upload") return;
    userStates.delete(ctx.from.id);

    const doc = ctx.message.document;
    if (!doc?.file_name?.endsWith(".session")) {
      await ctx.reply("✗ Отправь файл с расширением .session");
      return;
    }

    try {
      const file = await ctx.telegram.getFile(doc.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const data = await response.text();

      const filename = doc.file_name;
      const saved = saveSession(filename, data);

      if (saved) {
        const sessions = listSessions();
        const stats = getSessionStats();
        await ctx.reply(
          `✓ <b>Session загружена!</b>\n\n` +
          `Файл: <code>${filename}</code>\n` +
          `Всего сессий: <b>${stats.total}</b>\n` +
          `Активных: <b>${stats.active}</b>`,
          { parse_mode: "HTML", ...adminKeyboard }
        );
      } else {
        await ctx.reply(`✗ Ошибка сохранения файла.`, { parse_mode: "HTML", ...adminKeyboard });
      }
    } catch (err) {
      logger.error({ err }, "Session upload error");
      await ctx.reply(`✗ Ошибка загрузки: ${err}`, { parse_mode: "HTML", ...adminKeyboard });
    }
  });

  // ══ Photo/Animation from admin ══
  bot.on(message("photo"), async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "admin" || state.key !== "setphoto") return;
    userStates.delete(ctx.from.id);
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1]!.file_id;
    setWelcomeMedia({ fileId, type: "photo" });
    await ctx.reply(`✓ <b>Фото приветствия обновлено!</b>\n\nТеперь оно будет показываться при /start.`, {
      parse_mode: "HTML",
      reply_markup: adminKeyboard,
    });
  });

  bot.on(message("animation"), async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const state = userStates.get(ctx.from.id);
    if (!state || state.tab !== "admin" || state.key !== "setphoto") return;
    userStates.delete(ctx.from.id);
    const fileId = ctx.message.animation.file_id;
    setWelcomeMedia({ fileId, type: "animation" });
    await ctx.reply(`✓ <b>GIF приветствия обновлён!</b>\n\nТеперь он будет показываться при /start.`, {
      parse_mode: "HTML",
      reply_markup: adminKeyboard,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEXT MESSAGE — route by state
  // ══════════════════════════════════════════════════════════════════════════

  bot.on(message("text"), async (ctx) => {
    const { id, username, first_name } = ctx.from;
    trackUser(id, username, first_name);
    
    // ─ Dossier mode (stored in userStates, not ctx.session) ─
    const state = userStates.get(id);
    if (state?.tab === "osint" && state.key === "dossier") {
      const text = ctx.message?.text?.trim() || '';
      if (text === '/dossier_done') {
        const done = await handleDossierDone(ctx, state as any);
        if (done) return;
        return;
      } else if (text === '/dossier_cancel') {
        userStates.delete(id);
        await ctx.reply("❌ Составление досье отменено.", backMainKeyboard);
        return;
      }
      
      const entry: DossierEntry = {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        type: 'note',
        value: text,
        results: '',
        icon: '',
        color: ''
      };
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) entry.type = 'email';
      else if (/^\+?\d{10,15}$/.test(text.replace(/[\s-]/g, ''))) entry.type = 'phone';
      else if (/^[\w.-]+$/.test(text) && text.length < 30) entry.type = 'username';
      else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(text)) entry.type = 'ip';
      else if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(text)) entry.type = 'domain';
      
      entry.value = text;
      
      // Save to userStates
      const entries = (state as any).entries || [];
      entries.push(entry);
      userStates.set(id, { ...state, entries });
      
      await ctx.reply(
        `✅ Добавлено: <b>${entry.type.toUpperCase()}</b>
` +
        `📝 <code>${text}</code>

` +
        `Всего записей: ${entries.length}
` +
        `Отправь ещё данные или <code>/dossier_done</code> для завершения.`,
        { parse_mode: "HTML" }
      );
      return;
    }
    
    // ─ Smart OSINT mode ─
    if (state?.tab === "osint" && state.key === "smart") {
      const text = ctx.message?.text?.trim() || '';
      if (!text) return;
      
      // Detect type
      let detectedType: string;
      let platforms: { label: string; url: string; icon: string }[] = [];
      
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        detectedType = 'email';
        await ctx.reply(
          `🔍 Обнаружен <b>EMAIL</b>: <code>${text}</code>\n\n` +
          `Начинаю поиск по источникам...`,
          { parse_mode: "HTML" }
        );
        await runSmartOsint(ctx, text, 'email');
        return;
      } else if (/^\+?\d{10,15}$/.test(text.replace(/[\s-]/g, ''))) {
        detectedType = 'phone';
        await ctx.reply(
          `🔍 Обнаружен <b>ТЕЛЕФОН</b>: <code>${text}</code>\n\n` +
          `Начинаю поиск по источникам...`,
          { parse_mode: "HTML" }
        );
        await runSmartOsint(ctx, text, 'phone');
        return;
      } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(text)) {
        detectedType = 'ip';
        await ctx.reply(
          `🔍 Обнаружен <b>IP АДРЕС</b>: <code>${text}</code>\n\n` +
          `Начинаю поиск по источникам...`,
          { parse_mode: "HTML" }
        );
        await runSmartOsint(ctx, text, 'ip');
        return;
      } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(text)) {
        detectedType = 'domain';
        await ctx.reply(
          `🔍 Обнаружен <b>ДОМЕН</b>: <code>${text}</code>\n\n` +
          `Начинаю поиск по источникам...`,
          { parse_mode: "HTML" }
        );
        await runSmartOsint(ctx, text, 'domain');
        return;
      } else if (/^[\w.-]+$/.test(text) && text.length < 30) {
        detectedType = 'username';
        await ctx.reply(
          `🔍 Обнаружен <b>ЛОГИН</b>: <code>@${text}</code>\n\n` +
          `Начинаю поиск по источникам...`,
          { parse_mode: "HTML" }
        );
        await runSmartOsint(ctx, text, 'username');
        return;
      } else {
        // Fallback - treat as username
        detectedType = 'username';
        await ctx.reply(
          `🔍 Обнаружен <b>НИК/ИМЯ</b>: <code>${text}</code>\n\n` +
          `Начинаю поиск по источникам...`,
          { parse_mode: "HTML" }
        );
        await runSmartOsint(ctx, text, 'username');
        return;
      }
    }
    
    if (!state) return;

    userStates.delete(id);

    // ─ Admin broadcast text ─
    if (state.tab === "admin" && state.key === "broadcast") {
      const text = ctx.message.text.trim();
      if (!text) { await ctx.reply("✗ Пустой текст."); return; }
      const users = getAllUsers();
      await ctx.reply(`📢 Рассылка <b>${users.length}</b> пользователям...`, { parse_mode: "HTML" });
      let sent = 0;
      let failed = 0;
      for (const u of users) {
        try {
          await bot.telegram.sendMessage(u.userId, `📢 <b>Сообщение от администратора:</b>\n\n${text}`, { parse_mode: "HTML" });
          sent++;
        } catch {
          failed++;
        }
        await new Promise(r => setTimeout(r, 50));
      }
      await ctx.reply(`✓ Рассылка завершена\n\nОтправлено: <b>${sent}</b>\nОшибок: <b>${failed}</b>`, { parse_mode: "HTML", ...adminKeyboard });
      return;
    }

    // ─ Admin session upload text ─
    if (state.tab === "admin" && state.key === "session_upload") {
      userStates.delete(id);
      // Try to parse as session JSON or token
      let sessionData: any;
      let filename: string;
      try {
        sessionData = JSON.parse(text);
        filename = `session_${Date.now()}.session`;
      } catch {
        // Treat as bot token
        sessionData = { authorization: { user_id: 0, bot_token: text } };
        filename = `token_${Date.now()}.session`;
      }
      const saved = saveSession(filename, sessionData);
      if (saved) {
        const stats = getSessionStats();
        await ctx.reply(
          `✓ <b>Session сохранена!</b>\n\n` +
          `Файл: <code>${filename}</code>\n` +
          `Всего сессий: <b>${stats.total}</b>\n` +
          `Активных: <b>${stats.active}</b>`,
          { parse_mode: "HTML", ...adminKeyboard }
        );
      } else {
        await ctx.reply(`✗ Ошибка сохранения.`, { parse_mode: "HTML", ...adminKeyboard });
      }
      return;
    }

    if (!hasActiveSubscription(id)) {
      await ctx.reply("[#] Подписка истекла. Обратитесь к администратору.", backMainKeyboard);
      return;
    }

    const text = ctx.message.text.trim();
    if (!text) {
      await ctx.reply("✗ Пустой ввод.", backMainKeyboard);
      return;
    }

    try {
      // ─ SNOS ─
      if (state.tab === "snos") {
        if (!canUseRestrictedFeature(isAdmin(id))) {
          auditEvent({ actorId: id, action: `snos:${state.key}`, outcome: "denied" });
          await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
          return;
        }
        const parts = text.split(/\s+/);
        const userId = parts[0] ?? "unknown";
        const username = parts[1] ?? "";
        const link = parts[2] ?? "";
        const countRaw = parseInt(parts[3] ?? "30", 10);
        const count = isNaN(countRaw) || countRaw < 1 ? 30 : Math.min(countRaw, 500);
        const method = SNOS_MAP[state.key];
        if (!method) return;
        incrementOps(id);
        auditEvent({ actorId: id, action: `snos:${state.key}`, outcome: "allowed" });
        const mode = (state as any).mode ?? "fake";
        await method.run(ctx, userId, username, link, count, snosKeyboard, mode);
        return;
      }

      // ─ OSINT ─
      if (state.tab === "osint") {
        const method = OSINT_MAP[state.key];
        if (!method) return;
        if (!canUseOsint(id, isAdmin(id), state.key)) {
          auditEvent({ actorId: id, action: `osint:${state.key}`, outcome: "denied" });
          await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
          return;
        }
        incrementOps(id);
        auditEvent({ actorId: id, action: `osint:${state.key}`, outcome: "allowed" });
        await method.run(ctx, text, osintKeyboard);
        return;
      }

      // ─ TOOLS ─
      if (state.tab === "tools") {
        if (!canUseRestrictedFeature(isAdmin(id))) {
          auditEvent({ actorId: id, action: `tool:${state.key}`, outcome: "denied" });
          await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
          return;
        }
        const tool = TOOLS_MAP[state.key];
        if (!tool) return;
        incrementOps(id);
        auditEvent({ actorId: id, action: `tool:${state.key}`, outcome: "allowed" });
        await tool.run(ctx, text, toolsKeyboard);
        return;
      }

      // ─ DB SEARCH ─
      if (state.tab === "dbsearch") {
        if (!canUseRestrictedFeature(isAdmin(id))) {
          auditEvent({ actorId: id, action: "dbsearch", outcome: "denied" });
          await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
          return;
        }
        incrementOps(id);
        auditEvent({ actorId: id, action: "dbsearch", outcome: "allowed" });
        const result = search(text);
        await ctx.reply(formatResults(result), {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🔍 Новый поиск", "osint_dbsearch")],
            [Markup.button.callback("◀ OSINT меню", "tab_osint")],
          ]),
        });
        return;
      }
    } catch (err) {
      auditEvent({ actorId: id, action: `state:${state.tab}:${"key" in state ? state.key : "search"}`, outcome: "failed" });
      logger.error({ err }, "Handler error");
      await ctx.reply("[!] Ошибка выполнения. Попробуй снова.", backMainKeyboard);
    }
  });

  // ══ /dbstatus ══ (admin)
  bot.command("dbstatus", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const stats = getStats();
    const files = getIndexedFiles();
    const lines = files.map((f, i) =>
      `${i + 1}. <code>${f.filename}</code> — ${(f.sizeBytes / 1024 / 1024).toFixed(1)} МБ`
    );
    await ctx.reply(
      `🗄️ <b>Статус баз данных</b>\n\n` +
      `Записей в памяти: <b>${stats.records.toLocaleString()}</b>\n` +
      `Файлов в индексе: <b>${stats.sources}</b>\n\n` +
      (lines.length ? `<b>Файлы:</b>\n${lines.join("\n")}` : `<i>Нет загруженных файлов</i>\n\n/dbload — загрузить базы`) +
      `\n\nКанал: ${DB_CHANNEL_ID || "<не задан>"}\n` +
      `<i>Лимит Telegram Bot API: 20 МБ на файл</i>`,
      { parse_mode: "HTML" }
    );
  });

  // ══ /dbload ══ (admin — перезагрузить все базы из индекса)
  bot.command("dbload", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const msg = await ctx.reply("🔄 Перезагружаю базы из Telegram...", { parse_mode: "HTML" });
    const lines: string[] = [];
    await loadAllFromIndex(bot.telegram, (status) => {
      lines.push(status);
      logger.info({ status }, "dbload");
    });
    await ctx.telegram.editMessageText(
      ctx.chat.id, msg.message_id, undefined,
      lines.join("\n"),
      { parse_mode: "HTML" }
    );
  });

  // ══ /dbremove <file_id> ══ (admin — убрать базу из памяти и индекса)
  bot.command("dbremove", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const parts = ctx.message.text.split(/\s+/);
    const num = Number(parts[1]);
    if (isNaN(num) || num < 1) {
      const files = getIndexedFiles();
      const list = files.map((f, i) => `${i + 1}. <code>${f.filename}</code>`).join("\n");
      await ctx.reply(
        `✗ /dbremove &lt;номер&gt;\n\n${list || "Нет файлов"}`,
        { parse_mode: "HTML" }
      );
      return;
    }
    const files = getIndexedFiles();
    const entry = files[num - 1];
    if (!entry) { await ctx.reply("✗ Файл не найден."); return; }
    removeFile(entry.fileId);
    const stats = getStats();
    await ctx.reply(
      `✓ <b>${entry.filename}</b> удалена из памяти.\nОсталось записей: <b>${stats.records.toLocaleString()}</b>`,
      { parse_mode: "HTML" }
    );
  });

  // ══ osint_dbsearch callback ══
  bot.action("osint_dbsearch", async (ctx) => {
    await ctx.answerCbQuery();
    if (!canUseRestrictedFeature(isAdmin(ctx.from.id))) {
      auditEvent({ actorId: ctx.from.id, action: "dbsearch", outcome: "denied" });
      await ctx.reply(restrictedFeatureMessage, backMainKeyboard);
      return;
    }
    if (!checkSub(ctx)) {
      await ctx.answerCbQuery("[#] Нет подписки!", { show_alert: true });
      return;
    }
    const stats = getStats();
    if (stats.records === 0) {
      await ctx.reply(
        `🗄️ <b>Поиск по базам утечек</b>\n\n` +
        `❌ Базы не загружены.\n\n` +
        `Попроси администратора загрузить базы в ТГ-канал.`,
        { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("◀ Назад", "tab_osint")]]) }
      );
      return;
    }
    userStates.set(ctx.from.id, { tab: "dbsearch", step: "input" });
    await ctx.reply(
      `🗄️ <b>Поиск по базам утечек</b>\n\n` +
      `Записей в памяти: <b>${stats.records.toLocaleString()}</b>\n\n` +
      `Введи запрос — телефон, email, ФИО, username или IP.\n` +
      `Тип определяется автоматически.`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("✗ Отмена", "cancel_state")]]),
      }
    );
  });

  // ══ Channel post — auto-index new files ══
  bot.on("channel_post", async (ctx) => {
    if (!DB_CHANNEL_ID) return;
    const chatId = String(ctx.chat.id);
    const chatUsername = (ctx.chat as any).username ? `@${(ctx.chat as any).username}` : "";
    if (chatId !== DB_CHANNEL_ID && chatUsername !== DB_CHANNEL_ID) return;

    const doc = (ctx.channelPost as any).document;
    if (!doc) return;

    if (isInIndex(doc.file_id)) return; // already indexed

    // Notify admin
    try {
      await bot.telegram.sendMessage(
        ctx.from.id,
        `📥 Новый файл в канале: <b>${doc.file_name ?? "файл"}</b> (${((doc.file_size ?? 0) / 1024 / 1024).toFixed(1)} МБ)\nИндексирую...`,
        { parse_mode: "HTML" }
      );
    } catch {}

    const result = await indexFile(
      bot.telegram,
      doc.file_id,
      doc.file_name ?? "database",
      doc.file_size ?? 0,
    );

    try {
      if (result.ok) {
        await bot.telegram.sendMessage(
          ctx.from.id,
          `✅ <b>${doc.file_name}</b> загружена!\nЗаписей добавлено: <b>${result.records.toLocaleString()}</b>`,
          { parse_mode: "HTML" }
        );
      } else {
        await bot.telegram.sendMessage(
          ctx.from.id,
          `❌ Ошибка загрузки <b>${doc.file_name}</b>:\n${result.error}`,
          { parse_mode: "HTML" }
        );
      }
    } catch {}
  });

  // Flush store on graceful shutdown
  process.once("SIGINT", () => { flushStore(); });
  process.once("SIGTERM", () => { flushStore(); });

  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL STRESSER
  // ══════════════════════════════════════════════════════════════════════════

  // /emails — show registered test emails
  bot.command("emails", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    const emails = getEmails();
    if (!emails.length) {
      await ctx.reply("≡ Почты не зарегистрированы.\n\n/addemail test@gmail.com пароль", { parse_mode: "HTML" });
      return;
    }
    await ctx.reply(
      `📧 <b>Зарегистрированные почты (${emails.length}):</b>\n\n` +
      emails.map((e, i) => `${i + 1}. <code>${e.email}</code> — ${e.domain}`).join("\n"),
      { parse_mode: "HTML" }
    );
  });

  // /addemail test@gmail.com password
  bot.command("addemail", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 3) {
      await ctx.reply("✗ /addemail &lt;email&gt; &lt;пароль&gt;", { parse_mode: "HTML" });
      return;
    }
    const email = parts[1].toLowerCase();
    const password = parts.slice(2).join(" ");
    if (!email.includes("@")) {
      await ctx.reply("✗ Неверный email.");
      return;
    }
    addEmail(email, password);
    await ctx.reply(`✓ <b>${email}</b> добавлена.\n\nВсего: <b>${getEmails().length}</b>`, { parse_mode: "HTML" });
  });

  // /delemail test@gmail.com
  bot.command("delemail", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply("✗ /delemail &lt;email&gt;", { parse_mode: "HTML" });
      return;
    }
    const email = parts[1].toLowerCase();
    const ok = removeEmail(email);
    await ctx.reply(ok ? `✓ <b>${email}</b> удалена.` : `✗ Почта не найдена.`, { parse_mode: "HTML" });
  });

  // Stress command uses emailStressTest directly

  // /addadmin &lt;id&gt;
  bot.command("addadmin", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply("✗ /addadmin &lt;id&gt;", { parse_mode: "HTML" });
      return;
    }
    const adminId = Number(parts[1]);
    if (isNaN(adminId)) {
      await ctx.reply("✗ Неверный ID.");
      return;
    }
    ADMIN_IDS.add(adminId);
    process.env.ADMIN_IDS = [...ADMIN_IDS].join(",");
    await ctx.reply(`✓ <code>${adminId}</code> добавлен в админы. Всего: <b>${ADMIN_IDS.size}</b>`, { parse_mode: "HTML" });
  });

  // /removeadmin &lt;id&gt;
  bot.command("removeadmin", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply("✗ /removeadmin &lt;id&gt;", { parse_mode: "HTML" });
      return;
    }
    const adminId = Number(parts[1]);
    if (isNaN(adminId)) {
      await ctx.reply("✗ Неверный ID.");
      return;
    }
    ADMIN_IDS.delete(adminId);
    process.env.ADMIN_IDS = [...ADMIN_IDS].join(",");
    await ctx.reply(`✓ <code>${adminId}</code> удалён из админов. Всего: <b>${ADMIN_IDS.size}</b>`, { parse_mode: "HTML" });
  });

  // /session_upload — загрузить session файл
  bot.command("session_upload", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    userStates.set(ctx.from.id, { tab: "admin", key: "session_upload", step: "input" });
    await ctx.reply(
      `🔑 <b>Загрузка session файла</b>\n\n` +
      `Отправь .session файл в чат с ботом.\n\n` +
      `Формат: JSON с полем session.auth или authorization.\n\n` +
      `<i>После загрузки сессия будет доступна для реальной отправки жалоб</i>`,
      { parse_mode: "HTML" }
    );
  });

  // /admins
  bot.command("admins", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    const list = [...ADMIN_IDS].join(", ");
    await ctx.reply(`👑 <b>Админы (${ADMIN_IDS.size}):</b>\n\n<code>${list}</code>`, { parse_mode: "HTML" });
  });

  // /stress email@gmail.com 50
  bot.command("stress", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("[#] Только для администратора.", { parse_mode: "HTML" });
      return;
    }
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 3) {
      await ctx.reply("✗ /stress &lt;email&gt; &lt;кол-во&gt;", { parse_mode: "HTML" });
      return;
    }
    const target = parts[1];
    const count = Math.min(Number(parts[2]) || 10, 200);
    if (!target.includes("@")) {
      await ctx.reply("✗ Неверный email.");
      return;
    }

    const progressMsg = await ctx.reply(`📧 <b>Стресс-тест запущен</b>\n\nЦель: <code>${target}</code>\nКол-во: <b>${count}</b>\n\n<code>▸ Отправка...</code>`, { parse_mode: "HTML" });

    let lastPct = 0;
    let currentResult: { sent: number; failed: number } = { sent: 0, failed: 0 };
    const result = await emailStressTest(
      target,
      "Stress Test",
      "This is a stress test email for checking email server capacity and spam filters.",
      count,
      async (i, total) => {
        const pct = Math.round((i / total) * 100);
        if (pct > lastPct || i === total) {
          lastPct = pct;
          try {
            await ctx.telegram.editMessageText(
              ctx.chat!.id, progressMsg.message_id, undefined,
              `📧 <b>Стресс-тест</b>\n\n` +
              `Цель: <code>${target}</code>\n` +
              `Прогресс: <b>${i}/${total}</b> (${pct}%)\n\n` +
              `<code>▸ Отправка...</code>`,
              { parse_mode: "HTML" }
            );
          } catch {}
        }
      }
    );

    // Update result to include total sent/failed
    await ctx.telegram.editMessageText(
      ctx.chat!.id, progressMsg.message_id, undefined,
      `📧 <b>СТРЕСС-ТЕСТ ЗАВЕРШЁН</b>\n\n` +
      `<b>▸ Результат:</b>\n` +
      `Цель: <code>${target}</code>\n` +
      `Отправлено: <b>${result.sent}</b>\n` +
      `Ошибок: <b>${result.failed}</b>\n` +
      `Всего: <b>${count}</b>\n\n` +
      (result.errors.length > 0
        ? `<b>▸ Ошибки (первые 5):</b>\n` + result.errors.slice(0, 5).map(e => `  ▸ ${e.slice(0, 80)}`).join("\n")
        : `✓ Все письма отправлены успешно.`),
      { parse_mode: "HTML" }
    );
  });

  async function initDb(): Promise<void> {
    if (!DB_CHANNEL_ID) {
      logger.warn("DB_CHANNEL_ID not set — skipping OSINT DB load");
      return;
    }
    logger.info("Loading OSINT databases from Telegram channel...");
    await loadAllFromIndex(bot.telegram, (msg) => logger.info(msg));
    const stats = getStats();
    logger.info(`OSINT DB ready: ${stats.records.toLocaleString()} records from ${stats.sources} files`);
  }

  return { bot, initDb };
}
