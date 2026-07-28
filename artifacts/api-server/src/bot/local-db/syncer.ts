/**
 * syncer.ts — Downloads files from Telegram channel into memory.
 * Disk usage: only db_index.json (~1 KB per file) with file IDs/names.
 * All actual DB data lives in RAM (cleared on restart, rebuilt from Telegram).
 */
import fs from "fs";
import path from "path";
import os from "os";
import { pipeline } from "stream/promises";
import fetch from "node-fetch";
import type { Telegram } from "telegraf";
import { bulkInsert, clearSource, getStats } from "./mem-db.js";
import { parseFile } from "./parser.js";

const INDEX_PATH = path.join(process.cwd(), "db_index.json");

// ─── Index file (tiny — just IDs + names) ────────────────────────────────────

export interface FileEntry {
  fileId: string;
  filename: string;
  addedAt: number;
  sizeBytes: number;
}

function loadIndex(): FileEntry[] {
  try {
    if (fs.existsSync(INDEX_PATH)) return JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  } catch {}
  return [];
}

function saveIndex(entries: FileEntry[]): void {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export function addToIndex(entry: FileEntry): void {
  const entries = loadIndex().filter((e) => e.fileId !== entry.fileId);
  entries.unshift(entry);
  saveIndex(entries);
}

export function removeFromIndex(fileId: string): void {
  saveIndex(loadIndex().filter((e) => e.fileId !== fileId));
}

export function getIndexedFiles(): FileEntry[] {
  return loadIndex();
}

export function isInIndex(fileId: string): boolean {
  return loadIndex().some((e) => e.fileId === fileId);
}

// ─── Download helpers ─────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB — Telegram Bot API limit

async function downloadToTmp(telegram: Telegram, fileId: string): Promise<string> {
  const tgFile = await telegram.getFile(fileId);
  if (!tgFile.file_path) throw new Error("Telegram не вернул file_path");

  const token = (telegram as any).token as string;
  const url = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;

  const resp = await fetch(url);
  if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

  const tmpPath = path.join(os.tmpdir(), `osint_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  await pipeline(resp.body as any, fs.createWriteStream(tmpPath));
  return tmpPath;
}

// ─── Index a single file ──────────────────────────────────────────────────────

export async function indexFile(
  telegram: Telegram,
  fileId: string,
  filename: string,
  sizeBytes: number,
  onStatus?: (msg: string) => Promise<void>
): Promise<{ ok: boolean; records: number; error?: string }> {
  if (sizeBytes > MAX_FILE_BYTES) {
    return {
      ok: false,
      records: 0,
      error:
        `Файл слишком большой: ${(sizeBytes / 1024 / 1024).toFixed(1)} МБ.\n` +
        `Telegram Bot API позволяет скачивать файлы до 20 МБ.\n` +
        `✂️ Раздели файл на части по 15–20 МБ и загрузи каждую отдельно.`,
    };
  }

  let tmpPath: string | null = null;
  try {
    await onStatus?.("⬇️ Скачиваю из Telegram...");
    tmpPath = await downloadToTmp(telegram, fileId);

    await onStatus?.("🔍 Парсю и загружаю в память...");
    clearSource(fileId);

    const records = await parseFile(tmpPath, fileId, (batch) => bulkInsert(batch));
    addToIndex({ fileId, filename, addedAt: Date.now(), sizeBytes });

    return { ok: true, records };
  } catch (err: any) {
    return { ok: false, records: 0, error: err?.message ?? "Неизвестная ошибка" };
  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
  }
}

// ─── Load all files from index on startup ────────────────────────────────────

export async function loadAllFromIndex(
  telegram: Telegram,
  onStatus: (msg: string) => void
): Promise<void> {
  const entries = loadIndex();
  if (!entries.length) {
    onStatus("📂 Индекс пуст — загружай базы в ТГ-канал командой /dbload");
    return;
  }

  onStatus(`📂 Найдено ${entries.length} баз — загружаю в память...`);

  for (const entry of entries) {
    onStatus(`⬇️ ${entry.filename}...`);
    let tmpPath: string | null = null;
    try {
      tmpPath = await downloadToTmp(telegram, entry.fileId);
      clearSource(entry.fileId);
      await parseFile(tmpPath, entry.fileId, (batch) => bulkInsert(batch));
      const count = getStats().records;
      onStatus(`✓ ${entry.filename} загружена`);
    } catch (err: any) {
      onStatus(`⚠️ ${entry.filename}: ${err?.message ?? "ошибка"}`);
    } finally {
      if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  const stats = getStats();
  onStatus(`✅ Готово: ${stats.sources} баз, ${stats.records.toLocaleString()} записей в памяти`);
}

export function removeFile(fileId: string): void {
  clearSource(fileId);
  removeFromIndex(fileId);
}
