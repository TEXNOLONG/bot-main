/**
 * search.ts — Search the in-memory OSINT index and format results.
 */
import {
  searchPhone, searchEmail, searchUsername, searchIp, searchName,
  getStats,
} from "./mem-db.js";
import type { Record } from "./mem-db.js";

export type SearchField = "phone" | "email" | "name" | "username" | "ip";

const RE_EMAIL    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const RE_IP       = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const RE_PHONE_D  = /^[0-9]{7,15}$/;

export function detectField(raw: string): SearchField {
  const q = raw.trim();
  if (RE_EMAIL.test(q)) return "email";
  if (RE_IP.test(q)) return "ip";
  const digits = q.replace(/[\s\-().+]/g, "");
  if (RE_PHONE_D.test(digits)) return "phone";
  if (q.startsWith("@")) return "username";
  return "name";
}

export function normalizeQuery(q: string, field: SearchField): string {
  if (field === "phone")    return q.replace(/[\s\-().]/g, "");
  if (field === "email")    return q.toLowerCase().trim();
  if (field === "username") return q.startsWith("@") ? q.slice(1) : q.trim();
  return q.trim();
}

export interface SearchResult {
  field: SearchField;
  query: string;
  hits: Record[];
  totalInDb: number;
}

export function search(rawQuery: string, limit = 10): SearchResult {
  const field = detectField(rawQuery);
  const query = normalizeQuery(rawQuery, field);
  const { records } = getStats();

  let hits: Record[] = [];
  switch (field) {
    case "phone":    hits = searchPhone(query, limit); break;
    case "email":    hits = searchEmail(query, limit); break;
    case "username": hits = searchUsername(query, limit); break;
    case "ip":       hits = searchIp(query, limit); break;
    case "name":     hits = searchName(query, limit); break;
  }

  return { field, query, hits, totalInDb: records };
}

const FIELD_LABELS: Record<SearchField, string> = {
  phone:    "📞 Телефон",
  email:    "📧 Email",
  name:     "👤 Имя/ФИО",
  username: "🔤 Username",
  ip:       "🌐 IP",
};

export function formatResults(result: SearchResult): string {
  const { field, query, hits, totalInDb } = result;
  const header =
    `🗄️ <b>Поиск по базам утечек</b>\n` +
    `${FIELD_LABELS[field]}: <code>${query}</code>\n` +
    `Записей в памяти: <b>${totalInDb.toLocaleString()}</b>\n\n`;

  if (!hits.length) {
    return header + `❌ <b>Ничего не найдено</b>\n<i>Нет совпадений в загруженных базах.</i>`;
  }

  const lines = hits.map((r, i) => {
    const parts: string[] = [];
    if (r.phone)    parts.push(`📞 <code>${r.phone}</code>`);
    if (r.email)    parts.push(`📧 <code>${r.email}</code>`);
    if (r.name)     parts.push(`👤 ${r.name}`);
    if (r.username) parts.push(`🔤 @${r.username}`);
    if (r.ip)       parts.push(`🌐 <code>${r.ip}</code>`);
    return (
      `<b>${i + 1}.</b> ${parts.join("  │  ")}\n` +
      `<code>${r.raw.slice(0, 200)}</code>`
    );
  });

  return header + `✅ <b>Найдено: ${hits.length}</b>\n\n` + lines.join("\n\n");
}
