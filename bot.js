/**
 * Claude + TradingView MCP — Ticarət Siqnalı Məsləhətçisi
 *
 * Yalnız siqnal rejimi: Binance-dən (pulsuz, autentifikasiya tələb etmir)
 * şam (candle) datası çəkir, indikatorları hesablayır, təhlükəsizlik
 * yoxlamasını keçirir və tövsiyə yazdırır. Heç vaxt sifariş vermir —
 * hər əməliyyat sənin tərəfindən manual icra olunur.
 *
 * Local rejim: əl ilə işə sal — node bot.js
 * Cloud rejim: Railway-ə deploy et, env dəyişənlərini qur, Railway cron cədvəli ilə tetikləyir
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import { readFile, writeFile, appendFile } from "fs/promises";
import { execSync } from "child_process";
import { pathToFileURL } from "url";
import path from "path";

// Minimal .env yükləyici — dotenv asılılığı yoxdur (GitHub Actions-da npm install lazım deyil).
// Mühit dəyişəni artıq təyin olunubsa (CI secrets), .env onu üstələmir.
(() => {
  const envPath = path.resolve(".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const hashIdx = val.search(/\s+#/);
    if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
})();

// Qalıcı yaddaş üçün qovluq (DATA_DIR) — yerli işlədikdə cari qovluq
const DATA_DIR = process.env.DATA_DIR || ".";

// ─── Onboarding ───────────────────────────────────────────────────────────────

function checkOnboarding() {
  // Bulud/CI rejimi: konfiqurasiya mühit dəyişənlərindən gəlir, .env yaradılmır
  const isCloud = !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.GITHUB_ACTIONS ||
    process.env.CI
  );

  if (!isCloud && !existsSync(".env")) {
    console.log(
      "\n⚠️  .env faylı tapılmadı — default tənzimləmələrlə yenisi yaradılır...\n",
    );
    writeFileSync(
      ".env",
      [
        "# Ticarət tənzimləmələri",
        "PORTFOLIO_VALUE_USD=1000",
        "MAX_TRADE_SIZE_USD=100",
        "MAX_TRADES_PER_DAY=3",
        "SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT",
        "TIMEFRAME=4H",
      ].join("\n") + "\n",
    );
    try {
      execSync("open .env");
    } catch {}
    console.log(
      ".env faylındakı default dəyərləri (portfolio ölçüsü, coinlər, taymfreym) yoxla, sonra yenidən işə sal: node bot.js\n",
    );
    process.exit(0);
  }

  if (isCloud) return;

  // Hər çağırışda siqnal faylının yolunu göstər (yalnız yerli işlədikdə mənalıdır)
  console.log(`\n📄 Siqnal qeydi: ${path.resolve(CSV_FILE)}`);
  console.log(
    `   İstənilən vaxt Google Sheets və ya Excel-də aç — və ya Claude-a tapşır:\n` +
      `   "Move my trades.csv to ~/Desktop" və ya "Move it to my Documents folder"\n`,
  );
}

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbols: (process.env.SYMBOLS || "BTCUSDT,ETHUSDT,SOLUSDT")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  timeframe: process.env.TIMEFRAME || "4H",
  portfolioValue: parseFloat(process.env.PORTFOLIO_VALUE_USD || "1000"),
  maxTradeSizeUSD: parseFloat(process.env.MAX_TRADE_SIZE_USD || "100"),
  maxTradesPerDay: parseInt(process.env.MAX_TRADES_PER_DAY || "3"),
  paperStartingBalance: parseFloat(process.env.PAPER_TRADING_BALANCE_USD || "100"),
  // Stop məsafəsi: 132 günlük backtest-də geniş stop (2.5×ATR) dar stopdan (1.5) qat-qat
  // yaxşı nəticə verdi — dib fitilləri mövqeni vaxtından əvvəl atmır (Connors da stop əleyhinədir)
  atrMultiplier: parseFloat(process.env.ATR_MULTIPLIER || "2.5"),
  volumeThreshold: parseFloat(process.env.VOLUME_THRESHOLD || "1.3"),
  // ── Connors-adaptasiyalı mean-reversion parametrləri ──
  // Uzunmüddətli trend filtri: EMA(200) 4H-də ≈ 33 gün — Connors 200-period MA tövsiyə edir
  trendEmaPeriod: parseInt(process.env.TREND_EMA_PERIOD || "200"),
  // Giriş həddləri: 132 günlük parametr axtarışında <15/>85 ən yaxşı nəticəni verdi
  // (+16.3% komissiya daxil, 67% win rate) — <20/>80 isə -42.7% itirirdi
  rsiEntryLong: parseFloat(process.env.RSI_ENTRY_LONG || "15"),
  rsiEntryShort: parseFloat(process.env.RSI_ENTRY_SHORT || "85"),
  // Çıxış həddləri: mean-reversion-da qazanc TEZ götürülməlidir — backtest-də 55/45
  // bütün gec çıxış variantlarını üstələdi (75/25 fəlakət idi: -60%)
  rsiExitLong: parseFloat(process.env.RSI_EXIT_LONG || "55"),
  rsiExitShort: parseFloat(process.env.RSI_EXIT_SHORT || "45"),
  // Take-profit: giriş + N × ATR
  takeProfitAtrMult: parseFloat(process.env.TAKE_PROFIT_ATR_MULT || "2.0"),
  // Maksimum saxlama müddəti (saat) — mean-reversion işləmirsə vaxt limiti ilə çıx
  maxHoldHours: parseFloat(process.env.MAX_HOLD_HOURS || "120"),
  // ── Trend-following strategiyası (qızıl və s. trend edən aktivlər) ──
  // Qızılda RSI mean-reversion backtestlərdə MƏNFİ nəticə verir (23% win rate) —
  // qızıl trend edən aktivdir. İşləyən: EMA(9)/EMA(20) kəsişməsi + EMA(200) rejimi.
  // ?? (|| yox): boş sətir "" qəsdən "heç biri" deməkdir — || onu defaulta qaytarırdı
  trendSymbols: (process.env.TREND_SYMBOLS ?? "PAXGUSDT")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  // Trend əməliyyatlarında hədəf daha genişdir (trend davam edir): TP = ATR × 3
  trendTakeProfitAtrMult: parseFloat(process.env.TREND_TAKE_PROFIT_ATR_MULT || "3.0"),
  // ADX trend gücü filtri: bundan aşağıdırsa bazar yandadır (sideways) — crossover
  // siqnallarının əksəriyyəti belə şəraitdə yalan çıxır (whipsaw)
  adxThreshold: parseFloat(process.env.ADX_THRESHOLD || "22"),
  // Breakeven qaydası: qiymət +N×ATR xeyrimizə gedibsə stop girişə çəkilir —
  // "qazanan əməliyyat uduzana çevrilməsin". Backtest: hər rejimdə nəticəni yaxşılaşdırdı.
  breakevenTrigger: parseFloat(process.env.BREAKEVEN_TRIGGER || "0.75"),
  // Paper trading mövqe ölçüləndirməsi: hər siqnala kapitalın bu hissəsi, maksimum paralel mövqe sayı
  paperPositionFraction: parseFloat(process.env.PAPER_POSITION_FRACTION || "0.30"),
  paperMaxPositions: parseInt(process.env.PAPER_MAX_POSITIONS || "3"),
  // Fokus coinlər: bunlar üçün əlavə Telegram bildirişləri göndərilir —
  // ETH: davam edən oversold/overbought epizodunda təkrar giriş fürsətləri (daha dərin qiymət),
  // GOLD: EMA9/EMA20 kəsişməsi yaxınlaşanda erkən xəbərdarlıq
  focusSymbols: (process.env.FOCUS_SYMBOLS ?? "ETHUSDT,PAXGUSDT")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
};

const LOG_FILE = path.join(DATA_DIR, "safety-check-log.json");
const POSITIONS_FILE = path.join(DATA_DIR, "positions.json");
const PAPER_FILE = path.join(DATA_DIR, "paper-trading.json");
const PRICE_ALERTS_STATE_FILE = path.join(DATA_DIR, "price-alerts-state.json");

// Taymfreym → millisaniyə (intrabar SL/TP yoxlaması üçün şam sərhədləri lazımdır)
const TF_MS = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000,
  "1H": 3_600_000, "4H": 14_400_000, "1D": 86_400_000, "1W": 604_800_000,
};

// ─── Qiymət formatlaması ─────────────────────────────────────────────────────
// toFixed(2) ucuz coinlərdə ciddi dəqiqlik itkisi verir: $0.7486 → "$0.75" (0.19% xəta),
// $0.02345 → "$0.02" (14.7% xəta). Stop-loss/hədəf səviyyələri üçün bu qəbuledilməzdir,
// çünki bizim gözlənilən qazanc ~1% səviyyəsindədir. Ona görə onluq say qiymətə uyğunlaşır.
function fmtPrice(v) {
  if (!Number.isFinite(v)) return "?";
  const a = Math.abs(v);
  const dp = a >= 100 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 6 : 8;
  return v.toFixed(dp);
}

// ─── Bakı Vaxtı (AZT, UTC+4) ─────────────────────────────────────────────────

const BAKU_TZ = "Asia/Baku";

function bakuParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BAKU_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return parts.reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
}

function bakuDateStr(date = new Date()) {
  const p = bakuParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function bakuTimeStr(date = new Date()) {
  const p = bakuParts(date);
  return `${p.hour}:${p.minute}:${p.second}`;
}

function bakuDateTimeStr(date = new Date()) {
  return `${bakuDateStr(date)} ${bakuTimeStr(date)}`;
}

function bakuWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: BAKU_TZ, weekday: "short" }).format(date);
}

// ─── Telegram Bildirişləri ───────────────────────────────────────────────────
// TELEGRAM_BOT_TOKEN və TELEGRAM_CHAT_ID env dəyişənləri qurulubsa siqnal/əməliyyat
// bildirişləri göndərilir. Qurulmayıbsa səssiz keçilir — bot işinə mane olmur.

// Uğurda true qaytarır — çağıran tərəf "göndərildi" fərz edib state yazmasın deyə
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.log(`⚠️  Telegram bildirişi göndərilə bilmədi: HTTP ${res.status} ${body.slice(0, 150)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`⚠️  Telegram xətası: ${err.message}`);
    return false;
  }
}

// ─── Logging ────────────────────────────────────────────────────────────────

// Bütün fayl oxuma/yazmaları asinxrondur (fs/promises) — Node-un əsas event loop-unu
// (və ona bağlı HTTP serverini) bloklamasın deyə. Sinxron fs çağırışları bot analiz
// dövründə (8 coin) dashboard sorğularını saniyələrlə dondururdu.

async function loadLog() {
  if (!existsSync(LOG_FILE)) return { trades: [] };
  return JSON.parse(await readFile(LOG_FILE, "utf8"));
}

// safety-check-log.json yalnız son qərarları saxlayır (dashboard üçün) — tam tarixçə trades.csv-dədir.
// Bunu sonsuz böyütməmək lazımdır, yoxsa hər oxuma/yazma get-gedə yavaşlayır.
// GitHub Actions-da bu fayl hər dövrədə git-ə commit olunur — ona görə orada daha kiçik
// saxlanılır (MAX_LOG_ENTRIES env). Siqnallar (allPass) limitdən asılı olmayaraq qorunur.
const MAX_LOG_ENTRIES = parseInt(process.env.MAX_LOG_ENTRIES || "1500");

async function saveLog(log) {
  if (log.trades.length > MAX_LOG_ENTRIES) {
    // GÖZLƏ qərarları limitlə kəsilir, amma SİQNALLAR (allPass) qorunur —
    // onlar nadirdir və sistemin tarixi performans auditi üçün lazımdır
    const recent = log.trades.slice(-MAX_LOG_ENTRIES);
    const recentSet = new Set(recent);
    const preservedSignals = log.trades.filter((t) => t.allPass && !recentSet.has(t)).slice(-400);
    log.trades = [...preservedSignals, ...recent];
  }
  await writeFile(LOG_FILE, JSON.stringify(log, null, 2));
}

function countTodaysTrades(log) {
  const today = bakuDateStr();
  return log.trades.filter(
    (t) => bakuDateStr(new Date(t.timestamp)) === today && t.allPass,
  ).length;
}

async function loadPositions() {
  if (!existsSync(POSITIONS_FILE)) return [];
  return JSON.parse(await readFile(POSITIONS_FILE, "utf8"));
}

async function savePositions(positions) {
  await writeFile(POSITIONS_FILE, JSON.stringify(positions, null, 2));
}

// ─── Virtual Balans (Paper Trading) ──────────────────────────────────────────

async function loadPaperState() {
  if (!existsSync(PAPER_FILE)) {
    return {
      startingBalance: CONFIG.paperStartingBalance,
      balance: CONFIG.paperStartingBalance,
      positions: [],
      history: [],
    };
  }
  const state = JSON.parse(await readFile(PAPER_FILE, "utf8"));
  // Miqrasiya: köhnə tək-mövqeli format ({position: X}) → çox-mövqeli ({positions: [X]}).
  // Köhnə semantikada mövqe açıq olanda balans tam qalırdı — yeni semantikada balans
  // sərbəst nağddır, ona görə köhnə mövqenin qoyuluşu balansdan çıxılır.
  if (!Array.isArray(state.positions)) {
    state.positions = state.position ? [state.position] : [];
    for (const p of state.positions) {
      state.balance -= p.quantity * p.entryPrice;
    }
    delete state.position;
  }
  return state;
}

async function savePaperState(state) {
  await writeFile(PAPER_FILE, JSON.stringify(state, null, 2));
}

// Çox-mövqeli virtual balans: hər siqnala kapitalın ~30%-i, maksimum 3 paralel mövqe,
// hər coin üzrə maksimum 1 mövqe. Bu, real pul üçün nəzərdə tutulan ölçüləndirmə
// modelidir — tam balansla tək mövqe "bəxt oyunu" olur ($1500 simulyasiyası sübut etdi).
async function runPaperTrading(symbol, price, ema8, vwap, rsi3, atr, entrySignal, barsSince) {
  const state = await loadPaperState();
  let changed = false;

  // 1. Bu coinin açıq mövqeyi varsa — çıxış şərtlərini yoxla / PnL-i yenilə
  const posIdx = state.positions.findIndex((p) => p.symbol === symbol);
  if (posIdx !== -1) {
    const pos = state.positions[posIdx];
    console.log(`\n── Virtual Balans (Paper Trading) ──────────────────────────\n`);
    const bars = typeof barsSince === "function" ? barsSince(pos) : [];
    const result = checkExitConditions(pos, price, ema8, vwap, rsi3, bars);
    pos.lastCheckedAt = new Date().toISOString();
    changed = true; // breakevenArmed / currentPrice yenilənmiş ola bilər

    if (result.exit) {
      // SL/TP-də çıxış qiyməti SƏVİYYƏNİN özüdür (real sifariş orada dolur),
      // cari qiymət yox — paper nəticələri real XM icrası ilə üst-üstə düşsün
      const exitP = result.exitPrice !== undefined ? result.exitPrice : price;
      const { side, entryPrice, quantity, openedAt } = pos;
      const pnlPct =
        side === "SHORT"
          ? ((entryPrice - exitP) / entryPrice) * 100
          : ((exitP - entryPrice) / entryPrice) * 100;
      const invested = quantity * entryPrice;
      const pnlUsd = invested * (pnlPct / 100);

      state.balance += invested + pnlUsd; // kapital + qazanc/zərər geri qayıdır
      state.history.push({
        symbol, side, entryPrice, exitPrice: exitP, quantity, pnlPct, pnlUsd,
        openedAt, closedAt: new Date().toISOString(), exitReason: result.reason,
      });
      state.positions.splice(posIdx, 1);

      const equity = state.balance + state.positions.reduce((s, p) => s + p.quantity * p.entryPrice, 0);
      console.log(`🔔 VIRTUAL SATIŞ — ${symbol} ${side} bağlandı: giriş $${fmtPrice(entryPrice)} → çıxış $${fmtPrice(exitP)}`);
      console.log(`   PnL: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% (${pnlUsd >= 0 ? "+" : ""}$${pnlUsd.toFixed(2)}) — kapital: $${equity.toFixed(2)}`);
      await sendTelegram(
        `${pnlUsd >= 0 ? "✅" : "🔴"} <b>VİRTUAL SATIŞ — ${symbol}</b>\n` +
        `${side} bağlandı: $${fmtPrice(entryPrice)} → $${fmtPrice(exitP)}\n` +
        `PnL: <b>${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</b> (${pnlUsd >= 0 ? "+" : ""}$${pnlUsd.toFixed(2)})\n` +
        `💰 Ümumi kapital: $${equity.toFixed(2)} | açıq mövqe: ${state.positions.length}\n` +
        `Səbəb: ${result.reason}`,
      );
      // Bağlanışdan sonra performans xəbərdarlıqlarını yoxla
      await checkPerformanceAlerts(state);
    } else {
      const { side, entryPrice, quantity } = pos;
      const livePct =
        side === "SHORT"
          ? ((entryPrice - price) / entryPrice) * 100
          : ((price - entryPrice) / entryPrice) * 100;
      pos.currentPrice = price;
      pos.unrealizedPnlPct = livePct;
      pos.unrealizedPnlUsd = quantity * entryPrice * (livePct / 100);
      console.log(`📈 Açıq virtual mövqe: ${symbol} ${side} @ $${fmtPrice(entryPrice)} — hazırkı PnL: ${livePct >= 0 ? "+" : ""}${livePct.toFixed(2)}%${pos.breakevenArmed ? " 🛡️ breakeven aktivdir" : ""}`);
    }
  } else if (entrySignal.allPass && state.positions.length < CONFIG.paperMaxPositions) {
    // 2. Yeni siqnal + yer var → kapitalın ~30%-i ilə gir
    const equity = state.balance + state.positions.reduce((s, p) => s + p.quantity * p.entryPrice, 0);
    const tradeSize = Math.min(state.balance, equity * CONFIG.paperPositionFraction);
    if (tradeSize >= 1) {
      console.log(`\n── Virtual Balans (Paper Trading) ──────────────────────────\n`);
      const quantity = tradeSize / price;
      state.balance -= tradeSize;
      state.positions.push({
        symbol,
        side: entrySignal.side,
        entryPrice: price,
        quantity,
        atr,
        openedAt: new Date().toISOString(),
        currentPrice: price,
        unrealizedPnlPct: 0,
        unrealizedPnlUsd: 0,
        breakevenArmed: false,
      });
      changed = true;
      console.log(`💰 VIRTUAL ALIŞ — ${symbol} ${entrySignal.side} @ $${fmtPrice(price)} ($${tradeSize.toFixed(2)} ilə, ${state.positions.length}/${CONFIG.paperMaxPositions} mövqe)`);
      await sendTelegram(
        `💰 <b>VİRTUAL ALIŞ — ${symbol}</b>\n` +
        `${entrySignal.side} @ $${fmtPrice(price)}\n` +
        `Məbləğ: $${tradeSize.toFixed(2)} (kapitalın ${(CONFIG.paperPositionFraction * 100).toFixed(0)}%-i)\n` +
        `Açıq mövqe: ${state.positions.length}/${CONFIG.paperMaxPositions} | sərbəst: $${state.balance.toFixed(2)}`,
      );
    }
  }

  if (changed) await savePaperState(state);
}

// ─── Performans Xəbərdarlığı ─────────────────────────────────────────────────
// Fuad yalnız Telegrama baxır — ona görə sistem pisləşəndə özü xəbər verməlidir.
// 3 tetikləyici (hər biri təkrar spam olmasın deyə ayrıca dedupe olunur):
//   1. Ardıcıl zərərlər (3, 5, 7, ...)
//   2. Son 10 əməliyyatın cəmi mənfi
//   3. Kapital başlanğıcdan 10%/20%/30% aşağı düşüb
async function checkPerformanceAlerts(state) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const history = state.history || [];
  if (!state.alerts) state.alerts = { streak: 0, windowAt: 0, ddLevel: 0 };
  const A = state.alerts;
  const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  // 1. Ardıcıl zərər seriyası
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].pnlUsd < 0) streak++; else break;
  }
  // Yalnız mərhələlərdə xəbərdarlıq (3, 5, 7, ...) — hər zərərdə mesaj spam olardı
  if (streak >= 3 && streak >= A.streak + 2) {
    A.streak = streak;
    const lastN = history.slice(-streak);
    const lines = lastN.map((h) => `• ${h.symbol === "PAXGUSDT" ? "GOLD" : h.symbol.replace("USDT", "")} ${h.side}: ${fmtPct(h.pnlPct)}`).join("\n");
    await sendTelegram(
      `⚠️ <b>DİQQƏT — ${streak} ARDICIL ZƏRƏR</b>\n\n${lines}\n\n` +
      `Sistem üst-üstə ${streak} əməliyyatda uduzub. Real pulla ticarət edirsənsə mövqe ölçüsünü azaltmağı düşün.`,
    );
  } else if (streak === 0) {
    A.streak = 0; // qazanc gəldi — sayğac sıfırlanır
  }

  // 2. Son 10 əməliyyatın nəticəsi (hər 10 yeni əməliyyatda bir dəfə)
  if (history.length >= 10 && history.length - A.windowAt >= 10) {
    A.windowAt = history.length;
    const last10 = history.slice(-10);
    const sum = last10.reduce((s, h) => s + h.pnlUsd, 0);
    const wins = last10.filter((h) => h.pnlUsd > 0).length;
    if (sum < 0) {
      await sendTelegram(
        `📉 <b>SON 10 ƏMƏLİYYAT MƏNFİDİR</b>\n\n` +
        `Nəticə: <b>${sum >= 0 ? "+" : ""}$${sum.toFixed(2)}</b> | Qazanan: ${wins}/10\n` +
        `Ümumi əməliyyat sayı: ${history.length}\n\n` +
        `Sistem son dövrdə pul qazandırmır — davam etmək qərarını yenidən qiymətləndir.`,
      );
    } else {
      await sendTelegram(
        `📊 <b>Son 10 əməliyyat: ${sum >= 0 ? "+" : ""}$${sum.toFixed(2)}</b> (${wins}/10 qazanan)\n` +
        `Ümumi: ${history.length} əməliyyat. Sistem müsbətdədir.`,
      );
    }
  }

  // 3. Kapital düşüşü (10% / 20% / 30% həddləri)
  const equity = state.balance + (state.positions || []).reduce((s, p) => s + p.quantity * p.entryPrice, 0);
  const ddPct = ((state.startingBalance - equity) / state.startingBalance) * 100;
  const level = ddPct >= 30 ? 30 : ddPct >= 20 ? 20 : ddPct >= 10 ? 10 : 0;
  if (level > A.ddLevel) {
    A.ddLevel = level;
    await sendTelegram(
      `🔴 <b>KAPİTAL ${level}% AZALIB</b>\n\n` +
      `Başlanğıc: $${state.startingBalance.toFixed(2)} → İndi: <b>$${equity.toFixed(2)}</b>\n` +
      `Ümumi əməliyyat: ${history.length}\n\n` +
      `Bu, virtual balansdır — real pulla eyni nisbətdə itki olardı. Strategiyaya yenidən baxmaq vaxtıdır.`,
    );
  } else if (level === 0 && A.ddLevel > 0) {
    A.ddLevel = 0; // bərpa olunub
  }
}

// ─── Çıxış (sat) şərtləri — Mean-Reversion v2 ────────────────────────────────
// Prioritet sırası:
//   1. Stop-loss: giriş ∓ ATR × atrMultiplier (zərərin məhdudlaşdırılması)
//   2. Take-profit: giriş ± ATR × takeProfitAtrMult (hədəf)
//   3. RSI çıxışı: RSI(3) ortaya qayıtdı (BUY→≥65, SHORT→≤35) — Connors çıxış qaydası
//   4. Vaxt limiti: mövqe maxHoldHours-dan çox açıq qalıbsa bağla (mean-reversion işləmədi)
// `rsi3` — son BAĞLANMIŞ şamın RSI-si (formalaşan şamın RSI-si dövrə içində oynayır,
// yalan erkən çıxışlara səbəb olurdu; backtest/həftəlik qiymətləndirici də bağlanmış şamla işləyir).
// `recentBars` — son yoxlamadan bəri başlayan şamlar: SL/TP-nin yoxlamalar ARASINDA
// toxunulub-toxunulmadığını high/low ilə tutmaq üçün (30 dəq-lik spot yoxlama intrabar
// toxunuşları qaçırırdı). Çıxış qiyməti səviyyənin özüdür — real SL/TP sifarişi orada dolur.
function checkExitConditions(position, price, ema8, vwap, rsi3, recentBars) {
  const { side, entryPrice, atr, openedAt } = position;
  if (side !== "BUY" && side !== "SHORT") return { exit: false };

  // Trend simvolları (qızıl/PAXG): geniş hədəf (ATR×3), RSI çıxışı YOXDUR —
  // trend əməliyyatında RSI uzun müddət ekstremdə qala bilər, erkən çıxış qazancı kəsər
  const isTrendSymbol = CONFIG.trendSymbols.includes(position.symbol);
  const tpMult = isTrendSymbol ? CONFIG.trendTakeProfitAtrMult : CONFIG.takeProfitAtrMult;
  const stopDistance = atr ? atr * CONFIG.atrMultiplier : entryPrice * 0.02;
  const profitDistance = atr ? atr * tpMult : entryPrice * 0.03;

  // Yoxlamalar arasındakı ekstremlər (cari qiymət daxil)
  const hasBars = Array.isArray(recentBars) && recentBars.length > 0;
  const hi = hasBars ? Math.max(price, ...recentBars.map((b) => b.high)) : price;
  const lo = hasBars ? Math.min(price, ...recentBars.map((b) => b.low)) : price;

  const beArmed = position.breakevenArmed === true;
  const stopLabel = beArmed
    ? `breakeven stop (qiymət +${CONFIG.breakevenTrigger}×ATR getdiyi üçün stop girişə çəkilib)`
    : atr
      ? `ATR-əsaslı stop (ATR ${fmtPrice(atr)} × ${CONFIG.atrMultiplier})`
      : `sabit 2% stop`;

  const stopLoss = beArmed
    ? entryPrice
    : side === "BUY" ? entryPrice - stopDistance : entryPrice + stopDistance;
  const takeProfit = side === "BUY" ? entryPrice + profitDistance : entryPrice - profitDistance;

  // Sıra vacibdir (həftəlik qiymətləndirici ilə eyni): əvvəl SL (konservativ fərziyyə —
  // eyni pəncərədə həm SL, həm TP toxunubsa, SL birinci sayılır), sonra TP, yalnız
  // BUNDAN SONRA breakeven silahlanır (bu pəncərənin sıçrayışı gələcək yoxlamalara təsir edir).
  const slTouched = side === "BUY" ? lo <= stopLoss : hi >= stopLoss;
  if (slTouched) {
    return {
      exit: true,
      exitPrice: stopLoss,
      reason: `Stop-loss səviyyəsinə çatdı (${stopLabel}) — qiymət $${fmtPrice(stopLoss)} həddinə toxundu. Zərəri məhdudlaşdırmaq üçün mövqeni bağlamaq tövsiyə olunur.`,
    };
  }
  const tpTouched = side === "BUY" ? hi >= takeProfit : lo <= takeProfit;
  if (tpTouched) {
    return {
      exit: true,
      exitPrice: takeProfit,
      reason: `Take-profit hədəfinə çatdı ($${fmtPrice(takeProfit)}, giriş ${side === "BUY" ? "+" : "−"} ATR×${tpMult}) — mənfəəti götürmək üçün mövqeni bağlamaq tövsiyə olunur.`,
    };
  }

  // Breakeven: qiymət kifayət qədər xeyrimizə gedibsə (bir dəfə silahlanır, geri dönmür),
  // stop girişə çəkilir — qazanan mövqe uduzana çevrilməsin
  if (atr && !position.breakevenArmed) {
    const trigger = atr * CONFIG.breakevenTrigger;
    const favorableMove = side === "BUY" ? hi - entryPrice : entryPrice - lo;
    if (favorableMove >= trigger) position.breakevenArmed = true;
  }

  if (!isTrendSymbol && rsi3 !== null && rsi3 !== undefined) {
    if (side === "BUY" && rsi3 >= CONFIG.rsiExitLong) {
      return {
        exit: true,
        exitPrice: price,
        reason: `RSI(3) ${CONFIG.rsiExitLong}-i keçdi (bağlanmış şamda ${rsi3.toFixed(2)}) — gözlənilən geri sıçrayış tamamlandı sayılır. Mənfəəti qorumaq üçün SAT tövsiyə olunur.`,
      };
    }
    if (side === "SHORT" && rsi3 <= CONFIG.rsiExitShort) {
      return {
        exit: true,
        exitPrice: price,
        reason: `RSI(3) ${CONFIG.rsiExitShort}-in altına düşdü (bağlanmış şamda ${rsi3.toFixed(2)}) — gözlənilən dönüş tamamlandı sayılır. Mənfəəti qorumaq üçün mövqeni bağlamaq tövsiyə olunur.`,
      };
    }
  }

  const heldHours = openedAt ? (Date.now() - new Date(openedAt).getTime()) / 3_600_000 : null;
  if (heldHours !== null && heldHours >= CONFIG.maxHoldHours) {
    return {
      exit: true,
      exitPrice: price,
      reason: `Mövqe ${heldHours.toFixed(0)} saatdır açıqdır (limit ${CONFIG.maxHoldHours} saat) — gözlənilən hərəkət baş vermədi, vaxt limiti ilə bağlamaq tövsiyə olunur.`,
    };
  }

  return { exit: false };
}

// ─── Bazar Datası (Binance public API — pulsuz, auth tələb etmir) ───────────

async function fetchCandles(symbol, interval, limit = 100) {
  const intervalMap = {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1H": "1h",
    "4H": "4h",
    "1D": "1d",
    "1W": "1w",
  };
  const binanceInterval = intervalMap[interval] || "1m";

  // data-api.binance.vision — coğrafi məhdudiyyəti olmayan ictimai market data güzgüsü
  const BINANCE_BASE = process.env.BINANCE_API_BASE || "https://data-api.binance.vision";
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API xətası: ${res.status}`);
  const data = await res.json();

  return data.map((k) => {
    const volume = parseFloat(k[5]);
    // k[9] = taker buy base asset volume — aqressiv (bazar sifarişi ilə) alışlar.
    // Qalanı aqressiv satışdır. Delta = alıcı təzyiqi − satıcı təzyiqi (order flow).
    const takerBuy = parseFloat(k[9]);
    return {
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume,
      takerBuy,
      delta: takerBuy - (volume - takerBuy),
      deltaRatio: volume > 0 ? (takerBuy - (volume - takerBuy)) / volume : 0,
    };
  });
}

// ─── Order Flow (CVD) — MƏLUMAT XARAKTERLİ, siqnalı bloklamır ────────────────
// Son N şamın delta cəmi: aqressiv alıcılar, yoxsa satıcılar üstünlük təşkil edir?
// DİQQƏT: bunu bloklayıcı filtr kimi sınadım — robustluq testindən keçmədi
// (CVD 2 və 6 şam işləyirdi, 8/10/12/16 işləmirdi; coinlərin yarısında mənfi).
// Ona görə yalnız kontekst kimi göstərilir, giriş qərarına təsir etmir.
function calcOrderFlow(candles, lookback = 6) {
  const recent = candles.slice(-(lookback + 1), -1); // bağlanmış şamlar
  if (recent.length === 0) return null;
  const cvd = recent.reduce((s, c) => s + c.delta, 0);
  const totalVol = recent.reduce((s, c) => s + c.volume, 0);
  const cvdRatio = totalVol > 0 ? cvd / totalVol : 0;
  const lastDelta = recent[recent.length - 1].deltaRatio;
  return {
    cvd,
    cvdRatio,
    lastDelta,
    bias: cvdRatio > 0.02 ? "ALICI" : cvdRatio < -0.02 ? "SATICI" : "TARAZ",
  };
}

// ─── İndikator Hesablamaları ──────────────────────────────────────────────────

function calcEMA(closes, period) {
  const multiplier = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * multiplier + ema * (1 - multiplier);
  }
  return ema;
}

// RSI — Wilder smoothing (RMA) ilə, TradingView/Binance-in istifadə etdiyi standart üsul.
// Köhnə versiya son N şamın sadə ortalamasını götürürdü — dəyərlər tez-tez 0/100-ə
// çırpılırdı və istifadəçinin TradingView-da gördüyü RSI ilə üst-üstə düşmürdü.
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let avgGain = 0,
    avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// VWAP — seans əsaslı, hər gecəyarı UTC-də sıfırlanır
function calcVWAP(candles) {
  const midnightUTC = new Date();
  midnightUTC.setUTCHours(0, 0, 0, 0);
  const sessionCandles = candles.filter((c) => c.time >= midnightUTC.getTime());
  if (sessionCandles.length === 0) return null;
  const cumTPV = sessionCandles.reduce(
    (sum, c) => sum + ((c.high + c.low + c.close) / 3) * c.volume,
    0,
  );
  const cumVol = sessionCandles.reduce((sum, c) => sum + c.volume, 0);
  return cumVol === 0 ? null : cumTPV / cumVol;
}

// ATR(14) — Wilder smoothing (RMA) ilə, TradingView standartı. Bazarın volatilliyini ölçür,
// stop-loss/take-profit məsafələri bundan hesablanır.
function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    trueRanges.push(
      Math.max(
        cur.high - cur.low,
        Math.abs(cur.high - prev.close),
        Math.abs(cur.low - prev.close),
      ),
    );
  }
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
}

// ADX(14) — Wilder-in Average Directional Index-i, trendin GÜCÜNÜ ölçür (istiqamətini yox).
// ADX < ~20-25 → bazar yandadır (sideways), trend strategiyaları işləmir;
// ADX > 25 → güclü trend var. EMA crossover-in yalan siqnallarını süzmək üçün standart filtr.
function calcADX(candles, period = 14) {
  if (candles.length < period * 2 + 2) return null;
  const plusDMs = [], minusDMs = [], trs = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close),
    ));
  }
  let smTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smPlus = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smMinus = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  const dxs = [];
  for (let i = period; i < trs.length; i++) {
    smTR = smTR - smTR / period + trs[i];
    smPlus = smPlus - smPlus / period + plusDMs[i];
    smMinus = smMinus - smMinus / period + minusDMs[i];
    if (smTR === 0) { dxs.push(0); continue; }
    const pDI = (100 * smPlus) / smTR;
    const mDI = (100 * smMinus) / smTR;
    dxs.push(pDI + mDI === 0 ? 0 : (100 * Math.abs(pDI - mDI)) / (pDI + mDI));
  }
  if (dxs.length < period) return null;
  let adx = dxs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxs.length; i++) {
    adx = (adx * (period - 1) + dxs[i]) / period;
  }
  return adx;
}

// Mövqe ölçüsü təhlükəsizlik tavanı — SL məsafəsi data anomaliyası (məs. ATR sıfıra
// yaxın, dayanmış/qırıq şam) ucbatından qeyri-adi dar çıxarsa, risk-əsaslı düstur
// (riskUsd / stopDistance) mövqeni sükutla nəhəng göstərə bilər. Burda hesablanan ədəd
// birbaşa Telegram mesajına və oradan XM sifariş biletinə köçürülür — düsturun özünə
// güvənmək kifayət deyil, nəticə də ağlabatan diapazonda olmalıdır. Bax:
// nofx (github.com/NoFxAiOS/nofx) "hard risk limits the model cannot override" —
// eyni fikir, burda modelə yox, öz arifmetikamıza qarşı tətbiq olunur.
function computeXmUnits(riskUsd, price, stopDistance, xmAccount, maxLeverage = 10) {
  if (!(stopDistance > 0) || !(price > 0)) return null;
  const rawUnits = riskUsd / stopDistance;
  const maxNotional = xmAccount * maxLeverage;
  const rawNotional = rawUnits * price;
  if (rawNotional > maxNotional) {
    return { units: maxNotional / price, capped: true, rawUnits };
  }
  return { units: rawUnits, capped: false, rawUnits };
}

// Həcm təsdiqi — ən son TAMAMLANMIŞ şamın həcmi əvvəlki N şamın orta həcmindən kifayət qədər
// yüksək olmalıdır. Hazırda formalaşan şam (son element) yarımçıqdır — hər 30 dəqiqədə
// yoxlamada 4H şamın həcmi natural olaraq aşağı görünür, buna görə -2 indeksli (tamamlanmış) şam istifadə olunur.
function checkVolumeConfirmation(candles, lookback = 20) {
  const recent = candles.slice(-(lookback + 2));
  if (recent.length < 3) return { ratio: null, pass: true };
  const completedCandle = recent[recent.length - 2];
  const priorCandles = recent.slice(0, -2);
  const avgVolume = priorCandles.reduce((s, c) => s + c.volume, 0) / priorCandles.length;
  const ratio = avgVolume > 0 ? completedCandle.volume / avgVolume : null;
  return { ratio, pass: ratio !== null && ratio >= CONFIG.volumeThreshold };
}

// ─── Expectancy — Van Tharp (knowledge/KITAB-DERSLERI.md §10) ────────────────
//
// "Sistemin gəlirliliyini giriş yox, POZİSYON ÖLÇÜSÜ və EXPECTANCY müəyyən edir."
// Win rate TƏK BAŞINA mənasızdır: 35% qazanma ilə 1:3 RR, 60% qazanma ilə
// 1:1-dən yaxşıdır. Ona görə bütün hesabatlarda expectancy də göstərilir.
//
// Kahneman (kiçik ədədlər qanunu, §13): 30-dan az nümunədən çıxarılan win rate
// məlumat deyil, SƏS-KÜYDÜR — `thin` bayrağı bunu işarələyir.
function calcExpectancy(values) {
  const v = values.filter((x) => typeof x === "number" && isFinite(x));
  const n = v.length;
  if (!n) return { n: 0, winRate: null, expectancy: null, avgWin: 0, avgLoss: 0, thin: true };
  const w = v.filter((x) => x > 0);
  const l = v.filter((x) => x <= 0);
  const avgWin = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
  const avgLoss = l.length ? Math.abs(l.reduce((a, b) => a + b, 0) / l.length) : 0;
  const pw = w.length / n;
  return { n, winRate: pw * 100, avgWin, avgLoss,
           expectancy: pw * avgWin - (1 - pw) * avgLoss, thin: n < 30 };
}

// Hesabat sətri. unit: "%" və ya "$"
function expectancyLine(values, unit = "%") {
  const e = calcExpectancy(values);
  if (!e.n) return "";
  const sg = e.expectancy >= 0 ? "+" : "";
  let out = `📐 Expectancy: <b>${sg}${e.expectancy.toFixed(2)}${unit}</b>/əməliyyat` +
            ` (orta qazanc ${e.avgWin.toFixed(2)}${unit} · orta itki ${e.avgLoss.toFixed(2)}${unit})`;
  if (e.thin) out += `
⚠️ Yalnız ${e.n} əməliyyat — 30-dan azdır, bu rəqəmlər hələ SƏS-KÜYDÜR.`;
  return out;
}


// ─── Təhlükəsizlik Yoxlaması ──────────────────────────────────────────────────

// ─── Strategiya: Connors-adaptasiyalı Mean-Reversion (v2) ────────────────────
//
// Larry Connors-un RSI-2 strategiyasının kripto-4H adaptasiyası (hissə backtestlərdə
// BTC daily-də 62-68% win rate, səhmlərdə 75-80%):
//
//   1. TREND FİLTRİ (bloklayıcı): qiymət EMA(200)-dən yuxarıdırsa YALNIZ BUY,
//      aşağıdadırsa YALNIZ SHORT axtarılır. Uzunmüddətli trendə qarşı gedilmir.
//   2. GİRİŞ (bloklayıcı): trend istiqamətində qısamüddətli ekstrem —
//      BUY üçün RSI(3) < 20 (pullback), SHORT üçün RSI(3) > 80 (bounce).
//   3. KEYFİYYƏT GÖSTƏRİCİLƏRİ (bloklamır, məlumat üçün): həcm nisbəti,
//      BTC bias uyğunluğu, VWAP məsafəsi. Connors həcm filtri istifadə etmir —
//      mean-reversion girişlərində aşağı həcm normaldır.
//
// Köhnə v1 strategiyanın xətası: trend filtri EMA(8) idi — RSI(3) < 30 olanda
// qiymət demək olar həmişə EMA(8)-in altında olur, şərtlər riyazi olaraq
// bir-birini inkar edirdi (1000+ qərar, 0 siqnal).
function runSafetyCheck(price, ema8, vwap, rsi3, timeframe, extras) {
  const { symbol, atr, volumeInfo, btcBias, ema200, prevRsi3, orderFlow } = extras;
  const results = [];

  const check = (label, required, actual, pass, reasonIfFail) => {
    results.push({ label, required, actual, pass, reasonIfFail });
    const icon = pass ? "✅" : "🚫";
    console.log(`  ${icon} ${label}`);
    console.log(`     Tələb: ${required} | Faktiki: ${actual}`);
  };

  // Məlumat xarakterli göstərici — siqnalı BLOKLAMIR, keyfiyyət balına təsir edir
  let infoGood = 0, infoTotal = 0;
  const info = (label, expected, actual, good) => {
    infoTotal++;
    if (good) infoGood++;
    results.push({
      label: `${good ? "✓" : "⚠"} ${label} (məlumat — bloklamır)`,
      required: expected,
      actual,
      pass: true,
      reasonIfFail: null,
    });
    console.log(`  ${good ? "ℹ️ " : "⚠️ "}${label}: ${actual} (gözlənilən: ${expected})`);
  };

  console.log("\n── Təhlükəsizlik Yoxlaması (Mean-Reversion v2) ───────────\n");

  // 1. Uzunmüddətli trend rejimi — EMA(200)
  const uptrend = ema200 !== null && price > ema200;
  const side = uptrend ? "BUY" : "SHORT";
  const trendPct = ema200 !== null ? (((price - ema200) / ema200) * 100).toFixed(2) : "?";

  check(
    `Trend rejimi: ${uptrend ? "YÜKSƏLİŞ — yalnız BUY axtarılır" : "DÜŞÜŞ — yalnız SHORT axtarılır"} (EMA200 $${ema200 !== null ? fmtPrice(ema200) : "?"})`,
    uptrend ? "qiymət > EMA(200)" : "qiymət < EMA(200)",
    `$${fmtPrice(price)} (EMA200-dən ${trendPct}%)`,
    true,
  );

  // 2. Giriş şərti — qısamüddətli RSI(3) ekstremi. VACİB: siqnal "RSI aşağıdadır"
  // VƏZİYYƏTİNƏ yox, "RSI YENİ düşdü" HADİSƏSİNƏ bağlıdır — əvvəlki bağlanmış şamda
  // RSI hələ həddin o tayında olmalıdır. Yoxsa uzanan düşüşdə (düşən bıçaq) hər yeni
  // şamda təkrar BUY siqnalı gəlir (07-08-də SOL üçün 4 dalbadal siqnal buna görə idi).
  if (side === "BUY") {
    const freshDip = rsi3 < CONFIG.rsiEntryLong && (prevRsi3 === null || prevRsi3 >= CONFIG.rsiEntryLong);
    const stillFalling = rsi3 < CONFIG.rsiEntryLong && prevRsi3 !== null && prevRsi3 < CONFIG.rsiEntryLong;
    check(
      `RSI(3) ${CONFIG.rsiEntryLong}-in altına YENİ düşdü — BAĞLANMIŞ şamda təsdiqlənib (təzə pullback)`,
      `bağlanmış şam < ${CONFIG.rsiEntryLong} (ondan əvvəlki ≥ ${CONFIG.rsiEntryLong})`,
      `bağlanmış şam: ${rsi3.toFixed(2)} (əvvəlki: ${prevRsi3 !== null ? prevRsi3.toFixed(2) : "?"})`,
      freshDip,
      stillFalling
        ? `RSI(3) artıq bir neçə şamdır ${CONFIG.rsiEntryLong}-in altındadır (bağlanmış şam ${rsi3.toFixed(2)}, əvvəlki ${prevRsi3.toFixed(2)}) — bu, davam edən sərt düşüşdür (düşən bıçaq). İlk düşüş anında siqnal artıq verilmişdi; təkrar alış siqnalı verilmir. RSI ${CONFIG.rsiEntryLong}-in üstünə qayıdıb yenidən düşərsə, təzə fürsət sayılacaq.`
        : `Trend YÜKSƏLİŞDİR (qiymət EMA(200)-dən ${trendPct}% yuxarıda) — BUY siqnalı üçün qısamüddətli geri çəkilmə (pullback) gözlənilir: şam RSI(3) < ${CONFIG.rsiEntryLong} ilə BAĞLANMALIDIR, son bağlanmış şamda ${rsi3.toFixed(2)}-dir. Qiymət bir-iki şam geri çəkiləndə siqnal gələcək.`,
    );
  } else {
    const freshSpike = rsi3 > CONFIG.rsiEntryShort && (prevRsi3 === null || prevRsi3 <= CONFIG.rsiEntryShort);
    const stillRising = rsi3 > CONFIG.rsiEntryShort && prevRsi3 !== null && prevRsi3 > CONFIG.rsiEntryShort;
    check(
      `RSI(3) ${CONFIG.rsiEntryShort}-in üstünə YENİ qalxdı — BAĞLANMIŞ şamda təsdiqlənib (təzə bounce)`,
      `bağlanmış şam > ${CONFIG.rsiEntryShort} (ondan əvvəlki ≤ ${CONFIG.rsiEntryShort})`,
      `bağlanmış şam: ${rsi3.toFixed(2)} (əvvəlki: ${prevRsi3 !== null ? prevRsi3.toFixed(2) : "?"})`,
      freshSpike,
      stillRising
        ? `RSI(3) artıq bir neçə şamdır ${CONFIG.rsiEntryShort}-in üstündədir (bağlanmış şam ${rsi3.toFixed(2)}, əvvəlki ${prevRsi3.toFixed(2)}) — bu, davam edən güclü qalxışdır. İlk qalxış anında siqnal artıq verilmişdi; təkrar satış siqnalı verilmir. RSI ${CONFIG.rsiEntryShort}-in altına enib yenidən qalxarsa, təzə fürsət sayılacaq.`
        : `Trend DÜŞÜŞDÜR (qiymət EMA(200)-dən ${trendPct}% aşağıda) — SHORT siqnalı üçün qısamüddətli yuxarı sıçrayış (bounce) gözlənilir: şam RSI(3) > ${CONFIG.rsiEntryShort} ilə BAĞLANMALIDIR, son bağlanmış şamda ${rsi3.toFixed(2)}-dir. Qiymət müvəqqəti qalxanda siqnal gələcək.`,
    );
  }

  // 3. Keyfiyyət göstəriciləri — bloklamır (Connors modeli əlavə filtr istifadə etmir)
  if (volumeInfo && volumeInfo.ratio !== null) {
    info(
      "Həcm nisbəti",
      `≥ ${CONFIG.volumeThreshold}x güclü sayılır`,
      `${volumeInfo.ratio.toFixed(2)}x`,
      volumeInfo.pass,
    );
  }

  if (symbol !== "BTCUSDT" && btcBias) {
    const aligned =
      btcBias === "NEUTRAL" ||
      (side === "BUY" && btcBias === "BULLISH") ||
      (side === "SHORT" && btcBias === "BEARISH");
    info("BTC trend uyğunluğu", side === "BUY" ? "BULLISH" : "BEARISH", btcBias, aligned);
  }

  const distFromVWAP = vwap ? Math.abs((price - vwap) / vwap) * 100 : null;
  if (distFromVWAP !== null) {
    info("VWAP məsafəsi", "≤ 2% yaxın sayılır", `${distFromVWAP.toFixed(2)}%`, distFromVWAP <= 2);
  }

  // Order flow (CVD) — aqressiv alıcı/satıcı balansı, son 6 bağlanmış şam
  if (orderFlow) {
    const aligned =
      orderFlow.bias === "TARAZ" ||
      (side === "BUY" && orderFlow.bias === "ALICI") ||
      (side === "SHORT" && orderFlow.bias === "SATICI");
    info(
      "Order flow (CVD, 6 şam)",
      side === "BUY" ? "ALICI üstünlüyü" : "SATICI üstünlüyü",
      `${orderFlow.bias} (${(orderFlow.cvdRatio * 100).toFixed(1)}%)`,
      aligned,
    );
  }

  // Hədəf və risk — ATR əsaslı, deterministik
  const riskDistance = atr ? atr * CONFIG.atrMultiplier : null;
  const rewardDistance = atr ? atr * CONFIG.takeProfitAtrMult : null;
  const target =
    rewardDistance !== null
      ? side === "BUY"
        ? price + rewardDistance
        : price - rewardDistance
      : null;
  const expectedMove =
    target !== null ? { target, pct: (Math.abs(target - price) / price) * 100 } : null;
  const rr = riskDistance && rewardDistance ? rewardDistance / riskDistance : null;

  const allPass = results.every((r) => r.pass);

  let waitReason = null;
  if (!allPass) {
    const firstFailed = results.find((r) => !r.pass && r.reasonIfFail);
    waitReason = firstFailed
      ? firstFailed.reasonIfFail
      : `Bu ${timeframe} şamında giriş üçün lazımi şərtlər ödənmir.`;
  }

  // Keyfiyyət balı: 60 baza + məlumat göstəricilərinin payı (həcm, BTC uyğunluğu, VWAP)
  const qualityScore = infoTotal > 0 ? Math.round(60 + 40 * (infoGood / infoTotal)) : 75;

  return {
    results,
    allPass,
    side,
    waitReason,
    expectedMove,
    riskDistance,
    riskReward: rr,
    qualityScore,
  };
}

// ─── Strategiya: Trend-Following (qızıl / PAXG üçün) ─────────────────────────
//
// Qızıl (XAU/PAXG) mean-reversion-a tabe olmur — makro mövzular bir istiqamətə
// yığılanda həftələrlə trend edir, RSI uzun müddət ekstremdə qalır. Backtestlər:
// RSI mean-reversion qızılda 23% win rate (mənfi gözlənti), trend-following isə işləyir.
//
//   1. REJİM (bloklayıcı): qiymət EMA(200)-dən yuxarı → yalnız BUY, aşağı → yalnız SHORT
//   2. GİRİŞ (bloklayıcı): EMA(9) EMA(20)-ni SON BAĞLANMIŞ şamda kəsdi — yarımçıq
//      şamdakı kəsişmə saya alınmır (geri dönə bilər — yalan siqnalın əsas mənbəyi)
//   3. ADX FİLTRİ (bloklayıcı): ADX(14) ≥ hədd — yan bazarda (sideways) crossover
//      siqnallarının əksəriyyəti yalandır, yalnız güclü trenddə giriş
//   4. TƏSDİQ ŞAMI (bloklayıcı): kəsişmə şamı siqnal istiqamətində bağlanmalıdır
//   5. Hədəf: ATR × 3 (trend davam edir, geniş hədəf), stop: ATR × 1.5
function runTrendCheck(price, timeframe, extras) {
  const { atr, ema200, ema9, ema20, prevEma9, prevEma20, adx, lastClosedCandle, dxy } = extras;
  const results = [];

  const check = (label, required, actual, pass, reasonIfFail) => {
    results.push({ label, required, actual, pass, reasonIfFail });
    const icon = pass ? "✅" : "🚫";
    console.log(`  ${icon} ${label}`);
    console.log(`     Tələb: ${required} | Faktiki: ${actual}`);
  };

  // Məlumat xarakterli göstərici — siqnalı BLOKLAMIR. Video-təlimindən öyrənilən ideya:
  // DXY (dollar indeksi) qızılla tarixən əks-korrelyasiyadadır. Hələ bloklayıcı DEYİL —
  // order flow kimi əvvəlcə göstərilir, aylarla nəticəsi ölçülüb sübut olunsa bloklayıcı olar.
  const info = (label, expected, actual, good) => {
    results.push({
      label: `${good ? "✓" : "⚠"} ${label} (məlumat — bloklamır)`,
      required: expected, actual, pass: true, reasonIfFail: null,
    });
    console.log(`  ${good ? "ℹ️ " : "⚠️ "}${label}: ${actual} (gözlənilən: ${expected})`);
  };

  console.log("\n── Təhlükəsizlik Yoxlaması (Trend-Following / QIZIL) ─────\n");

  const uptrend = ema200 !== null && price > ema200;
  const side = uptrend ? "BUY" : "SHORT";
  const trendPct = ema200 !== null ? (((price - ema200) / ema200) * 100).toFixed(2) : "?";

  check(
    `Trend rejimi: ${uptrend ? "YÜKSƏLİŞ — yalnız BUY axtarılır" : "DÜŞÜŞ — yalnız SHORT axtarılır"} (EMA200 $${ema200 !== null ? fmtPrice(ema200) : "?"})`,
    uptrend ? "qiymət > EMA(200)" : "qiymət < EMA(200)",
    `$${fmtPrice(price)} (EMA200-dən ${trendPct}%)`,
    true,
  );

  // Kəsişmə YALNIZ bağlanmış şamlar üzərində — canlı şam daxil deyil
  const crossedUp = ema9 > ema20 && prevEma9 <= prevEma20;
  const crossedDown = ema9 < ema20 && prevEma9 >= prevEma20;
  const emaState = `EMA9 $${fmtPrice(ema9)} / EMA20 $${fmtPrice(ema20)}`;

  if (side === "BUY") {
    check(
      "EMA(9) EMA(20)-ni yuxarı kəsdi — BAĞLANMIŞ şamda təsdiqlənib",
      "son bağlanmış şamda bullish cross",
      crossedUp ? `KƏSİŞMƏ TƏSDİQLƏNDİ (${emaState})` : emaState,
      crossedUp,
      `Trend YÜKSƏLİŞDİR, amma giriş üçün EMA(9)-un EMA(20)-ni yuxarı kəsməsi və şamın bağlanması ilə təsdiqi gözlənilir — hazırda ${ema9 > ema20 ? "EMA9 yuxarıdadır, amma kəsişmə köhnədir (gecikmiş giriş riskli)" : "EMA9 hələ EMA20-nin altındadır"}. Yeni impuls dalğası şam bağlanışı ilə təsdiqlənəndə siqnal gələcək.`,
    );
  } else {
    check(
      "EMA(9) EMA(20)-ni aşağı kəsdi — BAĞLANMIŞ şamda təsdiqlənib",
      "son bağlanmış şamda bearish cross",
      crossedDown ? `KƏSİŞMƏ TƏSDİQLƏNDİ (${emaState})` : emaState,
      crossedDown,
      `Trend DÜŞÜŞDÜR, amma giriş üçün EMA(9)-un EMA(20)-ni aşağı kəsməsi və şamın bağlanması ilə təsdiqi gözlənilir — hazırda ${ema9 < ema20 ? "EMA9 aşağıdadır, amma kəsişmə köhnədir (gecikmiş giriş riskli)" : "EMA9 hələ EMA20-nin üstündədir"}. Yeni düşüş dalğası şam bağlanışı ilə təsdiqlənəndə siqnal gələcək.`,
    );
  }

  // ADX trend gücü filtri — yan bazarda crossover-lərin çoxu yalan çıxır
  check(
    `ADX(14) trend gücü filtri (${CONFIG.adxThreshold}-dən yuxarı = əsl trend)`,
    `≥ ${CONFIG.adxThreshold}`,
    adx !== null ? adx.toFixed(1) : "N/A",
    adx !== null && adx >= CONFIG.adxThreshold,
    `ADX(14) hazırda ${adx !== null ? adx.toFixed(1) : "?"} — ${CONFIG.adxThreshold} həddindən aşağıdır. Bu, bazarın yan hərəkətdə (sideways) olduğunu göstərir: belə şəraitdə EMA kəsişmələrinin əksəriyyəti yalan siqnaldır (whipsaw). Trend güclənənə qədər gözləmək tövsiyə olunur.`,
  );

  // Təsdiq şamı: kəsişmə şamı siqnal istiqamətində bağlanmalıdır
  if (lastClosedCandle) {
    const candleBullish = lastClosedCandle.close > lastClosedCandle.open;
    const candleOk = side === "BUY" ? candleBullish : !candleBullish;
    const candleDir = candleBullish ? "yaşıl (yüksəliş)" : "qırmızı (düşüş)";
    check(
      `Təsdiq şamı: kəsişmə şamı ${side === "BUY" ? "yaşıl" : "qırmızı"} bağlanmalıdır`,
      side === "BUY" ? "bağlanış > açılış" : "bağlanış < açılış",
      `${candleDir} (açılış $${fmtPrice(lastClosedCandle.open)} → bağlanış $${fmtPrice(lastClosedCandle.close)})`,
      candleOk,
      `Kəsişmə şamı ${candleDir} bağlanıb — siqnal istiqaməti (${side}) ilə uyğun deyil. Zəif təsdiqlə giriş yalan siqnal riskini artırır.`,
    );
  }

  // DXY (dollar indeksi) — qızılla əks-korrelyasiya. Video-təlimindəki "HAHO/DXI ters
  // teyit" ideyası: BUY üçün DXY zəifləməsi, SHORT üçün güclənməsi siqnalı dəstəkləyir.
  if (dxy) {
    const dxyFalling = dxy.change5d < 0;
    const aligned = side === "BUY" ? dxyFalling : !dxyFalling;
    info(
      "DXY (dollar indeksi) əks-korrelyasiya",
      side === "BUY" ? "DXY zəifləyir (dəstək)" : "DXY güclənir (dəstək)",
      `${dxy.close.toFixed(2)} (5 gündə ${dxy.change5d >= 0 ? "+" : ""}${dxy.change5d.toFixed(2)}%)`,
      aligned,
    );
  }

  const riskDistance = atr ? atr * CONFIG.atrMultiplier : null;
  const rewardDistance = atr ? atr * CONFIG.trendTakeProfitAtrMult : null;
  const target =
    rewardDistance !== null
      ? side === "BUY"
        ? price + rewardDistance
        : price - rewardDistance
      : null;
  const expectedMove =
    target !== null ? { target, pct: (Math.abs(target - price) / price) * 100 } : null;
  const rr = riskDistance && rewardDistance ? rewardDistance / riskDistance : null;

  const allPass = results.every((r) => r.pass);
  let waitReason = null;
  if (!allPass) {
    const firstFailed = results.find((r) => !r.pass && r.reasonIfFail);
    waitReason = firstFailed
      ? firstFailed.reasonIfFail
      : `Bu ${timeframe} şamında giriş üçün lazımi şərtlər ödənmir.`;
  }

  // Keyfiyyət balı: ADX nə qədər güclüdürsə, trend siqnalı o qədər etibarlıdır
  const qualityScore = adx !== null
    ? Math.round(Math.max(50, Math.min(100, 60 + (adx - CONFIG.adxThreshold) * 3)))
    : 60;

  return { results, allPass, side, waitReason, expectedMove, riskDistance, riskReward: rr, qualityScore };
}

// ─── Claude İkinci Rəyi (istəyə bağlı — ANTHROPIC_API_KEY qoyulubsa aktivdir) ─
//
// Hər RƏSMİ siqnalda güclü Claude modeli bazar kontekstinə baxıb müstəqil rəy verir.
// MƏSLƏHƏT XARAKTERLİDİR — siqnalı bloklamır. Səbəb: deterministik nüvə 9 illik
// walk-forward testindən keçib və ölçüləbiləndir; Claude rəyinin dəyəri əvvəlcə
// loglanıb zamanla ÖLÇÜLMƏLİDİR (rədd etdiyi siqnallar həqiqətən pis çıxırsa,
// o zaman bloklayıcı etmək olar). Xəta/timeout → siqnal onsuz gedir (fail-open).
async function reviewSignalWithClaude(ctx) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        // Qeyd: güclü modellər cavabdan əvvəl "düşünmə" bloklarına token xərcləyir —
        // 400 limitində mətn heç gəlmirdi. 1200 = düşünmə + qısa JSON üçün kifayətdir.
        max_tokens: 1200,
        system:
          "Sən təcrübəli kripto və qızıl treyderisən. Sənə deterministik siqnal sisteminin " +
          "İNDİCƏ verdiyi giriş siqnalının tam konteksti verilir (son 30 bağlanmış 4H şam, " +
          "indikatorlar, TP/SL). Vəzifən MÜSTƏQİL ikinci rəydir: şam strukturuna, trendin " +
          "vəziyyətinə, volatilliyə və order flow-a bax, siqnalın keyfiyyətini qiymətləndir. " +
          'Cavabı YALNIZ bu JSON formatında ver, başqa heç nə yazma: ' +
          '{"reyting": 0-100 arası tam ədəd, "qerar": "RAZIYAM" və ya "EHTİYATLIYAM" və ya ' +
          '"RAZI DEYİLƏM", "sebeb": "Azərbaycanca 1-2 qısa cümlə"}. ' +
          "Reyting: 80+ güclü setup, 50-79 orta, <50 zəif. Bu yalnız məsləhətdir — sifariş verilmir.",
        messages: [{ role: "user", content: JSON.stringify(ctx) }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const text = (data.content || []).map((b) => b.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const r = JSON.parse(m[0]);
    if (typeof r.reyting !== "number" || !r.qerar || !r.sebeb) return null;
    return {
      reyting: Math.max(0, Math.min(100, Math.round(r.reyting))),
      qerar: String(r.qerar),
      sebeb: String(r.sebeb).slice(0, 400),
      model,
    };
  } catch (err) {
    console.log(`⚠️  Claude rəyi alına bilmədi (${err.message}) — siqnal onsuz göndərilir.`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Əməliyyat Limitləri ──────────────────────────────────────────────────────

function checkTradeLimits(log) {
  const todayCount = countTodaysTrades(log);

  console.log("\n── Əməliyyat Limitləri ───────────────────────────────────\n");

  if (todayCount >= CONFIG.maxTradesPerDay) {
    console.log(
      `🚫 Günlük maksimum siqnal sayına çatıldı: ${todayCount}/${CONFIG.maxTradesPerDay}`,
    );
    return false;
  }

  console.log(
    `✅ Bu gün verilən siqnal: ${todayCount}/${CONFIG.maxTradesPerDay} — limit daxilində`,
  );

  const tradeSize = Math.min(
    CONFIG.portfolioValue * 0.01,
    CONFIG.maxTradeSizeUSD,
  );

  if (tradeSize > CONFIG.maxTradeSizeUSD) {
    console.log(
      `🚫 Təklif olunan ölçü $${tradeSize.toFixed(2)} maksimum $${CONFIG.maxTradeSizeUSD}-i keçir`,
    );
    return false;
  }

  console.log(
    `✅ Təklif olunan ölçü: $${tradeSize.toFixed(2)} — maksimum $${CONFIG.maxTradeSizeUSD} daxilində`,
  );

  return true;
}

// ─── Siqnal CSV Qeydiyyatı ────────────────────────────────────────────────────

const CSV_FILE = path.join(DATA_DIR, "trades.csv");

// trades.csv-nin başlıqlarla mövcud olduğuna əmin ol — istənilən vaxt Excel/Sheets-də aç
async function initCsv() {
  if (!existsSync(CSV_FILE)) {
    const funnyNote = `,,,,,,,,,"QEYD","Salam, deməli buraya qədər izlədin... bəlkə subscribe etmək vaxtıdır? :)"`;
    await writeFile(CSV_FILE, CSV_HEADERS + "\n" + funnyNote + "\n");
    console.log(
      `📄 ${CSV_FILE} yaradıldı — siqnalları izləmək üçün Google Sheets və ya Excel-də aç.`,
    );
  }
}
const CSV_HEADERS = [
  "Tarix",
  "Vaxt (Bakı)",
  "Coin",
  "İstiqamət",
  "Təklif Olunan Miqdar",
  "Qiymət",
  "Təklif Olunan Ölçü (USD)",
  "Gözlənilən Hədəf",
  "Gözlənilən Dəyişim (%)",
  "Status",
  "Qeyd",
].join(",");

async function writeTradeCsv(logEntry) {
  const now = new Date(logEntry.timestamp);
  const date = bakuDateStr(now);
  const time = bakuTimeStr(now);

  let side = "";
  let quantity = "";
  let totalUSD = "";
  let targetPrice = "";
  let targetPct = "";
  let status = "";
  let notes = "";

  if (!logEntry.allPass) {
    status = "GÖZLƏ";
    notes = logEntry.waitReason || "Şərtlər ödənmədi";
  } else {
    side = logEntry.side;
    quantity = (logEntry.tradeSize / logEntry.price).toFixed(6);
    totalUSD = logEntry.tradeSize.toFixed(2);
    targetPrice = logEntry.expectedMove ? logEntry.expectedMove.target.toFixed(2) : "";
    targetPct = logEntry.expectedMove ? logEntry.expectedMove.pct.toFixed(2) : "";
    status = "SİQNAL";
    notes = "Bütün şərtlər ödənildi — razısansa manual icra et";
  }

  const row = [
    date,
    time,
    logEntry.symbol,
    side,
    quantity,
    logEntry.price.toFixed(2),
    totalUSD,
    targetPrice,
    targetPct,
    status,
    `"${notes}"`,
  ].join(",");

  if (!existsSync(CSV_FILE)) {
    await writeFile(CSV_FILE, CSV_HEADERS + "\n");
  }

  await appendFile(CSV_FILE, row + "\n");
  console.log(`Siqnal qeydi saxlanıldı → ${CSV_FILE}`);
}

// Xülasə əmri: node bot.js --tax-summary
function generateTaxSummary() {
  if (!existsSync(CSV_FILE)) {
    console.log("trades.csv tapılmadı — hələ heç bir siqnal qeydə alınmayıb.");
    return;
  }

  const lines = readFileSync(CSV_FILE, "utf8").trim().split("\n");
  const rows = lines.slice(1).map((l) => l.split(","));

  const signals = rows.filter((r) => r[9] === "SİQNAL");
  const waiting = rows.filter((r) => r[9] === "GÖZLƏ");

  console.log("\n── Siqnal Xülasəsi ───────────────────────────────────────\n");
  console.log(`  Ümumi qeydə alınan qərar : ${rows.length}`);
  console.log(`  Verilmiş siqnal          : ${signals.length}`);
  console.log(`  Gözləmə tövsiyəsi        : ${waiting.length}`);
  console.log(`\n  Tam qeyd: ${CSV_FILE}`);
  console.log("─────────────────────────────────────────────────────────\n");
}

// ─── Manual Qiymət Səviyyəsi Xəbərdarlıqları (PRICE_ALERTS env dəyişəni) ─────
//
// Format: "ETHUSDT<1835,ETHUSDT>1860" (vergüllə ayrılmış SYMBOL<qiymət / SYMBOL>qiymət).
// İstifadəçinin özü təyin etdiyi spot al-sat qərarı üçün müşahidə həddidir —
// strategiya siqnalından TAM AYRIDIR, statistikaya düşmür. Yalnız BAĞLANMIŞ 4H
// şam yoxlanılır və yalnız HƏDDİN TƏZƏ KEÇİLDİYİ anda (əvvəlki bağlanmış şam
// hələ keçməmişdi) bir dəfə bildiriş gedir — qiymət o tərəfdə qalsa da 15 dəqiqədə
// bir təkrarlanmır (candleTime ilə dedupe, RSI siqnalları ilə eyni məntiq).
async function checkPriceLevelAlerts(symbol, candles, closes) {
  const raw = process.env.PRICE_ALERTS;
  if (!raw || !process.env.TELEGRAM_BOT_TOKEN) return;
  const alerts = raw
    .split(",")
    .map((s) => s.trim())
    .map((s) => {
      const m = s.match(/^([A-Za-z0-9]+)([<>])([\d.]+)$/);
      return m ? { symbol: m[1].toUpperCase(), op: m[2], threshold: parseFloat(m[3]) } : null;
    })
    .filter((a) => a && a.symbol === symbol);
  if (!alerts.length || candles.length < 3) return;

  const currClose = closes[closes.length - 2]; // son BAĞLANMIŞ şam
  const prevClose = closes[closes.length - 3]; // ondan əvvəlki bağlanmış şam
  const candleTime = candles[candles.length - 2].time;

  let state = {};
  if (existsSync(PRICE_ALERTS_STATE_FILE)) {
    try { state = JSON.parse(await readFile(PRICE_ALERTS_STATE_FILE, "utf8")); } catch {}
  }
  let changed = false;
  for (const a of alerts) {
    const key = `${a.symbol}${a.op}${a.threshold}`;
    const satisfiedNow = a.op === "<" ? currClose < a.threshold : currClose > a.threshold;
    const satisfiedPrev = a.op === "<" ? prevClose < a.threshold : prevClose > a.threshold;
    const fresh = satisfiedNow && !satisfiedPrev;
    if (fresh && state[key] !== candleTime) {
      state[key] = candleTime;
      changed = true;
      const label = symbol === "PAXGUSDT" ? "GOLD" : symbol.replace("USDT", "");
      const dirText = a.op === "<" ? `$${a.threshold} həddinin ALTINDA` : `$${a.threshold} həddinin ÜSTÜNDƏ`;
      await sendTelegram(
        `⚠️ <b>${label} SƏVİYYƏ XƏBƏRDARLIĞI</b>\n\n` +
        `4H şam ${dirText} bağlandı: $${fmtPrice(currClose)}\n` +
        `Bu, sənin özün təyin etdiyin ${a.op === "<" ? "aşağı" : "yuxarı"} hədddir.`,
      );
      console.log(`⚠️  Qiymət səviyyəsi xəbərdarlığı: ${label} ${dirText} (bağlanış $${fmtPrice(currClose)})`);
    }
  }
  if (changed) await writeFile(PRICE_ALERTS_STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Əsas ───────────────────────────────────────────────────────────────────

async function analyzeSymbol(symbol, log, positions, canSignal, btcBias) {
  console.log(`\n── ${symbol} ───────────────────────────────────────────\n`);

  // Şam datası çək — EMA(8) və tam VWAP seansı üçün kifayət qədər lazımdır
  const candles = await fetchCandles(symbol, CONFIG.timeframe, 500);
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  console.log(`  Cari qiymət: $${fmtPrice(price)}`);

  try {
    await checkPriceLevelAlerts(symbol, candles, closes);
  } catch (err) {
    console.log(`⚠️  Qiymət xəbərdarlığı yoxlaması xətası: ${err.message}`);
  }

  const ema8 = calcEMA(closes, 8);
  const ema200 = closes.length >= CONFIG.trendEmaPeriod ? calcEMA(closes, CONFIG.trendEmaPeriod) : null;
  const vwap = calcVWAP(candles);
  const rsi3 = calcRSI(closes, 3);
  // QƏRARLAR yalnız BAĞLANMIŞ şamların RSI-si ilə verilir. Formalaşan şamın RSI-si
  // (yuxarıdakı rsi3) yalnız məlumat üçün göstərilir — o, şam ərzində oynayır və
  // ondan qərar vermək yalan siqnal yaradırdı (qızıl strategiyasındakı eyni dərs).
  // Backtest, walk-forward və həftəlik qiymətləndirici də bağlanmış şamla işləyir.
  const rsi3Closed = calcRSI(closes.slice(0, -1), 3);      // son bağlanmış şam
  const rsi3PrevClosed = calcRSI(closes.slice(0, -2), 3);  // ondan əvvəlki bağlanmış şam

  console.log(`  EMA(8):   $${fmtPrice(ema8)}`);
  console.log(`  EMA(200): $${ema200 !== null ? fmtPrice(ema200) : "N/A"}`);
  console.log(`  VWAP:     $${vwap ? fmtPrice(vwap) : "N/A"}`);
  console.log(`  RSI(3):   canlı ${rsi3 !== null ? rsi3.toFixed(2) : "N/A"} | bağlanmış şam ${rsi3Closed !== null ? rsi3Closed.toFixed(2) : "N/A"} (qərar bağlanmış şamla verilir)`);

  // Diqqət: rsi3 === 0 mümkün dəyərdir (3 şam dalbadal düşüş — ekstrem oversold),
  // ona görə falsy (!rsi3) yox, məhz null yoxlanılır
  if (!vwap || rsi3 === null || rsi3Closed === null || ema200 === null) {
    console.log("\n⚠️  İndikatorları hesablamaq üçün kifayət qədər data yoxdur. Keçilir.");
    return null;
  }

  // Son yoxlamadan bəri BAŞLAYAN şamlar — SL/TP-nin yoxlamalar arasında toxunuşunu
  // high/low ilə tutmaq üçün. Giriş şamı bilərəkdən istisnadır: onun ekstremləri
  // girişdən ƏVVƏLKİ hərəkəti də ehtiva edir (həftəlik qiymətləndirici də giriş
  // şamını atlayır — eyni semantika).
  const candleMs = TF_MS[CONFIG.timeframe] || 4 * 3600 * 1000;
  const barsSince = (pos) => {
    if (!pos.openedAt) return [];
    const openT = new Date(pos.openedAt).getTime();
    const lastT = pos.lastCheckedAt ? new Date(pos.lastCheckedAt).getTime() : openT;
    return candles.filter((c) => c.time > openT && c.time + candleMs > lastT);
  };

  // Açıq mövqe(lər) varsa, çıxış şərtlərini yoxla
  const openPositions = positions.filter((p) => p.symbol === symbol && p.status === "open");
  if (openPositions.length > 0) {
    console.log(`\n── Açıq Mövqə Yoxlaması ──────────────────────────────────\n`);
  }
  for (const pos of openPositions) {
    const wasRecommended = pos.exitRecommended === true;
    const result = checkExitConditions(pos, price, ema8, vwap, rsi3Closed, barsSince(pos));
    pos.currentPrice = price;
    pos.lastCheckedAt = new Date().toISOString();
    pos.exitRecommended = result.exit;
    pos.exitReason = result.exit ? result.reason : null;
    if (result.exit) {
      console.log(`🔔 SAT TÖVSİYƏSİ — ${pos.side} ${symbol} (giriş $${fmtPrice(pos.entryPrice)})`);
      console.log(`   Səbəb: ${result.reason}`);
      // Bildiriş yalnız tövsiyə İLK dəfə yarananda göndərilir (hər 30 dəq təkrar spam olmasın)
      if (!wasRecommended) {
        await sendTelegram(
          `🔔 <b>SAT TÖVSİYƏSİ — ${symbol}</b>\n` +
          `Açıq ${pos.side} mövqeyin üçün çıxış şərti ödəndi\n` +
          `Giriş: $${fmtPrice(pos.entryPrice)} | Hazırkı: $${fmtPrice(price)}\n` +
          `Səbəb: ${result.reason}`,
        );
      }
    } else {
      console.log(`✅ Mövqə davam edir — ${pos.side} ${symbol} (giriş $${fmtPrice(pos.entryPrice)}), hələ çıxış şərti ödənmir.`);
    }
  }

  // ATR yalnız TAMAMLANMIŞ şamlardan hesablanır — hazırda formalaşan şamın diapazonu
  // yarımçıqdır, stop-loss məsafəsi dövrədən-dövrəyə oynamasın deyə çıxarılır
  const atr = calcATR(candles.slice(0, -1));
  const volumeInfo = checkVolumeConfirmation(candles);
  const orderFlow = calcOrderFlow(candles);
  if (orderFlow) {
    console.log(`  Order flow: ${orderFlow.bias} (CVD ${(orderFlow.cvdRatio * 100).toFixed(1)}%, son şam ${(orderFlow.lastDelta * 100).toFixed(1)}%)`);
  }

  // Strategiya seçimi: qızıl (PAXG) trend edən aktivdir — mean-reversion yox,
  // EMA(9)/EMA(20) crossover trend-following istifadə olunur
  const isTrendSymbol = CONFIG.trendSymbols.includes(symbol);
  let goldAlertInfo = null;
  let checkOutcome;
  if (isTrendSymbol) {
    // BÜTÜN trend hesablamaları yalnız BAĞLANMIŞ şamlar üzərində — canlı (yarımçıq)
    // şamdakı kəsişmə şam bağlanana qədər geri dönə bilər (yalan siqnalın əsas səbəbi)
    const closedCandles = candles.slice(0, -1);
    const closedCloses = closedCandles.map((c) => c.close);
    const ema9 = calcEMA(closedCloses, 9);
    const ema20 = calcEMA(closedCloses, 20);
    const prevCloses = closedCloses.slice(0, -1);
    const prevEma9 = calcEMA(prevCloses, 9);
    const prevEma20 = calcEMA(prevCloses, 20);
    const adx = calcADX(closedCandles);
    const lastClosedCandle = closedCandles[closedCandles.length - 1];
    goldAlertInfo = { ema9, ema20, adx };
    // DXY (dollar indeksi) — məlumat xarakterli, xəta olsa belə siqnalı dayandırmır
    let dxy = null;
    try { dxy = await fetchDxyContext(); } catch (err) { console.log(`⚠️  DXY yüklənə bilmədi: ${err.message}`); }
    checkOutcome = runTrendCheck(price, CONFIG.timeframe, {
      symbol, atr, ema200, ema9, ema20, prevEma9, prevEma20, adx, lastClosedCandle, dxy,
    });
  } else {
    // Giriş hadisəsi BAĞLANMIŞ şamlarla: son bağlanmış şamın RSI-si həddi keçib,
    // ondan əvvəlki hələ keçməmişdi. Formalaşan şamın RSI-si qərara qarışmır.
    checkOutcome = runSafetyCheck(price, ema8, vwap, rsi3Closed, CONFIG.timeframe, {
      symbol, closes, atr, volumeInfo, btcBias, ema200, prevRsi3: rsi3PrevClosed, orderFlow,
    });
  }
  const { results, allPass, side, waitReason, expectedMove, riskDistance, riskReward, qualityScore } = checkOutcome;

  // Dublikat qarşısı: eyni 4H şamı ərzində (hər 30 dəq yoxlamada) eyni coin üçün yalnız
  // BİR siqnal verilir — təkrar siqnallar günlük limiti boşuna yeyir və feed-i doldurur
  const candleTime = candles[candles.length - 1].time;
  const isDuplicate =
    allPass &&
    log.trades.some((t) => t.symbol === symbol && t.allPass && t.candleTime === candleTime);
  const effectiveAllPass = allPass && !isDuplicate;
  const effectiveWaitReason = isDuplicate
    ? `Bu ${CONFIG.timeframe} şamında ${symbol} üçün artıq siqnal verilib — eyni şam ərzində təkrar siqnal qeydə alınmır (dublikat qarşısı).`
    : waitReason;

  // ── Fokus coin bildirişləri (ETH, GOLD) — yalnız yeni şamın İLK yoxlamasında ──
  // Bunlar rəsmi siqnal DEYİL (statistikaya düşmür) — istifadəçinin özü qərar verməsi
  // üçün əlavə Telegram məlumatlarıdır.
  const firstCheckOfCandle = !log.trades.some((t) => t.symbol === symbol && t.candleTime === candleTime);
  if (CONFIG.focusSymbols.includes(symbol) && firstCheckOfCandle && !effectiveAllPass) {
    if (isTrendSymbol && goldAlertInfo && atr) {
      // GOLD: kəsişmə yaxınlaşır xəbərdarlığı — EMA9/EMA20 fərqi çox daralıb + trend güclüdür
      const { ema9, ema20, adx } = goldAlertInfo;
      const gap = Math.abs(ema9 - ema20);
      if (gap <= 0.15 * atr && adx !== null && adx >= CONFIG.adxThreshold) {
        const dir = ema9 > ema20 ? "bearish (SHORT tərəfə)" : "bullish (BUY tərəfə)";
        await sendTelegram(
          `⏳ <b>GOLD — kəsişmə yaxınlaşır</b>\n` +
          `EMA9 $${fmtPrice(ema9)} / EMA20 $${fmtPrice(ema20)} — fərq çox daralıb\n` +
          `ADX ${adx.toFixed(1)} (güclü trend) — növbəti 1-2 şamda ${dir} kəsişmə ehtimalı var.\n` +
          `Qrafiki izləməyə hazır ol — kəsişmə təsdiqlənəndə rəsmi siqnal gələcək.`,
        );
        console.log(`⏳ GOLD kəsişmə-yaxınlaşır bildirişi göndərildi (fərq $${gap.toFixed(2)})`);
      }
    } else if (!isTrendSymbol && rsi3PrevClosed !== null) {
      // ETH (və digər fokus kripto): davam edən ekstrem epizodunda təkrar giriş fürsəti —
      // tarixən dərin girişlər ən qazanclı olub (backtest), amma risk yüksəkdir
      const uptrendNow = price > ema200;
      const inLongEpisode = uptrendNow && rsi3Closed < CONFIG.rsiEntryLong && rsi3PrevClosed < CONFIG.rsiEntryLong;
      const inShortEpisode = !uptrendNow && rsi3Closed > CONFIG.rsiEntryShort && rsi3PrevClosed > CONFIG.rsiEntryShort;
      if ((inLongEpisode || inShortEpisode) && atr) {
        const dirSide = inLongEpisode ? "BUY" : "SHORT";
        const stopP = inLongEpisode ? price - atr * CONFIG.atrMultiplier : price + atr * CONFIG.atrMultiplier;
        await sendTelegram(
          `🔄 <b>TƏKRAR FÜRSƏT — ${dirSide} ${symbol}</b>\n` +
          `Qiymət: $${fmtPrice(price)} | RSI(3): ${rsi3.toFixed(1)}\n` +
          `Əvvəlki siqnal epizodu davam edir — daha dərin giriş qiyməti yaranıb.\n` +
          `🛑 Stop-loss: $${stopP.toFixed(2)}\n` +
          `⚠️ Bu, rəsmi siqnal deyil (davam edən hərəkət — risk yüksəkdir). Girsən, kiçik ölçü ilə.`,
        );
        console.log(`🔄 ${symbol} təkrar-fürsət bildirişi göndərildi`);
      }
    }
  }

  // Virtual balans (paper trading) — günlük siqnal limitindən asılı olmayaraq daim işləyir
  await runPaperTrading(symbol, price, ema8, vwap, rsi3Closed, atr, { allPass: effectiveAllPass, side }, barsSince);

  // Günlük limit dolubsa qərar yenə də qeydə alınır (dashboard günün sonuna qədər boş
  // qalmasın), sadəcə SİQNAL əvəzinə GÖZLƏ statusu ilə
  let finalAllPass = effectiveAllPass;
  let finalWaitReason = effectiveWaitReason;
  if (!canSignal && finalAllPass) {
    finalAllPass = false;
    finalWaitReason = `Günlük maksimum siqnal sayına (${CONFIG.maxTradesPerDay}) çatılıb — şərtlər ödənsə də bu gün yeni siqnal verilmir. Limit gecə yarısı (Bakı vaxtı) sıfırlanır.`;
    console.log(`\n⏭️  Günlük siqnal limiti dolub — qərar GÖZLƏ kimi qeydə alınır.`);
  }

  const tradeSize = Math.min(
    CONFIG.portfolioValue * 0.01,
    CONFIG.maxTradeSizeUSD,
  );

  const logEntry = {
    timestamp: new Date().toISOString(),
    symbol,
    timeframe: CONFIG.timeframe,
    candleTime,
    price,
    indicators: { ema8, ema200, vwap, rsi3, rsi3Closed, atr, orderFlow },
    conditions: results,
    allPass: finalAllPass,
    side,
    tradeSize,
    qualityScore,
    waitReason: finalWaitReason,
    expectedMove,
    riskDistance,
    riskReward,
    limits: {
      maxTradeSizeUSD: CONFIG.maxTradeSizeUSD,
      maxTradesPerDay: CONFIG.maxTradesPerDay,
      tradesToday: countTodaysTrades(log),
    },
  };

  if (!finalAllPass) {
    console.log(`🚫 SİQNAL YOXDUR — GÖZLƏ`);
    console.log(`   Səbəb: ${finalWaitReason}`);
  } else {
    console.log(`✅ BÜTÜN ŞƏRTLƏR ÖDƏNİLDİ — TÖVSİYƏ`);
    console.log(
      `\n   ${side} ${symbol} — təklif olunan ölçü ~$${tradeSize.toFixed(2)} (~$${fmtPrice(price)} ətrafında)`,
    );
    if (expectedMove) {
      console.log(
        `   Gözlənilən hədəf: ~$${fmtPrice(expectedMove.target)} (~${expectedMove.pct.toFixed(2)}% ${side === "BUY" ? "artım" : "düşüş"})`,
      );
    }
    if (riskReward !== null) {
      console.log(`   Risk/Reward: ${riskReward.toFixed(2)} (ATR-əsaslı risk məsafəsi: $${riskDistance.toFixed(2)})`);
    }
    console.log(`   Bu yalnız siqnaldır — razısansa öz mübadilə hesabında manual icra et.`);

    const stopPrice = riskDistance !== null
      ? (side === "BUY" ? price - riskDistance : price + riskDistance)
      : null;
    const scoreBar = qualityScore >= 85 ? "🟢🟢🟢" : qualityScore >= 70 ? "🟢🟢⚪" : "🟢⚪⚪";

    // XM icra planı — risk-əsaslı mövqe ölçüsü: SL-ə dəymək hesabın yalnız
    // XM_RISK_PCT %-nə başa gəlsin (peşəkar pul idarəetməsi qaydası)
    let xmSection = "";
    if (stopPrice !== null) {
      const xmAccount = parseFloat(process.env.XM_ACCOUNT_USD || "500");
      const xmRiskPct = parseFloat(process.env.XM_RISK_PCT || "1.5");
      const riskUsd = xmAccount * (xmRiskPct / 100);
      const stopDist = Math.abs(price - stopPrice);
      const sizing = computeXmUnits(riskUsd, price, stopDist, xmAccount);
      if (sizing) {
        const { units } = sizing;
        const notional = units * price;
        const isGoldSig = symbol === "PAXGUSDT";
        const xmSymbol = isGoldSig ? "XAUUSD" : symbol.replace("USDT", "USD");
        const baseAsset = symbol.replace("USDT", ""); // BTC, ETH, ...
        xmSection =
          `\n📐 <b>XM icra planı</b> (hesab $${xmAccount.toFixed(0)}, risk ${xmRiskPct}%):\n` +
          `Alət: <b>${xmSymbol}</b>\n` +
          `⚠️ <b>XM sifariş biletinə DƏQİQ bu ölçünü yaz:</b>\n` +
          `👉 <b>${units.toFixed(4)} ${baseAsset}</b> (~$${notional.toFixed(0)} notional${isGoldSig ? `, ≈${(units / 100).toFixed(2)} lot` : ""})\n` +
          `Standart "1 Lot" ilə buraxma — bu, çox böyük mövqe deməkdir!\n` +
          `SL-ə dəysə itki: ~$${riskUsd.toFixed(2)}\n` +
          (sizing.capped ? `⚠️ <b>Ölçü təhlükəsizlik tavanına endirildi</b> — SL məsafəsi qeyri-adi dar çıxdı (data anomaliyası ehtimalı ola bilər), xam düstur ${sizing.rawUnits.toFixed(4)} ${baseAsset} verirdi.\n` : "") +
          `\n☑️ <i>Girməzdən əvvəl yoxla: Stop-loss QOYDUN? Ölçü DƏQİQ yazılıb?</i>\n`;
        if (isGoldSig) {
          const day = new Date().getUTCDay();
          if (day === 6 || day === 0) {
            xmSection += `⚠️ XAUUSD bazarı həftəsonu bağlıdır — bazar ertəsi açılışda qiyməti yoxla.\n`;
          }
        }
      }
    }

    // 🧠 Claude ikinci rəyi — yalnız rəsmi siqnallarda çağırılır (~ayda 20-25 dəfə)
    let claudeSection = "";
    const review = await reviewSignalWithClaude({
      siqnal: {
        symbol, side, qiymet: price,
        strategiya: isTrendSymbol ? "trend-following (EMA9/20 cross + ADX)" : "mean-reversion (RSI3 bağlanmış şam hadisəsi)",
        tp: expectedMove ? expectedMove.target : null,
        sl: stopPrice,
        riskReward,
        sistemKeyfiyyetBali: qualityScore,
      },
      indikatorlar: {
        rsi3SonBaglanmis: rsi3Closed,
        rsi3OndanEvvelki: rsi3PrevClosed,
        ema200: ema200,
        ema200denFerqFaiz: ema200 ? ((price - ema200) / ema200) * 100 : null,
        atr,
        hecmNisbeti: volumeInfo && volumeInfo.ratio !== null ? volumeInfo.ratio : null,
        orderFlow: orderFlow ? { bias: orderFlow.bias, cvdFaiz: orderFlow.cvdRatio * 100 } : null,
        btcBias,
      },
      son30BaglanmisSham: candles.slice(0, -1).slice(-30).map((c) => ({
        t: new Date(c.time).toISOString().slice(0, 16),
        o: c.open, h: c.high, l: c.low, c: c.close, v: Math.round(c.volume),
      })),
    });
    if (review) {
      logEntry.claudeReview = review;
      const rIcon = review.qerar === "RAZIYAM" ? "🟢" : review.qerar === "RAZI DEYİLƏM" ? "🔴" : "🟡";
      claudeSection = `\n🧠 <b>Claude rəyi</b>: ${rIcon} ${review.qerar} — ${review.reyting}/100\n<i>${review.sebeb}</i>\n`;
      console.log(`🧠 Claude rəyi: ${review.qerar} ${review.reyting}/100 — ${review.sebeb}`);
    }

    await sendTelegram(
      `🚨 <b>SİQNAL — ${side} ${symbol}</b>\n\n` +
      `Qiymət: <b>$${fmtPrice(price)}</b>\n` +
      `${scoreBar} Keyfiyyət: <b>${qualityScore}/100</b>\n` +
      (orderFlow ? `🌊 Order flow: ${orderFlow.bias} (CVD ${(orderFlow.cvdRatio * 100).toFixed(1)}%)\n` : "") +
      (expectedMove ? `🎯 Hədəf (TP): $${fmtPrice(expectedMove.target)} (${side === "BUY" ? "+" : "−"}${expectedMove.pct.toFixed(2)}%)\n` : "") +
      (stopPrice !== null ? `🛑 Stop-loss (SL): $${fmtPrice(stopPrice)}\n` : "") +
      (riskReward !== null ? `⚖️ Risk/Reward: ${riskReward.toFixed(2)}\n` : "") +
      xmSection +
      claudeSection +
      `\n⚠️ Bu yalnız tövsiyədir — icra sənin əlindədir. TP və SL-i əmrlə birlikdə qoy!`,
    );
  }

  return logEntry;
}

// ─── Uzunmüddətli Rejim Analizi (Binance "al-tut" mövqeləri üçün) ────────────
//
// Bu, gündəlik 4H siqnallardan TAM AYRIDIR. Sual: "bu coini uzun müddət
// saxlamalıyam, yoxsa satmalıyam?" Günlük şamlarla işləyir.
//
// 3 sübutlu göstərici (backtest: 634 gün, 5 aktiv — hər birində al-tutdan yaxşı):
//   1. Qiymət > SMA(200) — klassik bull/bear xətti
//   2. Golden Cross — SMA(50) > SMA(200)
//   3. 12 aylıq mütləq momentum (Antonacci) — bugünkü qiymət 365 gün əvvəlkindən yuxarı
// Verdikt 2/3 çoxluq qaydası ilə verilir. Əlavə kontekst: Mayer Multiple
// (qiymət / SMA200) — Trace Mayer-in dəyər zonası göstəricisi.

const REGIME_STATE_FILE = path.join(DATA_DIR, "regime-state.json");

function smaAt(closes, period) {
  if (closes.length < period) return null;
  const w = closes.slice(-period);
  return w.reduce((a, b) => a + b, 0) / period;
}

async function analyzeLongTermRegime(symbol) {
  const url = `${process.env.BINANCE_API_BASE || "https://data-api.binance.vision"}/api/v3/klines?symbol=${symbol}&interval=1d&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance günlük data xətası: ${res.status}`);
  const closes = (await res.json()).map((k) => parseFloat(k[4]));
  if (closes.length < 200) return null;

  const price = closes[closes.length - 1];
  const sma50 = smaAt(closes, 50);
  const sma200 = smaAt(closes, 200);
  const yearAgo = closes.length > 365 ? closes[closes.length - 366] : null;

  const aboveSma200 = sma200 !== null ? price > sma200 : null;
  const goldenCross = sma50 !== null && sma200 !== null ? sma50 > sma200 : null;
  const momentum12m = yearAgo !== null ? price > yearAgo : null;
  const momentumPct = yearAgo !== null ? ((price - yearAgo) / yearAgo) * 100 : null;
  const mayer = sma200 !== null ? price / sma200 : null;

  const checks = [aboveSma200, goldenCross, momentum12m].filter((x) => x !== null);
  const positives = checks.filter(Boolean).length;
  const verdict =
    checks.length < 2 ? "MƏLUMAT AZDIR"
    : positives >= 2 ? "SAXLA"
    : positives === 1 ? "EHTİYATLI OL"
    : "SAT";

  // Mayer Multiple zonası (Trace Mayer-in tarixi backtesti)
  let mayerZone = null;
  if (mayer !== null) {
    mayerZone =
      mayer < 0.8 ? "dərin ucuzluq — tarixən yaxşı toplama zonası"
      : mayer < 1.0 ? "ucuz — orta qiymətdən aşağı"
      : mayer < 1.5 ? "ədalətli dəyər"
      : mayer < 2.4 ? "sağlam yüksəliş"
      : "zirvə zonası — tarixən düzəliş gəlib";
  }

  return { symbol, price, sma50, sma200, aboveSma200, goldenCross, momentum12m, momentumPct, mayer, mayerZone, positives, total: checks.length, verdict };
}

function formatRegimeLine(r) {
  const label = r.symbol === "PAXGUSDT" ? "GOLD" : r.symbol.replace("USDT", "");
  const icon = r.verdict === "SAXLA" ? "🟢" : r.verdict === "EHTİYATLI OL" ? "🟡" : r.verdict === "SAT" ? "🔴" : "⚪";
  return (
    `${icon} <b>${label}: ${r.verdict}</b> (${r.positives}/${r.total})\n` +
    `   $${fmtPrice(r.price)} | SMA200 $${r.sma200 !== null ? fmtPrice(r.sma200) : "?"}\n` +
    `   ${r.aboveSma200 ? "✅" : "❌"} SMA200-dən yuxarı · ${r.goldenCross ? "✅" : "❌"} Golden Cross · ${r.momentum12m ? "✅" : "❌"} 12ay momentum (${r.momentumPct !== null ? (r.momentumPct >= 0 ? "+" : "") + r.momentumPct.toFixed(0) + "%" : "?"})\n` +
    (r.mayer !== null ? `   📊 Mayer ${r.mayer.toFixed(2)} — ${r.mayerZone}\n` : "")
  );
}

// Rejim dəyişikliyi olanda DƏRHAL bildiriş göndərir (ən vacib an: SAXLA → SAT)
async function checkRegimeChanges() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  let prev = {};
  if (existsSync(REGIME_STATE_FILE)) {
    try { prev = JSON.parse(await readFile(REGIME_STATE_FILE, "utf8")); } catch {}
  }
  const next = {};
  for (const symbol of CONFIG.symbols) {
    let r;
    try { r = await analyzeLongTermRegime(symbol); } catch { continue; }
    if (!r) continue;
    next[symbol] = r.verdict;
    const old = prev[symbol];
    if (old && old !== r.verdict && r.verdict !== "MƏLUMAT AZDIR") {
      const label = symbol === "PAXGUSDT" ? "GOLD" : symbol.replace("USDT", "");
      const urgent = r.verdict === "SAT" || old === "SAT";
      await sendTelegram(
        `${urgent ? "🚨" : "🔔"} <b>UZUNMÜDDƏTLİ REJİM DƏYİŞDİ — ${label}</b>\n\n` +
        `${old} ➜ <b>${r.verdict}</b>\n\n` +
        formatRegimeLine(r) +
        `\n💡 Bu, uzunmüddətli mövqelərin (Binance al-tut) üçündür — gündəlik 4H siqnallardan ayrıdır.`,
      );
      console.log(`🔔 Rejim dəyişikliyi: ${symbol} ${old} → ${r.verdict}`);
    }
  }
  await writeFile(REGIME_STATE_FILE, JSON.stringify(next, null, 2));
}

// ─── Həftəlik Telegram Hesabatı (hər bazar günü) ─────────────────────────────

const REPORT_STATE_FILE = path.join(DATA_DIR, "weekly-report-state.json");

// Bir siqnalın nəticəsini tarixi şam datası ilə qiymətləndirir — canlı çıxış
// qaydalarının eynisi: stop (breakeven daxil), TP, RSI çıxışı, vaxt limiti
async function evaluateSignalOutcome(sig) {
  const ts = new Date(sig.timestamp).getTime();
  const atr = sig.indicators && sig.indicators.atr;
  if (!atr) return null;
  const isGold = CONFIG.trendSymbols.includes(sig.symbol);

  let candles;
  try {
    candles = await fetchCandles(sig.symbol, CONFIG.timeframe, 500);
  } catch {
    return null;
  }
  const candleMs = 4 * 3600 * 1000;
  const sigIdx = candles.findIndex((c) => ts >= c.time && ts < c.time + candleMs);
  if (sigIdx === -1) return null;

  const entry = sig.price;
  const side = sig.side;
  const closes = candles.map((c) => c.close);
  let stop = side === "BUY" ? entry - atr * CONFIG.atrMultiplier : entry + atr * CONFIG.atrMultiplier;
  const tpMult = isGold ? CONFIG.trendTakeProfitAtrMult : CONFIG.takeProfitAtrMult;
  const tp = side === "BUY" ? entry + atr * tpMult : entry - atr * tpMult;
  const beTrig = atr * CONFIG.breakevenTrigger;

  const finish = (exitPrice, outcome) => ({
    outcome,
    pnlPct: (side === "BUY" ? (exitPrice - entry) / entry : (entry - exitPrice) / entry) * 100,
  });

  for (let j = sigIdx + 1; j < Math.min(sigIdx + 31, candles.length); j++) {
    const c = candles[j];
    if (side === "BUY") {
      if (c.low <= stop) return finish(stop, "stop");
      if (c.high >= tp) return finish(tp, "tp");
      if (c.high >= entry + beTrig && stop < entry) stop = entry;
      if (!isGold) {
        const r = calcRSI(closes.slice(0, j + 1), 3);
        if (r !== null && r >= CONFIG.rsiExitLong) return finish(c.close, "rsi");
      }
    } else {
      if (c.high >= stop) return finish(stop, "stop");
      if (c.low <= tp) return finish(tp, "tp");
      if (c.low <= entry - beTrig && stop > entry) stop = entry;
      if (!isGold) {
        const r = calcRSI(closes.slice(0, j + 1), 3);
        if (r !== null && r <= CONFIG.rsiExitShort) return finish(c.close, "rsi");
      }
    }
  }
  if (candles.length - 1 > sigIdx + 30) {
    return finish(candles[sigIdx + 30].close, "time");
  }
  return { outcome: "open", pnlPct: (side === "BUY" ? (closes[closes.length - 1] - entry) / entry : (entry - closes[closes.length - 1]) / entry) * 100 };
}

// Hər bazar günü (Bakı) saat 12-dən sonra bir dəfə həftəlik hesabat göndərir
async function sendWeeklyReportIfDue() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const force = process.env.FORCE_WEEKLY_REPORT === "1";
  const now = new Date();
  if (!force && bakuWeekday(now) !== "Sun") return;
  const hour = parseInt(bakuParts(now).hour, 10);
  if (!force && hour < 12) return;

  const todayKey = bakuDateStr(now);
  let state = { lastSent: null };
  if (existsSync(REPORT_STATE_FILE)) {
    try { state = JSON.parse(await readFile(REPORT_STATE_FILE, "utf8")); } catch {}
  }
  if (!force && state.lastSent === todayKey) return;

  console.log("\n📊 Həftəlik hesabat hazırlanır...");
  const log = await loadLog();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const signals = log.trades.filter((t) => t.allPass && new Date(t.timestamp).getTime() >= weekAgo);

  let wins = 0, losses = 0, open = 0, totalPnl = 0;
  const closedPnls = [];
  let best = null, worst = null;
  const lines = [];
  for (const s of signals) {
    const r = await evaluateSignalOutcome(s);
    if (!r) continue;
    const label = s.symbol === "PAXGUSDT" ? "GOLD" : s.symbol.replace("USDT", "");
    if (r.outcome === "open") {
      open++;
      lines.push(`⏳ ${label} ${s.side}: hələ açıq (${r.pnlPct >= 0 ? "+" : ""}${r.pnlPct.toFixed(2)}%)`);
    } else {
      totalPnl += r.pnlPct;
      if (r.pnlPct > 0) wins++; else losses++;
      closedPnls.push(r.pnlPct);
      if (!best || r.pnlPct > best.pnl) best = { label, side: s.side, pnl: r.pnlPct };
      if (!worst || r.pnlPct < worst.pnl) worst = { label, side: s.side, pnl: r.pnlPct };
      lines.push(`${r.pnlPct > 0 ? "✅" : "❌"} ${label} ${s.side}: ${r.pnlPct >= 0 ? "+" : ""}${r.pnlPct.toFixed(2)}%`);
    }
  }

  // Virtual balans həftəlik statistikası
  const paper = await loadPaperState();
  const weekTrades = (paper.history || []).filter((h) => new Date(h.closedAt).getTime() >= weekAgo);
  const paperWins = weekTrades.filter((h) => h.pnlUsd > 0).length;
  const paperPnl = weekTrades.reduce((s, h) => s + h.pnlUsd, 0);
  const equity = paper.balance + (paper.positions || []).reduce((s, p) => s + p.quantity * p.entryPrice, 0);

  const closed = wins + losses;
  const weekStart = bakuDateStr(new Date(weekAgo));
  let msg =
    `📊 <b>HƏFTƏLİK HESABAT</b> (${weekStart} → ${todayKey})\n\n` +
    `🚨 Verilən siqnal: <b>${signals.length}</b>\n`;
  if (closed > 0) {
    msg +=
      `✅ Uğurlu: <b>${wins}</b> | ❌ Uğursuz: <b>${losses}</b>` + (open ? ` | ⏳ Açıq: ${open}` : "") + `\n` +
      `🎯 Win rate: <b>${((100 * wins) / closed).toFixed(0)}%</b>\n` +
      `📈 Cəm nəticə (bərabər ölçü ilə): <b>${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%</b>\n` +
      `${expectancyLine(closedPnls, "%")}
`;
    if (best) msg += `🥇 Ən yaxşı: ${best.label} ${best.side} ${best.pnl >= 0 ? "+" : ""}${best.pnl.toFixed(2)}%\n`;
    if (worst && worst.pnl < 0) msg += `💔 Ən pis: ${worst.label} ${worst.side} ${worst.pnl.toFixed(2)}%\n`;
    msg += `\n${lines.join("\n")}\n`;
  } else if (signals.length > 0) {
    msg += `⏳ Hamısı hələ açıqdır\n\n${lines.join("\n")}\n`;
  } else {
    msg += `Bu həftə şərtləri ödəyən siqnal olmadı — bazar giriş üçün əlverişsiz idi (bu, sistemin düzgün işlədiyini göstərir: şərtsiz giriş yoxdur).\n`;
  }
  msg +=
    `\n💰 <b>Virtual balans:</b>\n` +
    `Bu həftə bağlanan: ${weekTrades.length}` + (weekTrades.length ? ` (${paperWins}✅ / ${weekTrades.length - paperWins}❌, ${paperPnl >= 0 ? "+" : ""}$${paperPnl.toFixed(2)})` : "") + `\n` +
    `Ümumi kapital: <b>$${equity.toFixed(2)}</b> (başlanğıc $${paper.startingBalance.toFixed(2)})`;

  await sendTelegram(msg);

  // Uzunmüddətli rejim hesabatı — Binance al-tut mövqeləri üçün ayrıca mesaj
  const regimeLines = [];
  for (const symbol of CONFIG.symbols) {
    try {
      const r = await analyzeLongTermRegime(symbol);
      if (r) regimeLines.push(formatRegimeLine(r));
    } catch {}
  }
  if (regimeLines.length) {
    await sendTelegram(
      `📅 <b>UZUNMÜDDƏTLİ REJİM</b> (Binance al-tut mövqeləri üçün)\n\n` +
      regimeLines.join("\n") +
      `\n<b>Qayda:</b> 🟢 SAXLA = 3 göstəricidən ən azı 2-si müsbət · 🟡 EHTİYATLI OL = 1 müsbət · 🔴 SAT = heç biri müsbət deyil\n` +
      `Backtest (634 gün, 5 aktiv): bu qayda hər aktivdə "al-tut"dan yaxşı nəticə verib və maksimum düşüşü xeyli azaldıb.`,
    );
  }
  await writeFile(REPORT_STATE_FILE, JSON.stringify({ lastSent: todayKey }, null, 2));
  console.log("📊 Həftəlik hesabat Telegram-a göndərildi.");
}

// ─── S&P 500 Günlük Siqnalı (SP500=1 olduqda aktivdir) ───────────────────────
//
// Connors mean-reversion strategiyası ƏSLİNDƏ S&P 500 üçün yaradılıb — onun ana
// tədqiqat sahəsidir (SPY-da tarixi win rate 75-80%). Qaydalar (yalnız LONG —
// indeksdə short tərəf tarixən zəifdir):
//   REJİM:  bağlanış > SMA(200) → bull, yalnız o zaman giriş axtarılır
//   GİRİŞ:  günlük RSI(3) < 15 (bağlanmış gün) → AL
//   ÇIXIŞ:  RSI(3) > 65 (Connors çıxışı) | stop 2.5×ATR | hədəf 5×ATR
// Hər ticarət günü NY açılışından (09:30 ET) sonra bir dəfə brifinq göndərilir —
// siqnal olmasa belə vəziyyət bildirilir. Mövqe MƏSLƏHƏT xarakterlidir (virtual
// balansa daxil deyil), nəticələri sp500-state.json-da izlənir.

const SPX_STATE_FILE = path.join(DATA_DIR, "sp500-state.json");
const US100_STATE_FILE = path.join(DATA_DIR, "us100-state.json");
const OIL_STATE_FILE = path.join(DATA_DIR, "oil-state.json");

function nyParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    weekday: get("weekday"),
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
  };
}

// Yahoo Finance v8 (pulsuz, açarsız). Bugünkü YARIMÇIQ günü atırıq —
// qərarlar yalnız bağlanmış günlərlə verilir (kriptoda olduğu kimi).
async function fetchYahooDaily(ticker) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2y`,
    { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } },
  );
  if (!res.ok) throw new Error(`Yahoo Finance xətası: ${res.status}`);
  const j = await res.json();
  const r = j.chart && j.chart.result && j.chart.result[0];
  if (!r || !r.timestamp) throw new Error("Yahoo Finance: gözlənilməz cavab strukturu");
  const q = r.indicators.quote[0];
  const todayNY = nyParts().date;
  const out = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    if (q.close[i] == null || q.high[i] == null || q.low[i] == null) continue;
    const dateNY = nyParts(new Date(r.timestamp[i] * 1000)).date;
    if (dateNY === todayNY) continue; // sessiya davam edir — yarımçıq gün
    out.push({
      time: r.timestamp[i] * 1000, date: dateNY,
      open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i],
      volume: q.volume[i] || 0,
    });
  }
  return out;
}

// DXY (ABŞ dollar indeksi) — qızıl siqnalına MƏLUMAT XARAKTERLİ kontekst (bloklamır).
// Video-təlimindən öyrənilən ideya: DXY qızılla tarixən əks-korrelyasiyadadır. 5 illik
// robustluq testi APARILMAYIB — ona görə hələ bloklayıcı deyil, yalnız göstərilir.
let dxyCache = { at: 0, value: null };
async function fetchDxyContext() {
  if (Date.now() - dxyCache.at < 3_600_000) return dxyCache.value; // 1 saat keş — gündəlik data tez-tez dəyişmir
  const candles = await fetchYahooDaily("DX-Y.NYB");
  if (candles.length < 6) return null;
  const last = candles[candles.length - 1];
  const prev5 = candles[candles.length - 6];
  const value = { close: last.close, change5d: ((last.close - prev5.close) / prev5.close) * 100 };
  dxyCache = { at: Date.now(), value };
  return value;
}

// ─── Qızıl Günlük Donchian Breakout (GOLD=1 olduqda aktivdir) ────────────────
//
// 4H EMA9/20+ADX trend-following RƏDD EDİLDİ — 5.5 illik PAXGUSDT testində
// bütün ADX həddləri (18-28) mənfi çıxdı, zaman-yarısı qeyri-sabit idi.
// Əvəzinə 25 illik COMEX qızıl fyuçersi (GC=F) üzərində bir neçə strategiya
// sərt robustluq testindən (tam dövr + zaman-yarısı + parametr qonşuları)
// keçirildi:
//   - Connors günlük mean-reversion: sabit, +46..+70% — AMMA 25 ildə 101
//     əməliyyatın 101-i də BUY (0 SHORT) — sadəcə qızılın bilinən yüksəliş
//     trendini əks etdirir, simmetrik edge deyil.
//   - Donchian(20) kanal breakout + ATR trailing stop: BUY tərəfi +195%
//     (151 əməliyyat, 55% win, hər iki yarıda sabit: +117%/+82%), AMMA SHORT
//     tərəfi -70% (122 əməliyyat, 32% win) — SHORT xərcsiz belə zərərlidir.
// NƏTİCƏ: yalnız BUY tərəfi həm ən yüksək, həm ən sabit nəticəni verir.
// Ona görə bu strategiya BİLƏRƏKDƏN YALNIZ LONG-DUR (short axtarılmır).
//
// Qayda: son 20 gün daxilində olmayan yeni GÜNLÜK bağlanış zirvəsi (Donchian
// kanalı yuxarı qırılması) → AL. Sabit TP yoxdur — mövqe ATR-əsaslı TRAILING
// stop ilə "qazananı uzun saxla" məntiqi ilə idarə olunur (trend davam etdikcə
// stop yuxarı çəkilir, heç vaxt aşağı enmir).

const GOLD_STATE_FILE = path.join(DATA_DIR, "gold-state.json");
const GOLD_DONCHIAN_PERIOD = 20;
const GOLD_ATR_MULT = 2.0;

async function sendGoldDailyBriefIfDue() {
  if (process.env.GOLD !== "1" || !process.env.TELEGRAM_BOT_TOKEN) return;
  const force = process.env.FORCE_GOLD === "1";
  const ny = nyParts();
  if (!force) {
    if (ny.weekday === "Sat" || ny.weekday === "Sun") return;
    if (ny.hour < 9 || (ny.hour === 9 && ny.minute < 30)) return;
  }

  let state = { lastBrief: null, position: null, history: [] };
  if (existsSync(GOLD_STATE_FILE)) {
    try { state = JSON.parse(await readFile(GOLD_STATE_FILE, "utf8")); } catch {}
  }
  if (!force && state.lastBrief === ny.date) return;

  console.log("\n🥇 Qızıl (GC=F) günlük yoxlaması...");
  const candles = await fetchYahooDaily("GC=F");
  if (candles.length < GOLD_DONCHIAN_PERIOD + 20) { console.log("⚠️  Qızıl: kifayət qədər data yoxdur."); return; }
  const last = candles[candles.length - 1];
  const atr = calcATR(candles, 14);

  const fmtN = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  let msg =
    `🥇 <b>QIZIL GÜNLÜK — Donchian Breakout</b> (${last.date} bağlanışı ilə)\n\n` +
    `Bağlanış: <b>$${fmtN(last.close)}</b>\n\n`;

  if (state.position) {
    const p = state.position;
    if (last.low <= p.trailStop) {
      const exitPrice = p.trailStop;
      const pnlPct = ((exitPrice - p.entry) / p.entry) * 100;
      state.history.push({ ...p, exitPrice, exitDate: last.date, pnlPct });
      state.position = null;
      msg += `${pnlPct >= 0 ? "✅" : "🔴"} <b>ÇIXIŞ TÖVSİYƏSİ</b> — trailing stop işlədi\n` +
        `Giriş $${fmtN(p.entry)} (${p.entryDate}) → çıxış $${fmtN(exitPrice)} | <b>${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</b>\n` +
        `XM-də XAUUSD mövqeyin varsa bağlamağı düşün.\n`;
    } else {
      if (atr) {
        const newTrail = last.close - GOLD_ATR_MULT * atr;
        if (newTrail > p.trailStop) p.trailStop = newTrail; // trailing: yalnız yuxarı çəkilir
      }
      const pnlPct = ((last.close - p.entry) / p.entry) * 100;
      msg += `⏳ Açıq tövsiyə: BUY @ $${fmtN(p.entry)} (${p.entryDate}) — hazırkı ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%\n` +
        `🛑 Trailing stop: $${fmtN(p.trailStop)} (qiymət yüksəldikcə stop da yüksəlir, heç vaxt enmir)\n`;
    }
  }

  if (!state.position && atr) {
    const priorCandles = candles.slice(-(GOLD_DONCHIAN_PERIOD + 1), -1);
    const donchianHigh = Math.max(...priorCandles.map((c) => c.high));
    if (last.close > donchianHigh) {
      const trailStop = last.close - GOLD_ATR_MULT * atr;
      state.position = { entry: last.close, entryDate: last.date, trailStop };
      const xmAccount = parseFloat(process.env.XM_ACCOUNT_USD || "500");
      const xmRiskPct = parseFloat(process.env.XM_RISK_PCT || "1.5");
      const riskUsd = xmAccount * (xmRiskPct / 100);
      const sizing = computeXmUnits(riskUsd, last.close, last.close - trailStop, xmAccount);
      const units = sizing ? sizing.units : 0;
      msg += `🚨 <b>BUY SİQNALI</b> — ${GOLD_DONCHIAN_PERIOD} günlük kanal yuxarı qırıldı ($${fmtN(donchianHigh)})\n` +
        `Giriş: ~$${fmtN(last.close)} | 🛑 Trailing stop: $${fmtN(trailStop)} (ATR×${GOLD_ATR_MULT})\n` +
        `Sabit TP yoxdur — trend davam etdikcə stop yuxarı çəkiləcək, qazananı uzun saxla məntiqi.\n` +
        `📐 XM: <b>XAUUSD</b>\n` +
        `⚠️ <b>Sifariş biletinə DƏQİQ bu ölçünü yaz:</b> 👉 <b>${units.toFixed(4)}</b> (SL itkisi ~$${riskUsd.toFixed(0)}) — standart "1 Lot" ilə buraxma!\n` +
        (sizing && sizing.capped ? `⚠️ <b>Ölçü təhlükəsizlik tavanına endirildi</b> — ATR qeyri-adi kiçik çıxdı, xam düstur ${sizing.rawUnits.toFixed(4)} verirdi.\n` : "") +
        `\n☑️ <i>Girməzdən əvvəl yoxla: Stop-loss QOYDUN? Ölçü DƏQİQ yazılıb?</i>\n`;
      const review = await reviewSignalWithClaude({
        siqnal: {
          symbol: "GOLD", side: "BUY", qiymet: last.close,
          strategiya: "Donchian(20) günlük kanal breakout + ATR trailing stop (yalnız long)",
          tp: null, sl: trailStop, riskReward: null, sistemKeyfiyyetBali: null,
        },
        indikatorlar: { donchianHigh, atr },
        son30BaglanmisGun: candles.slice(-30).map((c) => ({ t: c.date, o: c.open, h: c.high, l: c.low, c: c.close })),
      });
      if (review) {
        const rIcon = review.qerar === "RAZIYAM" ? "🟢" : review.qerar === "RAZI DEYİLƏM" ? "🔴" : "🟡";
        msg += `\n🧠 <b>Claude rəyi</b>: ${rIcon} ${review.qerar} — ${review.reyting}/100\n<i>${review.sebeb}</i>\n`;
      }
    } else {
      msg += `⚪ Siqnal yoxdur — ${GOLD_DONCHIAN_PERIOD} günlük zirvə ($${fmtN(donchianHigh)}) qırılmayıb.\n`;
    }
  }

  if (state.history.length) {
    const wins = state.history.filter((h) => h.pnlPct > 0).length;
    const tot = state.history.reduce((s, h) => s + h.pnlPct, 0);
    msg += `\n📊 İndiyədək: ${state.history.length} əməliyyat, ${wins}✅/${state.history.length - wins}❌, cəm ${tot >= 0 ? "+" : ""}${tot.toFixed(2)}%`;
    msg += `
${expectancyLine(state.history.map((h) => h.pnlPct), "%")}`;
  }

  const sent = await sendTelegram(msg);
  if (!sent) {
    console.log("⚠️  Qızıl brifinqi göndərilə bilmədi — növbəti dövrədə təkrar cəhd olunacaq.");
    return;
  }
  state.lastBrief = ny.date;
  await writeFile(GOLD_STATE_FILE, JSON.stringify(state, null, 2));
  console.log("🥇 Qızıl brifinqi göndərildi.");
}

// Ümumi Connors günlük mean-reversion brifinqi — S&P 500 üçün qurulub, sonra
// 10 illik testdən keçən Nasdaq 100 (US100) üçün də eyni funksiya istifadə olunur
// (60 siqnal/10 il, 75% win rate, +0.92%/siqnal — S&P 500-ə çox yaxın profil).
//
// DİQQƏT: Neft (Brent/WTI) üzərində EYNİ qayda test edildi və RƏDD EDİLDİ — win
// rate yüksək görünsə də (60-80%) orta PnL sıfıra yaxın/mənfi çıxdı (nadir amma
// böyük itkilər, məs. tək əməliyyatda -10.8%/-12.8%). Neft əmtəədir, qızıl kimi
// tarixən trend-yönümlüdür — mean-reversion ona uyğun deyil, ona görə əlavə
// edilməyib. Neft üçün qızıldakı kimi trend-following testi gələcək iş olaraq qalır.
async function sendDailyEquityBriefIfDue(cfg) {
  const { envFlag, forceEnvFlag, label, emoji, yahooTicker, stateFile, xmSymbol, claudeAssetName } = cfg;
  if (process.env[envFlag] !== "1" || !process.env.TELEGRAM_BOT_TOKEN) return;
  const force = process.env[forceEnvFlag] === "1";
  const ny = nyParts();
  if (!force) {
    if (ny.weekday === "Sat" || ny.weekday === "Sun") return;
    if (ny.hour < 9 || (ny.hour === 9 && ny.minute < 30)) return; // bazar hələ açılmayıb
  }

  let state = { lastBrief: null, position: null, history: [] };
  if (existsSync(stateFile)) {
    try { state = JSON.parse(await readFile(stateFile, "utf8")); } catch {}
  }
  if (!force && state.lastBrief === ny.date) return; // bu gün artıq göndərilib

  console.log(`\n${emoji} ${label} günlük yoxlaması...`);
  const candles = await fetchYahooDaily(yahooTicker);
  if (candles.length < 210) { console.log(`⚠️  ${label}: kifayət qədər data yoxdur.`); return; }
  const closes = candles.map((c) => c.close);
  const last = candles[candles.length - 1];
  const sma200 = smaAt(closes, 200);
  const rsi3 = calcRSI(closes, 3);
  const atr = calcATR(candles, 14);
  const bull = last.close > sma200;
  const smaDist = ((last.close - sma200) / sma200) * 100;

  const fmtN = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  // Diqqət: Telegram HTML rejimində "&" simvolu "&amp;" kimi yazılmalıdır — yoxsa HTTP 400
  let msg =
    `${emoji} <b>${label} GÜNLÜK</b> (${last.date} bağlanışı ilə)\n\n` +
    `Bağlanış: <b>${fmtN(last.close)}</b> | SMA200: ${fmtN(sma200)} (${smaDist >= 0 ? "+" : ""}${smaDist.toFixed(1)}%)\n` +
    `Rejim: ${bull ? "🟢 BULL (SMA200 üstündə)" : "🔴 BEAR (SMA200 altında)"} | RSI(3): <b>${rsi3.toFixed(1)}</b>\n\n`;

  // 1. Açıq məsləhət mövqeyi varsa — dünənki bağlanmış günlə çıxışı yoxla
  if (state.position) {
    const p = state.position;
    let exitPrice = null, exitTag = null;
    if (last.low <= p.stop) { exitPrice = p.stop; exitTag = "stop"; }        // konservativ: SL birinci
    else if (last.high >= p.tp) { exitPrice = p.tp; exitTag = "tp"; }
    else if (rsi3 >= 65) { exitPrice = last.close; exitTag = "rsi"; }
    if (exitPrice !== null) {
      const pnlPct = ((exitPrice - p.entry) / p.entry) * 100;
      state.history.push({ ...p, exitPrice, exitDate: last.date, exitTag, pnlPct });
      state.position = null;
      const tagText = exitTag === "stop" ? "stop-loss işlədi" : exitTag === "tp" ? "hədəfə çatdı" : "RSI(3) &gt; 65 — Connors çıxışı";
      msg += `${pnlPct >= 0 ? "✅" : "🔴"} <b>ÇIXIŞ TÖVSİYƏSİ</b> — ${tagText}\n` +
        `Giriş ${fmtN(p.entry)} (${p.entryDate}) → çıxış ${fmtN(exitPrice)} | <b>${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</b>\n` +
        `XM-də ${xmSymbol} mövqeyin varsa bağlamağı düşün.\n`;
    } else {
      const pnlPct = ((last.close - p.entry) / p.entry) * 100;
      msg += `⏳ Açıq tövsiyə: AL @ ${fmtN(p.entry)} (${p.entryDate}) — hazırkı ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%\n` +
        `SL ${fmtN(p.stop)} | TP ${fmtN(p.tp)} | RSI(3) &gt; 65 olanda çıxış siqnalı gələcək.\n`;
    }
  }

  // 2. Mövqe yoxdursa — giriş şərtini yoxla
  if (!state.position && bull && rsi3 < 15) {
    const stop = last.close - 2.5 * atr;
    const tp = last.close + 5 * atr;
    state.position = { entry: last.close, entryDate: last.date, stop, tp };
    const xmAccount = parseFloat(process.env.XM_ACCOUNT_USD || "500");
    const xmRiskPct = parseFloat(process.env.XM_RISK_PCT || "1.5");
    const riskUsd = xmAccount * (xmRiskPct / 100);
    const sizing = computeXmUnits(riskUsd, last.close, last.close - stop, xmAccount);
    const units = sizing ? sizing.units : 0;
    msg += `🚨 <b>AL SİQNALI</b> — bull rejimdə RSI(3) ${rsi3.toFixed(1)} (&lt; 15 oversold)\n` +
      `Giriş: ~${fmtN(last.close)} | 🛑 SL: ${fmtN(stop)} | 🎯 TP: ${fmtN(tp)}\n` +
      `📐 XM: <b>${xmSymbol}</b>\n` +
      `⚠️ <b>Sifariş biletinə DƏQİQ bu ölçünü yaz:</b> 👉 <b>${units.toFixed(4)}</b> (SL itkisi ~$${riskUsd.toFixed(0)}) — standart "1 Lot" ilə buraxma!\n` +
      (sizing && sizing.capped ? `⚠️ <b>Ölçü təhlükəsizlik tavanına endirildi</b> — SL məsafəsi qeyri-adi dar çıxdı, xam düstur ${sizing.rawUnits.toFixed(4)} verirdi.\n` : "") +
      `\n☑️ <i>Girməzdən əvvəl yoxla: Stop-loss QOYDUN? Ölçü DƏQİQ yazılıb?</i>\n`;
    // Claude ikinci rəyi — yalnız AL siqnalında (gündəlik brifinqdə yox)
    const review = await reviewSignalWithClaude({
      siqnal: {
        symbol: claudeAssetName, side: "BUY", qiymet: last.close,
        strategiya: "Connors günlük mean-reversion (RSI3 < 15, bull rejim)",
        tp, sl: stop, riskReward: 2.0, sistemKeyfiyyetBali: null,
      },
      indikatorlar: { rsi3SonBaglanmis: rsi3, sma200, sma200denFerqFaiz: smaDist, atr },
      son30BaglanmisGun: candles.slice(-30).map((c) => ({
        t: c.date, o: c.open, h: c.high, l: c.low, c: c.close,
      })),
    });
    if (review) {
      const rIcon = review.qerar === "RAZIYAM" ? "🟢" : review.qerar === "RAZI DEYİLƏM" ? "🔴" : "🟡";
      msg += `\n🧠 <b>Claude rəyi</b>: ${rIcon} ${review.qerar} — ${review.reyting}/100\n<i>${review.sebeb}</i>\n`;
    }
  } else if (!state.position) {
    msg += bull
      ? `⚪ Siqnal yoxdur — giriş üçün RSI(3) &lt; 15 lazımdır (pullback gözlənilir).\n`
      : `⚪ Siqnal yoxdur — bazar SMA200 altındadır, bu strategiya bear rejimdə giriş etmir.\n`;
  }

  // Ümumi statistika (tarixçə yığıldıqca)
  if (state.history.length) {
    const wins = state.history.filter((h) => h.pnlPct > 0).length;
    const tot = state.history.reduce((s, h) => s + h.pnlPct, 0);
    msg += `\n📊 İndiyədək: ${state.history.length} əməliyyat, ${wins}✅/${state.history.length - wins}❌, cəm ${tot >= 0 ? "+" : ""}${tot.toFixed(2)}%`;
    msg += `
${expectancyLine(state.history.map((h) => h.pnlPct), "%")}`;
  }

  const sent = await sendTelegram(msg);
  if (!sent) {
    // Göndəriş alınmadı — state yazılmır ki, növbəti dövrədə (30 dəq sonra) yenidən cəhd olunsun
    console.log(`⚠️  ${label} brifinqi göndərilə bilmədi — növbəti dövrədə təkrar cəhd olunacaq.`);
    return;
  }
  state.lastBrief = ny.date;
  await writeFile(stateFile, JSON.stringify(state, null, 2));
  console.log(`${emoji} ${label} brifinqi göndərildi.`);
}

async function sendSp500DailyBriefIfDue() {
  return sendDailyEquityBriefIfDue({
    envFlag: "SP500", forceEnvFlag: "FORCE_SP500", label: "S&amp;P 500", emoji: "📈",
    yahooTicker: "%5EGSPC", stateFile: SPX_STATE_FILE, xmSymbol: "US500Cash", claudeAssetName: "S&P500",
  });
}

async function sendUs100DailyBriefIfDue() {
  return sendDailyEquityBriefIfDue({
    envFlag: "US100", forceEnvFlag: "FORCE_US100", label: "US100 (Nasdaq 100)", emoji: "💻",
    yahooTicker: "%5ENDX", stateFile: US100_STATE_FILE, xmSymbol: "US100Cash", claudeAssetName: "US100",
  });
}

// ─── Neft (Brent) Günlük Trend-Following Siqnalı (OIL=1 olduqda aktivdir) ────
//
// ⚠️ EKSPERİMENTAL — S&P 500/US100-dən fərqli olaraq bu strategiya VALİDASİYA
// EDİLMƏYİB. Qızılın canlı məntiqi ilə eyni qaydalar (EMA200 rejim + EMA9/20
// kəsişməsi bağlanmış şamda + ADX(14)≥22 + təsdiq şamı) GÜNLÜK taymfreymdə
// tətbiq olunur (neft üçün pulsuz 4H mənbəyi yoxdur — Yahoo Finance yalnız
// günlük verir). 10 illik backtest (Brent BZ=F, WTI CL=F) nəticəsi:
//   - ADX həddi dəyişəndə nəticə İŞARƏ DƏYİŞDİRİR: Brent-də ADX≥20-də +1.39%/
//     əməliyyat, ADX≥25-də -2.78%/əməliyyat — qonşu parametrlər arasında bu
//     qədər fərq real edge-dən çox təsadüfi uyğunluğa (overfitting) işarədir.
//   - Nümunə sayı kiçikdir (12-23 siqnal/10 il) — statistik əhəmiyyəti azdır.
//   - HƏR İKİ neft növündə tarixdə TƏK əməliyyatda -18.8% itki müşahidə
//     olundu (2026 aprel) — ATR×2.5 stop bu sıçrayışı (gap) tutmadı.
// İstifadəçinin açıq qərarı ilə YENƏ DƏ əlavə edilib — stop-loss ölçüsünü
// (məbləğini) özü təyin edəcək. Telegram mesajında status açıq bildirilir və
// ADX həddi (22) bu backtest-dən seçilməyib — qızılın öz həddidir (lookahead
// qarşısı: eyni datadan seçib eyni datada "yaxşı görünən" ədədi istifadə etmək
// nəticəni şişirdərdi).

async function sendOilDailyBriefIfDue() {
  if (process.env.OIL !== "1" || !process.env.TELEGRAM_BOT_TOKEN) return;
  const force = process.env.FORCE_OIL === "1";
  const ny = nyParts();
  if (!force) {
    if (ny.weekday === "Sat" || ny.weekday === "Sun") return;
    if (ny.hour < 9 || (ny.hour === 9 && ny.minute < 30)) return;
  }

  let state = { lastBrief: null, position: null, history: [] };
  if (existsSync(OIL_STATE_FILE)) {
    try { state = JSON.parse(await readFile(OIL_STATE_FILE, "utf8")); } catch {}
  }
  if (!force && state.lastBrief === ny.date) return;

  console.log("\n🛢️  Neft (Brent) günlük yoxlaması...");
  const candles = await fetchYahooDaily("BZ=F");
  if (candles.length < 205) { console.log("⚠️  Neft: kifayət qədər data yoxdur."); return; }
  const closes = candles.map((c) => c.close);
  const last = candles[candles.length - 1];
  const ema200 = calcEMA(closes, 200);
  const ema9 = calcEMA(closes, 9);
  const ema20 = calcEMA(closes, 20);
  const prevCloses = closes.slice(0, -1);
  const prevEma9 = calcEMA(prevCloses, 9);
  const prevEma20 = calcEMA(prevCloses, 20);
  const adx = calcADX(candles);
  const atr = calcATR(candles, 14);
  const bull = last.close > ema200;
  const side = bull ? "BUY" : "SHORT";

  const fmtN = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  let msg =
    `🛢️ <b>NEFT (BRENT) GÜNLÜK</b> — ⚠️ EKSPERİMENTAL, validasiya edilməyib\n\n` +
    `Bağlanış: <b>$${fmtN(last.close)}</b> | EMA200: $${fmtN(ema200)}\n` +
    `Rejim: ${bull ? "🟢 YÜKSƏLİŞ" : "🔴 DÜŞÜŞ"} | ADX(14): <b>${adx !== null ? adx.toFixed(1) : "N/A"}</b>\n\n`;

  // 1. Açıq mövqe yoxlaması
  if (state.position) {
    const p = state.position;
    let exitPrice = null, exitTag = null;
    if (p.side === "BUY") {
      if (last.low <= p.stop) { exitPrice = p.stop; exitTag = "stop"; }
      else if (last.high >= p.tp) { exitPrice = p.tp; exitTag = "tp"; }
    } else {
      if (last.high >= p.stop) { exitPrice = p.stop; exitTag = "stop"; }
      else if (last.low <= p.tp) { exitPrice = p.tp; exitTag = "tp"; }
    }
    if (exitPrice !== null) {
      const pnlPct = (p.side === "BUY" ? (exitPrice - p.entry) / p.entry : (p.entry - exitPrice) / p.entry) * 100;
      state.history.push({ ...p, exitPrice, exitDate: last.date, exitTag, pnlPct });
      state.position = null;
      msg += `${pnlPct >= 0 ? "✅" : "🔴"} <b>ÇIXIŞ TÖVSİYƏSİ</b> — ${exitTag === "stop" ? "stop-loss işlədi" : "hədəfə çatdı"}\n` +
        `Giriş ${p.side} ${fmtN(p.entry)} (${p.entryDate}) → çıxış ${fmtN(exitPrice)} | <b>${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</b>\n` +
        `XM-də BrentCash mövqeyin varsa bağlamağı düşün.\n`;
    } else {
      const pnlPct = (p.side === "BUY" ? (last.close - p.entry) / p.entry : (p.entry - last.close) / p.entry) * 100;
      msg += `⏳ Açıq tövsiyə: ${p.side} @ ${fmtN(p.entry)} (${p.entryDate}) — hazırkı ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%\n` +
        `SL ${fmtN(p.stop)} | TP ${fmtN(p.tp)}\n`;
    }
  }

  // 2. Yeni giriş şərti (mövqe yoxdursa)
  if (!state.position && ema9 !== null && ema20 !== null && prevEma9 !== null && prevEma20 !== null && adx !== null && atr) {
    const crossedUp = ema9 > ema20 && prevEma9 <= prevEma20;
    const crossedDown = ema9 < ema20 && prevEma9 >= prevEma20;
    const crossed = side === "BUY" ? crossedUp : crossedDown;
    const candleOk = side === "BUY" ? last.close > last.open : last.close < last.open;
    if (crossed && adx >= CONFIG.adxThreshold && candleOk) {
      const stop = side === "BUY" ? last.close - CONFIG.atrMultiplier * atr : last.close + CONFIG.atrMultiplier * atr;
      const tp = side === "BUY" ? last.close + CONFIG.trendTakeProfitAtrMult * atr : last.close - CONFIG.trendTakeProfitAtrMult * atr;
      state.position = { side, entry: last.close, entryDate: last.date, stop, tp };
      const xmAccount = parseFloat(process.env.XM_ACCOUNT_USD || "500");
      const xmRiskPct = parseFloat(process.env.XM_RISK_PCT || "1.5");
      const riskUsd = xmAccount * (xmRiskPct / 100);
      const oilSizing = computeXmUnits(riskUsd, last.close, Math.abs(last.close - stop), xmAccount);
      const units = oilSizing ? oilSizing.units : 0;
      msg += `🚨 <b>${side} SİQNALI</b> — EMA9/20 kəsişməsi, ADX ${adx.toFixed(1)}\n` +
        `Giriş: ~$${fmtN(last.close)} | 🛑 SL: $${fmtN(stop)} | 🎯 TP: $${fmtN(tp)}\n` +
        `📐 XM: <b>BrentCash</b>\n` +
        `⚠️ <b>Sifariş biletinə DƏQİQ bu ölçünü yaz:</b> 👉 <b>${units.toFixed(2)}</b> (SL itkisi ~$${riskUsd.toFixed(0)}) — standart "1 Lot" ilə buraxma!\n` +
        (oilSizing && oilSizing.capped ? `⚠️ <b>Ölçü təhlükəsizlik tavanına endirildi</b> — SL məsafəsi qeyri-adi dar çıxdı, xam düstur ${oilSizing.rawUnits.toFixed(2)} verirdi.\n` : "") +
        `\n⚠️ <b>Bu strategiya validasiya edilməyib.</b> 10 illik testdə nəticə ADX həddinə görə +1.4%-dən -2.8%-ə sıçrayırdı (qonşu parametrlər sabit deyil) və tarixdə tək əməliyyatda -18.8% itki olub (stop bu hərəkəti tutmadı — neftin sıçrayış riski adi ATR stopunu aşa bilər). Öz risk ölçünü diqqətlə özün təyin et.\n` +
        `\n☑️ <i>Girməzdən əvvəl yoxla: Stop-loss QOYDUN? Ölçü DƏQİQ yazılıb?</i>\n`;
      const review = await reviewSignalWithClaude({
        siqnal: {
          symbol: "OIL(Brent)", side, qiymet: last.close,
          strategiya: "EKSPERİMENTAL trend-following (EMA9/20 cross + ADX, validasiya edilməyib)",
          tp, sl: stop, riskReward: CONFIG.trendTakeProfitAtrMult / CONFIG.atrMultiplier, sistemKeyfiyyetBali: null,
        },
        indikatorlar: { ema200, adx, atr },
        son30BaglanmisGun: candles.slice(-30).map((c) => ({
          t: c.date, o: c.open, h: c.high, l: c.low, c: c.close,
        })),
      });
      if (review) {
        const rIcon = review.qerar === "RAZIYAM" ? "🟢" : review.qerar === "RAZI DEYİLƏM" ? "🔴" : "🟡";
        msg += `\n🧠 <b>Claude rəyi</b>: ${rIcon} ${review.qerar} — ${review.reyting}/100\n<i>${review.sebeb}</i>\n`;
      }
    } else {
      msg += `⚪ Siqnal yoxdur — kəsişmə/ADX/təsdiq şərtləri hələ ödənmir.\n`;
    }
  }

  if (state.history.length) {
    const wins = state.history.filter((h) => h.pnlPct > 0).length;
    const tot = state.history.reduce((s, h) => s + h.pnlPct, 0);
    msg += `\n📊 İndiyədək: ${state.history.length} əməliyyat, ${wins}✅/${state.history.length - wins}❌, cəm ${tot >= 0 ? "+" : ""}${tot.toFixed(2)}%`;
    msg += `
${expectancyLine(state.history.map((h) => h.pnlPct), "%")}`;
  }

  const sent = await sendTelegram(msg);
  if (!sent) {
    console.log("⚠️  Neft brifinqi göndərilə bilmədi — növbəti dövrədə təkrar cəhd olunacaq.");
    return;
  }
  state.lastBrief = ny.date;
  await writeFile(OIL_STATE_FILE, JSON.stringify(state, null, 2));
  console.log("🛢️  Neft brifinqi göndərildi.");
}

// ─── Xəbər Analizi (NEWS=1 olduqda aktivdir) ─────────────────────────────────
//
// Pulsuz RSS lentləri (Fed, CNBC, MarketWatch, CoinDesk, Investing) hər dövrədə
// oxunur; YENİ + bazara aid xəbərlər Claude-a verilir, o da hər aktiv üzrə təsir
// meyli qaytarır: -2 (güclü SAT) ... +2 (güclü AL). Nəzərəçarpan təsir varsa
// Telegram-a "xəbər siqnalı" gedir. DÜRÜST QEYD: 30 dəq cron + analiz gecikməsi
// səbəbiylə sürətli qiymət reaksiyası ARTIQ baş vermiş ola bilər — bu qat anlıq
// scalping üçün deyil, gələn günlərin meyli və kontekst üçündür. Bütün analizlər
// news-state.json-da saxlanılır ki, proqnoz dəqiqliyi sonradan ölçülə bilsin.
//
// Xərc nəzarəti: relevantlıq filtri (açar sözlər) + gündə maksimum 8 analiz +
// ucuz model (NEWS_MODEL, default claude-sonnet-5 — Fable siqnal rəyləri üçündür).

const NEWS_STATE_FILE = path.join(DATA_DIR, "news-state.json");

const NEWS_FEEDS = [
  { name: "Fed",          url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { name: "CNBC Markets", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
  { name: "MarketWatch",  url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { name: "CoinDesk",     url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Investing",    url: "https://www.investing.com/rss/news.rss" },
];

// Bazara təsir edə biləcək mövzular — qalan başlıqlar Claude-a göndərilmir (xərc)
const NEWS_RELEVANCE =
  /fed|fomc|powell|warsh|rate|inflation|cpi|ppi|payroll|jobs report|unemployment|tariff|trump|musk|white house|bitcoin|btc|ethereum|crypto|etf|sec |treasury|yield|recession|gdp|stimulus|war |strike|sanction|iran|china|opec|oil price|gold|dollar|dxy|bank of|ecb|liquidat/i;

function parseRssItems(xml, source) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    const pick = (tag) => {
      const m = b.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
      return m ? m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x?\w+;/g, "'").trim() : null;
    };
    const title = pick("title");
    const rawLink = pick("link") || pick("guid");
    const pub = pick("pubDate");
    if (!title) continue;
    items.push({
      source,
      title,
      id: (rawLink || title).slice(0, 200),
      // Yalnız həqiqi URL-lər Telegram-da link kimi göstərilir (guid bəzən URL deyil)
      link: rawLink && /^https?:\/\//.test(rawLink) ? rawLink : null,
      pubMs: pub ? Date.parse(pub) || 0 : 0,
    });
  }
  return items;
}

// recentContext: son bir neçə analizin xülasəsi (state.analyses-dən) — Claude-un
// "bu xəbər TAM YENİDİR, yoxsa artıq bildirdiyimiz şeyin təkrar təsdiqidir" sualına
// cavab verə bilməsi üçün. Axia Futures videosundan (2026-08-03 analiz) öyrənilən
// dərs: eyni xəbərin İLK dəfə görünməsi bazarda daha güclü, davamlı hərəkət yaradır;
// artıq gözlənilən şeyin sadəcə TƏSDİQİ isə kəskin amma qısa reaksiya yaradır və
// çox vaxt artıq qiymətə yazılıb (siqnal dəyəri aşağıdır). Bu ayrım "vacib" qərarına
// təsir edir ki, eyni inkişaf edən xəbərə (məs. FED faiz müzakirəsi) hər addımda
// eyni gücdə bildiriş getməsin.
async function analyzeNewsWithClaude(items, recentContext) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = process.env.NEWS_MODEL || "claude-sonnet-5";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        system:
          "Sən makro-iqtisadiyyat və kripto bazar analitikisən. Sənə İNDİCƏ dərc olunmuş xəbər " +
          "başlıqları verilir (VACIB) və son bir neçə saatda/gündə ARTIQ BİLDİRDİYİMİZ xəbərlərin " +
          "qısa siyahısı (KONTEKST). Onların YAXINGƏLƏCƏK (bir neçə gün) bazar təsirini qiymətləndir. " +
          "4 aktiv üzrə təsir balı ver: -2 güclü SAT, -1 zəif SAT, 0 neytral, +1 zəif AL, +2 güclü AL. " +
          "Yalnız GERÇƏKDƏN əhəmiyyətli xəbərlərdə sıfırdan fərqli bal ver — adi gündəlik xəbərlər 0-dır. " +
          "VACİB AYRIM: əgər bu başlıq KONTEKST-dəki bir xəbərin sadəcə TƏKRARI/TƏSDİQİDİR (eyni inkişaf " +
          "edən hekayənin növbəti addımı, yeni məzmun yoxdur), təsir balını AŞAĞI SAL və ya 0 saxla — " +
          "bazar bunu artıq gözləyirdi, siqnal dəyəri azdır. Yalnız HƏQİQƏTƏN YENİ məlumat (əvvəllər " +
          "bilinməyən) və ya gözlənilənin ƏKSİNƏ çıxan inkişaf üçün güclü bal ver. " +
          'Cavab YALNIZ bu JSON: {"vacib": true/false, "esasXeber": "ən təsirli başlığın qısa Azərbaycanca xülasəsi", ' +
          '"esasIndex": <ən təsirli başlığın i nömrəsi>, "digerIndexler": [təsirə töhfə verən digər başlıqların i nömrələri, maks 2], ' +
          '"yeniMelumatdirmi": true/false, ' +
          '"tesir": {"GOLD": n, "BTC": n, "ETH": n, "SP500": n}, "sebeb": "Azərbaycanca 1-2 cümlə"}. ' +
          '"vacib" yalnız hər hansı aktivdə |bal| >= 1 olduqda true olsun.',
        messages: [{
          role: "user",
          content: JSON.stringify({
            kontekst_son_bildirisler: recentContext || [],
            vacib_basliqlar: items.map((it, i) => ({ i, menbe: it.source, basliq: it.title })),
          }),
        }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const text = (data.content || []).map((b) => b.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    // Model bəzən "+1" yazır — JSON işarəli müsbət rəqəmi qəbul etmir
    const r = JSON.parse(m[0].replace(/:\s*\+(\d)/g, ": $1"));
    if (typeof r.vacib !== "boolean" || !r.tesir) return null;
    return r;
  } catch (err) {
    console.log(`⚠️  Xəbər analizi alına bilmədi: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── İqtisadi təqvim (FMP, pulsuz tier) — yüksək-təsirli xəbərlərdən əvvəl xəbərdarlıq ──
const ECON_STATE_FILE = path.join(DATA_DIR, "econ-calendar-state.json");
const ECON_ALERT_MINUTES_BEFORE = 35;
const ECON_COUNTRIES = new Set(["US"]);

async function fetchEconomicCalendarFmp(fromDate, toDate) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${fromDate}&to=${toDate}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`⚠️  FMP təqvim xətası: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.log(`⚠️  FMP təqvim gözlənilməyən cavab: ${JSON.stringify(data).slice(0, 200)}`);
      return null;
    }
    return data;
  } catch (err) {
    console.log(`⚠️  FMP təqvim şəbəkə xətası: ${err.message}`);
    return null;
  }
}

async function checkEconomicCalendarAlerts() {
  if (process.env.ECON_CALENDAR !== "1" || !process.env.TELEGRAM_BOT_TOKEN || !process.env.FMP_API_KEY) return;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  let state = { fetchedDate: null, events: [], alerted: [] };
  if (existsSync(ECON_STATE_FILE)) {
    try { state = JSON.parse(await readFile(ECON_STATE_FILE, "utf8")); } catch {}
  }

  if (state.fetchedDate !== today) {
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
    const raw = await fetchEconomicCalendarFmp(today, tomorrow);
    if (raw) {
      state.events = raw.filter(
        (e) => ECON_COUNTRIES.has(e.country) && String(e.impact).toLowerCase() === "high"
      );
      state.fetchedDate = today;
      state.alerted = [];
      console.log(`📅 İqtisadi təqvim yükləndi: ${state.events.length} yüksək-təsirli hadisə (${today}).`);
    } else {
      console.log("⚠️  İqtisadi təqvim yüklənə bilmədi, növbəti dövrədə yenidən cəhd olunacaq.");
    }
  }

  let changed = false;
  for (const e of state.events || []) {
    const eventId = `${e.event}_${e.date}`;
    if (state.alerted.includes(eventId)) continue;
    const eventTime = new Date(e.date);
    const minutesUntil = (eventTime - now) / 60000;
    if (minutesUntil > 0 && minutesUntil <= ECON_ALERT_MINUTES_BEFORE) {
      const text =
        `⏰ <b>YÜKSƏK-TƏSİRLİ XƏBƏR ~${Math.round(minutesUntil)} DƏQİQƏ SONRA</b>\n\n` +
        `📊 ${e.event} (${e.country})\n` +
        `Gözlənti: ${e.estimate ?? "?"} | Əvvəlki: ${e.previous ?? "?"}\n\n` +
        `⚠️ Bu, qızıl/dollar/indekslərdə kəskin hərəkət yarada bilər — açıq mövqelərinə diqqət et.`;
      const sent = await sendTelegram(text);
      if (sent) {
        state.alerted.push(eventId);
        changed = true;
        console.log(`📅 Xəbərdarlıq göndərildi: ${e.event}`);
      }
    }
  }

  if (changed || state.fetchedDate === today) {
    await writeFile(ECON_STATE_FILE, JSON.stringify(state, null, 2));
  }
}

async function checkNewsAndNotify() {
  if (process.env.NEWS !== "1" || !process.env.TELEGRAM_BOT_TOKEN || !process.env.ANTHROPIC_API_KEY) return;
  const force = process.env.FORCE_NEWS === "1";

  let state = { seen: [], day: null, analysesToday: 0, analyses: [] };
  if (existsSync(NEWS_STATE_FILE)) {
    try { state = JSON.parse(await readFile(NEWS_STATE_FILE, "utf8")); } catch {}
  }
  const today = bakuDateStr();
  if (state.day !== today) { state.day = today; state.analysesToday = 0; }

  // Bütün lentləri çək (biri yıxılsa qalanları işləsin)
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (f) => {
      const r = await fetch(f.url, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) });
      if (!r.ok) throw new Error(`${f.name}: HTTP ${r.status}`);
      return parseRssItems(await r.text(), f.name);
    }),
  );
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (all.length === 0) { console.log("⚠️  Heç bir xəbər lenti oxuna bilmədi."); return; }

  const seenSet = new Set(state.seen);

  // İlk işə düşmə: hazırkı xəbərlərin hamısını "görülmüş" say, analiz etmə —
  // yoxsa köhnə xəbər seli ilk dövrədə yalançı siqnal yaradar
  if (state.seen.length === 0 && !force) {
    state.seen = all.map((i) => i.id).slice(0, 600);
    await writeFile(NEWS_STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`📰 Xəbər izləməsi başladıldı — ${all.length} mövcud başlıq qeydə alındı, analiz növbəti dövrədən.`);
    return;
  }

  const maxAgeMs = 3 * 3600 * 1000; // yalnız təzə xəbərlər (3 saatdan yeni və ya tarixi bilinməyən)
  let fresh = all.filter(
    (i) => !seenSet.has(i.id) && (i.pubMs === 0 || Date.now() - i.pubMs < maxAgeMs),
  );
  const relevant = fresh.filter((i) => NEWS_RELEVANCE.test(i.title));

  // Görülmüşlər siyahısını yenilə (təzələr + mövcudlar, 600 ilə məhdud)
  state.seen = [...new Set([...fresh.map((i) => i.id), ...state.seen])].slice(0, 600);

  const toAnalyze = force ? all.filter((i) => NEWS_RELEVANCE.test(i.title)).slice(0, 25) : relevant.slice(0, 25);
  console.log(`📰 Xəbər: ${all.length} başlıq, yeni: ${fresh.length}, bazara aid: ${toAnalyze.length}`);

  if (toAnalyze.length === 0) { await writeFile(NEWS_STATE_FILE, JSON.stringify(state, null, 2)); return; }
  if (!force && state.analysesToday >= 8) {
    console.log("📰 Günlük analiz limiti (8) dolub — xərc nəzarəti, sabah davam.");
    await writeFile(NEWS_STATE_FILE, JSON.stringify(state, null, 2));
    return;
  }

  state.analysesToday++;
  // Son bildirişlərin qısa xülasəsi — "bu YENİDİR, yoxsa təkrardır" ayrımı üçün
  const recentContext = (state.analyses || [])
    .filter((a) => Date.now() - new Date(a.at).getTime() < 24 * 3600 * 1000)
    .slice(0, 8)
    .map((a) => ({ vaxt: a.at, xeber: a.esas }));
  const verdict = await analyzeNewsWithClaude(toAnalyze, recentContext);

  if (verdict) {
    // Ölçmə üçün hər analiz saxlanılır (son 200)
    state.analyses = [{ at: new Date().toISOString(), tesir: verdict.tesir, esas: verdict.esasXeber }, ...(state.analyses || [])].slice(0, 200);
  }

  const anyImpact = verdict && Object.values(verdict.tesir).some((v) => Math.abs(v) >= 1);
  if (verdict && verdict.vacib && anyImpact) {
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const icon = (v) => (v >= 2 ? "🟢🟢 GÜCLÜ AL" : v === 1 ? "🟢 AL meyli" : v <= -2 ? "🔴🔴 GÜCLÜ SAT" : v === -1 ? "🔴 SAT meyli" : "⚪ neytral");
    const lines = ["GOLD", "BTC", "ETH", "SP500"]
      .map((a) => `${a}: ${icon(verdict.tesir[a] ?? 0)}`)
      .join("\n");

    // Mənbə linkləri — Claude yalnız başlıq NÖMRƏSİNİ qaytarır, URL bizim öz
    // datamızdan gəlir (modelə URL yazdırmaq uydurma link riskidir)
    const linkFor = (idx) => {
      const it = Number.isInteger(idx) ? toAnalyze[idx] : null;
      return it && it.link ? `📎 <a href="${esc(it.link)}">${esc(it.source)}: ${esc(it.title.slice(0, 90))}</a>` : null;
    };
    const sourceLinks = [
      linkFor(verdict.esasIndex),
      ...(Array.isArray(verdict.digerIndexler) ? verdict.digerIndexler.slice(0, 2).map(linkFor) : []),
    ].filter(Boolean);

    // Model bəzən xülasə sahəsini buraxır — o halda seçdiyi xəbərin öz başlığı göstərilir
    const mainItem = Number.isInteger(verdict.esasIndex) ? toAnalyze[verdict.esasIndex] : null;
    const headline = verdict.esasXeber || (mainItem ? mainItem.title : "Yeni bazar xəbərləri");

    const freshnessTag = verdict.yeniMelumatdirmi === false
      ? `🔁 <i>Artıq gözlənilən xəbərin təsdiqi — bazar bunu qismən qiymətə yazmış ola bilər.</i>\n`
      : verdict.yeniMelumatdirmi === true
        ? `🆕 <i>Tam yeni məlumat — bazarın tam reaksiyası hələ formalaşmayıb.</i>\n`
        : "";

    await sendTelegram(
      `📰 <b>XƏBƏR SİQNALI</b> (məsləhət)\n\n` +
      `"${esc(headline)}"\n\n` +
      freshnessTag +
      `${lines}\n\n` +
      (verdict.sebeb ? `Səbəb: ${esc(verdict.sebeb)}\n` : "") +
      (sourceLinks.length ? `\n${sourceLinks.join("\n")}\n` : "") +
      `\n⚠️ Qiymət bu xəbərə qismən reaksiya vermiş ola bilər — girişdən əvvəl qrafikdə təsdiq axtar. Bu, yaxın günlərin meylidir, anlıq scalping siqnalı deyil.`,
    );
    console.log(`📰 Xəbər siqnalı göndərildi: ${headline}`);
  } else if (verdict) {
    console.log(`📰 Yeni xəbərlər analiz olundu — nəzərəçarpan bazar təsiri yoxdur.`);
  }

  await writeFile(NEWS_STATE_FILE, JSON.stringify(state, null, 2));
}

async function run() {
  checkOnboarding();
  await initCsv();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Claude Ticarət Siqnalı Məsləhətçisi");
  console.log(`  ${bakuDateTimeStr()} (Bakı vaxtı)`);
  console.log(`  Rejim: 📋 YALNIZ SİQNAL — heç bir sifariş avtomatik verilmir`);
  console.log("═══════════════════════════════════════════════════════════");

  console.log(`\nCoinlər: ${CONFIG.symbols.join(", ")} | Taymfreym: ${CONFIG.timeframe}`);

  // Konfiqurasiya sağlamlıq yoxlaması — səssiz səhv konfiqurasiya real pulda bahalıdır
  const cfgWarnings = [];
  for (const s of CONFIG.trendSymbols) {
    if (!CONFIG.symbols.includes(s)) cfgWarnings.push(`TREND_SYMBOLS-dakı ${s} SYMBOLS siyahısında yoxdur — analiz olunmur`);
  }
  for (const s of CONFIG.focusSymbols) {
    if (!CONFIG.symbols.includes(s)) cfgWarnings.push(`FOCUS_SYMBOLS-dakı ${s} SYMBOLS siyahısında yoxdur — bildiriş gəlməyəcək`);
  }
  if (CONFIG.rsiEntryLong >= CONFIG.rsiExitLong) cfgWarnings.push(`RSI giriş (${CONFIG.rsiEntryLong}) çıxışdan (${CONFIG.rsiExitLong}) aşağı olmalıdır — mövqe dərhal bağlanacaq`);
  if (CONFIG.breakevenTrigger >= CONFIG.atrMultiplier) cfgWarnings.push(`Breakeven tetikləyicisi (${CONFIG.breakevenTrigger}) stop məsafəsindən (${CONFIG.atrMultiplier}) böyükdür — heç vaxt işləməyəcək`);
  if (CONFIG.paperPositionFraction * CONFIG.paperMaxPositions > 1.0) cfgWarnings.push(`Mövqe payı × maks mövqe = ${(CONFIG.paperPositionFraction * CONFIG.paperMaxPositions).toFixed(2)} > 1.0 — son mövqelər kiçilir`);
  if (cfgWarnings.length) {
    console.log(`\n⚠️  KONFİQURASİYA XƏBƏRDARLIQLARI:`);
    cfgWarnings.forEach((w) => console.log(`   • ${w}`));
  }

  const log = await loadLog();
  const positions = await loadPositions();

  // BTC trendini əvvəlcədən hesabla — digər coinlər üçün məlumat göstəricisi (bloklamır)
  let btcBias = null;
  try {
    const btcCandles = await fetchCandles("BTCUSDT", CONFIG.timeframe, 500);
    const btcCloses = btcCandles.map((c) => c.close);
    const btcPrice = btcCloses[btcCloses.length - 1];
    const btcEma200 = btcCloses.length >= CONFIG.trendEmaPeriod ? calcEMA(btcCloses, CONFIG.trendEmaPeriod) : null;
    if (btcEma200 !== null) {
      // ±0.5% zolaq: EMA200-ə çox yaxındırsa NEUTRAL sayılır
      const diff = ((btcPrice - btcEma200) / btcEma200) * 100;
      btcBias = diff > 0.5 ? "BULLISH" : diff < -0.5 ? "BEARISH" : "NEUTRAL";
      console.log(`\n── BTC Trend Göstəricisi ─────────────────────────────────\n`);
      console.log(`  BTC bias: ${btcBias} (qiymət $${fmtPrice(btcPrice)}, EMA(200) $${fmtPrice(btcEma200)}, fərq ${diff.toFixed(2)}%)`);
    }
  } catch (err) {
    console.log(`\n⚠️  BTC trend göstəricisi üçün data alına bilmədi: ${err.message}`);
  }

  for (const symbol of CONFIG.symbols) {
    const canSignal = checkTradeLimits(log);

    let logEntry;
    try {
      logEntry = await analyzeSymbol(symbol, log, positions, canSignal, btcBias);
    } catch (err) {
      console.log(`\n⚠️  ${symbol} üçün analiz alına bilmədi (müvəqqəti xəta): ${err.message}`);
      console.log(`   Digər coinlərin analizi davam edir.`);
      continue;
    }
    if (!logEntry) continue;

    log.trades.push(logEntry);
    await saveLog(log);
    await writeTradeCsv(logEntry);
  }

  await savePositions(positions);

  // Sahibsiz mövqe qorunması: coin SYMBOLS siyahısından çıxarılıbsa, onun açıq virtual
  // mövqeyi heç vaxt yoxlanılmır və əbədi açıq qalır (kapital bloklanır, çıxış işləmir).
  // Belə mövqelər cari bazar qiyməti ilə bağlanır.
  try {
    const st = await loadPaperState();
    const orphans = st.positions.filter((p) => !CONFIG.symbols.includes(p.symbol));
    for (const pos of orphans) {
      let lastPrice = pos.currentPrice || pos.entryPrice;
      try {
        const c = await fetchCandles(pos.symbol, CONFIG.timeframe, 2);
        lastPrice = c[c.length - 1].close;
      } catch {}
      const pnlPct = pos.side === "SHORT"
        ? ((pos.entryPrice - lastPrice) / pos.entryPrice) * 100
        : ((lastPrice - pos.entryPrice) / pos.entryPrice) * 100;
      const invested = pos.quantity * pos.entryPrice;
      const pnlUsd = invested * (pnlPct / 100);
      st.balance += invested + pnlUsd;
      st.history.push({
        symbol: pos.symbol, side: pos.side, entryPrice: pos.entryPrice, exitPrice: lastPrice,
        quantity: pos.quantity, pnlPct, pnlUsd, openedAt: pos.openedAt,
        closedAt: new Date().toISOString(),
        exitReason: `${pos.symbol} izlənilən coinlər siyahısından çıxarılıb — mövqe cari qiymətlə bağlandı.`,
      });
      console.log(`⚠️  Sahibsiz mövqe bağlandı: ${pos.symbol} ${pos.side} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)`);
      await sendTelegram(
        `⚠️ <b>SAHİBSİZ MÖVQE BAĞLANDI — ${pos.symbol}</b>\n` +
        `Bu coin izlənilən siyahıdan çıxarılıb, mövqe cari qiymətlə bağlandı.\n` +
        `${pos.side}: $${fmtPrice(pos.entryPrice)} → $${fmtPrice(lastPrice)} | ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% (${pnlUsd >= 0 ? "+" : ""}$${pnlUsd.toFixed(2)})`,
      );
    }
    if (orphans.length) {
      st.positions = st.positions.filter((p) => CONFIG.symbols.includes(p.symbol));
      await savePaperState(st);
    }
  } catch (err) {
    console.log(`⚠️  Sahibsiz mövqe yoxlaması xətası: ${err.message}`);
  }

  const paperState = await loadPaperState();
  console.log(`\n── Virtual Balans Xülasəsi ───────────────────────────────\n`);
  const equity = paperState.balance + paperState.positions.reduce((s, p) => s + p.quantity * p.entryPrice, 0);
  if (paperState.positions.length > 0) {
    const posList = paperState.positions.map((p) => `${p.symbol} ${p.side} ($${fmtPrice(p.entryPrice)})`).join(", ");
    console.log(`💰 Kapital: $${equity.toFixed(2)} (sərbəst $${paperState.balance.toFixed(2)}) — açıq: ${posList}`);
  } else {
    console.log(`💰 Kapital: $${equity.toFixed(2)} (başlanğıc $${paperState.startingBalance.toFixed(2)}) — açıq virtual mövqe yoxdur, növbəti siqnalı gözləyir.`);
  }

  console.log(`\nQərar qeydi saxlanıldı → ${LOG_FILE}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Uzunmüddətli rejim dəyişikliyi varsa dərhal bildir (xətası dövrəni dayandırmasın)
  try {
    await checkRegimeChanges();
  } catch (err) {
    console.log(`⚠️  Rejim yoxlaması xətası: ${err.message}`);
  }

  // Bazar günüdürsə həftəlik hesabatı göndər
  try {
    await sendWeeklyReportIfDue();
  } catch (err) {
    console.log(`⚠️  Həftəlik hesabat xətası: ${err.message}`);
  }

  // S&P 500 və US100 günlük brifinqi (NY açılışından sonra bir dəfə)
  try {
    await sendSp500DailyBriefIfDue();
  } catch (err) {
    console.log(`⚠️  S&P 500 yoxlaması xətası: ${err.message}`);
  }
  try {
    await sendUs100DailyBriefIfDue();
  } catch (err) {
    console.log(`⚠️  US100 yoxlaması xətası: ${err.message}`);
  }
  try {
    await sendOilDailyBriefIfDue();
  } catch (err) {
    console.log(`⚠️  Neft yoxlaması xətası: ${err.message}`);
  }
  try {
    await sendGoldDailyBriefIfDue();
  } catch (err) {
    console.log(`⚠️  Qızıl yoxlaması xətası: ${err.message}`);
  }

  // Xəbər lentləri + Claude təsir analizi
  try {
    await checkNewsAndNotify();
  } catch (err) {
    console.log(`⚠️  Xəbər analizi xətası: ${err.message}`);
  }

  // İqtisadi təqvim (FMP) — yüksək-təsirli xəbərlərdən əvvəl xəbərdarlıq
  try {
    await checkEconomicCalendarAlerts();
  } catch (err) {
    console.log(`⚠️  İqtisadi təqvim xətası: ${err.message}`);
  }

  // ICT modeli (təcrübi) — ICT_SIGNALS=1 olmasa heç nə etmir
  try {
    await checkIctSignals();
  } catch (err) {
    console.log(`⚠️  ICT siqnal xətası: ${err.message}`);
  }
}


// ─── ICT SİQNALLARI (təcrübi) ────────────────────────────────────────────────
//
// 45 videoluq bootcamp-dan çıxarılmış ICT modeli — ict-engine.mjs.
// ⚠️ Botun digər strategiyalarından FƏRQLİ olaraq bu, gəlirlilik baxımından
// ÖLÇÜLMƏYİB. Ona görə: ayrıca modul, "TƏCRÜBİ" damğası, avtomatik icra YOX,
// mövcud strategiyalara TOXUNMUR. ICT_SIGNALS=1 olmasa ümumiyyətlə işləmir.
// Anthropic API tələb etmir.

// Çox alət = çox siqnal, KEYFİYYƏT itirmədən. Müəllimin öz üsulu budur
// (D42 @00:07:38 — 8 paritəni yan-yana izləyir). Filtri boşaltmaqdan fərqli
// olaraq bu, setup keyfiyyətini aşağı salmır.
const ICT_ASSETS = [
  { t: "NQ=F",    label: "NASDAQ (US100)", kind: "index"  },
  { t: "ES=F",    label: "SP500",          kind: "index"  },
  { t: "YM=F",    label: "DOW",            kind: "index"  },
  { t: "GC=F",    label: "QIZIL",          kind: "gold"   },
  { t: "CL=F",    label: "NEFT (WTI)",     kind: "gold"   },
  { t: "SI=F",    label: "GÜMÜŞ",          kind: "gold"   },
  { t: "BTC-USD", label: "BITCOIN",        kind: "crypto" },
  { t: "ETH-USD", label: "ETHEREUM",       kind: "crypto" },
  { t: "EURUSD=X", label: "EURUSD",        kind: "forex"  },
  { t: "GBPUSD=X", label: "GBPUSD",        kind: "forex"  },
];

async function fetchYahoo5m(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=60d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${ticker}: HTTP ${res.status}`);
  const r = (await res.json())?.chart?.result?.[0];
  if (!r) throw new Error(`${ticker}: boş cavab`);
  const t = r.timestamp || [], q = r.indicators.quote[0], out = [];
  for (let i = 0; i < t.length; i++) {
    if ([q.open[i], q.high[i], q.low[i], q.close[i]].some((x) => x == null)) continue;
    out.push({ t: t[i] * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] });
  }
  return out;
}

async function checkIctSignals() {
  if (process.env.ICT_SIGNALS !== "1") return;
  const { findIctSetup, formatIctSignal, formatIctForming, fetchDxy, dxyContext } =
    await import("./ict-engine.mjs");

  // DXY — yalnız qızıl/gümüş üçün kontekst (ölçüldü: proqnoz vermir, filtr DEYİL)
  let dxyBars = null;
  try { dxyBars = await fetchDxy(); } catch { /* kritik deyil */ }

  // data/ qovluğu — signals.yml onu `git add -f data` ilə state branch-ına yazır,
  // yəni işlər arasında qalır (əks halda hər 15 dəqiqədə eyni siqnal təkrarlanardı).
  const STATE = "data/ict-state.json";
  try { await fs.mkdir("data", { recursive: true }); } catch {}
  let seen = {};
  try { seen = JSON.parse(await fs.readFile(STATE, "utf-8")); } catch { seen = {}; }

  // Yalnız SON şamlarda yaranan setup bildirilir — köhnə tarixi siqnallar yox.
  const FRESH_BARS = parseInt(process.env.ICT_FRESH_BARS || "3", 10);

  for (const a of ICT_ASSETS) {
    try {
      const bars = await fetchYahoo5m(a.t);
      const { signal, live, diag } = findIctSetup(bars, { kind: a.kind });
      console.log(
        `  ICT ${a.label}: sweep ${diag.sweeps} → HTF ${diag.htfOk} → MSS ${diag.mss} → ` +
        `FVG ${diag.fvg} → doldu ${diag.filled}` +
        (live ? ` | ⏳ CANLI mərhələ ${live.stage}` : "") +
        (signal ? ` | son setup ${signal.barsAgo} şam əvvəl` : " | tam setup yoxdur"),
      );
      const price = bars[bars.length - 1].c;

      // 1) Tam siqnal — setup tamamlanıb
      if (signal && signal.barsAgo <= FRESH_BARS && seen[a.t] !== signal.time) {
        let msg = formatIctSignal(signal, a.label, price);
        // Qızıl/gümüşdə DXY konteksti əlavə olunur (bloklamır, məlumat verir)
        if (a.kind === "gold" && dxyBars) {
          const ctx = dxyContext(dxyBars, bars, signal.dir);
          if (ctx) msg += `

${ctx.line}`;
        }
        await sendTelegram(msg);
        seen[a.t] = signal.time;
        await fs.writeFile(STATE, JSON.stringify(seen, null, 2));
        console.log(`  📤 ICT SİQNALI göndərildi: ${a.label}`);
        continue;
      }

      // 2) Formalaşan setup — istifadəçinin əsas tələbi: tez-tez analiz.
      // Sweep olub, MSS/giriş gözlənilir. Bu, ƏMR deyil, diqqət xəbərdarlığıdır.
      // Hər mərhələ üçün bir dəfə göndərilir (spam olmasın).
      if (process.env.ICT_FORMING !== "0" && live) {
        const key = `${a.t}:forming:${live.stage}:${live.dir}:${live.sweptName}`;
        if (seen[key] !== bars[bars.length - 1].t && !seen[key]) {
          await sendTelegram(formatIctForming(live, a.label, price));
          seen[key] = bars[bars.length - 1].t;
          // köhnə "forming" açarlarını təmizlə (fayl şişməsin)
          const keys = Object.keys(seen).filter((k) => k.includes(":forming:"));
          if (keys.length > 40) for (const k of keys.slice(0, 20)) delete seen[k];
          await fs.writeFile(STATE, JSON.stringify(seen, null, 2));
          console.log(`  ⏳ ICT setup formalaşır: ${a.label} (mərhələ ${live.stage})`);
        }
      }
    } catch (err) {
      console.log(`  ⚠️  ICT ${a.label}: ${err.message}`);
    }
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

export { run, CONFIG, sendWeeklyReportIfDue, analyzeLongTermRegime, sendSp500DailyBriefIfDue, sendUs100DailyBriefIfDue, sendOilDailyBriefIfDue, sendGoldDailyBriefIfDue, checkNewsAndNotify, checkPriceLevelAlerts, checkEconomicCalendarAlerts, checkIctSignals };

if (isMain) {
  if (process.argv.includes("--tax-summary")) {
    generateTaxSummary();
  } else {
    run().catch((err) => {
      console.error("Bot xətası:", err);
      process.exit(1);
    });
  }
}
