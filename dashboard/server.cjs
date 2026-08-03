// Claude Execute — Terminal dashboard
// Zero-dependency local web server. Serves the dashboard UI and the bot's data files.
//
//   node dashboard/server.cjs
//   open http://localhost:3737

const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3737;
const DATA_DIR = process.env.DATA_DIR || ROOT;

// Minimal .env loader — no dependency on dotenv
(() => {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // strip optional trailing comment (only if separated by whitespace)
    const hashIdx = val.search(/\s+#/);
    if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
})();

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
};

const serveFile = (res, filePath, contentType) => {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 500, err.message);
    send(res, 200, data, { "Content-Type": contentType });
  });
};

const sendJson = (res, status, obj) =>
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

let regimeCache = { at: 0, data: null };

const POSITIONS_FILE = () => path.join(DATA_DIR, "positions.json");

function loadPositions() {
  const p = POSITIONS_FILE();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function savePositions(positions) {
  fs.writeFileSync(POSITIONS_FILE(), JSON.stringify(positions, null, 2));
}

const PAPER_FILE = () => path.join(DATA_DIR, "paper-trading.json");

function loadPaperState() {
  const p = PAPER_FILE();
  const startingBalance = Number(process.env.PAPER_TRADING_BALANCE_USD) || 100;
  if (!fs.existsSync(p)) {
    return { startingBalance, balance: startingBalance, positions: [], history: [] };
  }
  const state = JSON.parse(fs.readFileSync(p, "utf8"));
  // Köhnə tək-mövqeli format dəstəyi (balans köhnə semantikada tam qalırdı — qoyuluş çıxılır)
  if (!Array.isArray(state.positions)) {
    state.positions = state.position ? [state.position] : [];
    for (const pos of state.positions) {
      state.balance -= pos.quantity * pos.entryPrice;
    }
    delete state.position;
  }
  return state;
}

// Ümumi kapital = sərbəst balans + açıq mövqelərə qoyulmuş məbləğ
function paperEquity(state) {
  return state.balance + (state.positions || []).reduce((s, p) => s + p.quantity * p.entryPrice, 0);
}

// ─── Giriş qoruması (Basic Auth) ─────────────────────────────────────────────
// DASHBOARD_USER/DASHBOARD_PASSWORD təyin olunmayıbsa (yerli inkişaf), giriş açıqdır.
function checkAuth(req) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!user || !pass) return true;
  const header = req.headers["authorization"] || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  let decoded;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) return false;
  return decoded.slice(0, idx) === user && decoded.slice(idx + 1) === pass;
}

const server = http.createServer(async (req, res) => {
  if (!checkAuth(req)) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Kripto Siqnal Dashboard"' });
    return res.end("Giriş tələb olunur");
  }

  const url = req.url.split("?")[0];

  if (url === "/" || url === "/index.html") {
    return serveFile(res, path.join(__dirname, "index.html"), "text/html; charset=utf-8");
  }

  if (url === "/architecture" || url === "/architecture.html") {
    return serveFile(res, path.join(__dirname, "architecture.html"), "text/html; charset=utf-8");
  }

  if (url === "/api/log") {
    const p = path.join(DATA_DIR, "safety-check-log.json");
    if (!fs.existsSync(p)) {
      return send(res, 200, '{"trades":[]}', { "Content-Type": "application/json; charset=utf-8" });
    }
    return serveFile(res, p, "application/json; charset=utf-8");
  }

  if (url === "/api/csv") {
    const p = path.join(DATA_DIR, "trades.csv");
    if (!fs.existsSync(p)) return send(res, 200, "", { "Content-Type": "text/plain; charset=utf-8" });
    return serveFile(res, p, "text/plain; charset=utf-8");
  }

  if (url === "/api/rules") {
    const p = path.join(ROOT, "rules.json");
    if (!fs.existsSync(p)) return send(res, 200, "{}", { "Content-Type": "application/json; charset=utf-8" });
    return serveFile(res, p, "application/json; charset=utf-8");
  }

  if (url === "/api/env") {
    // Surface only safe-to-display config (no secrets)
    const env = {
      symbols: (process.env.SYMBOLS || "BTCUSDT,ETHUSDT,SOLUSDT")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
      timeframe: process.env.TIMEFRAME || "4H",
      portfolio: Number(process.env.PORTFOLIO_VALUE_USD) || null,
      maxTradeUSD: Number(process.env.MAX_TRADE_SIZE_USD) || null,
      maxTradesPerDay: Number(process.env.MAX_TRADES_PER_DAY) || null,
    };
    return send(res, 200, JSON.stringify(env), { "Content-Type": "application/json; charset=utf-8" });
  }

  if (url === "/api/positions" && req.method === "GET") {
    return sendJson(res, 200, loadPositions());
  }

  if (url === "/api/positions/open" && req.method === "POST") {
    try {
      const payload = JSON.parse(await readBody(req));
      const { symbol, side, entryPrice, tradeSize, atr } = payload;
      if (!symbol || !side || !entryPrice) {
        return sendJson(res, 400, { error: "symbol, side və entryPrice tələb olunur" });
      }
      const positions = loadPositions();
      const position = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        symbol,
        side,
        entryPrice: Number(entryPrice),
        tradeSize: Number(tradeSize) || 0,
        atr: Number(atr) || null,
        openedAt: new Date().toISOString(),
        status: "open",
        currentPrice: Number(entryPrice),
        exitRecommended: false,
        exitReason: null,
      };
      positions.push(position);
      savePositions(positions);
      return sendJson(res, 200, position);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (url === "/api/positions/close" && req.method === "POST") {
    try {
      const payload = JSON.parse(await readBody(req));
      const positions = loadPositions();
      const pos = positions.find((p) => p.id === payload.id);
      if (!pos) return sendJson(res, 404, { error: "Mövqə tapılmadı" });
      pos.status = "closed";
      pos.closedAt = new Date().toISOString();
      pos.closeNote = payload.note || "Manual bağlanıb";
      if (payload.exitPrice) {
        const exitPrice = Number(payload.exitPrice);
        pos.exitPrice = exitPrice;
        pos.pnlPct = pos.side === "SHORT"
          ? ((pos.entryPrice - exitPrice) / pos.entryPrice) * 100
          : ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100;
        pos.pnlUsd = (pos.tradeSize || 0) * (pos.pnlPct / 100);
      }
      savePositions(positions);
      return sendJson(res, 200, pos);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (url === "/api/paper-trading" && req.method === "GET") {
    return sendJson(res, 200, loadPaperState());
  }

  // Uzunmüddətli rejim (Binance al-tut mövqeləri üçün) — 30 dəqiqə keşlənir,
  // çünki günlük şamlara əsaslanır və tez-tez dəyişmir
  if (url === "/api/regime" && req.method === "GET") {
    const CACHE_MS = 30 * 60_000;
    if (regimeCache.data && Date.now() - regimeCache.at < CACHE_MS) {
      return sendJson(res, 200, regimeCache.data);
    }
    try {
      const botModule = await import(pathToFileURL(path.join(ROOT, "bot.js")).href);
      const symbols = botModule.CONFIG.symbols;
      const out = [];
      for (const s of symbols) {
        try {
          const r = await botModule.analyzeLongTermRegime(s);
          if (r) out.push(r);
        } catch {}
      }
      regimeCache = { at: Date.now(), data: out };
      return sendJson(res, 200, out);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Virtual balansı sıfırla (təzə başlanğıc) — Basic Auth arxasındadır
  if (url === "/api/paper-trading/reset" && req.method === "POST") {
    const startingBalance = Number(process.env.PAPER_TRADING_BALANCE_USD) || 100;
    const fresh = { startingBalance, balance: startingBalance, positions: [], history: [] };
    fs.writeFileSync(PAPER_FILE(), JSON.stringify(fresh, null, 2));
    return sendJson(res, 200, fresh);
  }

  if (url === "/api/stats" && req.method === "GET") {
    const paper = loadPaperState();
    const paperClosed = paper.history || [];
    const paperWins = paperClosed.filter((h) => h.pnlUsd > 0).length;
    const equity = paperEquity(paper);
    const paperReturn = equity - paper.startingBalance;

    const manualClosed = loadPositions().filter((p) => p.status === "closed" && typeof p.pnlUsd === "number");
    const manualWins = manualClosed.filter((p) => p.pnlUsd > 0).length;

    const stats = {
      paperTrading: {
        startingBalance: paper.startingBalance,
        balance: equity,
        freeBalance: paper.balance,
        totalReturnUsd: paperReturn,
        totalReturnPct: (paperReturn / paper.startingBalance) * 100,
        totalTrades: paperClosed.length,
        wins: paperWins,
        losses: paperClosed.length - paperWins,
        winRatePct: paperClosed.length ? (paperWins / paperClosed.length) * 100 : null,
        avgProfitPct: paperClosed.length
          ? paperClosed.reduce((s, h) => s + (h.pnlPct || 0), 0) / paperClosed.length
          : null,
      },
      manual: {
        totalTrades: manualClosed.length,
        wins: manualWins,
        losses: manualClosed.length - manualWins,
        winRatePct: manualClosed.length ? (manualWins / manualClosed.length) * 100 : null,
        avgProfitPct: manualClosed.length
          ? manualClosed.reduce((s, p) => s + (p.pnlPct || 0), 0) / manualClosed.length
          : null,
      },
    };
    return sendJson(res, 200, stats);
  }

  send(res, 404, "Not found");
});

// ─── Daxili planlayıcı — botu sabit fasilə ilə avtomatik işə salır ───────────
// Qeyd: bu, yalnız botun NƏ QƏDƏR TEZ-TEZ yoxlama apardığını idarə edir.
// TIMEFRAME (bot.js-də CONFIG.timeframe) — strategiyanın hansı şam ölçüsünə
// (4H) əsaslandığını idarə edir və bundan tam ayrıdır. Daha tez-tez yoxlama
// strategiyanı dəyişmir, sadəcə hələ bağlanmamış 4H şamın inkişafını izləyir.

async function runBotCycle() {
  try {
    const botModule = await import(pathToFileURL(path.join(ROOT, "bot.js")).href);
    await botModule.run();
  } catch (err) {
    console.error("Bot xətası:", err);
  }
}

function startScheduler() {
  if (process.env.AUTO_RUN === "false") return;
  const checkIntervalMin = Number(process.env.CHECK_INTERVAL_MINUTES) || 30;
  const intervalMs = checkIntervalMin * 60_000;
  console.log(`  ▸ Hər ${checkIntervalMin} dəqiqədə bir yoxlanacaq (analiz şamı: ${process.env.TIMEFRAME || "4H"})\n`);
  runBotCycle();
  setInterval(runBotCycle, intervalMs);
  startAnomalyWatcher();
  startWeeklyReport();
}

// ─── Həftəlik Telegram hesabatı — hər bazar 20:00 (Bakı) ─────────────────────
function startWeeklyReport() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  let lastSentKey = "";
  setInterval(async () => {
    try {
      const baku = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baku" }));
      if (baku.getDay() !== 0 || baku.getHours() !== 20) return;
      const key = `${baku.getFullYear()}-${baku.getMonth()}-${baku.getDate()}`;
      if (key === lastSentKey) return;
      lastSentKey = key;

      const paper = loadPaperState();
      const equity = paperEquity(paper);
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      const weekTrades = (paper.history || []).filter((h) => new Date(h.closedAt).getTime() >= weekAgo);
      const weekWins = weekTrades.filter((h) => h.pnlUsd > 0).length;
      const weekPnl = weekTrades.reduce((s, h) => s + h.pnlUsd, 0);
      const allTrades = paper.history || [];
      const allWins = allTrades.filter((h) => h.pnlUsd > 0).length;

      await tgSend(
        `📊 <b>HƏFTƏLİK HESABAT</b>\n\n` +
        `💰 Ümumi kapital: <b>$${equity.toFixed(2)}</b> (başlanğıc $${paper.startingBalance})\n` +
        `📈 Açıq mövqe: ${(paper.positions || []).length}\n\n` +
        `<b>Bu həftə:</b> ${weekTrades.length} əməliyyat | ${weekWins}W/${weekTrades.length - weekWins}L | ${weekPnl >= 0 ? "+" : ""}$${weekPnl.toFixed(2)}\n` +
        `<b>Ümumi:</b> ${allTrades.length} əməliyyat | win rate ${allTrades.length ? ((100 * allWins) / allTrades.length).toFixed(0) : 0}%\n\n` +
        `📊 protective-happiness-production.up.railway.app`,
      );
      console.log("📊 Həftəlik hesabat göndərildi");
    } catch (err) {
      console.error("Həftəlik hesabat xətası:", err.message);
    }
  }, 30 * 60_000);
}

// ─── Anomaliya alarmı — xəbər-təsirli qəfil hərəkətləri tutur ────────────────
// Hər 3 dəqiqədə son 5 dəqiqəlik qiymət dəyişimi yoxlanılır. Qəfil sıçrayış
// (>1.2%) görünəndə Telegram-a alarm gedir — xəbər API-lərindən daha sürətlidir,
// çünki xəbərin təsiri qiymətdə saniyələr içində görünür. Hər coin üçün 30 dəq cooldown.

const anomalyLastAlert = {};

async function tgSend(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("Telegram anomaliya alarmı xətası:", err.message);
  }
}

function startAnomalyWatcher() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const BINANCE = process.env.BINANCE_API_BASE || "https://data-api.binance.vision";
  const thresholdPct = Number(process.env.ANOMALY_THRESHOLD_PCT) || 1.2;
  const cooldownMs = 30 * 60_000;

  const symbols = (process.env.SYMBOLS || "BTCUSDT,ETHUSDT,SOLUSDT")
    .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

  async function checkOnce() {
    for (const sym of symbols) {
      try {
        const res = await fetch(`${BINANCE}/api/v3/klines?symbol=${sym}&interval=1m&limit=6`);
        if (!res.ok) continue;
        const k = await res.json();
        if (k.length < 6) continue;
        const firstOpen = parseFloat(k[0][1]);
        const lastClose = parseFloat(k[k.length - 1][4]);
        const changePct = ((lastClose - firstOpen) / firstOpen) * 100;
        if (Math.abs(changePct) >= thresholdPct) {
          const now = Date.now();
          if (anomalyLastAlert[sym] && now - anomalyLastAlert[sym] < cooldownMs) continue;
          anomalyLastAlert[sym] = now;
          const dir = changePct > 0 ? "📈 QALXIR" : "📉 DÜŞÜR";
          await tgSend(
            `⚡ <b>QƏFİL HƏRƏKƏT — ${sym}</b>\n` +
            `${dir}: son 5 dəqiqədə <b>${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%</b>\n` +
            `Qiymət: $${lastClose}\n` +
            `Mümkün səbəb: vacib xəbər / böyük sifariş. Açıq mövqeyin varsa yoxla!`,
          );
          console.log(`⚡ Anomaliya alarmı: ${sym} ${changePct.toFixed(2)}%`);
        }
      } catch (err) {
        // Şəbəkə xətaları alarm sistemini dayandırmasın
      }
    }
  }

  console.log(`  ▸ Anomaliya alarmı aktiv: 5 dəqiqəlik hərəkət ≥ ${thresholdPct}% olduqda Telegram bildirişi\n`);
  setInterval(checkOnce, 3 * 60_000);
}

server.listen(PORT, () => {
  const banner = [
    "",
    "  ╔══════════════════════════════════════════╗",
    "  ║  CLAUDE EXECUTE  ::  TERMINAL DASHBOARD  ║",
    "  ╚══════════════════════════════════════════╝",
    "",
    `  ▸ http://localhost:${PORT}`,
    "",
    "  Press Ctrl+C to stop.",
    "",
  ].join("\n");
  console.log(banner);
  startScheduler();
});
