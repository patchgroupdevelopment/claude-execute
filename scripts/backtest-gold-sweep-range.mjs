// ════════════════════════════════════════════════════════════════════════════
//  "POWERFUL GOLD STRATEGY 2026" — ÖLÇMƏ
//
//  Mənbə: tradingview.com/chart/XAUUSD/EGLuCHK8 (yazılı ideya, skript deyil)
//  Müəllifin qaydası: qiymət aydın high/low-u qırır, FOMO yaradır, sonra geri
//  qayıdıb ƏSL istiqamətdə gedir. İki model:
//     Model 1 — manipulyasiya təsdiqlənəndən sonra gir (sweep + shift),
//               hədəf: diapazonun 50% səviyyəsi
//     Model 2 — "reload zone"a geri çəkilməni gözlə, giriş 61.8%–80%
//               retracement, hədəf: diapazonun QARŞI tərəfi
//  Müəllifin iddiası: qazanma 60–70%, orta R:R 2.0–2.5, ayda bir neçə trade.
//  Stop qaydası verilmir — biz sweep ekstremumunun o tayına qoyuruq.
//
//  ⚠️ Bu, artıq ölçdüyümüz ICT modelinin EYNİ AİLƏSİDİR (sweep → MSS → FVG).
//  Fərq YALNIZ giriş və hədəf tərifindədir. Ona görə burada məhz həmin fərq
//  ölçülür: müəllifin diapazon-əsaslı hədəfi bizim DOL hədəfindən yaxşıdırmı?
//
//  İstifadə: node scripts/backtest-gold-sweep-range.mjs [TF] [SIMVOL...]
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_SYMS = ["GC=F", "SI=F", "NQ=F", "ES=F", "CL=F", "BTC-USD", "ETH-USD"];
const RANGE = { "5m": "60d", "60m": "730d", "1d": "10y" };

const RANGE_LEN = +(process.env.RANGE_LEN || 20);   // diapazonu təyin edən şam sayı
const MAX_WAIT_MSS = +(process.env.WMSS || 24);     // sweep-dən sonra MSS gözləmə
const MAX_WAIT_FILL = +(process.env.WFILL || 20);   // retracement gözləmə (Model 2)
const MAX_BARS = +(process.env.MAXBARS || 60);      // vaxt stopu
const MODEL = process.env.MODEL || "both";          // "1" | "2" | "both"
// ── ÇIXIŞ REJİMİ ──────────────────────────────────────────────────────────
// range : müəllifin qaydası — sabit hədəf (50% və ya qarşı sərhəd)
// rr3/rr5: sabit R-qatı hədəf
// trail : hədəf YOXDUR — ATR trailing stop, trend davam etdikcə saxla.
//         "trend dəyişəndə gir, günlərlə gözlə" məntiqinin düzgün tərcüməsi.
const EXIT = process.env.EXIT || "range";
const TRAIL_ATR = +(process.env.TRAIL_ATR || 3);
// ── İCRA XƏRCİ ────────────────────────────────────────────────────────────
// COST_PCT = gediş-gəliş spred+komissiya, qiymətin FAİZİ ilə (XM qızıl ≈ 0.006%).
// Xərc R ilə ifadə olunur: xərcinR = (qiymət × COST_PCT/100) / risk.
// Ona görə eyni xərc DAR stoplu scalpda böyük, geniş stoplu swing-də kiçikdir.
const COST_PCT = +(process.env.COST_PCT || 0);

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

function atrSeries(b, n = 14) {
  const out = new Array(b.length).fill(null);
  const tr = [null];
  for (let i = 1; i < b.length; i++)
    tr.push(Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c)));
  if (b.length < n + 1) return out;
  let a = tr.slice(1, n + 1).reduce((x, y) => x + y, 0) / n;
  out[n] = a;
  for (let i = n + 1; i < b.length; i++) { a = (a * (n - 1) + tr[i]) / n; out[i] = a; }
  return out;
}

// Bir modeli icra et. model = 1 (dərhal giriş, 50% hədəf) və ya 2 (geri çəkilmə, tam hədəf)
function run(bars, model) {
  const atr = atrSeries(bars);
  const swH = new Array(bars.length).fill(null);
  const swL = new Array(bars.length).fill(null);
  let lh = null, ll = null;
  for (let i = 1; i < bars.length - 1; i++) {
    if (bars[i].h > bars[i - 1].h && bars[i].h > bars[i + 1].h) lh = bars[i].h;
    if (bars[i].l < bars[i - 1].l && bars[i].l < bars[i + 1].l) ll = bars[i].l;
    swH[i + 1] = lh; swL[i + 1] = ll;
  }

  const trades = [];
  let stage = 0, dir = 0, stageBar = 0, swExt = 0;
  let rLo = 0, rHi = 0, legHi = 0, legLo = 0, entryPx = 0;
  let pos = null;

  for (let i = RANGE_LEN + 20; i < bars.length; i++) {
    const b = bars[i];

    // ── açıq mövqe ──
    if (pos) {
      const long = pos.dir === 1;
      const hitSl = long ? b.l <= pos.sl : b.h >= pos.sl;
      const hitTp = pos.tp != null && (long ? b.h >= pos.tp : b.l <= pos.tp);
      if (hitSl) {                                  // mühafizəkar: SL əvvəl
        // trailing rejimdə stop irəli çəkilmiş ola bilər — real R hesablanır
        pos.r = ((pos.sl - pos.entry) / pos.risk) * pos.dir;
        trades.push({ ...pos, exit: "SL", i });
        pos = null;
      } else if (hitTp) {
        pos.r = Math.abs(pos.tp - pos.entry) / pos.risk;
        trades.push({ ...pos, exit: "TP", i });
        pos = null;
      } else if (i - pos.openBar >= MAX_BARS) {
        pos.r = ((b.c - pos.entry) / pos.risk) * pos.dir;
        trades.push({ ...pos, exit: "vaxt", i });
        pos = null;
      }
      // ── trailing stop: qiymət lehinə getdikcə stop irəli çəkilir ──
      if (pos && EXIT === "trail" && atr[i]) {
        const t = pos.dir === 1 ? b.c - atr[i] * TRAIL_ATR : b.c + atr[i] * TRAIL_ATR;
        if (pos.dir === 1 ? t > pos.sl : t < pos.sl) pos.sl = t;
      }
      if (pos) continue;
    }

    // ── diapazon: sweep-dən ƏVVƏLKİ RANGE_LEN şam ──
    const win = bars.slice(i - RANGE_LEN, i);
    const hi = Math.max(...win.map((x) => x.h));
    const lo = Math.min(...win.map((x) => x.l));

    if (stage === 0) {
      // sweep: diapazon sərhədini fitillə deldi, amma GÖVDƏ içəri qayıtdı
      const sweptLow = b.l < lo && b.c > lo;
      const sweptHigh = b.h > hi && b.c < hi;
      if (sweptLow || sweptHigh) {
        stage = 1;
        dir = sweptLow ? 1 : -1;
        stageBar = i;
        swExt = sweptLow ? b.l : b.h;
        rLo = lo; rHi = hi;
        legHi = b.h; legLo = b.l;
      }
    } else if (stage === 1) {
      // MSS gözlənilir — struktur qırılması təsdiqi
      swExt = dir === 1 ? Math.min(swExt, b.l) : Math.max(swExt, b.h);
      legHi = Math.max(legHi, b.h);
      legLo = Math.min(legLo, b.l);
      if (i - stageBar > MAX_WAIT_MSS) { stage = 0; continue; }
      const mss = dir === 1 ? swH[i] != null && b.c > swH[i] : swL[i] != null && b.c < swL[i];
      if (!mss) continue;

      const mid = (rLo + rHi) / 2;
      const sl = dir === 1 ? swExt - (atr[i] || 0) * 0.15 : swExt + (atr[i] || 0) * 0.15;

      if (model === 1) {
        // Model 1: dərhal gir, hədəf diapazonun 50%-i
        const ent = b.c;
        const risk = Math.abs(ent - sl);
        const tp = EXIT === "trail" ? null
          : EXIT === "rr3" ? ent + dir * risk * 3
          : EXIT === "rr5" ? ent + dir * risk * 5
          : mid;
        const tpOk = tp === null || (dir === 1 ? tp > ent : tp < ent);
        if (risk > 0 && tpOk)
          pos = { dir, entry: ent, sl, tp, risk, r: 0, openBar: i, t: b.t };
        stage = 0;
      } else {
        // Model 2: 61.8–80% geri çəkilmə gözlənilir, hədəf qarşı sərhəd
        const legTop = dir === 1 ? legHi : legLo;
        const legBot = dir === 1 ? legLo : legHi;
        const span = legTop - legBot;
        entryPx = legBot + span * 0.705;   // 61.8–80% zolağının ortası
        stage = 2;
        stageBar = i;
        pos = null;
        // hədəf və stop mərhələ 2-də qurulur
        legHi = legTop; legLo = legBot;
      }
    } else if (stage === 2) {
      if (i - stageBar > MAX_WAIT_FILL) { stage = 0; continue; }
      const filled = dir === 1 ? b.l <= entryPx : b.h >= entryPx;
      if (!filled) continue;
      stage = 0;
      const ent = entryPx;
      const sl = dir === 1 ? swExt - (atr[i] || 0) * 0.15 : swExt + (atr[i] || 0) * 0.15;
      const risk = Math.abs(ent - sl);
      const tp = EXIT === "trail" ? null
        : EXIT === "rr3" ? ent + dir * risk * 3
        : EXIT === "rr5" ? ent + dir * risk * 5
        : (dir === 1 ? rHi : rLo);              // diapazonun qarşı tərəfi
      const tpOk = tp === null || (dir === 1 ? tp > ent : tp < ent);
      if (risk > 0 && tpOk)
        pos = { dir, entry: ent, sl, tp, risk, r: 0, openBar: i, t: b.t };
    }
  }
  if (COST_PCT > 0)
    for (const t of trades) t.r -= (t.entry * COST_PCT) / 100 / t.risk;
  return trades;
}

function stats(rs) {
  const n = rs.length;
  if (!n) return { n: 0 };
  const sum = rs.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sd = Math.sqrt(rs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  const wins = rs.filter((x) => x > 0);
  const avgW = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  let eq = 0, peak = 0, dd = 0;
  for (const r of rs) { eq += r; peak = Math.max(peak, eq); dd = Math.min(dd, eq - peak); }
  return { n, sum, mean, t: sd > 0 ? mean / (sd / Math.sqrt(n)) : 0, wr: (100 * wins.length) / n, avgW, dd };
}

const pad = (s, n) => String(s).padStart(n);

(async () => {
  const tfArg = process.argv[2];
  const tfs = tfArg && RANGE[tfArg] ? [tfArg] : ["5m", "60m", "1d"];
  const syms = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT_SYMS;
  const models = MODEL === "both" ? [1, 2] : [+MODEL];

  console.log("\n═══ \"POWERFUL GOLD STRATEGY 2026\" — ÖLÇMƏ ═══");
  console.log(`xərc ${COST_PCT}% · diapazon ${RANGE_LEN} şam · MSS gözləmə ${MAX_WAIT_MSS} · vaxt stopu ${MAX_BARS} · çıxış: ${EXIT}${EXIT === "trail" ? " (ATR×" + TRAIL_ATR + ")" : ""}`);
  console.log("Müəllifin iddiası: qazanma 60–70% · orta R:R 2.0–2.5\n");

  for (const model of models) {
    const ad = model === 1 ? "MODEL 1 — dərhal giriş, hədəf diapazonun 50%-i"
      : "MODEL 2 — 61.8–80% geri çəkilmə, hədəf qarşı sərhəd";
    console.log(`\n╔══ ${ad} ══`);
    for (const tf of tfs) {
      const all = [];
      const allT = [];
      const rows = [];
      for (const s of syms) {
        let bars;
        try { bars = await fetchYahoo(s, tf, RANGE[tf]); } catch { continue; }
        if (bars.length < 300) continue;
        const tr = run(bars, model);
        const rs = tr.map((x) => x.r);
        all.push(...rs);
        allT.push(...tr.map((x) => x.t));
        const st = stats(rs);
        if (st.n) rows.push(`${s.padEnd(9)}${pad(st.n, 5)}${pad(st.wr.toFixed(0) + "%", 7)}` +
          `${pad((st.mean >= 0 ? "+" : "") + st.mean.toFixed(3), 9)}${pad("R:R " + st.avgW.toFixed(1), 9)}${pad("t=" + st.t.toFixed(2), 9)}`);
      }
      const T = stats(all);
      console.log(`\n  ── ${tf} ──`);
      console.log("  alət     trade qazanc%   orta R  orta qazanc        t");
      for (const r of rows) console.log("  " + r);
      if (!T.n) { console.log("  trade yaranmadı"); continue; }
      console.log(`  ${"CƏMİ".padEnd(9)}${pad(T.n, 5)}${pad(T.wr.toFixed(0) + "%", 7)}` +
        `${pad((T.mean >= 0 ? "+" : "") + T.mean.toFixed(3), 9)}${pad("R:R " + T.avgW.toFixed(1), 9)}  t=${T.t.toFixed(2)}`);
      if (allT.length === all.length && all.length >= 40) {
        const idx = allT.map((t, k) => [t, all[k]]).sort((x, y) => x[0] - y[0]);
        const m = Math.floor(idx.length / 2);
        const h1 = stats(idx.slice(0, m).map((x) => x[1]));
        const h2 = stats(idx.slice(m).map((x) => x[1]));
        const same = h1.mean > 0 === h2.mean > 0;
        console.log(`  zaman-yarısı: 1-ci ${(h1.mean >= 0 ? "+" : "") + h1.mean.toFixed(3)}R · ` +
          `2-ci ${(h2.mean >= 0 ? "+" : "") + h2.mean.toFixed(3)}R  ${same ? "✅ eyni işarə" : "❌ İŞARƏ DƏYİŞİR"}`);
      }
      const c1 = T.n >= 50, c2 = T.mean >= 0.15, c3 = T.t >= 2;
      console.log(`  ${c1 && c2 && c3 ? "✅ MEYARLARI KEÇİR" : "❌ keçmir"}` +
        `  (${c1 ? "✅" : "❌"}n ${c2 ? "✅" : "❌"}exp ${c3 ? "✅" : "❌"}t)` +
        `   müəllif dedi: 60–70% / R:R 2.0–2.5`);
    }
  }
  console.log("");
})();
