# SNOS Tools — Telegram OSINT Bot

Telegram-бот с OSINT-инструментами, системой сносов (жалоб) и управлением подписками.

## Run & Operate

- Workflow: `artifacts/api-server: API Server` — Express сервер + Telegram бот (порт 8080)
- `pnpm --filter @workspace/api-server run dev` — запустить вручную
- `pnpm run typecheck:libs && pnpm --filter @workspace/api-server run typecheck` — проверка типов
- `pnpm --filter @workspace/api-server run build` — сборка

## Required Secrets

- `BOT_TOKEN` — токен Telegram-бота от @BotFather (**обязателен для бота**)
- `ADMIN_ID` — Telegram ID администратора (число, например: 123456789)
- `DB_CHANNEL_ID` — ID или username канала с базами OSINT (например: `-1001234567890` или `@mychannel`)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Telegram: Telegraf 4.x
- API: Express 5
- DB: JSON-файл (`snos_data.json`) через store.ts
- Build: esbuild (ESM bundle)

## Версия: 4.0.0 — Что нового

### СНОС (14 методов)
- Спам, Порно, Насилие, Домогательство, Мошенничество, Религия
- Канал, Группа, Сессии, Наркотики
- **Новые:** Терроризм, Экстремизм, Детский контент, Бот

### OSINT (18+ методов)
- Username (Sherlock 65+ платформ), Email (Holehe 35+ сервисов)
- IP Геолокация, Телефон, Домен/WHOIS, DNS Recon
- Telegram Lookup, Базы утечек, По ФИО
- Репутация IP, Email одноразовый?, Соцсети (агрегат)
- Insecam камеры, RTSP Снимок, Windy Webcams
- **Новые:** SSL Сертификат, Поиск субдоменов, Скан портов, Reverse IP, GeoIP Трейс

### ИНСТРУМЕНТЫ (16 методов)
- Email Bomber, Cookie Stealer, Session Grabber, Brute Force
- WAF Bypass, Hash Cracker, Net Sniffer, Cloud Bypass
- **Новые:** DDoS Simulator, Phishing Kit, Keylogger, SQL Injector
- **Новые:** Ransomware Sim, Token Grabber, WiFi Deauth, IP Spoofer

### Команды бота
- `/start` — главное меню
- `/id` — показать Telegram ID (без подписки)
- `/help` — справка
- `/cancel` — отменить действие

### Новые Admin-команды
- `/grant <id> <дней>` — выдать подписку
- `/revoke <id>` — отозвать
- `/extend <id> <дней>` — **НОВОЕ:** продлить поверх текущей
- `/subs` — список активных
- `/broadcast <текст>` — **НОВОЕ:** рассылка всем пользователям

### Новые фишки
- Трекинг пользователей (firstSeen, lastSeen, операций)
- Кнопка 📊 Статистика в главном меню
- Счётчик операций в профиле
- Admin: список всех пользователей с подписками
- Admin: рассылка через кнопку или команду

## Where things live

- `artifacts/api-server/src/bot/bot.ts` — главный файл бота, команды и callback handlers
- `artifacts/api-server/src/bot/snos.ts` — методы жалоб (визуальные)
- `artifacts/api-server/src/bot/osint.ts` — OSINT методы (реальные запросы)
- `artifacts/api-server/src/bot/tools.ts` — инструменты (визуальные)
- `artifacts/api-server/src/bot/keyboards.ts` — клавиатуры
- `artifacts/api-server/src/bot/store.ts` — JSON-хранилище (subscriptions + users)
- `artifacts/api-server/src/bot/visual.ts` — утилиты (progressBar, fake-генераторы)
- `artifacts/api-server/snos_data.json` — файл данных

## Architecture decisions

- Хранилище — JSON-файл (snos_data.json), не PostgreSQL. Простота для бота.
- Все ИНСТРУМЕНТЫ полностью визуальные (для демонстраций).
- OSINT методы делают реальные HTTP-запросы к публичным API.
- Подписки накапливаются (extend добавляет дни поверх текущей даты истечения).

## Gotchas

- Перед запуском бота обязательно установить `BOT_TOKEN` и `ADMIN_ID` в секреты.
- После изменений кода нужно перезапустить workflow `artifacts/api-server: API Server`.
- pnpm typecheck:libs надо запускать перед typecheck api-server (собирает lib/db, lib/api-zod).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
