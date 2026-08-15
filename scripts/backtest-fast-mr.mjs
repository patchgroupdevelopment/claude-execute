// Eksperimental 1H mean-reversion backtest-i — mövcud 4H strategiyanın (bot.js)
// eyni qaydalarını (RSI(3) 15/85 giriş, 55/45 çıxış, EMA(200) trend filtri,
// ATR×2.5 stop, ATR×2.0 TP, breakeven 0.75×ATR, max 120 saat saxlama) DƏYİŞMƏDƏN
// yalnız daha qısa taymfreymdə (1H) işə salır — məqsəd: eyni statistik hədləri
// saxlayaraq, sırf bar sayını artıraraq siqnal tezliyini yüksəltmək.
//
// Müqayisə üçün eyni pəncərədə 4H versiyası da paralel qaçırılır.

const BASE = "https://data-api.binance.vision";
const SYMBOLS = ["BTCUSDT", "ETHUSDT"];
const YEARS_BACK = 3;
const COMMISSION_RT = 0.001; // 0.1% round-trip (fee+slippage təxmini)

const RSI_ENTRY_LONG = 15, RSI_ENTRY_SHORT = 85;
const RSI_EXIT_LONG = 55, RSI_EXIT_SHORT = 45;
const ATR_MULT = 2.5, TP_MULT = 2.0, BE_TRIGGER = 0.75, MAX_HOLD_H = 120;
const EMA_PERIOD = 200;

async function fetchKlines(symbol, interval, startTime, endTime) {
  const out = [];
  let cursor = startTime;
  while (cursor < endTime) {
    const url = `${BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${cursor}&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance xətası: ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    for (const k of rows) {
      out.push({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4] });
    }
    const lastTime = rows[rows.length - 1][0];
    if (lastTime <= cursor) break;
    cursor = lastTime + 1;
    if (rows.length < 1000) break;
  }
  return out.filter((c) => c.time <= endTime);
}

function emaSeries(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period) return out;
  const mult = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * mult + ema * (1 - mult);
    out[i] = ema;
  }
  return out;
}

function rsiSeries(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function atrSeries(candles, period) {
  const out = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return out;
  const trs = [null];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i], prev = candles[i - 1];
    trs.push(Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close)));
  }
  let atr = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  out[period] = atr;
  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    out[i] = atr;
  }
  return out;
}

// Hər 1H şamın vaxtına görə ən son TAMAMLANMIŞ 4H şamın EMA(200)-ünü tapır —
// trend filtrini yavaş (etibarlı) taymfreymdə saxlayıb, yalnız giriş siqnalını
// sürətli (1H) taymfreymdə axtarmaq üçün. `trendCandles`/`trendEma` vaxta görə
// artan sırayla olmalıdır.
function alignTrend(candles, trendCandles, trendEma) {
  const out = new Array(candles.length).fill(null);
  let j = -1;
  for (let i = 0; i < candles.length; i++) {
    while (j + 1 < trendCandles.length && trendCandles[j + 1].time <= candles[i].time) j++;
    out[i] = j >= 0 ? trendEma[j] : null;
  }
  return out;
}

// candles[i] = son BAĞLANMIŞ şam kimi qəbul edilir (qərar bununla verilir).
// Giriş: yalnız "təzə kəsişmə" (əvvəlki bağlanmış şamda hədd aşılmayıbsa).
// Çıxış: SL (ATR×2.5, ya da breakeven) → TP (ATR×2.0) → breakeven silahlanma →
//        RSI çıxışı (55/45) → 120 saat vaxt limiti. Sıra bot.js ilə eynidir.
function simulate(candles, closes, ema200, rsi3, atr, barHours) {
  const trades = [];
  let pos = null;
  const maxHoldBars = MAX_HOLD_H / barHours;

  for (let i = EMA_PERIOD + 3; i < candles.length; i++) {
    const c = candles[i];
    const price = closes[i];

    if (pos) {
      const stopDistance = pos.atr * ATR_MULT;
      const profitDistance = pos.atr * TP_MULT;
      const stopLoss = pos.beArmed ? pos.entryPrice : (pos.side === "BUY" ? pos.entryPrice - stopDistance : pos.entryPrice + stopDistance);
      const takeProfit = pos.side === "BUY" ? pos.entryPrice + profitDistance : pos.entryPrice - profitDistance;

      const slTouched = pos.side === "BUY" ? c.low <= stopLoss : c.high >= stopLoss;
      const tpTouched = pos.side === "BUY" ? c.high >= takeProfit : c.low <= takeProfit;

      let exitPrice = null, exitReason = null;
      if (slTouched) { exitPrice = stopLoss; exitReason = pos.beArmed ? "breakeven" : "stop-loss"; }
      else if (tpTouched) { exitPrice = takeProfit; exitReason = "take-profit"; }
      else {
        if (!pos.beArmed) {
          const trigger = pos.atr * BE_TRIGGER;
          const favorable = pos.side === "BUY" ? c.high - pos.entryPrice : pos.entryPrice - c.low;
          if (favorable >= trigger) pos.beArmed = true;
        }
        const r = rsi3[i];
        if (r !== null) {
          if (pos.side === "BUY" && r >= RSI_EXIT_LONG) { exitPrice = price; exitReason = "rsi-exit"; }
          else if (pos.side === "SHORT" && r <= RSI_EXIT_SHORT) { exitPrice = price; exitReason = "rsi-exit"; }
        }
        if (exitPrice === null && (i - pos.entryIdx) >= maxHoldBars) { exitPrice = price; exitReason = "time-exit"; }
      }

      if (exitPrice !== null) {
        const rawPct = pos.side === "BUY" ? (exitPrice - pos.entryPrice) / pos.entryPrice : (pos.entryPrice - exitPrice) / pos.entryPrice;
        const pnlPct = rawPct - COMMISSION_RT;
        trades.push({ symbol: pos.symbol, side: pos.side, entryTime: c.time, exitReason, pnlPct, entryIdx: pos.entryIdx, exitIdx: i });
        pos = null;
      }
      continue;
    }

    if (ema200[i] === null || rsi3[i] === null || rsi3[i - 1] === null || atr[i] === null) continue;
    const uptrend = price > ema200[i];
    const side = uptrend ? "BUY" : "SHORT";
    const r = rsi3[i], prevR = rsi3[i - 1];

    const freshDip = side === "BUY" && r < RSI_ENTRY_LONG && prevR >= RSI_ENTRY_LONG;
    const freshSpike = side === "SHORT" && r > RSI_ENTRY_SHORT && prevR <= RSI_ENTRY_SHORT;

    if (freshDip || freshSpike) {
      pos = { side, entryPrice: price, atr: atr[i], entryIdx: i, beArmed: false, symbol: null };
    }
  }
  return trades;
}

function summarize(trades, label, periodDays) {
  if (!trades.length) {
    console.log(`  ${label}: 0 əməliyyat`);
    return;
  }
  const wins = trades.filter((t) => t.pnlPct > 0).length;
  const totalPct = trades.reduce((s, t) => s + t.pnlPct, 0) * 100;
  const winRate = (100 * wins) / trades.length;
  const perMonth = trades.length / (periodDays / 30);
  console.log(
    `  ${label}: ${trades.length} əməliyyat (~${perMonth.toFixed(1)}/ay) | ${winRate.toFixed(0)}% qazanma | cəm ${totalPct >= 0 ? "+" : ""}${totalPct.toFixed(1)}%`,
  );
}

async function runForSymbol(symbol) {
  const end = Date.now();
  const start = end - YEARS_BACK * 365 * 24 * 3600 * 1000;

  console.log(`\n=== ${symbol} ===`);
  const [c1h, c4h] = await Promise.all([
    fetchKlines(symbol, "1h", start, end),
    fetchKlines(symbol, "4h", start, end),
  ]);
  console.log(`  1H şam sayı: ${c1h.length} | 4H şam sayı: ${c4h.length}`);

  const closes4h = c4h.map((c) => c.close);
  const ema200_4h = emaSeries(closes4h, EMA_PERIOD);

  const variants = [
    ["1H (YENİ eksperimental, 1H trend filtri)", c1h, 1, null],
    ["4H (mövcud, müqayisə üçün)", c4h, 4, null],
    ["1H + 4H trend filtri (hibrid)", c1h, 1, alignTrend(c1h, c4h, ema200_4h)],
  ];

  for (const [tf, candles, hours, trendOverride] of variants) {
    const closes = candles.map((c) => c.close);
    const ema200 = trendOverride || emaSeries(closes, EMA_PERIOD);
    const rsi3 = rsiSeries(closes, 3);
    const atr = atrSeries(candles, 14);
    const trades = simulate(candles, closes, ema200, rsi3, atr, hours).map((t) => ({ ...t, symbol }));

    const periodDays = (candles[candles.length - 1].time - candles[0].time) / 86_400_000;
    summarize(trades, tf, periodDays);

    // Robustluq: birinci yarı vs ikinci yarı
    const mid = Math.floor(trades.length / 2);
    if (trades.length >= 8) {
      const half1 = trades.slice(0, mid);
      const half2 = trades.slice(mid);
      const p1 = (trades[mid - 1] ? trades[mid - 1].entryTime : candles[0].time) - candles[0].time;
      summarize(half1, `    1-ci yarı`, Math.max(p1 / 86_400_000, 1));
      summarize(half2, `    2-ci yarı`, Math.max(periodDays - p1 / 86_400_000, 1));
    }
  }
}

for (const symbol of SYMBOLS) {
  await runForSymbol(symbol);
}
