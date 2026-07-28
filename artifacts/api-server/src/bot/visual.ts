export function progressBar(current: number, total: number, length = 20): string {
  const filled = Math.round((current / total) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const HEADER = `
╔══════════════════════════╗
║  ███████╗███╗  ██╗ ██████╗ ███████╗  ║
║  ██╔════╝████╗ ██║██╔═══██╗██╔════╝  ║
║  ███████╗██╔██╗██║██║   ██║███████╗  ║
║  ╚════██║██║╚████║██║   ██║╚════██║  ║
║  ███████║██║ ╚███║╚██████╔╝███████║  ║
║  ╚══════╝╚═╝  ╚══╝ ╚═════╝ ╚══════╝  ║
╚══════════════════════════╝
`.trim();

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}мс`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}с`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}м ${s}с`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

export function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "истекла";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
}

export function fakeEmail(): string {
  const names = ["admin", "support", "info", "user", "test", "noreply", "contact", "security", "no-reply", "root"];
  const domains = ["gmail.com", "mail.ru", "yandex.ru", "outlook.com", "proton.me", "icloud.com", "yahoo.com"];
  return `${names[Math.floor(Math.random() * names.length)]}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

export function fakeIP(): string {
  return `${rand(1,254)}.${rand(0,255)}.${rand(0,255)}.${rand(1,254)}`;
}

export function fakeToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEF";
  return Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function fakeMac(): string {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
  ).join(":");
}

export function fakePassword(): string {
  const pwds = ["qwerty123", "password1!", "Admin@2024", "P@ssw0rd", "123456789", "letmein2024", "Secure#Pass1", "Dragon99!", "Passw0rd#2025", "!QAZ2wsx"];
  return pwds[Math.floor(Math.random() * pwds.length)];
}

export function fakeHash(): string {
  const chars = "0123456789abcdef";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function fakeHash64(): string {
  const chars = "0123456789abcdef";
  return Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function fakeUserAgent(): string {
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) Edge/124.0.0.0",
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

export function fakeCVE(): string {
  const year = 2022 + Math.floor(Math.random() * 3);
  const num = 10000 + Math.floor(Math.random() * 89999);
  return `CVE-${year}-${num}`;
}

export function fakePort(): number {
  const ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 8080, 8443, 27017];
  return ports[Math.floor(Math.random() * ports.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const FAKE_CITIES = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск", "Самара", "Уфа"];
export const FAKE_ISP = ["Ростелеком", "МТС", "Билайн", "МегаФон", "Yota", "ТТК", "Дом.ру"];
