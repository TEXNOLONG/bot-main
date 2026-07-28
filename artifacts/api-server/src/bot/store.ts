import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "snos_data.json");

export interface Subscription {
  userId: number;
  username?: string;
  firstName?: string;
  grantedAt: number;
  expiresAt: number;
  grantedBy: number;
}

export interface WelcomeMedia {
  fileId: string;
  type: "photo" | "animation";
}

export interface UserStats {
  userId: number;
  username?: string;
  firstName?: string;
  firstSeen: number;
  lastSeen: number;
  operations: number;
}

export interface UserAgreement {
  acceptedAt: number;
  version: string;
  articles: string[];
}

export interface Store {
  subscriptions: Record<number, Subscription>;
  welcomeMedia?: WelcomeMedia;
  users: Record<number, UserStats>;
  broadcastText?: string;
  sessions: Record<number, Session[]>;
  agreements: Record<number, UserAgreement>;
}

export interface Session {
  sessionId: string;
  userId: number;
  device: string;
  platform: string;
  ip: string;
  location: string;
  addedAt: number;
  addedBy: number;
}

function loadStore(): Store {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      // migrate: add users field if missing
      if (!parsed.users) parsed.users = {};
      if (!parsed.sessions) parsed.sessions = {};
      if (!parsed.agreements) parsed.agreements = {};
      return parsed;
    }
  } catch {
    // ignore
  }
  return { subscriptions: {}, users: {}, sessions: {}, agreements: {} };
}

function saveStore(store: Store): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

let _store: Store = loadStore();

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function hasActiveSubscription(userId: number): boolean {
  const sub = _store.subscriptions[userId];
  if (!sub) return false;
  return sub.expiresAt > Date.now();
}

export function getSubscription(userId: number): Subscription | null {
  const sub = _store.subscriptions[userId];
  if (!sub) return null;
  return sub;
}

export function grantSubscription(
  userId: number,
  username: string | undefined,
  firstName: string | undefined,
  durationDays: number,
  adminId: number
): Subscription {
  const now = Date.now();
  const existing = _store.subscriptions[userId];
  const base = existing && existing.expiresAt > now ? existing.expiresAt : now;

  const sub: Subscription = {
    userId,
    username,
    firstName,
    grantedAt: now,
    expiresAt: base + durationDays * 24 * 60 * 60 * 1000,
    grantedBy: adminId,
  };

  _store.subscriptions[userId] = sub;
  saveStore(_store);
  return sub;
}

export function revokeSubscription(userId: number): boolean {
  if (!_store.subscriptions[userId]) return false;
  delete _store.subscriptions[userId];
  saveStore(_store);
  return true;
}

export function getAllSubscriptions(): Subscription[] {
  return Object.values(_store.subscriptions);
}

export function getActiveSubscriptions(): Subscription[] {
  const now = Date.now();
  return Object.values(_store.subscriptions).filter((s) => s.expiresAt > now);
}

// ─── Welcome Media ────────────────────────────────────────────────────────────

export function getWelcomeMedia(): WelcomeMedia | null {
  return _store.welcomeMedia ?? null;
}

export function setWelcomeMedia(media: WelcomeMedia): void {
  _store.welcomeMedia = media;
  saveStore(_store);
}

export function clearWelcomeMedia(): void {
  delete _store.welcomeMedia;
  saveStore(_store);
}

// ─── User tracking ────────────────────────────────────────────────────────────

// ─── Deferred save — writes happen at most once per 5s to avoid thrashing ─────
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    saveStore(_store);
  }, 5000);
}

export function trackUser(userId: number, username?: string, firstName?: string): void {
  const now = Date.now();
  const existing = _store.users[userId];
  _store.users[userId] = {
    userId,
    username: username ?? existing?.username,
    firstName: firstName ?? existing?.firstName,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
    operations: existing?.operations ?? 0,
  };
  scheduleSave();
}

export function incrementOps(userId: number): void {
  const u = _store.users[userId];
  if (u) {
    u.operations = (u.operations ?? 0) + 1;
    scheduleSave();
  }
}

export function getUserStats(userId: number): UserStats | null {
  return _store.users[userId] ?? null;
}

export function getAllUsers(): UserStats[] {
  return Object.values(_store.users);
}

export function flushStore(): void {
  saveStore(_store);
}

/** Keeps an audit trail without storing search targets or message contents. */
// ─── Session management ───────────────────────────────────────────────────────

export function addSession(userId: number, device: string, platform: string, ip: string, location: string, addedBy: number): Session {
  const session: Session = {
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    device,
    platform,
    ip,
    location,
    addedAt: Date.now(),
    addedBy,
  };
  if (!_store.sessions[userId]) _store.sessions[userId] = [];
  _store.sessions[userId].push(session);
  scheduleSave();
  return session;
}

export function removeSession(userId: number, sessionId: string): boolean {
  const sessions = _store.sessions[userId];
  if (!sessions) return false;
  const idx = sessions.findIndex(s => s.sessionId === sessionId);
  if (idx === -1) return false;
  sessions.splice(idx, 1);
  if (sessions.length === 0) delete _store.sessions[userId];
  scheduleSave();
  return true;
}

export function getSessions(userId: number): Session[] {
  return _store.sessions[userId] ?? [];
}

export function getAllSessions(): Session[] {
  return Object.values(_store.sessions).flat();
}

export function clearSessions(userId: number): number {
  const count = (_store.sessions[userId] ?? []).length;
  delete _store.sessions[userId];
  scheduleSave();
  return count;
}

// ─── Agreement management ─────────────────────────────────────────────────────

export function acceptAgreement(userId: number, articles: string[], version: string): void {
  _store.agreements[userId] = {
    acceptedAt: Date.now(),
    version,
    articles,
  };
  scheduleSave();
}

export function getUserAgreement(userId: number): UserAgreement | null {
  return _store.agreements[userId] ?? null;
}

export function hasAcceptedAgreement(userId: number, requiredArticles?: string[]): boolean {
  const ag = _store.agreements[userId];
  if (!ag) return false;
  if (!requiredArticles) return true;
  return requiredArticles.every((a) => ag.articles.includes(a));
}
