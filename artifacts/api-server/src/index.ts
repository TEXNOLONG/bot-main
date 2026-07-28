import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env file manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* .env not found, use existing env vars */ }

import app from "./app";
import { logger } from "./lib/logger";
import { createBot } from "./bot/bot";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start Telegram bot
const botToken = process.env["BOT_TOKEN"];
if (!botToken) {
  logger.warn("BOT_TOKEN not set — Telegram bot will not start");
} else {
  const { bot, initDb } = createBot(botToken);
  bot.launch({
    allowedUpdates: ["message", "callback_query", "channel_post"],
  });
  logger.info("Telegram bot started (polling)");

  // Load OSINT databases from Telegram channel into RAM
  initDb().catch((err) => logger.error({ err }, "DB init failed"));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

// Start Express server
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
