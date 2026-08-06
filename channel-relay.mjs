// EKSPERİMENTAL: xarici Telegram mənbələrini izləyir. İki rejim var:
//  - "signal": ticarət qrupu (CAMP TRADE) — konkret əməliyyat elanlarını süzür
//  - "news":   xəbər kanalı (Ninja News) — bazara təsir edə biləcək xəbərləri süzür
// Hər iki halda adi söhbət/zarafat/əhəmiyyətsiz məzmun sükutla keçilir.
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "data";
const STATE_FILE = path.join(DATA_DIR, "channel-relay-state.json");
const TRACKING_FILE = path.join(DATA_DIR, "relay-tracking.json");
const MAX_PER_RUN = parseInt(process.env.MAX_PER_RUN || "12", 10);
const MAX_TRACK_DAYS = 7;

// Claude-in çıxardığı aktivi qiymət mənbəyinə bağlayır — yalnız bunlar izlənir.
const ASSET_FEEDS = {
  XAUUSD: { type: "yahoo", ticker: "GC=F" },
  XAGUSD: { type: "yahoo", ticker: "SI=F" },
  US100: { type: "yahoo", ticker: "%5ENDX" },
  US500: { type: "yahoo", ticker: "%5EGSPC" },
  WTI: { type: "yahoo", ticker: "CL=F" },
  BRENT: { type: "yahoo", ticker: "BZ=F" },
  BTCUSD: { type: "binance", symbol: "BTCUSDT" },
  ETHUSD: { type: "binance", symbol: "ETHUSDT" },
  EURUSD: { type: "yahoo", ticker: "EURUSD=X" },
  GBPUSD: { type: "yahoo", ticker: "GBPUSD=X" },
  USDJPY: { type: "yahoo", ticker: "USDJPY=X" },
};

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-fable-5";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SOURCES = [
  { key: "campTrade", id: "-1002369027049", label: "CAMP TRADE", mode: "signal" },
  { key: "ninjaNews", id: "-1001235684992", label: "Ninja News", mode: "news" },
  { key: "apexMarket", id: "-1003764251871", label: "APEX MARKET EXPERT", mode: "signal" },
  { key: "gulerTrade", id: "-1002147574500", label: "Borsa Workout Trade Academy", mode: "signal" },
];

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ageLabel(unixSeconds) {
  const mins = Math.round((Date.now() / 1000 - unixSeconds) / 60);
  if (mins < 1) return "indicə";
  if (mins < 60) return `${mins} dəq əvvəl`;
  const hours = (mins / 60).toFixed(1);
  return `${hours} saat əvvəl ⚠️ köhnə ola bilər`;
}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function askClaude(system, userText) {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: userText }],
      }),
    });
    const data = await res.json();
    const textBlock = data?.content?.find((c) => c.type === "text");
    if (!textBlock) return null;
    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (e) {
    console.log("Claude analiz xətası:", e.message);
    return null;
  }
}

async function classifySignal(rawMessage, label) {
  const system =
    `Sən xarici bir Telegram ticarət qrupundan (${label}) gələn mesajları filtərləyirsən. ` +
    `Bu qrup qarışıq məzmun paylaşır: adi söhbət, zarafat, iqtisadi təqvim bildirişləri, təsviri bazar ` +
    `şərhi (dəstək/müqavimət zonaları, "əgər qırılsa gedər" tipli) VƏ bəzən konkret əməliyyat elanları. ` +
    `Yalnız KONKRET, İCRA OLUNA BİLƏN əməliyyat elanını (aktiv + istiqamət, mümkünsə giriş/SL/TP rəqəmləri ` +
    `ilə) siqnal hesab et. Adi söhbət, sual-cavab, zarafat, xəbər bildirişi, ümumi "bura qırılsa ora gedər" ` +
    `tipli təsviri şərh SİQNAL DEYİL — bunları isSignal:false ilə qaytar.\n\n` +
    `Əməliyyat elanıdırsa, MÜTLƏQ yoxla: BUY üçün SL girişdən AŞAĞI, TP YUXARI olmalıdır (SELL üçün əksi). ` +
    `Bu qayda pozulubsa, consistencyIssue sahəsində konkret izah et. Bir neçə TP hədəfi verilibsə (TP1, TP2...), ` +
    `"tp" sahəsinə ən yaxın (TP1) ədədi yaz, qalanlarını "səbəb" sahəsində qeyd et. "TP COMPLETE" / "hədəfə çatdı" ` +
    `kimi ARTIQ BAĞLANMIŞ əməliyyatın nəticə elanları YENİ SİQNAL DEYİL — isSignal:false.\n\n` +
    `"assetCode" sahəsinə YALNIZ bu siyahıdan uyğun gələni yaz (heç biri uyğun gəlmirsə null): ` +
    `XAUUSD, XAGUSD, US100, US500, WTI, BRENT, BTCUSD, ETHUSD, EURUSD, GBPUSD, USDJPY.\n\n` +
    `Yalnız bu JSON formatında cavab ver, başqa heç nə yazma:\n` +
    `{"isSignal":true/false,"asset":"...","assetCode":"XAUUSD"/.../null,"direction":"BUY"/"SELL"/null,` +
    `"entry":number/null,"sl":number/null,"tp":number/null,"consistencyIssue":"qısa izah (maks 8 söz) və ya null",` +
    `"tövsiyə":"GİR"/"EHTİYATLI"/"GİRMƏ"/null,"səbəb":"çox qısa izah, maks 10 söz"}`;
  return askClaude(system, `Mesaj:\n"""${rawMessage}"""`);
}

async function classifyNews(rawMessage, label) {
  const system =
    `Sən xarici bir xəbər kanalından (${label}) gələn bülletenləri filtərləyirsən. Bizim izlədiyimiz ` +
    `aktivlər: BTC, ETH, Qızıl (XAUUSD), S&P 500, Nasdaq/US100, Neft (Brent). Kanal həm əhəmiyyətli ` +
    `makro/geosiyasi/şirkət xəbərləri, həm də adi/təkrar/əhəmiyyətsiz məzmun paylaşır. ` +
    `Yalnız bu aktivlərdən BİRİNƏ VƏ YA ÜMUMİ BAZAR ƏHVAL-RUHİYYƏSİNƏ real təsir edə biləcək, GENUİN YENİ ` +
    `məlumatı əhəmiyyətli hesab et (Fed açıqlamaları, faiz qərarları, geosiyasi eskalasiya/sakitləşmə, ` +
    `böyük şirkət hesabatları, tənzimləmə qərarları və s.). Sıravi bülleten başlığı, artıq məlum olan ` +
    `köhnə məlumatın təkrarı, əhəmiyyətsiz təfərrüat ƏHƏMİYYƏTLİ DEYİL — isImportant:false qaytar.\n\n` +
    `Yalnız bu JSON formatında cavab ver, başqa heç nə yazma:\n` +
    `{"isImportant":true/false,"affectedAssets":["BTC","Qızıl",...] və ya [],"təsirYönü":"müsbət"/"mənfi"/"qarışıq"/null,"səbəb":"çox qısa izah, maks 12 söz"}`;
  return askClaude(system, `Bülleten:\n"""${rawMessage}"""`);
}

async function fetchYahooCandles(ticker, rangeDays) {
  const range = rangeDays <= 7 ? "7d" : "1mo";
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1h&range=${range}`, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) return [];
  const q = res.indicators.quote[0];
  const out = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    if (q.high[i] == null || q.low[i] == null) continue;
    out.push({ time: res.timestamp[i] * 1000, high: q.high[i], low: q.low[i] });
  }
  return out;
}

async function fetchBinanceCandles(symbol, sinceMs) {
  const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1h&startTime=${sinceMs}&limit=200`);
  const kl = await r.json();
  if (!Array.isArray(kl)) return [];
  return kl.map((k) => ({ time: k[0], high: +k[2], low: +k[3] }));
}

async function fetchCandlesSince(assetCode, sinceMs) {
  const feed = ASSET_FEEDS[assetCode];
  if (!feed) return [];
  const daysAgo = (Date.now() - sinceMs) / 86400000;
  if (feed.type === "binance") return fetchBinanceCandles(feed.symbol, sinceMs);
  const candles = await fetchYahooCandles(feed.ticker, Math.min(daysAgo + 1, MAX_TRACK_DAYS + 1));
  return candles.filter((c) => c.time >= sinceMs);
}

// Göndərilən siqnalı izləmə jurnalına əlavə edir (nəticəsi sonra yoxlanacaq).
async function trackSignal(source, m, a) {
  if (!a.assetCode || a.entry == null || a.sl == null || a.tp == null || !a.direction) return;
  let tracking = [];
  if (existsSync(TRACKING_FILE)) {
    try { tracking = JSON.parse(await readFile(TRACKING_FILE, "utf8")); } catch {}
  }
  tracking.push({
    sourceKey: source.key, msgId: m.id, sentAt: m.date * 1000,
    assetCode: a.assetCode, direction: a.direction, entry: a.entry, sl: a.sl, tp: a.tp,
    tövsiyə: a.tövsiyə, status: "OPEN",
  });
  await writeFile(TRACKING_FILE, JSON.stringify(tracking, null, 2));
}

// Açıq izlənən siqnalların TP/SL-ə çatıb-çatmadığını real qiymət datası ilə yoxlayır.
async function resolveTrackedOutcomes() {
  if (!existsSync(TRACKING_FILE)) return;
  let tracking;
  try { tracking = JSON.parse(await readFile(TRACKING_FILE, "utf8")); } catch { return; }

  let changed = false;
  for (const t of tracking) {
    if (t.status !== "OPEN") continue;
    const ageDays = (Date.now() - t.sentAt) / 86400000;
    try {
      const candles = await fetchCandlesSince(t.assetCode, t.sentAt);
      for (const c of candles) {
        const hitSl = t.direction === "BUY" ? c.low <= t.sl : c.high >= t.sl;
        const hitTp = t.direction === "BUY" ? c.high >= t.tp : c.low <= t.tp;
        if (hitSl) { t.status = "SL_HIT"; t.resolvedAt = c.time; break; }
        if (hitTp) { t.status = "TP_HIT"; t.resolvedAt = c.time; break; }
      }
    } catch (e) {
      console.log(`[izləmə] ${t.assetCode} qiymət xətası:`, e.message);
    }
    if (t.status === "OPEN" && ageDays > MAX_TRACK_DAYS) t.status = "EXPIRED";
    if (t.status !== "OPEN") changed = true;
  }
  if (changed) await writeFile(TRACKING_FILE, JSON.stringify(tracking, null, 2));
}

// Hər bazar ertəsi bir dəfə: hər mənbənin real (TP/SL-ə çatmış) nəticələrini raportlaşdırır.
async function sendWeeklySummaryIfDue(state) {
  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const weekKey = `${now.getUTCFullYear()}-W${Math.ceil((now.getUTCDate()) / 7)}-${now.getUTCMonth()}`;
  if (!process.env.FORCE_RELAY_SUMMARY && (!isMonday || state.lastSummaryWeek === weekKey)) return;

  if (!existsSync(TRACKING_FILE)) return;
  let tracking;
  try { tracking = JSON.parse(await readFile(TRACKING_FILE, "utf8")); } catch { return; }
  if (!tracking.length) return;

  const bySource = {};
  for (const t of tracking) {
    bySource[t.sourceKey] ??= { tp: 0, sl: 0, open: 0, expired: 0 };
    if (t.status === "TP_HIT") bySource[t.sourceKey].tp++;
    else if (t.status === "SL_HIT") bySource[t.sourceKey].sl++;
    else if (t.status === "EXPIRED") bySource[t.sourceKey].expired++;
    else bySource[t.sourceKey].open++;
  }

  let text = `📊 <b>HƏFTƏLİK RELAY HESABATI</b> [EKSPERİMENTAL]\n\n`;
  for (const source of SOURCES) {
    const s = bySource[source.key];
    if (!s) continue;
    const resolved = s.tp + s.sl;
    const winRate = resolved ? Math.round((s.tp / resolved) * 100) : null;
    text += `<b>${esc(source.label)}</b>: ${resolved} nəticələnib`;
    text += winRate != null ? ` — ${winRate}% qazanma (${s.tp}✅/${s.sl}❌)` : ` — hələ nəticə yoxdur`;
    if (s.open) text += `, ${s.open} açıq`;
    if (s.expired) text += `, ${s.expired} vaxtı keçib`;
    text += `\n`;
  }
  text += `\n⚠️ Nümunə hələ kiçikdir — statistik əhəmiyyət üçün daha çox həftə lazımdır.`;

  await sendTelegram(text);
  state.lastSummaryWeek = weekKey;
}

async function processSignalSource(client, source, lastId) {
  const entity = await client.getEntity(source.id);
  const messages = await client.getMessages(entity, { limit: 50, minId: lastId });
  const allNew = messages.filter((m) => m.message && m.id > lastId).reverse();
  const newOnes = allNew.slice(0, MAX_PER_RUN);
  console.log(`[${source.label}] ${allNew.length} yeni mesaj (son ID: ${lastId}), bu dövrədə ${newOnes.length} işlənəcək.`);

  let maxId = lastId;
  for (const m of newOnes) {
    maxId = Math.max(maxId, m.id);
    const a = await classifySignal(m.message, source.label);
    if (!a || !a.isSignal) continue;

    const dirIcon = a.direction === "BUY" ? "🟢" : a.direction === "SELL" ? "🔴" : "⚪";
    const verdictIcon = a.tövsiyə === "GİR" ? "✅" : a.tövsiyə === "EHTİYATLI" ? "🟡" : "🚫";
    let text =
      `📡 <b>SİQNAL</b> [EKSPERİMENTAL] · 🕐 ${ageLabel(m.date)}\n\n` +
      `${dirIcon} <b>${esc(a.asset || "?")} ${esc(a.direction || "")}</b>\n`;
    if (a.entry != null) text += `Giriş: <b>${a.entry}</b>`;
    if (a.sl != null) text += `  |  SL: <b>${a.sl}</b>`;
    if (a.tp != null) text += `  |  TP: <b>${a.tp}</b>`;
    text += `\n\n${verdictIcon} <b>${esc(a.tövsiyə || "?")}</b> — ${esc(a.səbəb || "")}`;
    if (a.consistencyIssue) text += `\n⚠️ ${esc(a.consistencyIssue)}`;

    await sendTelegram(text);
    await trackSignal(source, m, a);
    console.log(`[${source.label}] Göndərildi: msg ${m.id} — ${a.tövsiyə || "SİQNAL DEYİL"}`);
  }
  return maxId;
}

async function processNewsSource(client, source, lastId) {
  const entity = await client.getEntity(source.id);
  const messages = await client.getMessages(entity, { limit: 50, minId: lastId });
  const allNew = messages.filter((m) => m.message && m.id > lastId).reverse();
  const newOnes = allNew.slice(0, MAX_PER_RUN);
  console.log(`[${source.label}] ${allNew.length} yeni mesaj (son ID: ${lastId}), bu dövrədə ${newOnes.length} işlənəcək.`);

  let maxId = lastId;
  for (const m of newOnes) {
    maxId = Math.max(maxId, m.id);
    const a = await classifyNews(m.message, source.label);
    if (!a || !a.isImportant) continue;

    const dirIcon = a.təsirYönü === "müsbət" ? "📈" : a.təsirYönü === "mənfi" ? "📉" : "➖";
    let text =
      `🆕 <b>XƏBƏRLƏR</b> · 🕐 ${ageLabel(m.date)}\n\n` +
      `${dirIcon} ${esc(a.səbəb || "")}`;
    if (a.affectedAssets?.length) text += `\n<i>${a.affectedAssets.map(esc).join(", ")}</i>`;

    await sendTelegram(text);
    console.log(`[${source.label}] Göndərildi: msg ${m.id} — ${a.təsirYönü}`);
  }
  return maxId;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  let state = { sources: {} };
  if (existsSync(STATE_FILE)) {
    try {
      const loaded = JSON.parse(await readFile(STATE_FILE, "utf8"));
      // Köhnə tək-mənbəli formatdan (lastMessageId) miqrasiya
      if (loaded.lastMessageId != null && !loaded.sources) {
        state = { sources: { campTrade: { lastMessageId: loaded.lastMessageId } } };
      } else {
        state = loaded;
      }
    } catch {}
  }

  const apiId = parseInt(process.env.TG_API_ID, 10);
  const apiHash = process.env.TG_API_HASH;
  const sessionStr = process.env.TG_SESSION;
  if (!apiId || !apiHash || !sessionStr) {
    console.log("TG_API_ID / TG_API_HASH / TG_SESSION yoxdur — relay keçilir.");
    return;
  }

  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, { connectionRetries: 3 });
  await client.connect();

  for (const source of SOURCES) {
    const lastId = state.sources[source.key]?.lastMessageId || 0;
    try {
      const newLastId = source.mode === "news"
        ? await processNewsSource(client, source, lastId)
        : await processSignalSource(client, source, lastId);
      state.sources[source.key] = { lastMessageId: newLastId };
    } catch (e) {
      console.log(`[${source.label}] Xəta:`, e.message);
    }
  }

  await resolveTrackedOutcomes();
  await sendWeeklySummaryIfDue(state);

  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  await client.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
