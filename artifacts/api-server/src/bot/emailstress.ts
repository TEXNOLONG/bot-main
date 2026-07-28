import net from "net";
import tls from "tls";

// SMTP without nodemailer — pure Node.js
export interface EmailEntry {
  email: string;
  domain: string;
  password: string;
}

let _emails: EmailEntry[] = [];

export function addEmail(email: string, password: string): void {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  _emails = _emails.filter(e => e.email !== email);
  _emails.push({ email, domain, password });
  process.env.EMAILS = _emails.map(e => e.email).join(",");
}

export function removeEmail(email: string): boolean {
  const idx = _emails.findIndex(e => e.email === email);
  if (idx === -1) return false;
  _emails.splice(idx, 1);
  process.env.EMAILS = _emails.map(e => e.email).join(",");
  return true;
}

export function getEmails(): EmailEntry[] {
  if (_emails.length === 0) {
    const raw = (process.env.EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
    for (const e of raw) {
      const domain = e.split("@")[1]?.toLowerCase() || "";
      _emails.push({ email: e, domain, password: process.env.EMAIL_PASS || "" });
    }
  }
  return [..._emails];
}

export interface EmailResult {
  target: string;
  from: string;
  sent: number;
  failed: number;
  errors: string[];
}

const SMTP_CONFIGS: Record<string, { host: string; port: number; tls: boolean }> = {
  "gmail.com":     { host: "smtp.gmail.com",     port: 587, tls: false },
  "yandex.ru":      { host: "smtp.yandex.ru",      port: 587, tls: false },
  "mail.ru":        { host: "smtp.mail.ru",        port: 587, tls: false },
  "bk.ru":          { host: "smtp.mail.ru",        port: 587, tls: false },
  "inbox.ru":       { host: "smtp.mail.ru",        port: 587, tls: false },
  "list.ru":        { host: "smtp.mail.ru",        port: 587, tls: false },
  "outlook.com":    { host: "smtp.office365.com",  port: 587, tls: false },
  "hotmail.com":    { host: "smtp.office365.com",  port: 587, tls: false },
  "rambler.ru":     { host: "smtp.rambler.ru",     port: 587, tls: false },
};

function base64(str: string): string {
  return Buffer.from(str).toString("base64");
}

function sendSMTP(
  host: string, port: number, useTLS: boolean,
  user: string, pass: string,
  from: string, to: string, subject: string, body: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = useTLS
      ? tls.connect(port, host, { rejectUnauthorized: false })
      : net.connect(port, host);

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("SMTP timeout"));
    }, 15000);

    let buffer = "";
    let step = 0;

    const cmd = (data: string) => {
      socket.write(data + "\r\n");
    };

    const auth = base64("\x00" + user + "\x00" + pass);

    socket.on("data", (data: Buffer) => {
      buffer += data.toString();
      const code = parseInt(buffer.slice(0, 3));

      if (buffer.includes("\r\n")) {
        buffer = "";
        try {
          switch (step) {
            case 0: // Connect
              cmd("EHLO localhost");
              step = 1;
              break;
            case 1: // EHLO
              cmd("AUTH PLAIN " + auth);
              step = 2;
              break;
            case 2: // AUTH
              cmd(`MAIL FROM:<${from}>`);
              step = 3;
              break;
            case 3: // MAIL FROM
              cmd(`RCPT TO:<${to}>`);
              step = 4;
              break;
            case 4: // RCPT TO
              cmd("DATA");
              step = 5;
              break;
            case 5: // DATA
              cmd(
                `From: <${from}>\r\n` +
                `To: <${to}>\r\n` +
                `Subject: =?UTF-8?B?${base64(subject)}?=\r\n` +
                `Content-Type: text/html; charset=UTF-8\r\n` +
                `\r\n` +
                body +
                "\r\n."
              );
              step = 6;
              break;
            case 6: // Message sent
              cmd("QUIT");
              clearTimeout(timeout);
              resolve();
              break;
          }
        } catch (e: any) {
          clearTimeout(timeout);
          socket.destroy();
          reject(e);
        }
      }
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function emailStressTest(
  targetEmail: string,
  subject: string,
  body: string,
  count: number,
  onProgress?: (i: number, total: number) => Promise<void>
): Promise<EmailResult> {
  const emails = getEmails();
  if (!emails.length) {
    throw new Error("No emails registered. Use /addemail email@gmail.com password");
  }

  const errors: string[] = [];
  let sent = 0;
  let failed = 0;
  const rotator = [...emails];

  for (let i = 0; i < count; i++) {
    const entry = rotator[i % rotator.length];
    const config = SMTP_CONFIGS[entry.domain];
    if (!config) {
      failed++;
      errors.push(`#${i + 1} [${entry.email}]: No SMTP config for ${entry.domain}`);
      continue;
    }

    try {
      await sendSMTP(
        config.host, config.port, config.tls,
        entry.email, entry.password,
        entry.email, targetEmail,
        `${subject} #${i + 1}`,
        `<html><body><h2>Stress Test</h2><p>${body}</p><hr><small>#${i + 1}/${count} via ${entry.email}</small></body></html>`
      );
      sent++;
    } catch (e: any) {
      failed++;
      errors.push(`#${i + 1} [${entry.email}]: ${e.message}`);
    }

    if (onProgress) await onProgress(i + 1, count);
    await new Promise(r => setTimeout(r, 300));
  }

  return { target: targetEmail, from: emails[0].email, sent, failed, errors };
}