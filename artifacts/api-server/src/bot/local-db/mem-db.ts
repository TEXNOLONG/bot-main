/**
 * mem-db.ts — Pure in-memory index for OSINT records.
 * No disk, no native bindings, no WASM. Just Maps.
 *
 * Exact-match fields (phone, email, username, ip): O(1) lookup via Map.
 * Name (partial match): linear scan over nameList.
 */

export interface Record {
  source: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  ip: string | null;
  raw: string;
}

// ─── Index structures ─────────────────────────────────────────────────────────

const phoneIdx    = new Map<string, Record[]>();
const emailIdx    = new Map<string, Record[]>();
const usernameIdx = new Map<string, Record[]>();
const ipIdx       = new Map<string, Record[]>();
const nameList: Record[] = [];

let _totalRecords = 0;
const _sourceRecordCount = new Map<string, number>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addToIdx(idx: Map<string, Record[]>, key: string | null, rec: Record): void {
  if (!key) return;
  const list = idx.get(key);
  if (list) list.push(rec);
  else idx.set(key, [rec]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getStats(): { sources: number; records: number } {
  return { sources: _sourceRecordCount.size, records: _totalRecords };
}

export function getSourceRecordCounts(): Map<string, number> {
  return _sourceRecordCount;
}

export function clearSource(source: string): void {
  const count = _sourceRecordCount.get(source) ?? 0;
  if (!count) return;

  for (const idx of [phoneIdx, emailIdx, usernameIdx, ipIdx] as Map<string, Record[]>[]) {
    for (const [key, recs] of idx) {
      const filtered = recs.filter((r) => r.source !== source);
      if (filtered.length === 0) idx.delete(key);
      else idx.set(key, filtered);
    }
  }
  // Remove from nameList (mutate in place)
  let i = nameList.length;
  while (i--) {
    if (nameList[i]!.source === source) nameList.splice(i, 1);
  }

  _totalRecords -= count;
  _sourceRecordCount.delete(source);
}

export function bulkInsert(rows: Record[]): void {
  for (const r of rows) {
    addToIdx(phoneIdx,    r.phone,    r);
    addToIdx(emailIdx,    r.email,    r);
    addToIdx(usernameIdx, r.username, r);
    addToIdx(ipIdx,       r.ip,       r);
    if (r.name) nameList.push(r);
    _totalRecords++;
    _sourceRecordCount.set(r.source, (_sourceRecordCount.get(r.source) ?? 0) + 1);
  }
}

export function searchPhone(q: string, limit = 10): Record[] {
  return (phoneIdx.get(q) ?? []).slice(0, limit);
}

export function searchEmail(q: string, limit = 10): Record[] {
  return (emailIdx.get(q) ?? []).slice(0, limit);
}

export function searchUsername(q: string, limit = 10): Record[] {
  return (usernameIdx.get(q) ?? []).slice(0, limit);
}

export function searchIp(q: string, limit = 10): Record[] {
  return (ipIdx.get(q) ?? []).slice(0, limit);
}

export function searchName(q: string, limit = 10): Record[] {
  const lower = q.toLowerCase();
  const results: Record[] = [];
  for (const r of nameList) {
    if (r.name!.toLowerCase().includes(lower)) {
      results.push(r);
      if (results.length >= limit) break;
    }
  }
  return results;
}
