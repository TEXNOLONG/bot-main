/**
 * session-manager.ts — Управление session файлами для реальной отправки жалоб
 */
import fs from "fs";
import path from "path";
import { Telegraf, Markup } from "telegraf";
import { logger } from "../lib/logger.js";

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

export interface SessionInfo {
  id: string;
  filename: string;
  userId: number;
  token?: string;
  createdAt: number;
  lastUsed?: number;
  status: "active" | "error" | "expired";
}

export function ensureSessionsDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

export function listSessions(): SessionInfo[] {
  ensureSessionsDir();
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith(".session"));
  return files.map(f => {
    try {
      const raw = fs.readFileSync(path.join(SESSIONS_DIR, f), "utf-8");
      const data = JSON.parse(raw);
      const auth = data?.session?.auth || data?.authorization || {};
      return {
        id: auth.user_id || f,
        filename: f,
        userId: auth.user_id || 0,
        token: auth.bot_token || data?.api_token,
        createdAt: data?.created_at || Date.now(),
        lastUsed: data?.last_used,
        status: "active",
      };
    } catch {
      return { id: f, filename: f, userId: 0, createdAt: Date.now(), status: "error" };
    }
  });
}

export function saveSession(filename: string, data: any): boolean {
  ensureSessionsDir();
  try {
    fs.writeFileSync(path.join(SESSIONS_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
    logger.info({ filename }, "Session saved");
    return true;
  } catch (err) {
    logger.error({ err, filename }, "Failed to save session");
    return false;
  }
}

export function deleteSession(filename: string): boolean {
  try {
    const filePath = path.join(SESSIONS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info({ filename }, "Session deleted");
      return true;
    }
    return false;
  } catch (err) {
    logger.error({ err, filename }, "Failed to delete session");
    return false;
  }
}

export function createBotFromSession(token: string): Telegraf {
  return new Telegraf(token);
}

export async function sendComplaintViaSession(
  bot: Telegraf,
  complaint: string,
  targetId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const tg = bot.telegram;
    await tg.sendMessage(777000, complaint, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("📎 Ссылка на нарушение", "url", { url: `https://t.me/${targetId}` })],
      ]),
    });
    return { ok: true };
  } catch (err: any) {
    logger.error({ err, targetId }, "Failed to send complaint via session");
    return { ok: false, error: err.description || err.message };
  }
}

export function getSessionStats(): { total: number; active: number; errors: number } {
  const sessions = listSessions();
  return {
    total: sessions.length,
    active: sessions.filter(s => s.status === "active").length,
    errors: sessions.filter(s => s.status === "error").length,
  };
}