// EKSPERİMENTAL: xarici Telegram qrupunu (CAMP TRADE) izləyir, hər yeni mesajı
// Claude ilə "bu, icra oluna bilən əməliyyat elanıdırmı?" sualına görə süzür,
// yalnız konkret siqnalları öz Telegram-ımıza rəylə birgə göndərir.
// Qrup söhbət/zarafat/təqvim/təsviri şərh də paylaşır — bunlar sükutla keçilir.
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "data";
const STATE_FILE = path.join(DATA_DIR, "channel-relay-state.json");
const CHANNEL_ID = process.env.CHANNEL_ID || "-1002369027049";
const CHANNEL_LABEL = process.env.CHANNEL_LABEL || "CAMP TRADE";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-fable-5";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

async function classifyWithClaude(rawMessage) {
  if (!ANTHROPIC_API_KEY) return null;
  const system =
    `Sən xarici bir Telegram ticarət qrupundan (${CHANNEL_LABEL}) gələn mesajları filtərləyirsən. ` +
    `Bu qrup qarışıq məzmun paylaşır: adi söhbət, zarafat, iqtisadi təqvim bildirişləri, təsviri bazar ` +
    `şərhi (dəstək/müqavimət zonaları, "əgər qırılsa gedər" tipli) VƏ bəzən konkret əməliyyat elanları. ` +
    `Yalnız KONKRET, İCRA OLUNA BİLƏN əməliyyat elanını (aktiv + istiqamət, mümkünsə giriş/SL/TP rəqəmləri ` +
    `ilə) siqnal hesab et. Adi söhbət, sual-cavab, zarafat, xəbər bildirişi, ümumi "bura qırılsa ora gedər" ` +
    `tipli təsviri şərh SİQNAL DEYİL — bunları isSignal:false ilə qaytar.\n\n` +
    `Əməliyyat elanıdırsa, MÜTLƏQ yoxla: BUY üçün SL girişdən AŞAĞI, TP YUXARI olmalıdır (SELL üçün əksi). ` +
    `Bu qayda pozulubsa, consistencyIssue sahəsində konkret izah et.\n\n` +
    `Yalnız bu JSON formatında cavab ver, başqa heç nə yazma:\n` +
    `{"isSignal":true/false,"asset":"...","direction":"BUY"/"SELL"/null,"entry":number/null,"sl":number/null,` +
    `"tp":number/null,"consistencyIssue":"izah və ya null","tövsiyə":"GİR"/"EHTİYATLI"/"GİRMƏ"/null,"səbəb":"qısa izah"}`;

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
        messages: [{ role: "user", content: `Mesaj:\n"""${rawMessage}"""` }],
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

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  let state = { lastMessageId: 0 };
  if (existsSync(STATE_FILE)) {
    try { state = JSON.parse(await readFile(STATE_FILE, "utf8")); } catch {}
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

  const MAX_PER_RUN = parseInt(process.env.MAX_PER_RUN || "12", 10);

  const entity = await client.getEntity(CHANNEL_ID);
  const messages = await client.getMessages(entity, { limit: 50, minId: state.lastMessageId });
  const allNew = messages.filter((m) => m.message && m.id > state.lastMessageId).reverse();
  const newOnes = allNew.slice(0, MAX_PER_RUN);

  console.log(`${allNew.length} yeni mesaj tapıldı (son işlənən ID: ${state.lastMessageId}), bu dövrədə ${newOnes.length} işlənəcək.`);

  let maxId = state.lastMessageId;
  for (const m of newOnes) {
    maxId = Math.max(maxId, m.id);
    const analysis = await classifyWithClaude(m.message);
    if (!analysis || !analysis.isSignal) continue;

    const dirIcon = analysis.direction === "BUY" ? "🟢" : analysis.direction === "SELL" ? "🔴" : "⚪";
    const verdictIcon = analysis.tövsiyə === "GİR" ? "✅" : analysis.tövsiyə === "EHTİYATLI" ? "🟡" : "🚫";

    let text =
      `📡 <b>XARİCİ SİQNAL</b> [EKSPERİMENTAL — ${esc(CHANNEL_LABEL)}]\n\n` +
      `${dirIcon} <b>${esc(analysis.asset || "?")} ${esc(analysis.direction || "")}</b>\n`;
    if (analysis.entry != null) text += `Giriş: ${analysis.entry}\n`;
    if (analysis.sl != null) text += `SL: ${analysis.sl}\n`;
    if (analysis.tp != null) text += `TP: ${analysis.tp}\n`;
    if (analysis.consistencyIssue) {
      text += `\n⚠️ <b>Uyğunsuzluq tapıldı:</b> ${esc(analysis.consistencyIssue)}\n`;
    }
    text +=
      `\n${verdictIcon} <b>Tövsiyə: ${esc(analysis.tövsiyə || "?")}</b>\n` +
      `<i>${esc(analysis.səbəb || "")}</i>\n` +
      `\n📝 Orijinal mesaj:\n<i>${esc(m.message.slice(0, 500))}</i>\n` +
      `\n⚠️ Bu mənbə validasiya edilməyib — öz risk qərarını özün ver.`;

    await sendTelegram(text);
    console.log(`Göndərildi: msg ${m.id} — ${analysis.tövsiyə || "SİQNAL DEYİL"}`);
  }

  state.lastMessageId = maxId;
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));

  await client.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
