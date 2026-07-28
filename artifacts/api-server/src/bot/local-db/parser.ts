/**
 * parser.ts — Stream-parse CSV/TXT files line-by-line.
 * Auto-detects delimiter and column mapping.
 * Never loads the whole file into memory.
 */
import { createReadStream } from "fs";
import readline from "readline";

export interface ParsedRow {
  phone: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  ip: string | null;
  raw: string;
}

// ─── Regex patterns ───────────────────────────────────────────────────────────

const RE_EMAIL    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const RE_PHONE    = /^\+?[0-9]{7,15}$/;
const RE_IP       = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const RE_USERNAME = /^@?[a-zA-Z0-9_]{3,32}$/;

function detectDelimiter(sample: string): string {
  const candidates = ["\t", ";", "|", ":", ","];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    const count = sample.split(d).length - 1;
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

type ColType = "phone" | "email" | "name" | "username" | "ip" | null;

function guessColType(header: string): ColType {
  const h = header.toLowerCase().trim();
  if (/phone|tel|mobile|mob|msisdn/.test(h)) return "phone";
  if (/email|mail|e-mail/.test(h)) return "email";
  if (/name|fio|fullname|full_name|surname|имя|фио/.test(h)) return "name";
  if (/user|login|nick|handle|username/.test(h)) return "username";
  if (/^ip$|ip_addr|ipaddress|remote_addr/.test(h)) return "ip";
  return null;
}

function detectByValue(value: string): ColType {
  const v = value.trim();
  if (RE_EMAIL.test(v)) return "email";
  if (RE_IP.test(v)) return "ip";
  if (RE_PHONE.test(v.replace(/[\s\-().]/g, ""))) return "phone";
  return null;
}

function normalizePhone(v: string): string {
  return v.replace(/[\s\-().]/g, "");
}

function normalizeUsername(v: string): string {
  return v.startsWith("@") ? v.slice(1) : v;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export async function parseFile(
  filePath: string,
  source: string,
  onBatch: (rows: (ParsedRow & { source: string })[]) => void,
  batchSize = 5000
): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let lineNum = 0;
    let delimiter = ",";
    let colMap: ColType[] = []; // index → field type
    let hasHeader = false;
    let batch: (ParsedRow & { source: string })[] = [];
    let total = 0;

    rl.on("line", (rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return;
      lineNum++;

      // ── First line: detect format ──
      if (lineNum === 1) {
        delimiter = detectDelimiter(line);
        const parts = line.split(delimiter);

        // Check if it's a header row (non-numeric, recognisable names)
        const allNonNumeric = parts.every((p) => isNaN(Number(p.trim())));
        const anyKnownHeader = parts.some((p) => guessColType(p) !== null);

        if (allNonNumeric && anyKnownHeader) {
          hasHeader = true;
          colMap = parts.map((p) => guessColType(p));
          return; // skip header row from data
        }

        // No header: guess columns from first row values
        hasHeader = false;
        colMap = parts.map((p) => detectByValue(p));
      }

      // ── Data line ──
      const parts = line.split(delimiter);
      const row: ParsedRow & { source: string } = {
        source,
        phone: null, email: null, name: null, username: null, ip: null,
        raw: line.slice(0, 500), // keep raw for display, truncate at 500
      };

      // Single-column file (e.g. plain list of emails or phones)
      if (colMap.length === 1 || parts.length === 1) {
        const val = (parts[0] ?? "").trim();
        const type = colMap[0] ?? detectByValue(val);
        if (type) assignField(row, type, val);
        else row.email = null; // unrecognised single column — still store raw
      } else {
        for (let i = 0; i < Math.min(parts.length, colMap.length); i++) {
          const val = (parts[i] ?? "").trim();
          if (!val) continue;
          const type = colMap[i] ?? detectByValue(val);
          if (type) assignField(row, type, val);
        }
      }

      // Skip rows where nothing was parsed (all nulls)
      const hasAny = row.phone || row.email || row.name || row.username || row.ip;
      if (!hasAny) return;

      batch.push(row);
      total++;

      if (batch.length >= batchSize) {
        onBatch(batch);
        batch = [];
      }
    });

    rl.on("close", () => {
      if (batch.length) onBatch(batch);
      resolve(total);
    });

    rl.on("error", reject);
    stream.on("error", reject);
  });
}

function assignField(
  row: ParsedRow,
  type: ColType,
  value: string
): void {
  switch (type) {
    case "phone":    row.phone    = normalizePhone(value); break;
    case "email":    row.email    = value.toLowerCase(); break;
    case "name":     row.name     = value; break;
    case "username": row.username = normalizeUsername(value); break;
    case "ip":       row.ip       = value; break;
  }
}
