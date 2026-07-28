import { Markup } from "telegraf";

// ─── Главное меню ─────────────────────────────────────────────────────────────
export const mainKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◈ СНОС", "tab_snos"),
    Markup.button.callback("◈ OSINT", "tab_osint"),
  ],
  [
    Markup.button.callback("◆ ИНСТРУМЕНТЫ", "tab_tools"),
    Markup.button.callback("◉ Профиль", "profile"),
  ],
  [
    Markup.button.callback("[i] О боте", "about"),
    Markup.button.callback("📊 Статистика", "my_stats"),
  ],
]);

// ─── СНОС — подкатегории ─────────────────────────────────────────────────────
export const snosKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("■ Жалобы", "snos_cat_reports"),
    Markup.button.callback("■ Сессии", "snos_cat_sessions"),
  ],
  [Markup.button.callback("◀ Назад", "back_main")],
]);

export const snosReportsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("■ Спам", "snos_spam"),
    Markup.button.callback("■ Порно", "snos_porn"),
  ],
  [
    Markup.button.callback("■ Насилие", "snos_violence"),
    Markup.button.callback("■ Домогательство", "snos_harass"),
  ],
  [
    Markup.button.callback("■ Мошенничество", "snos_fraud"),
    Markup.button.callback("■ Религия", "snos_religion"),
  ],
  [
    Markup.button.callback("■ Канал", "snos_channel"),
    Markup.button.callback("■ Группа", "snos_group"),
  ],
  [
    Markup.button.callback("■ Наркотики", "snos_drugs"),
    Markup.button.callback("■ Терроризм", "snos_terrorism"),
  ],
  [
    Markup.button.callback("■ Экстремизм", "snos_extremism"),
    Markup.button.callback("■ Детский контент", "snos_child"),
  ],
  [
    Markup.button.callback("■ Бот", "snos_bot"),
    Markup.button.callback("■ Азарт", "snos_gambling"),
  ],
  [
    Markup.button.callback("■ Самоповреждение", "snos_selfharm"),
    Markup.button.callback("■ Пиратство", "snos_piracy"),
  ],
  [Markup.button.callback("◀ Назад", "snos_keyboard")],
]);

export const snosSessionsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("■ Сессии", "snos_session"),
    Markup.button.callback("◆ Массовый Снос", "snos_session_mass"),
  ],
  [
    Markup.button.callback("◆ Мульти-Снос", "snos_session_multi"),
    Markup.button.callback("◆ NUKE СЕССИЙ", "snos_session_nuke"),
  ],
  [Markup.button.callback("◀ Назад", "snos_keyboard")],
]);

// ─── OSINT — подкатегории с пагинацией ────────────────────────────────────────
export const osintKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◎ Основные", "osint_cat_basic"),
    Markup.button.callback("◎ Email", "osint_cat_email"),
  ],
  [
    Markup.button.callback("◎ Телефон", "osint_cat_phone"),
    Markup.button.callback("◎ Соцсети", "osint_cat_social"),
  ],
  [
    Markup.button.callback("◎ Сеть", "osint_cat_network"),
    Markup.button.callback("◎ Камеры", "osint_cat_cameras"),
  ],
  [
    Markup.button.callback("◎ Углублённый", "osint_cat_deep"),
    Markup.button.callback("🗄️ Базы утечек", "osint_dbsearch"),
  ],
  [Markup.button.callback("◀ Назад", "back_main")],
]);

export const osintBasicKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◎ Юзернейм", "osint_username"),
    Markup.button.callback("◎ Домен / WHOIS", "osint_domain"),
  ],
  [
    Markup.button.callback("◈ IP Геолокация", "osint_ip"),
    Markup.button.callback("◈ Репутация IP", "osint_iprep"),
  ],
  [
    Markup.button.callback("▪ По ФИО", "osint_fio"),
    Markup.button.callback("▶ Telegram Lookup", "osint_telegram"),
  ],
  [Markup.button.callback("◀ Назад", "osint_keyboard")],
]);

export const osintEmailKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("▣ Email (Holehe)", "osint_email"),
    Markup.button.callback("▣ Email одноразовый?", "osint_disposable"),
  ],
  [
    Markup.button.callback("▣ Email Enumeration", "osint_emailenum"),
    Markup.button.callback("▣ Email Header", "osint_emailheader"),
  ],
  [Markup.button.callback("◀ Назад", "osint_keyboard")],
]);

export const osintPhoneKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◆ Телефон", "osint_phone"),
    Markup.button.callback("◆ Телефон — глубокий", "osint_phoneosint"),
  ],
  [Markup.button.callback("◀ Назад", "osint_keyboard")],
]);

export const osintSocialKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◈ Соцсети (агрегат)", "osint_social"),
    Markup.button.callback("◈ Соцсети — глубокий", "osint_socialdeep"),
  ],
  [
    Markup.button.callback("◎ Username Cross-Ref", "osint_usernamexref"),
    Markup.button.callback("◆ LeakCheck", "osint_leakcheck"),
  ],
  [Markup.button.callback("◀ Назад", "osint_keyboard")],
]);

export const osintNetworkKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◈ DNS Recon", "osint_dns"),
    Markup.button.callback("▣ Поиск субдоменов", "osint_subdomain"),
  ],
  [
    Markup.button.callback("◈ Скан портов", "osint_portscan"),
    Markup.button.callback("▣ CIDR / IP Range", "osint_cidr"),
  ],
  [
    Markup.button.callback("◎ Reverse IP", "osint_reverseip"),
    Markup.button.callback("▪ GeoIP Трейс", "osint_geoiptrace"),
  ],
  [
    Markup.button.callback("◈ ASN Intelligence", "osint_asni"),
    Markup.button.callback("▶ URL Scanner", "osint_urlscan"),
  ],
  [Markup.button.callback("◀ Назад", "osint_keyboard")],
]);

export const osintCamerasKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("● Insecam камеры", "osint_insecam"),
    Markup.button.callback("○ RTSP Снимок", "osint_rtsp"),
  ],
  [
    Markup.button.callback("◎ Windy Webcams", "osint_windy"),
    Markup.button.callback("◆ SSL Сертификат", "osint_ssl"),
  ],
  [Markup.button.callback("◀ Назад", "osint_keyboard")],
]);

export const osintDeepKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("⚠ CVE / Уязвимости", "osint_cve"),
    Markup.button.callback("⚠ HIBP", "osint_hibp"),
  ],
  [
    Markup.button.callback("◈ Shodan", "osint_shodan"),
    Markup.button.callback("▣ Pastebin", "osint_pastebin"),
  ],
  [
    Markup.button.callback("⚠ DarkWeb", "osint_darkweb"),
    Markup.button.callback("◎ MAC Address", "osint_maclookup"),
  ],
  [Markup.button.callback("◀ Назад", "osint_keyboard")],
]);

// ─── ИНСТРУМЕНТЫ — подкатегории с пагинацией ──────────────────────────────────
export const toolsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◇ Web", "tools_cat_web"),
    Markup.button.callback("◇ Сеть", "tools_cat_network"),
  ],
  [
    Markup.button.callback("◇ Безопасность", "tools_cat_security"),
    Markup.button.callback("◇ Telegram", "tools_cat_telegram"),
  ],
  [Markup.button.callback("◀ Назад", "back_main")],
]);

export const toolsWebKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("▣ Email Bomber", "tool_email"),
    Markup.button.callback("◆ Cookie Stealer", "tool_cookie"),
  ],
  [
    Markup.button.callback("◇ Session Grabber", "tool_session"),
    Markup.button.callback("◇ WAF Bypass", "tool_waf"),
  ],
  [
    Markup.button.callback("○ Cloud Bypass", "tool_cloud"),
    Markup.button.callback("▶ Phishing Kit", "tool_phishing"),
  ],
  [
    Markup.button.callback("▶ Credential Phish", "tool_credential_phish"),
    Markup.button.callback("◈ Hash Cracker", "tool_hash"),
  ],
  [Markup.button.callback("◀ Назад", "tools_keyboard")],
]);

export const toolsNetworkKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◈ Net Sniffer", "tool_sniffer"),
    Markup.button.callback("◎ WiFi Deauth", "tool_deauth"),
  ],
  [
    Markup.button.callback("▣ IP Spoofer", "tool_spoof"),
    Markup.button.callback("◎ DNS Spoof", "tool_dns_spoof"),
  ],
  [
    Markup.button.callback("◈ MITM Attack", "tool_man_in_middle"),
    Markup.button.callback("⊕ Reverse Shell", "tool_reverse_shell"),
  ],
  [Markup.button.callback("◀ Назад", "tools_keyboard")],
]);

export const toolsSecurityKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("⊕ Brute Force", "tool_brute"),
    Markup.button.callback("◆ SQL Injector", "tool_sqlinject"),
  ],
  [
    Markup.button.callback("⊕ XSS Scanner", "tool_xss"),
    Markup.button.callback("◇ Token Grabber", "tool_token"),
  ],
  [
    Markup.button.callback("▪ Keylogger", "tool_keylogger"),
    Markup.button.callback("◈ Ransomware Sim", "tool_ransomware"),
  ],
  [Markup.button.callback("◀ Назад", "tools_keyboard")],
]);

export const toolsTelegramKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("◉ DDoS", "tool_ddos"),
    Markup.button.callback("▣ Telegram Wiretap", "tool_wiretap"),
  ],
  [
    Markup.button.callback("⊕ Deepfake Detect", "tool_deepfake_detect"),
    Markup.button.callback("▪ Data Broker", "tool_data_broker"),
  ],
  [
    Markup.button.callback("◈ Port Scan Pro", "tool_portscan_pro"),
    Markup.button.callback("▣ Subdomain Enum", "tool_subdomain_enum"),
  ],
  [
    Markup.button.callback("◎ Reverse IP", "tool_reverse_ip"),
    Markup.button.callback("◇ API Enum", "tool_api_enum"),
  ],
  [Markup.button.callback("◀ Назад", "tools_keyboard")],
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const backMainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("◀ Назад в меню", "back_main")],
]);

export const adminKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("≡ Список подписок", "admin_list"),
    Markup.button.callback("▤ Статистика", "admin_stats"),
  ],
  [
    Markup.button.callback("□ Сменить фото/GIF", "admin_setphoto"),
    Markup.button.callback("✗ Сбросить фото", "admin_resetphoto"),
  ],
  [
    Markup.button.callback("📢 Рассылка", "admin_broadcast"),
    Markup.button.callback("👥 Все юзеры", "admin_users"),
  ],
  [
    Markup.button.callback("🔑 Session файлы", "admin_sessions"),
    Markup.button.callback("📊 Статус сессий", "admin_session_stats"),
  ],
  [Markup.button.callback("◀ Главное меню", "back_main")],
]);