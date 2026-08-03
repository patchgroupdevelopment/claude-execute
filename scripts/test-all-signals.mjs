// Bütün izlənilən aktivlər üçün TEST siqnalı göndərir — bot.js-dəki EYNİ
// düsturlarla, EYNİ (aydın ölçü göstərən) mesaj formatı ilə. Real gedən
// heç bir siqnalı əvəz etmir, state faylına toxunmur — sırf mesaj
// formatının aydınlığını yoxlamaq üçündür.
//
// İşə salınma: yalnız `workflow_dispatch` ilə (bax: .github/workflows/test-signals.yml)

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
if (!TOKEN || !CHAT_ID) {
  console.error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID tapılmadı.");
  process.exit(1);
}

const XM_ACCOUNT = Number(process.env.XM_ACCOUNT_USD || 2000);
const XM_RISK_PCT = Number(process.env.XM_RISK_PCT || 1.5);
const riskUsd = XM_ACCOUNT * (XM_RISK_PCT / 100);

function calcATR(candles, period = 14) {
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) atr = (atr * (period - 1) + trs[i]) / period;
  return atr;
}
function fmtPrice(v) {
  const a = Math.abs(v);
  const dp = a >= 100 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 6 : 8;
  return v.toFixed(dp);
}
function fmtN(v) { return v.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

async function fetchBinance4H(symbol) {
  const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=4h&limit=100`);
  const kl = await r.json();
  return kl.map(k => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4] }));
}
async function fetchYahooDaily(ticker) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const j = await r.json();
  const res = j.chart.result[0], q = res.indicators.quote[0];
  const out = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    if (q.close[i] == null) continue;
    out.push({ high: q.high[i], low: q.low[i], close: q.close[i], open: q.open[i] });
  }
  return out;
}

async function send(text) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
  });
  console.log(`  HTTP ${res.status}`);
  if (res.status !== 200) console.log(await res.text());
  await new Promise(r => setTimeout(r, 1200)); // Telegram rate-limit qarşısı
}

// ── 1 & 2) BTC/ETH — 4H mean-reversion ──────────────────────────────────────
for (const [symbol, baseAsset, side] of [["BTCUSDT", "BTC", "BUY"], ["ETHUSDT", "ETH", "SHORT"]]) {
  console.log(`\n${symbol} (4H mean-reversion)...`);
  const candles = await fetchBinance4H(symbol);
  const price = candles[candles.length - 1].close;
  const atr = calcATR(candles.slice(0, -1), 14);
  const stopDist = atr * 2.5, tpDist = atr * 2.0;
  const stopPrice = side === "BUY" ? price - stopDist : price + stopDist;
  const tp = side === "BUY" ? price + tpDist : price - tpDist;
  const units = riskUsd / stopDist;
  const notional = units * price;
  const xmSymbol = symbol.replace("USDT", "USD");
  const text =
    `🚨 <b>SİQNAL — ${side} ${symbol}</b> [TEST]\n\n` +
    `Qiymət: <b>$${fmtPrice(price)}</b>\n` +
    `🎯 Hədəf (TP): $${fmtPrice(tp)} (${side === "BUY" ? "+" : "−"}${(tpDist / price * 100).toFixed(2)}%)\n` +
    `🛑 Stop-loss (SL): $${fmtPrice(stopPrice)}\n` +
    `⚖️ Risk/Reward: ${(tpDist / stopDist).toFixed(2)}\n` +
    `\n📐 <b>XM icra planı</b> (hesab $${XM_ACCOUNT}, risk ${XM_RISK_PCT}%):\n` +
    `Alət: <b>${xmSymbol}</b>\n` +
    `⚠️ <b>XM sifariş biletinə DƏQİQ bu ölçünü yaz:</b>\n` +
    `👉 <b>${units.toFixed(4)} ${baseAsset}</b> (~$${notional.toFixed(0)} notional)\n` +
    `Standart "1 Lot" ilə buraxma — bu, çox böyük mövqe deməkdir!\n` +
    `SL-ə dəysə itki: ~$${riskUsd.toFixed(2)}\n` +
    `\n⚠️ Bu YALNIZ TEST siqnalıdır — icra ETMƏ.`;
  await send(text);
}

// ── 3) GOLD — Donchian trailing stop ────────────────────────────────────────
console.log("\nGOLD (Donchian breakout)...");
{
  const candles = await fetchYahooDaily("GC=F");
  const price = candles[candles.length - 1].close;
  const atr = calcATR(candles.slice(0, -1), 14);
  const stopDist = atr * 2.0;
  const trailStop = price - stopDist;
  const units = riskUsd / stopDist;
  const donchianHigh = Math.max(...candles.slice(-21, -1).map(c => c.high));
  const text =
    `🚨 <b>BUY SİQNALI</b> [TEST] — 20 günlük kanal yuxarı qırıldı ($${fmtN(donchianHigh)})\n` +
    `Giriş: ~$${fmtN(price)} | 🛑 Trailing stop: $${fmtN(trailStop)} (ATR×2.0)\n` +
    `Sabit TP yoxdur — trend davam etdikcə stop yuxarı çəkiləcək, qazananı uzun saxla məntiqi.\n` +
    `📐 XM: <b>XAUUSD</b>\n` +
    `⚠️ <b>Sifariş biletinə DƏQİQ bu ölçünü yaz:</b> 👉 <b>${units.toFixed(4)}</b> (SL itkisi ~$${riskUsd.toFixed(0)}) — standart "1 Lot" ilə buraxma!\n` +
    `\n⚠️ Bu YALNIZ TEST siqnalıdır — icra ETMƏ.`;
  await send(text);
}

// ── 4 & 5) SP500 / US100 — günlük Connors ───────────────────────────────────
for (const [name, ticker, xmSymbol] of [["S&P 500", "%5EGSPC", "US500Cash"], ["Nasdaq 100 (US100)", "%5ENDX", "US100Cash"]]) {
  console.log(`\n${name} (günlük Connors)...`);
  const candles = await fetchYahooDaily(ticker);
  const price = candles[candles.length - 1].close;
  const atr = calcATR(candles.slice(0, -1), 14);
  const stop = price - 2.5 * atr, tp = price + 5.0 * atr;
  const units = riskUsd / (price - stop);
  const text =
    `🚨 <b>AL SİQNALI</b> [TEST] — bull rejimdə RSI(3) 11.2 (&lt; 15 oversold)\n` +
    `Giriş: ~${fmtN(price)} | 🛑 SL: ${fmtN(stop)} | 🎯 TP: ${fmtN(tp)}\n` +
    `📐 XM: <b>${xmSymbol}</b>\n` +
    `⚠️ <b>Sifariş biletinə DƏQİQ bu ölçünü yaz:</b> 👉 <b>${units.toFixed(4)}</b> (SL itkisi ~$${riskUsd.toFixed(0)}) — standart "1 Lot" ilə buraxma!\n` +
    `\n⚠️ Bu YALNIZ TEST siqnalıdır — icra ETMƏ.`;
  await send(text);
}

// ── 6) Neft (Brent) — günlük trend-following ────────────────────────────────
console.log("\nNEFT (Brent trend-following)...");
{
  const candles = await fetchYahooDaily("BZ=F");
  const price = candles[candles.length - 1].close;
  const atr = calcATR(candles.slice(0, -1), 14);
  const stop = price - 2.5 * atr, tp = price + 3.0 * atr;
  const units = riskUsd / Math.abs(price - stop);
  const text =
    `🚨 <b>BUY SİQNALI</b> [TEST] — EMA9/20 kəsişməsi, ADX 24.3\n` +
    `Giriş: ~$${fmtN(price)} | 🛑 SL: $${fmtN(stop)} | 🎯 TP: $${fmtN(tp)}\n` +
    `📐 XM: <b>BrentCash</b>\n` +
    `⚠️ <b>Sifariş biletinə DƏQİQ bu ölçünü yaz:</b> 👉 <b>${units.toFixed(2)}</b> (SL itkisi ~$${riskUsd.toFixed(0)}) — standart "1 Lot" ilə buraxma!\n` +
    `\n⚠️ Bu strategiya validasiya edilməyib (eksperimental).\n` +
    `⚠️ Bu YALNIZ TEST siqnalıdır — icra ETMƏ.`;
  await send(text);
}

console.log("\n✅ 6 test siqnalı göndərildi.");
