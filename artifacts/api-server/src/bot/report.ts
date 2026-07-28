/**
 * report.ts — Hacker/Space themed HTML report generator for OSINT & camera results
 */
import type { Context } from "telegraf";

// ─── Shared CSS & JS ─────────────────────────────────────────────────────────

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  :root {
    --white:   #ffffff;
    --silver:  #d0d0d0;
    --gray:    #888888;
    --dim:     #555555;
    --muted:   #333333;
    --accent:  #ffffff;
    --bg:      #000000;
    --bg2:     #0a0a0a;
    --panel:   rgba(255, 255, 255, 0.03);
    --panel2:  rgba(255, 255, 255, 0.05);
    --border:  rgba(255, 255, 255, 0.18);
    --border2: rgba(255, 255, 255, 0.22);
    /* legacy aliases so inline styles still work */
    --green:   #d0d0d0;
    --cyan:    #ffffff;
    --orange:  #999999;
    --red:     #666666;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--silver);
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.6;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── Stars canvas (fixed) ── */
  #stars {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Subtle scanline overlay ── */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(0, 0, 0, 0.18) 3px,
      rgba(0, 0, 0, 0.18) 4px
    );
    pointer-events: none;
    z-index: 9000;
  }

  /* ── Main layout ── */
  .wrap {
    position: relative;
    z-index: 1;
    max-width: 980px;
    margin: 0 auto;
    padding: 40px 24px 60px;
  }

  /* ── Header ── */
  .hdr {
    text-align: center;
    margin-bottom: 44px;
    padding: 36px 24px 28px;
    border: 1px solid var(--border2);
    background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
    position: relative;
  }

  /* Corner brackets */
  .hdr::before {
    content: '';
    position: absolute;
    top: -2px; left: -2px;
    width: 24px; height: 24px;
    border-top: 2px solid var(--white);
    border-left: 2px solid var(--white);
  }
  .hdr::after {
    content: '';
    position: absolute;
    bottom: -2px; right: -2px;
    width: 24px; height: 24px;
    border-bottom: 2px solid var(--white);
    border-right: 2px solid var(--white);
  }
  .hdr-corner-tr {
    position: absolute;
    top: -2px; right: -2px;
    width: 24px; height: 24px;
    border-top: 2px solid var(--white);
    border-right: 2px solid var(--white);
  }
  .hdr-corner-bl {
    position: absolute;
    bottom: -2px; left: -2px;
    width: 24px; height: 24px;
    border-bottom: 2px solid var(--white);
    border-left: 2px solid var(--white);
  }

  .logo {
    font-family: 'Orbitron', monospace;
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 10px;
    color: var(--white);
    margin-bottom: 6px;
  }
  .logo em { color: var(--silver); font-style: normal; }

  .logo-sep {
    font-family: 'Orbitron', monospace;
    font-size: 11px;
    letter-spacing: 6px;
    color: var(--dim);
    margin-bottom: 18px;
    text-transform: uppercase;
  }

  .report-type {
    display: inline-block;
    padding: 5px 20px;
    border: 1px solid var(--border2);
    font-family: 'Orbitron', monospace;
    font-size: 13px;
    letter-spacing: 4px;
    color: var(--white);
    background: rgba(255,255,255,0.05);
    margin-bottom: 18px;
    text-transform: uppercase;
  }

  .hdr-meta {
    display: flex;
    justify-content: center;
    gap: 28px;
    font-size: 11px;
    color: var(--dim);
    letter-spacing: 1px;
    flex-wrap: wrap;
  }
  .hdr-meta span { display: flex; align-items: center; gap: 6px; }
  .dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--silver);
    display: inline-block;
    animation: dot-pulse 2s infinite;
  }
  .dot.cyan  { background: var(--white); }
  .dot.orange{ background: var(--gray);  }

  /* ── Stats bar ── */
  .stats {
    display: flex;
    gap: 16px;
    margin-bottom: 36px;
    flex-wrap: wrap;
  }
  .stat {
    flex: 1;
    min-width: 140px;
    border: 1px solid var(--border);
    padding: 18px 16px;
    background: var(--panel);
    text-align: center;
    position: relative;
  }
  .stat::before {
    content: '';
    position: absolute;
    top: -1px; left: -1px;
    width: 8px; height: 8px;
    border-top: 1px solid var(--white);
    border-left: 1px solid var(--white);
  }
  .stat-val {
    font-family: 'Orbitron', monospace;
    font-size: 28px;
    font-weight: 700;
    color: var(--white);
    display: block;
    line-height: 1;
    margin-bottom: 6px;
  }
  .stat-lbl {
    font-size: 9px;
    letter-spacing: 3px;
    color: var(--dim);
    text-transform: uppercase;
  }

  /* ── Panel ── */
  .panel {
    border: 1px solid var(--border);
    background: var(--panel);
    margin-bottom: 28px;
    position: relative;
  }
  .panel-title {
    padding: 10px 20px;
    background: rgba(255,255,255,0.04);
    border-bottom: 1px solid var(--border);
    font-size: 10px;
    letter-spacing: 4px;
    color: var(--white);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .panel-title::before {
    content: '▸';
    color: var(--silver);
  }
  .panel-body { padding: 20px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; }
  th {
    padding: 10px 14px;
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--white);
    border-bottom: 1px solid var(--border2);
    text-align: left;
    font-weight: normal;
  }
  td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: var(--silver);
    vertical-align: middle;
    font-size: 13px;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.03); }

  /* ── Camera grid (Insecam) ── */
  .cam-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }
  .cam-card {
    border: 1px solid var(--border);
    padding: 16px;
    background: rgba(0,0,0,0.5);
    transition: border-color 0.25s, background 0.25s;
    position: relative;
  }
  .cam-card::after {
    content: '';
    position: absolute;
    bottom: -1px; right: -1px;
    width: 8px; height: 8px;
    border-bottom: 1px solid var(--silver);
    border-right: 1px solid var(--silver);
  }
  .cam-card:hover { border-color: var(--white); background: rgba(255,255,255,0.04); }
  .cam-num {
    font-size: 9px;
    letter-spacing: 3px;
    color: var(--dim);
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .cam-id {
    font-family: 'Orbitron', monospace;
    font-size: 16px;
    color: var(--white);
    margin-bottom: 10px;
  }
  .cam-card a {
    display: block;
    color: var(--silver);
    text-decoration: none;
    font-size: 12px;
    margin-bottom: 12px;
    word-break: break-all;
    opacity: 0.75;
    transition: opacity 0.2s;
  }
  .cam-card a:hover { opacity: 1; color: var(--white); }

  /* ── RTSP snapshot ── */
  .snap-wrap {
    text-align: center;
    padding: 16px;
  }
  .snap-wrap img {
    max-width: 100%;
    border: 1px solid var(--border);
    filter: grayscale(100%);
  }
  .snap-none {
    padding: 40px;
    text-align: center;
    color: var(--dim);
    font-size: 13px;
    letter-spacing: 2px;
  }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 2px 9px;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    border: 1px solid;
  }
  .badge-green  { border-color: var(--silver); color: var(--silver); }
  .badge-cyan   { border-color: var(--white);  color: var(--white);  }
  .badge-orange { border-color: var(--gray);   color: var(--gray);   }
  .badge-red    { border-color: var(--dim);    color: var(--dim);    }

  /* ── Links ── */
  a { color: var(--silver); text-decoration: none; transition: color 0.2s; }
  a:hover { color: var(--white); }

  /* ── Info row ── */
  .info-row {
    display: flex;
    gap: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 9px 0;
    align-items: flex-start;
  }
  .info-row:last-child { border-bottom: none; }
  .info-key {
    width: 180px;
    flex-shrink: 0;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--dim);
    padding-top: 1px;
  }
  .info-val { color: var(--silver); font-size: 13px; word-break: break-all; }

  /* ── Divider ── */
  .divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 28px 0;
  }

  /* ── Footer ── */
  .footer {
    text-align: center;
    margin-top: 48px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.10);
    font-size: 10px;
    letter-spacing: 2px;
    color: var(--muted);
    text-transform: uppercase;
    line-height: 2;
  }

  /* ── Animations ── */
  @keyframes dot-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes blink { 50% { opacity: 0; } }

  .blink { animation: blink 1s step-end infinite; }
  .glow  { color: var(--white); }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .stats { flex-direction: column; }
    .cam-grid { grid-template-columns: 1fr; }
    .logo { font-size: 22px; letter-spacing: 5px; }
    .info-key { width: 130px; }
  }
`;

const STAR_JS = `
<script>
(function () {
  var c = document.getElementById('stars');
  var x = c.getContext('2d');
  var S = [];
  var N = 220;
  function resize() {
    c.width  = window.innerWidth;
    c.height = Math.max(document.body.scrollHeight, window.innerHeight);
  }
  function init() {
    S = [];
    for (var i = 0; i < N; i++) {
      var bright = Math.random() < 0.10;
      S.push({
        x:  Math.random() * c.width,
        y:  Math.random() * c.height,
        r:  bright ? (Math.random() * 1.6 + 0.5) : (Math.random() * 0.8 + 0.1),
        a:  Math.random() * 0.55 + 0.10,
        dy: Math.random() * 0.06 + 0.01,
        dx: (Math.random() - 0.5) * 0.03,
        bright: bright,
        phase: Math.random() * Math.PI * 2,
        freq:  Math.random() * 0.02 + 0.005
      });
    }
  }
  var t = 0;
  function draw() {
    x.clearRect(0, 0, c.width, c.height);
    t += 0.016;
    for (var i = 0; i < S.length; i++) {
      var s = S[i];
      var a = s.bright
        ? s.a * (0.5 + 0.5 * Math.sin(t * 40 * s.freq + s.phase))
        : s.a;
      x.beginPath();
      x.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      x.fillStyle = 'rgba(255,255,255,' + a + ')';
      x.fill();
      s.y += s.dy;
      s.x += s.dx;
      if (s.y > c.height + 4) { s.y = -4; s.x = Math.random() * c.width; }
      if (s.x < -4 || s.x > c.width + 4) { s.x = Math.random() * c.width; }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', function () { resize(); init(); });
  resize(); init(); draw();
})();
<\/script>`;

// ─── Header builder ───────────────────────────────────────────────────────────

function header(reportType: string, metaItems: { label: string; value: string; color?: string }[]): string {
  const metaHtml = metaItems
    .map((m) => {
      const cls = m.color ? `dot ${m.color}` : "dot";
      return `<span><span class="${cls}"></span>${m.label}: <b>${esc(m.value)}</b></span>`;
    })
    .join("\n        ");

  return `
  <header class="hdr">
    <div class="hdr-corner-tr"></div>
    <div class="hdr-corner-bl"></div>
    <div class="logo">SNOS<em>.</em>TOOLS</div>
    <div class="logo-sep">// intelligence platform //</div>
    <div class="report-type">${esc(reportType)}</div>
    <div class="hdr-meta">
      ${metaHtml}
    </div>
  </header>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function wrap(title: string, body: string): string {
  return `
  <section class="panel">
    <div class="panel-title">${esc(title)}</div>
    <div class="panel-body">${body}</div>
  </section>`;
}

function infoRow(key: string, val: string): string {
  return `<div class="info-row"><div class="info-key">${esc(key)}</div><div class="info-val">${val}</div></div>`;
}

function htmlDoc(bodyContent: string, pageTitle = "SNOS.TOOLS // OSINT INTEL"): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pageTitle)}</title>
<style>${SHARED_CSS}</style>
</head>
<body>
<canvas id="stars"></canvas>
<div class="wrap">
${bodyContent}

  <footer class="footer">
    <div>SNOS.TOOLS // OSINT INTELLIGENCE SYSTEM // v4.1</div>
    <div>CLASSIFIED OUTPUT — DO NOT DISTRIBUTE — ${esc(now())}</div>
    <div><span class="blink">_</span></div>
  </footer>
</div>
${STAR_JS}
</body>
</html>`;
}

// ─── Universal OSINT Report ───────────────────────────────────────────────────

export type OsintReportStatus = "success" | "partial" | "failed";

export interface OsintReportLink {
  label: string;
  url: string;
  status?: "found" | "missing" | "blocked" | "unknown";
  meta?: string;
}

export interface OsintReportSection {
  title: string;
  type: "info" | "table" | "links" | "raw";
  rows?: { key: string; value: string; badge?: "green" | "cyan" | "orange" | "red" }[];
  headers?: string[];
  tableRows?: string[][];
  links?: OsintReportLink[];
  rawHtml?: string;
}

export interface OsintReportData {
  methodKey: string;
  methodName: string;
  reportType: string;
  query: string;
  status?: OsintReportStatus;
  stats?: { label: string; value: string }[];
  sections: OsintReportSection[];
  source?: string;
}

function badgeHtml(kind?: "green" | "cyan" | "orange" | "red"): string {
  return kind ? `badge badge-${kind}` : "badge badge-cyan";
}

function linkStatusBadge(status?: OsintReportLink["status"]): string {
  switch (status) {
    case "found":   return `<span class="badge badge-green">FOUND</span>`;
    case "missing": return `<span class="badge badge-red">NOT FOUND</span>`;
    case "blocked": return `<span class="badge badge-orange">BLOCKED</span>`;
    default:        return `<span class="badge badge-cyan">LINK</span>`;
  }
}

function renderSection(section: OsintReportSection): string {
  if (section.type === "info" && section.rows?.length) {
    const body = section.rows
      .map((r) => {
        const val = r.badge
          ? `<span class="${badgeHtml(r.badge)}">${esc(r.value)}</span>`
          : esc(r.value);
        return infoRow(r.key, val);
      })
      .join("\n");
    return wrap(section.title, `<div>${body}</div>`);
  }

  if (section.type === "links" && section.links?.length) {
    const rows = section.links
      .map((l, i) => {
        const meta = l.meta ? `<span style="color:var(--dim);font-size:11px;margin-left:8px">${esc(l.meta)}</span>` : "";
        return `<tr>
          <td style="font-family:'Orbitron',monospace;font-size:12px">${String(i + 1).padStart(2, "0")}</td>
          <td><a href="${esc(l.url)}" target="_blank">${esc(l.label)}</a>${meta}</td>
          <td>${linkStatusBadge(l.status)}</td>
        </tr>`;
      })
      .join("\n");
    const table = `<table><thead><tr><th>#</th><th>Платформа / URL</th><th>Статус</th></tr></thead><tbody>${rows}</tbody></table>`;
    return wrap(section.title, table);
  }

  if (section.type === "table" && section.headers && section.tableRows) {
    const head = section.headers.map((h) => `<th>${esc(h)}</th>`).join("");
    const body = section.tableRows
      .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("\n");
    return wrap(section.title, `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
  }

  if (section.type === "raw" && section.rawHtml) {
    return wrap(section.title, section.rawHtml);
  }

  return wrap(section.title, `<div class="snap-none">⚠ ДАННЫЕ ОТСУТСТВУЮТ</div>`);
}

export function generateOsintReport(data: OsintReportData): string {
  const ts = now();
  const statusLabel =
    data.status === "success" ? "DATA ACQUIRED"
    : data.status === "failed" ? "NO RESULTS"
    : "PARTIAL DATA";

  const statsHtml = data.stats?.length
    ? `<div class="stats">${data.stats.map((s) =>
        `<div class="stat"><span class="stat-val">${esc(s.value)}</span><span class="stat-lbl">${esc(s.label)}</span></div>`
      ).join("")}</div>`
    : "";

  const sectionsHtml = data.sections.map(renderSection).join("\n");

  const metaHtml = `
    ${infoRow("Метод", esc(data.methodName))}
    ${infoRow("Запрос", `<code>${esc(data.query)}</code>`)}
    ${infoRow("Статус", `<span class="badge badge-${data.status === "success" ? "green" : data.status === "failed" ? "red" : "orange"}">${statusLabel}</span>`)}
    ${data.source ? infoRow("Источник", esc(data.source)) : ""}
    ${infoRow("Время", esc(ts))}`;

  const body = `
${header(data.reportType, [
  { label: "Target", value: data.query.slice(0, 48) },
  { label: "Method", value: data.methodKey, color: "cyan" },
  { label: "Status", value: statusLabel, color: data.status === "failed" ? "orange" : "" },
])}

${statsHtml}

${sectionsHtml}

${wrap("Метаданные отчёта", `<div>${metaHtml}</div>`)}`;

  return htmlDoc(body, `SNOS.TOOLS // ${data.reportType}`);
}

export interface DbSearchHit {
  phone?: string;
  email?: string;
  name?: string;
  username?: string;
  ip?: string;
  raw: string;
  source?: string;
}

export function generateDbSearchReport(
  field: string,
  query: string,
  hits: DbSearchHit[],
  totalInDb: number
): string {
  const ts = now();
  const statsHtml = `
  <div class="stats">
    <div class="stat"><span class="stat-val">${hits.length}</span><span class="stat-lbl">Совпадений</span></div>
    <div class="stat"><span class="stat-val">${totalInDb.toLocaleString()}</span><span class="stat-lbl">Записей в БД</span></div>
    <div class="stat"><span class="stat-val glow">${esc(field.toUpperCase())}</span><span class="stat-lbl">Тип запроса</span></div>
  </div>`;

  let tableHtml: string;
  if (!hits.length) {
    tableHtml = `<div class="snap-none">⚠ СОВПАДЕНИЙ НЕ НАЙДЕНО</div>`;
  } else {
    const rows = hits.map((h, i) => {
      const parts: string[] = [];
      if (h.phone) parts.push(`📞 ${esc(h.phone)}`);
      if (h.email) parts.push(`📧 ${esc(h.email)}`);
      if (h.name) parts.push(`👤 ${esc(h.name)}`);
      if (h.username) parts.push(`@${esc(h.username)}`);
      if (h.ip) parts.push(`🌐 ${esc(h.ip)}`);
      return `<tr>
        <td>${String(i + 1).padStart(2, "0")}</td>
        <td>${parts.join("<br>") || "—"}</td>
        <td><code style="font-size:11px;word-break:break-all">${esc(h.raw.slice(0, 180))}</code></td>
        <td>${esc(h.source ?? "—")}</td>
      </tr>`;
    }).join("\n");
    tableHtml = `<table><thead><tr><th>#</th><th>Данные</th><th>Raw</th><th>Источник</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const body = `
${header("Leak DB // Search Report", [
  { label: "Query", value: query },
  { label: "Field", value: field, color: "cyan" },
  { label: "Hits", value: String(hits.length) },
])}
${statsHtml}
${wrap("Результаты поиска", tableHtml)}
${wrap("Метаданные", `<div>${infoRow("Запрос", `<code>${esc(query)}</code>`)}${infoRow("Время", esc(ts))}</div>`)}`;

  return htmlDoc(body, "SNOS.TOOLS // LEAK DB SEARCH");
}

// ─── Send HTML report to Telegram ─────────────────────────────────────────────

export async function sendHtmlReport(ctx: Context, html: string, filename: string): Promise<void> {
  const buf = Buffer.from(html, "utf-8");
  try {
    await ctx.telegram.sendDocument(
      ctx.chat!.id,
      { source: buf, filename },
      {
        caption:
          `▣ <b>HTML Отчёт</b> · <code>${filename}</code>\n` +
          `<i>Открой файл в браузере для полного просмотра.</i>`,
        parse_mode: "HTML",
      }
    );
  } catch {
    try {
      await ctx.reply(
        `⚠️ <b>Не удалось отправить HTML-файл</b>\n` +
        `<i>Размер: ${(buf.length / 1024).toFixed(1)} KB</i>`,
        { parse_mode: "HTML" }
      );
    } catch { /* ignore */ }
  }
}

export function safeReportFilename(methodKey: string, query: string): string {
  const safe = query.replace(/[^a-zA-Z0-9@._-]/g, "_").slice(0, 40);
  return `${methodKey}_${safe}_${Date.now()}.html`;
}

export async function deliverOsintReport(ctx: Context, data: OsintReportData): Promise<void> {
  const html = generateOsintReport(data);
  await sendHtmlReport(ctx, html, safeReportFilename(data.methodKey, data.query));
}

// ─── Insecam Report ───────────────────────────────────────────────────────────

export interface InsecamCamData {
  id: string;
  viewUrl: string;
}

export function generateInsecamReport(cams: InsecamCamData[], query: string): string {
  const ts = now();

  const statsHtml = `
  <div class="stats">
    <div class="stat"><span class="stat-val">${cams.length}</span><span class="stat-lbl">Камер найдено</span></div>
    <div class="stat"><span class="stat-val glow">${esc(query.toUpperCase())}</span><span class="stat-lbl">Страна / Запрос</span></div>
    <div class="stat"><span class="stat-val" style="font-size:16px;padding-top:6px">${esc(ts)}</span><span class="stat-lbl">Время сканирования</span></div>
  </div>`;

  let gridHtml: string;
  if (!cams.length) {
    gridHtml = `<div class="snap-none">⚠ ДАННЫЕ ОТСУТСТВУЮТ — КАМЕРЫ НЕ ОБНАРУЖЕНЫ</div>`;
  } else {
    const cards = cams
      .map(
        (c, i) => `
      <div class="cam-card">
        <div class="cam-num">OBJECT ${String(i + 1).padStart(3, "0")}</div>
        <div class="cam-id">#${esc(c.id)}</div>
        <a href="${esc(c.viewUrl)}" target="_blank">${esc(c.viewUrl)}</a>
        <span class="badge badge-green">LIVE ACCESS</span>
        <span class="badge badge-cyan" style="margin-left:6px">OPEN</span>
      </div>`
      )
      .join("\n");
    gridHtml = `<div class="cam-grid">${cards}</div>`;
  }

  const infoHtml = `
    ${infoRow("Источник", '<a href="https://www.insecam.org" target="_blank">insecam.org</a> — публичный каталог')}
    ${infoRow("Запрос", esc(query.toUpperCase()))}
    ${infoRow("Результат", `<span class="badge badge-${cams.length ? "green" : "red"}">${cams.length ? `${cams.length} ОБЪЕКТОВ` : "НЕТ ДАННЫХ"}</span>`)}
    ${infoRow("Тип данных", "IP-камеры без авторизации")}
    ${infoRow("Время", esc(ts))}`;

  const body = `
${header("Insecam // Open Camera Scan", [
  { label: "Target", value: query.toUpperCase() },
  { label: "Found", value: `${cams.length} cameras`, color: "cyan" },
  { label: "Status", value: cams.length ? "DATA ACQUIRED" : "NO RESULTS", color: cams.length ? "" : "orange" },
])}

${statsHtml}

${wrap("Обнаруженные камеры", gridHtml)}

${wrap("Метаданные запроса", `<div>${infoHtml}</div>`)}`;

  return htmlDoc(body);
}

// ─── RTSP Report ─────────────────────────────────────────────────────────────

export function generateRtspReport(imgBuf: Buffer | null, rtspUrl: string): string {
  const ts = now();
  const success = imgBuf !== null && imgBuf.length > 0;

  // Strip credentials from URL for display
  const displayUrl = rtspUrl.replace(/:\/\/([^@]+)@/, "://***:***@");

  let imgHtml: string;
  if (success && imgBuf) {
    const b64 = imgBuf.toString("base64");
    imgHtml = `
    <div class="snap-wrap">
      <img src="data:image/jpeg;base64,${b64}" alt="RTSP Snapshot" />
    </div>
    <div style="text-align:center;margin-top:12px;font-size:10px;letter-spacing:2px;color:rgba(0,255,136,0.4)">
      FRAME CAPTURED — ${imgBuf.length.toLocaleString()} BYTES
    </div>`;
  } else {
    imgHtml = `<div class="snap-none">⚠ SNAPSHOT NOT AVAILABLE — CONNECTION FAILED OR TIMED OUT</div>`;
  }

  const statsHtml = `
  <div class="stats">
    <div class="stat">
      <span class="stat-val" style="font-size:${success ? "20px" : "16px"};padding-top:4px;color:var(--${success ? "green" : "red"})">
        ${success ? "SUCCESS" : "FAILED"}
      </span>
      <span class="stat-lbl">Статус захвата</span>
    </div>
    <div class="stat">
      <span class="stat-val">${success && imgBuf ? Math.round(imgBuf.length / 1024) : 0}</span>
      <span class="stat-lbl">KB · Размер кадра</span>
    </div>
    <div class="stat">
      <span class="stat-val" style="font-size:14px;padding-top:8px">ffmpeg 6.1</span>
      <span class="stat-lbl">Декодер</span>
    </div>
  </div>`;

  const infoHtml = `
    ${infoRow("RTSP URL", `<span style="word-break:break-all;color:var(--cyan)">${esc(displayUrl)}</span>`)}
    ${infoRow("Протокол", "RTSP / TCP")}
    ${infoRow("Декодер", "ffmpeg 6.1.2")}
    ${infoRow("Тайм-аут", "13 секунд")}
    ${infoRow("Статус", `<span class="badge badge-${success ? "green" : "red"}">${success ? "FRAME CAPTURED" : "CONNECTION FAILED"}</span>`)}
    ${infoRow("Размер", success && imgBuf ? `${imgBuf.length.toLocaleString()} bytes` : "—")}
    ${infoRow("Время", esc(ts))}`;

  const body = `
${header("RTSP // Frame Capture", [
  { label: "Target", value: displayUrl.slice(0, 40) + (displayUrl.length > 40 ? "…" : "") },
  { label: "Engine", value: "ffmpeg 6.1", color: "cyan" },
  { label: "Status", value: success ? "CAPTURED" : "FAILED", color: success ? "" : "orange" },
])}

${statsHtml}

${wrap("Захваченный кадр", imgHtml)}

${wrap("Параметры соединения", `<div>${infoHtml}</div>`)}`;

  return htmlDoc(body);
}

// ─── Windy Webcams Report ─────────────────────────────────────────────────────

export interface WindyGeo {
  lat: number;
  lon: number;
  display: string;
}

export function generateWindyReport(webcams: any[], geo: WindyGeo, query: string): string {
  const ts = now();

  const totalViews = webcams.reduce((s: number, w: any) => s + (w.viewCount ?? 0), 0);

  const statsHtml = `
  <div class="stats">
    <div class="stat"><span class="stat-val">${webcams.length}</span><span class="stat-lbl">Камер найдено</span></div>
    <div class="stat"><span class="stat-val">${totalViews.toLocaleString()}</span><span class="stat-lbl">Суммарно просмотров</span></div>
    <div class="stat"><span class="stat-val" style="font-size:13px;padding-top:10px">${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}</span><span class="stat-lbl">Координаты</span></div>
    <div class="stat"><span class="stat-val" style="font-size:12px;padding-top:10px">50 km</span><span class="stat-lbl">Радиус поиска</span></div>
  </div>`;

  let tableHtml: string;
  if (!webcams.length) {
    tableHtml = `<div class="snap-none">⚠ КАМЕРЫ В РАДИУСЕ 50 КМ НЕ НАЙДЕНЫ</div>`;
  } else {
    const rows = webcams
      .map((cam, i) => {
        const loc = cam.location ?? {};
        const city = [loc.city, loc.region, loc.country].filter(Boolean).join(", ") || "—";
        const viewUrl = cam.urls?.detail ?? `https://windy.com/webcams/${cam.webcamId}`;
        const views = (cam.viewCount ?? 0).toLocaleString();
        const status = cam.status === "active" ? "active" : "inactive";
        const badgeCls = status === "active" ? "badge-green" : "badge-red";
        return `<tr>
          <td style="font-family:'Orbitron',monospace;color:var(--cyan);font-size:12px">${String(i + 1).padStart(2, "0")}</td>
          <td><a href="${esc(viewUrl)}" target="_blank">${esc(cam.title ?? `Webcam ${i + 1}`)}</a></td>
          <td style="color:rgba(0,255,136,0.7);font-size:12px">${esc(city)}</td>
          <td style="text-align:right;color:rgba(0,229,255,0.8);font-size:12px">${esc(views)}</td>
          <td><span class="badge ${badgeCls}">${esc(status)}</span></td>
        </tr>`;
      })
      .join("\n");

    tableHtml = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Камера</th>
          <th>Локация</th>
          <th style="text-align:right">Просмотры</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  const infoHtml = `
    ${infoRow("Запрос", esc(query))}
    ${infoRow("Геолокация", esc(geo.display))}
    ${infoRow("Координаты", `${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)}`)}
    ${infoRow("Радиус", "50 км")}
    ${infoRow("Источник", '<a href="https://api.windy.com" target="_blank">Windy Webcams API v3</a>')}
    ${infoRow("Найдено", `${webcams.length} камер`)}
    ${infoRow("Время", esc(ts))}`;

  const body = `
${header("Windy // Webcam Intelligence", [
  { label: "Query", value: query },
  { label: "Location", value: geo.display, color: "cyan" },
  { label: "Found", value: `${webcams.length} webcams` },
])}

${statsHtml}

${wrap("Список веб-камер", tableHtml)}

${wrap("Параметры поиска", `<div>${infoHtml}</div>`)}`;

  return htmlDoc(body);
}
