// ════════════════════════════════════════════════════════════════════════════
//  PARABOLIC SAR + EMA 200 + MACD — ÖLÇMƏ
//
//  Mənbə: tradingview.com/script/eevVxLxD (Saleh_Toodarvari, açıq mənbə)
//  Qaydalar (müəllifin öz sözləri):
//     AL  : qiymət EMA200-dən YUXARI · PSAR yüksəliş trendi · MACD delta MÜSBƏT
//     SAT : qiymət EMA200-dən AŞAĞI  · PSAR eniş trendi     · MACD delta MƏNFİ
//  Müəllif nə stop, nə hədəf, nə də backtest nəticəsi vermir.
//
//  Bizim əlavəmiz (ölçmək üçün lazımdır):
//     stop   = giriş anındakı PSAR dəyəri (PSAR onsuz da stop-and-reverse-dir)
//     çıxış  = PSAR əks tərəfə çevriləndə
//     R      = (çıxış − giriş) / |giriş − PSAR| × istiqamət
//
//  ⚠️ KITAB-DERSLERI §1 (Aronson): MƏCBURİ BENCHMARK. Trend-izləyən uzun-meylli
//  sistem yüksələn bazarda avtomatik qazanır — "al və saxla"dan yaxşı olmasa
//  heç bir dəyəri yoxdur. Ona görə hər sətirdə buy&hold da göstərilir.
//
//  İstifadə: node scripts/backtest-psar-ema-macd.mjs [TF] [SIMVOL...]
//     TF: 5m | 60m | 1d      (default: hamısı ardıcıl)
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_SYMS = ["NQ=F", "ES=F", "YM=F", "GC=F", "CL=F", "SI=F", "BTC-USD", "ETH-USD"];
const RANGE = { "5m": "60d", "60m": "730d", "1d": "10y" };

const LONG_ONLY = process.env.LONG_ONLY === "1";
const PSAR_STEP = +(process.env.PSAR_STEP || 0.02);
const PSAR_MAX = +(process.env.PSAR_MAX || 0.2);

async function fetchYahoo(sym, interval, range) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = (await r.json())?.chart?.result?.[0];
  const t = d?.timestamp || [];
  const q = d?.indicators?.quote?.[0];
  const out = [];
  for (let i = 0; i < t.length; i++) {
    if (!q || [q.open[i], q.high[i], q.low[i], q.close[i]].some((x) => x == null)) continue;
    out.push({ t: t[i] * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] });
  }
  return out;
}

function ema(vals, n) {
  const out = new Array(vals.length).fill(null);
  const k = 2 / (n + 1);
  let e = null;
  for (let i = 0; i < vals.length; i++) {
    if (i === n - 1) { e = vals.slice(0, n).reduce((a, b) => a + b, 0) / n; out[i] = e; }
    else if (i >= n) { e = vals[i] * k + e * (1 - k); out[i] = e; }
  }
  return out;
}

// MACD delta = histoqram = MACD − siqnal xətti
function macdHist(closes, f = 12, s = 26, sig = 9) {
  const ef = ema(closes, f), es = ema(closes, s);
  const line = closes.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
  const valid = line.filter((x) => x != null);
  const sl = ema(valid, sig);
  const out = new Array(closes.length).fill(null);
  let j = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] == null) continue;
    if (sl[j] != null) out[i] = line[i] - sl[j];
    j++;
  }
  return out;
}

// Wilder Parabolic SAR — TradingView-dakı ta.sar ilə eyni məntiq
function psar(bars, step = PSAR_STEP, max = PSAR_MAX) {
  const n = bars.length;
  const sar = new Array(n).fill(null);
  const up = new Array(n).fill(null);        // true = yüksəliş trendi
  if (n < 3) return { sar, up };
  let isUp = bars[1].c >= bars[0].c;
  let ep = isUp ? bars[1].h : bars[1].l;
  let af = step;
  let s = isUp ? bars[0].l : bars[0].h;
  for (let i = 2; i < n; i++) {
    s = s + af * (ep - s);
    // SAR son iki şamın diapazonuna girə bilməz
    if (isUp) s = Math.min(s, bars[i - 1].l, bars[i - 2].l);
    else s = Math.max(s, bars[i - 1].h, bars[i - 2].h);
    // çevrilmə
    if (isUp && bars[i].l < s) { isUp = false; s = ep; ep = bars[i].l; af = step; }
    else if (!isUp && bars[i].h > s) { isUp = true; s = ep; ep = bars[i].h; af = step; }
    else if (isUp && bars[i].h > ep) { ep = bars[i].h; af = Math.min(af + step, max); }
    else if (!isUp && bars[i].l < ep) { ep = bars[i].l; af = Math.min(af + step, max); }
    sar[i] = s;
    up[i] = isUp;
  }
  return { sar, up };
}

function run(bars) {
  const closes = bars.map((b) => b.c);
  const e200 = ema(closes, 200);
  const hist = macdHist(closes);
  const { sar, up } = psar(bars);

  const trades = [];
  let pos = null;

  for (let i = 210; i < bars.length; i++) {
    const b = bars[i];
    if (e200[i] == null || hist[i] == null || sar[i] == null) continue;

    const longOk = b.c > e200[i] && up[i] === true && hist[i] > 0;
    const shortOk = b.c < e200[i] && up[i] === false && hist[i] < 0;
    const prevLong = e200[i - 1] != null && hist[i - 1] != null && bars[i - 1].c > e200[i - 1] && up[i - 1] === true && hist[i - 1] > 0;
    const prevShort = e200[i - 1] != null && hist[i - 1] != null && bars[i - 1].c < e200[i - 1] && up[i - 1] === false && hist[i - 1] < 0;

    // ── açıq mövqe: PSAR çevriləndə çıx ──
    if (pos) {
      const flipped = pos.dir === 1 ? up[i] === false : up[i] === true;
      if (flipped) {
        const r = ((b.c - pos.entry) / pos.risk) * pos.dir;
        trades.push({ ...pos, exit: b.c, r, exitBar: i });
        pos = null;
      }
    }

    // ── yeni giriş: şərtlər TƏZƏ tamamlananda ──
    if (!pos) {
      if (longOk && !prevLong) {
        const risk = Math.abs(b.c - sar[i]);
        if (risk > 0) pos = { dir: 1, entry: b.c, risk, bar: i, t: b.t };
      } else if (!LONG_ONLY && shortOk && !prevShort) {
        const risk = Math.abs(b.c - sar[i]);
        if (risk > 0) pos = { dir: -1, entry: b.c, risk, bar: i, t: b.t };
      }
    }
  }
  return trades;
}

function stats(rs) {
  const n = rs.length;
  if (!n) return { n: 0 };
  const sum = rs.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sd = Math.sqrt(rs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  const wins = rs.filter((x) => x > 0);
  let eq = 0, peak = 0, dd = 0;
  for (const r of rs) { eq += r; peak = Math.max(peak, eq); dd = Math.min(dd, eq - peak); }
  return { n, sum, mean, t: sd > 0 ? mean / (sd / Math.sqrt(n)) : 0, wr: (100 * wins.length) / n, dd };
}

const pad = (s, n) => String(s).padStart(n);

(async () => {
  const tfArg = process.argv[2];
  const tfs = tfArg && RANGE[tfArg] ? [tfArg] : ["5m", "60m", "1d"];
  const syms = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT_SYMS;

  console.log("\n═══ PSAR + EMA200 + MACD — ÖLÇMƏ ═══");
  console.log(`PSAR ${PSAR_STEP}/${PSAR_MAX} · MACD 12/26/9 · EMA 200 · ${LONG_ONLY ? "YALNIZ LONG" : "long + short"}`);

  for (const tf of tfs) {
    console.log(`\n────────── ${tf}  (${RANGE[tf]}) ──────────`);
    console.log("alət        trade  qazanc%   orta R   cəmi R  maks.düşüş   al&saxla  a&s düşüş");
    const all = [];
    const allT = [];
    const bhDD = [];
    for (const s of syms) {
      let bars;
      try { bars = await fetchYahoo(s, tf, RANGE[tf]); }
      catch (e) { console.log(`${s.padEnd(10)} data alınmadı (${e.message})`); continue; }
      if (bars.length < 300) { console.log(`${s.padEnd(10)} az data (${bars.length})`); continue; }
      const tr = run(bars);
      const rs = tr.map((x) => x.r);
      all.push(...rs);
      allT.push(...tr.map((x) => x.t));
      const st = stats(rs);
      const bh = ((bars[bars.length - 1].c - bars[0].c) / bars[0].c) * 100;
      // al&saxla-nın ƏN DƏRİN DÜŞÜŞÜ — ədalətli müqayisə üçün (yalnız gəlir azdır)
      let bpk = bars[0].c, bdd = 0;
      for (const bb of bars) { bpk = Math.max(bpk, bb.c); bdd = Math.min(bdd, (bb.c - bpk) / bpk * 100); }
      bhDD.push(bdd);
      if (!st.n) { console.log(`${s.padEnd(10)} ${pad(0, 5)}        —        —        —           —  ${pad(bh.toFixed(0) + "%", 9)}`); continue; }
      console.log(
        `${s.padEnd(10)} ${pad(st.n, 5)} ${pad(st.wr.toFixed(0) + "%", 8)} ` +
        `${pad((st.mean >= 0 ? "+" : "") + st.mean.toFixed(3), 8)} ` +
        `${pad((st.sum >= 0 ? "+" : "") + st.sum.toFixed(1), 8)} ${pad(st.dd.toFixed(1) + "R", 11)} ` +
        `${pad((bh >= 0 ? "+" : "") + bh.toFixed(0) + "%", 9)} ${pad(bdd.toFixed(0) + "%", 7)}`,
      );
    }
    const T = stats(all);
    console.log("─".repeat(68));

    // ⚠️ ROBUSTLUQ: üstünlük ZAMAN BOYU sabitdirmi, yoxsa bir dövrün məhsuludur?
    // Yaddaşdakı qızıl dərsi: "yaxşı" görünən strategiya zaman-yarısı testində
    // dağıldı. Ona görə bu yoxlama məcburidir.
    if (allT.length === all.length && all.length >= 40) {
      const idx = allT.map((t, k) => [t, all[k]]).sort((x, y) => x[0] - y[0]);
      const mid = Math.floor(idx.length / 2);
      const h1 = stats(idx.slice(0, mid).map((x) => x[1]));
      const h2 = stats(idx.slice(mid).map((x) => x[1]));
      const sameSign = h1.mean > 0 === h2.mean > 0;
      console.log(
        `  zaman-yarısı:  1-ci yarı ${(h1.mean >= 0 ? "+" : "") + h1.mean.toFixed(3)}R (${h1.n})` +
        `   ·   2-ci yarı ${(h2.mean >= 0 ? "+" : "") + h2.mean.toFixed(3)}R (${h2.n})` +
        `   ${sameSign ? "✅ eyni işarə" : "❌ İŞARƏ DƏYİŞİR — sabit deyil"}`,
      );
    }
    if (!T.n) { console.log("Heç bir trade yaranmadı."); continue; }
    console.log(
      `CƏMİ       ${pad(T.n, 5)} ${pad(T.wr.toFixed(0) + "%", 8)} ` +
      `${pad((T.mean >= 0 ? "+" : "") + T.mean.toFixed(3), 8)} ` +
      `${pad((T.sum >= 0 ? "+" : "") + T.sum.toFixed(1), 8)} ${pad(T.dd.toFixed(1) + "R", 11)}`,
    );
    const c1 = T.n >= 50, c2 = T.mean >= 0.15, c3 = T.t >= 2;
    console.log(
      `  ${c1 ? "✅" : "❌"} ≥50 trade (${T.n})   ` +
      `${c2 ? "✅" : "❌"} expectancy ≥+0.15R (${(T.mean >= 0 ? "+" : "") + T.mean.toFixed(3)})   ` +
      `${c3 ? "✅" : "❌"} t ≥ 2 (${T.t.toFixed(2)})`,
    );
    console.log(`  ${c1 && c2 && c3 ? "✅ MEYARLARI KEÇİR" : "❌ MEYARLARI KEÇMİR"}`);
  }
  console.log("");
})();
