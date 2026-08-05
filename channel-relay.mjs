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
const MAX_PER_RUN = parseInt(process.env.MAX_PER_RUN || "12", 10);

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
    `Yalnız bu JSON formatında cavab ver, başqa heç nə yazma:\n` +
    `{"isSignal":true/false,"asset":"...","direction":"BUY"/"SELL"/null,"entry":number/null,"sl":number/null,` +
    `"tp":number/null,"consistencyIssue":"izah və ya null","tövsiyə":"GİR"/"EHTİYATLI"/"GİRMƏ"/null,"səbəb":"qısa izah"}`;
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
    `{"isImportant":true/false,"affectedAssets":["BTC","Qızıl",...] və ya [],"təsirYönü":"müsbət"/"mənfi"/"qarışıq"/null,"səbəb":"qısa izah (1-2 cümlə)"}`;
  return askClaude(system, `Bülleten:\n"""${rawMessage}"""`);
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
      `📡 <b>XARİCİ SİQNAL</b> [EKSPERİMENTAL — ${esc(source.label)}]\n` +
      `🕐 Orijinal mesaj: ${ageLabel(m.date)}\n\n` +
      `${dirIcon} <b>${esc(a.asset || "?")} ${esc(a.direction || "")}</b>\n`;
    if (a.entry != null) text += `Giriş: ${a.entry}\n`;
    if (a.sl != null) text += `SL: ${a.sl}\n`;
    if (a.tp != null) text += `TP: ${a.tp}\n`;
    if (a.consistencyIssue) text += `\n⚠️ <b>Uyğunsuzluq tapıldı:</b> ${esc(a.consistencyIssue)}\n`;
    text +=
      `\n${verdictIcon} <b>Tövsiyə: ${esc(a.tövsiyə || "?")}</b>\n<i>${esc(a.səbəb || "")}</i>\n` +
      `\n📝 Orijinal mesaj:\n<i>${esc(m.message.slice(0, 500))}</i>\n` +
      `\n⚠️ Bu mənbə validasiya edilməyib — öz risk qərarını özün ver.`;

    await sendTelegram(text);
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
      `🆕 <b>XARİCİ XƏBƏR</b> [EKSPERİMENTAL — ${esc(source.label)}]\n` +
      `🕐 Orijinal mesaj: ${ageLabel(m.date)}\n\n` +
      `${dirIcon} Təsir: ${esc(a.təsirYönü || "naməlum")}\n`;
    if (a.affectedAssets?.length) text += `Aktivlər: ${a.affectedAssets.map(esc).join(", ")}\n`;
    text +=
      `\n<i>${esc(a.səbəb || "")}</i>\n` +
      `\n📝 Orijinal:\n<i>${esc(m.message.slice(0, 500))}</i>\n` +
      `\n⚠️ Bu mənbə validasiya edilməyib.`;

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

  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  await client.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
