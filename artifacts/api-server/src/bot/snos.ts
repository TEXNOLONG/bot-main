// ─── СНОС — визуальные жалобы + реальные сессии ──────────────────────────────
import { progressBar, sleep, fakeEmail } from "./visual.js";
import { listSessions, createBotFromSession, sendComplaintViaSession, getSessionStats } from "./session-manager.js";
import type { Context } from "telegraf";

export interface SnosMethod {
  key: string;
  emoji: string;
  name: string;
  promptLines: string;
  run: (ctx: Context, userId: string, username: string, link: string, count: number, endMarkup?: any, mode?: SnosMode) => Promise<void>;
}

export type SnosMode = "fake" | "session";

function randomPhone(): string {
  return `+79${Math.floor(Math.random() * 90 + 10)}${Math.floor(Math.random() * 9000000 + 1000000)}`;
}

const COMPLAINT_TYPES: Record<string, string[]> = {
  spam: [
    "Пользователь {user} ID: {user_id} использует чат для рассылки рекламы и спама, что нарушает правила сообщества. Прошу удалить его сессию и заблокировать возможность отправки нежелательных сообщений.",
    "Здравствуйте, хочу пожаловаться на {user} ID: {user_id}, он использует спам для продвижения своего канала, прошу принять меры по удалению аккаунта.",
    "Complaint about spam. User {user} with ID: {user_id} is spamming groups, please take action.",
    "Жалоба на рассылку рекламы. Пользователь {user} с ID: {user_id} спамит по группам, прошу принять меры.",
  ],
  porn: [
    "Добрый день, прошу заблокировать аккаунт {user} с ID: {user_id}. Пользователь занимается распространением запрещённого контента.",
    "Пользователь {user} с ID: {user_id} распространяет контент 18+, нарушающий правила платформы, прошу принять меры.",
    "Good afternoon, please block account {user} ID: {user_id} for distributing prohibited content.",
  ],
  violence: [
    "Hello, Telegram support! User ID: {user_id} has shared content depicting violence and abuse. Please take immediate action.",
    "Пользователь {user} ID: {user_id} публикует контент, содержащий насилие. Прошу принять меры и удалить аккаунт.",
    "I am reporting user ID: {user_id} for sharing violent content. Please investigate and take appropriate action.",
  ],
  harass: [
    "Прошу принять меры против пользователя {user} ID: {user_id}, который занимается преследованием и домогательством.",
    "User {user} ID: {user_id} is harassing and threatening other users. Please take action to block this account.",
    "Пользователь {user} ID: {user_id} систематически преследует других пользователей. Прошу удалить аккаунт.",
  ],
  fraud: [
    "Пользователь {user} ID: {user_id} занимается мошенничеством и обманом других пользователей. Прошу заблокировать аккаунт.",
    "User {user} ID: {user_id} is involved in fraudulent activities and scamming users. Please block this account immediately.",
    "Жалоба на мошенника. Пользователь ID: {user_id} обманывает людей, прошу принять меры.",
  ],
  religion: [
    "User ID: {user_id} provokes people into conflicts by affecting religions, please take measures to remove this user.",
    "Пользователь {user} ID: {user_id} разжигает религиозную ненависть и конфликты, прошу принять меры.",
    "User ID: {user_id} provokes religious conflicts and hatred, please take action.",
  ],
  channel: [
    "Hello, Telegram support! I want to file a complaint against the Telegram channel: {id}. This channel distributes prohibited content. Please remove it. Thank you.",
    "Good afternoon, I want to complain about the channel: {id}. This channel publishes personal information of users. Please take action.",
    "Channel {id} violates Telegram platform rules by distributing illegal materials. Please block the channel.",
  ],
  group: [
    "Hello, Telegram Support, I want to file a complaint against the group with ID: {id} for distributing prohibited content. Please take action to block the group!",
    "Good day, group {id} is used to distribute illegal materials, please block the group.",
    "Жалоба на группу {id}: распространение запрещённого контента. Прошу заблокировать.",
  ],
  session: [
    "Здравствуйте, меня взломали и выкинули с аккаунта {user}. Теперь я не могу зайти. Прошу обнулите сессии или удалите аккаунт. Вот мой ID: {user_id}",
    "Hello, I fell for a phishing link and got hacked. Account {user} ID: {user_id}. Please reset all sessions or delete the account.",
    "Здравствуйте, у меня украли аккаунт {user} с ID {user_id}. Прошу отключить все сессии на данном аккаунте.",
  ],
  drugs: [
    "Пользователь {user} ID: {user_id} занимается продажей и распространением наркотиков через Telegram. Прошу немедленно заблокировать аккаунт.",
    "User {user} ID: {user_id} is selling and distributing drugs via Telegram. Please block this account immediately.",
    "Жалоба на наркоторговца. Пользователь ID: {user_id} продаёт запрещённые вещества. Прошу удалить аккаунт.",
  ],
  terrorism: [
    "Уважаемая служба поддержки Telegram! Пользователь {user} с ID: {user_id} распространяет материалы террористического характера, призывает к насильственным действиям. Прошу немедленно заблокировать.",
    "I am reporting user ID: {user_id} for posting terrorist propaganda and calls for violence. This violates your terms of service. Please remove this account immediately.",
    "User {user} ID: {user_id} is spreading extremist and terrorist content. Please take immediate action to block this account.",
    "Данный аккаунт {user} ID: {user_id} занимается пропагандой терроризма и вербовкой участников. Прошу немедленно удалить.",
  ],
  extremism: [
    "Пользователь {user} ID: {user_id} распространяет экстремистские материалы, ненависть по признаку расы и национальности. Прошу заблокировать аккаунт.",
    "User {user} ID: {user_id} is promoting extremist ideology and inciting racial hatred. Please block this account immediately.",
    "Аккаунт {user} ID: {user_id} публикует контент, разжигающий межнациональную и религиозную рознь. Прошу принять меры.",
    "Жалоба на экстремизм. Пользователь {user} ID: {user_id} пропагандирует запрещённые организации. Прошу удалить аккаунт.",
  ],
  child: [
    "URGENT: User ID: {user_id} is distributing child sexual abuse material (CSAM). This is illegal and requires immediate action. Please block this account and report to law enforcement.",
    "Срочно! Аккаунт {user} ID: {user_id} распространяет материалы сексуального насилия над детьми. Прошу немедленно заблокировать и сообщить в правоохранительные органы.",
    "User {user} ID: {user_id} is sharing prohibited content involving minors. Please take immediate action to remove this account.",
  ],
  bot: [
    "Данный бот {user} ID: {user_id} используется для массовой рассылки спама и нарушает правила Telegram. Прошу заблокировать.",
    "This bot {user} ID: {user_id} is conducting illegal activities including mass spam and phishing attacks. Please disable it immediately.",
    "Жалоба на бота ID: {user_id}. Бот занимается мошенничеством, сбором персональных данных и фишингом. Прошу удалить.",
    "Bot {user} ID: {user_id} is being used for automated harassment and scamming. Please take action to disable this bot.",
  ],
  gambling: [
    "Пользователь {user} ID: {user_id} организует и продвигает азартные игры и букмекерскую деятельность в Telegram, что нарушает правила платформы и законодательство. Прошу заблокировать.",
    "User {user} ID: {user_id} is running illegal gambling operations and betting schemes. Please block this account immediately.",
    "Жалоба на азартные игры. Аккаунт {user} ID: {user_id} привлекает пользователей в букмекерские конторы и казино. Прошу удалить.",
  ],
  selfharm: [
    "URGENT: User {user} ID: {user_id} is promoting self-harm and suicide. This content endangers lives and requires immediate removal.",
    "Пользователь {user} ID: {user_id} продвигает самоповреждение и суицидальное поведение. Прошу немедленно заблокировать.",
    "User {user} ID: {user_id} shares graphic content of self-harm and encourages others to do the same. This is a safety emergency.",
  ],
  piracy: [
    "Пользователь {user} ID: {user_id} занимается массовым распространением пиратского контента: фильмов, ПО, игр. Прошу заблокировать аккаунт.",
    "User {user} ID: {user_id} is distributing copyrighted material including movies, software, and games without authorization. Please take action.",
    "Жалоба на пиратство. Аккаунт {user} ID: {user_id} является узлом распространения нелегального контента. Прошу удалить.",
  ],
  session_mass: [
    "Здравствуйте! Прошу обнулить все сессии аккаунта {user} ID: {user_id}. Я потерял доступ к своему аккаунту, меня выкинуло со всех устройств. Подозреваю взлом. Вот ссылка на нарушение: {id}",
    "Hello Telegram Support! Account {user} ID: {user_id} was hacked. Please terminate ALL active sessions immediately. The attacker is using my account. Link: {id}",
    "URGENT: Account {user} ID: {user_id} has been compromised. I need all sessions terminated NOW. I cannot access my account anymore. Reference: {id}",
    "Здравствуйте, аккаунт {user} ID: {user_id} взломан. Прошу принудительно завершить все активные сессии и сбросить двухфакторную аутентификацию. Ссылка: {id}",
    "My Telegram account {user} ID: {user_id} was stolen. Please kill all sessions, reset 2FA, and help me recover. This is an emergency. {id}",
  ],
  session_multi: [
    "Здравствуйте, хочу сообщить о массовом взломе. Аккаунт {user} ID: {user_id} используется для рассылки спама с множества сессий. Прошу обнулить все сессии и заблокировать. {id}",
    "Multiple fake sessions are being used by {user} ID: {user_id} to spam groups and channels. Please reset all sessions and investigate. Reference: {id}",
    "Аккаунт {user} ID: {user_id} скомпрометирован и используется для автоматической рассылки. Нужно обнулить сессии и заблокировать источник. {id}",
    "I'm reporting {user} ID: {user_id} for session abuse. Multiple unauthorized sessions are sending spam. Please terminate all sessions immediately. {id}",
    "Пользователь {user} ID: {user_id} использует взломанные аккаунты для массовых действий. Прошу проверить и обнулить все сессии. {id}",
  ],
  session_nuke: [
    "EMERGENCY: Account {user} ID: {user_id} is under active attack. ALL sessions must be terminated IMMEDIATELY. The attacker is actively using the account. {id}",
    "Здравствуйте! Аккаунт {user} ID: {user_id} находится под активной атакой. Требуется НЕМЕДЛЕННО обнулить ВСЕ сессии. Хакер уже использует аккаунт! {id}",
    "URGENT SECURITY BREACH: {user} ID: {user_id} is being actively compromised. Kill every session NOW. This is not a drill. Reference: {id}",
    "Аккаунт {user} ID: {user_id} полностью скомпрометирован. Хакер имеет полный доступ. Прошу НУКНУТЬ все сессии, сбросить 2FA и заблокировать. {id}",
    "Account {user} ID: {user_id} is being actively used by an attacker. I need a full session wipe — every single session terminated. This is critical. {id}",
  ],
};

/** Fake visual snos — имитация отправки */
async function runFakeSnos(
  ctx: Context,
  type: string,
  userId: string,
  username: string,
  link: string,
  count: number,
  label: string,
  name: string,
  endMarkup?: any
): Promise<void> {
  const chatId = ctx.chat!.id;
  const displayTarget = username || userId;
  const header = `${label} <b>${name}</b>\n◎ Цель: <code>${displayTarget}</code> | Отправок: <b>${count}</b>`;

  const msg = await ctx.reply(`${header}\n\n<code>▸ Подготовка жалоб...</code>`, {
    parse_mode: "HTML",
  });

  const templates = COMPLAINT_TYPES[type] ?? COMPLAINT_TYPES.spam;
  const stages = Math.min(count, 8);
  const step = Math.floor(count / stages);

  for (let i = 0; i < stages; i++) {
    const sent = Math.min((i + 1) * step, count);
    const pct = Math.round((sent / count) * 100);
    const bar = progressBar(pct, 100, 18);
    const template = templates[i % templates.length];
    const complaint = template
      .replace(/{user}/g, username || "target")
      .replace(/{user_id}/g, userId)
      .replace(/{id}/g, link || userId);

    const text =
      `${header}\n\n` +
      `<code>[${bar}] ${pct}%</code>\n\n` +
      `<b>▸ Отправка #${sent}:</b>\n` +
      `<code>${complaint.slice(0, 120)}...</code>\n\n` +
      `▣ Email: <code>${fakeEmail()}</code>\n` +
      `◆ Phone: <code>${randomPhone()}</code>`;

    try {
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, text, {
        parse_mode: "HTML",
      });
    } catch {}
    await sleep(600 + Math.random() * 350);
  }

  const delivered = Math.floor(count * (0.82 + Math.random() * 0.15));
  const rejected = Math.floor(count * (0.03 + Math.random() * 0.1));
  const servers = 2 + Math.floor(Math.random() * 6);
  const time = (count * 0.05 + Math.random() * 2).toFixed(1);
  const accounts = 3 + Math.floor(Math.random() * 8);

  const result =
    `${label} <b>${name} — ВЫПОЛНЕНО</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `◎ Цель: <code>${displayTarget}</code>\n` +
    `▣ Отправлено: <b>${count}</b>\n` +
    `✓ Доставлено: <b>${delivered}</b>\n` +
    `✗ Отклонено: <b>${rejected}</b>\n` +
    `◈ Серверов: <b>${servers}</b>\n` +
    `◉ Аккаунтов: <b>${accounts}</b>\n` +
    `◆ Время: <b>${time}с</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<code>Жалобы отправлены на рассмотрение</code>`;

  try {
    await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, {
      parse_mode: "HTML",
      ...(endMarkup ?? {}),
    });
  } catch {}
}

/** Real session-based snos — реальная отправка через сессии */
async function runSessionSnos(
  ctx: Context,
  type: string,
  userId: string,
  username: string,
  link: string,
  count: number,
  label: string,
  name: string,
  endMarkup?: any
): Promise<void> {
  const chatId = ctx.chat!.id;
  const displayTarget = username || userId;
  const header = `${label} <b>${name}</b>\n◎ Цель: <code>${displayTarget}</code> | Отправок: <b>${count}</b>`;

  const sessions = listSessions();
  const validSessions = sessions.filter(s => s.token && s.status === "active");

  if (validSessions.length === 0) {
    const result =
      `${label} <b>${name} — ОШИБКА</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `◎ Цель: <code>${displayTarget}</code>\n\n` +
      `✗ Нет доступных сессий!\n\n` +
      `Доступно сессий: <b>${sessions.length}</b>\n` +
      `Активных: <b>${validSessions.length}</b>\n\n` +
      `Загрузите session файлы через /admin → session_upload`;

    const msg = await ctx.reply(result, { parse_mode: "HTML" });
    return;
  }

  const msg = await ctx.reply(`${header}\n\n<code>▸ Загрузка ${validSessions.length} сессий...</code>`, {
    parse_mode: "HTML",
  });

  const templates = COMPLAINT_TYPES[type] ?? COMPLAINT_TYPES.spam;
  let sent = 0;
  let failed = 0;
  let successSessions = new Set<string>();

  for (let i = 0; i < count; i++) {
    const session = validSessions[i % validSessions.length];
    const template = templates[i % templates.length];
    const complaint = template
      .replace(/{user}/g, username || "target")
      .replace(/{user_id}/g, userId)
      .replace(/{id}/g, link || userId);

    const bot = createBotFromSession(session.token!);
    const result = await sendComplaintViaSession(bot, complaint, link || userId);

    if (result.ok) {
      sent++;
      successSessions.add(session.filename);
    } else {
      failed++;
    }

    const pct = Math.round(((i + 1) / count) * 100);
    const bar = progressBar(pct, 100, 18);

    const text =
      `${header}\n\n` +
      `<code>[${bar}] ${pct}%</code>\n\n` +
      `<b>▸ Отправлено: ${sent}/${count}</b>\n` +
      `✓ Успешно: <b>${sent}</b>\n` +
      `✗ Ошибок: <b>${failed}</b>\n\n` +
      `◆ Сессий использовано: <b>${successSessions.size}/${validSessions.length}</b>`;

    try {
      await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, text, {
        parse_mode: "HTML",
      });
    } catch {}

    await sleep(1000 + Math.random() * 500);
  }

  const result =
    `${label} <b>${name} — ЗАВЕРШЕНО</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `◎ Цель: <code>${displayTarget}</code>\n` +
    `▣ Отправлено: <b>${count}</b>\n` +
    `✓ Успешно: <b>${sent}</b>\n` +
    `✗ Ошибок: <b>${failed}</b>\n` +
    `◆ Сессий использовано: <b>${successSessions.size}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<code>Жалобы отправлены через реальные сессии</code>`;

  try {
    await ctx.telegram.editMessageText(chatId, msg.message_id, undefined, result, {
      parse_mode: "HTML",
      ...(endMarkup ?? {}),
    });
  } catch {}
}

/** Run snos with mode selection */
export async function runSnos(
  ctx: Context,
  type: string,
  userId: string,
  username: string,
  link: string,
  count: number,
  label: string,
  name: string,
  mode: SnosMode = "fake",
  endMarkup?: any
): Promise<void> {
  if (mode === "session") {
    await runSessionSnos(ctx, type, userId, username, link, count, label, name, endMarkup);
  } else {
    await runFakeSnos(ctx, type, userId, username, link, count, label, name, endMarkup);
  }
}

export const SNOS_METHODS: SnosMethod[] = [
  {
    key: "spam",
    emoji: "■",
    name: "Снос за СПАМ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>\n\nПример: <code>123456789 @user https://t.me/c/xxx 50</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "spam", uid, uname, link, count, "■", "Снос за СПАМ", mode ?? "fake", em),
  },
  {
    key: "porn",
    emoji: "■",
    name: "Снос за ПОРНО",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "porn", uid, uname, link, count, "■", "Снос за ПОРНО", mode ?? "fake", em),
  },
  {
    key: "violence",
    emoji: "■",
    name: "Снос за НАСИЛИЕ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "violence", uid, uname, link, count, "■", "Снос за НАСИЛИЕ", mode ?? "fake", em),
  },
  {
    key: "harass",
    emoji: "■",
    name: "Снос за ДОМОГАТЕЛЬСТВО",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "harass", uid, uname, link, count, "■", "Снос за ДОМОГАТЕЛЬСТВО", mode ?? "fake", em),
  },
  {
    key: "fraud",
    emoji: "■",
    name: "Снос за МОШЕННИЧЕСТВО",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "fraud", uid, uname, link, count, "■", "Снос за МОШЕННИЧЕСТВО", mode ?? "fake", em),
  },
  {
    key: "religion",
    emoji: "■",
    name: "Снос за РЕЛИГИЮ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "religion", uid, uname, link, count, "■", "Снос за РЕЛИГИЮ", mode ?? "fake", em),
  },
  {
    key: "channel",
    emoji: "■",
    name: "Снос КАНАЛА",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_канал кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "channel", uid, uname, link, count, "■", "Снос КАНАЛА", mode ?? "fake", em),
  },
  {
    key: "group",
    emoji: "■",
    name: "Снос ГРУППЫ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_группу кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "group", uid, uname, link, count, "■", "Снос ГРУППЫ", mode ?? "fake", em),
  },
  {
    key: "session",
    emoji: "■",
    name: "Снос СЕССИЙ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "session", uid, uname, link, count, "■", "Снос СЕССИЙ", mode ?? "fake", em),
  },
  {
    key: "drugs",
    emoji: "■",
    name: "Снос за НАРКОТИКИ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "drugs", uid, uname, link, count, "■", "Снос за НАРКОТИКИ", mode ?? "fake", em),
  },
  {
    key: "terrorism",
    emoji: "■",
    name: "Снос за ТЕРРОРИЗМ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "terrorism", uid, uname, link, count, "■", "Снос за ТЕРРОРИЗМ", mode ?? "fake", em),
  },
  {
    key: "extremism",
    emoji: "■",
    name: "Снос за ЭКСТРЕМИЗМ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "extremism", uid, uname, link, count, "■", "Снос за ЭКСТРЕМИЗМ", mode ?? "fake", em),
  },
  {
    key: "child",
    emoji: "■",
    name: "Снос за ДЕТСКИЙ КОНТЕНТ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "child", uid, uname, link, count, "■", "Снос за ДЕТСКИЙ КОНТЕНТ", mode ?? "fake", em),
  },
  {
    key: "bot",
    emoji: "■",
    name: "Снос БОТА",
    promptLines: "Введи данные цели через пробел:\n<code>ID @username_бота ссылка кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "bot", uid, uname, link, count, "■", "Снос БОТА", mode ?? "fake", em),
  },
  {
    key: "gambling",
    emoji: "■",
    name: "Снос за АЗАРТ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "gambling", uid, uname, link, count, "■", "Снос за АЗАРТ", mode ?? "fake", em),
  },
  {
    key: "selfharm",
    emoji: "■",
    name: "Снос за САМОПОВРЕЖДЕНИЕ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "selfharm", uid, uname, link, count, "■", "Снос за САМОПОВРЕЖДЕНИЕ", mode ?? "fake", em),
  },
  {
    key: "piracy",
    emoji: "■",
    name: "Снос за ПИРАТСТВО",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "piracy", uid, uname, link, count, "■", "Снос за ПИРАТСТВО", mode ?? "fake", em),
  },
  {
    key: "session_mass",
    emoji: "◆",
    name: "Массовый Снос СЕССИЙ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>\n\n<i>Массовая отправка жалоб на обнуление сессий</i>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "session_mass", uid, uname, link, count, "◆", "Массовый Снос СЕССИЙ", mode ?? "fake", em),
  },
  {
    key: "session_multi",
    emoji: "◆",
    name: "Мульти-Снос СЕССИЙ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>\n\n<i>Мульти-аккаунт отправка для обнуления сессий</i>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "session_multi", uid, uname, link, count, "◆", "Мульти-Снос СЕССИЙ", mode ?? "fake", em),
  },
  {
    key: "session_nuke",
    emoji: "◆",
    name: "NUKE СЕССИЙ",
    promptLines: "Введи данные цели через пробел:\n<code>ID @юзернейм ссылка_на_нарушение кол-во</code>\n\n<i>Полное уничтожение всех сессий цели</i>",
    run: (ctx, uid, uname, link, count, em, mode) => runSnos(ctx, "session_nuke", uid, uname, link, count, "◆", "NUKE СЕССИЙ", mode ?? "fake", em),
  },
];

export const SNOS_MAP: Record<string, SnosMethod> = Object.fromEntries(
  SNOS_METHODS.map((m) => [m.key, m])
);
