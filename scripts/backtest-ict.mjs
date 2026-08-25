// ════════════════════════════════════════════════════════════════════════════
//  ICT UNIVERSAL MODEL — GƏLİRLİLİK ÖLÇMƏSİ
//
//  İndiyə qədər yalnız SİQNAL SAYI ölçülüb. Bu, əsl sualı cavablandırmır.
//  knowledge/KITAB-DERSLERI.md §1 (Aronson) və §10 (Tharp):
//     "Qəbul meyarı: expectancy ≥ +0.15R, ≥ 50 trade, statistik əhəmiyyət."
//
//  Burada hər siqnal REAL trade kimi icra olunur:
//    giriş → SL / TP1 (yarısı çıxır + stop BE-yə) → TP2 (DOL) → vaxt stopu
//  Nəticə R ilə hesablanır (1R = riskə atılan məbləğ).
//
//  Şam daxilində SL və TP eyni şama düşərsə → SL-in ƏVVƏL dəydiyi qəbul edilir
//  (mühafizəkar fərziyyə; əks halda nəticə süni şəkildə yaxşı görünür).
//
//  İstifadə: node scripts/backtest-ict.mjs [SIMVOL...]
//  Açarlar : HTFON=0/1  TW=a,b  MINRR=  HTFW=  WMSS=
// ════════════════════════════════════════════════════════════════════════════

const SYMS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["NQ=F", "ES=F", "YM=F", "GC=F", "CL=F", "SI=F", "BTC-USD", "ETH-USD"];

const P = {
  htfWin: +(process.env.HTFW || 60),
  minSweep: 1,
  minRR: +(process.env.MINRR || 2.0),
  minDispAtr: 0.5,
  maxWaitMss: +(process.env.WMSS || 24),
  maxWaitFill: 20,
  fvgLookback: 20,
  slBufAtr: 0.15,
  minStopAtr: 0.5,
  tradeWin: (process.env.TW || "0,1440").split(",").map(Number),
  noTrade: [960, 1200],
  lunch: [720, 780],
  maxBarsTrade: 60,
};
const HTF_ON = process.env.HTFON !== "0";

async function fetchYahoo(sym, interval = "5m", range = "60d") {
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

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function ny(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
const inW = (m, [a, b]) => (a <= b ? m >= a && m < b : m >= a || m < b);

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

const SESS = { AS: [1200, 1440], LO: [120, 300], AM: [570, 660], PM: [810, 960] };

function run(bars, h1) {
  for (const b of bars) Object.assign(b, ny(b.t));
  const atr = atrSeries(bars);

  const swH = new Array(bars.length).fill(null);
  const swL = new Array(bars.length).fill(null);
  let lh = null, ll = null;
  for (let i = 1; i < bars.length - 1; i++) {
    if (bars[i].h > bars[i - 1].h && bars[i].h > bars[i + 1].h) lh = bars[i].h;
    if (bars[i].l < bars[i - 1].l && bars[i].l < bars[i + 1].l) ll = bars[i].l;
    swH[i + 1] = lh; swL[i + 1] = ll;
  }

  const bullFvg = (k) => {
    if (k < 2 || !atr[k]) return null;
    const top = bars[k].l, bot = bars[k - 2].h, mid = bars[k - 1];
    return top > bot && mid.h - mid.l >= atr[k] * P.minDispAtr && mid.c > mid.o ? { top, bot } : null;
  };
  const bearFvg = (k) => {
    if (k < 2 || !atr[k]) return null;
    const top = bars[k - 2].l, bot = bars[k].h, mid = bars[k - 1];
    return top > bot && mid.h - mid.l >= atr[k] * P.minDispAtr && mid.c < mid.o ? { top, bot } : null;
  };

  let curDay = null, dayHi = -Infinity, dayLo = Infinity;
  let pdh = null, pdl = null, pdhLive = false, pdlLive = false;
  const lv = {};
  for (const k of Object.keys(SESS))
    lv[k] = { hi: null, lo: null, hiLive: false, loLive: false, cH: -Infinity, cL: Infinity, wasHi: false, wasLo: false };
  let htfBull = null, htfBear = null, hIdx = 0, lastHtfBull = -1e9, lastHtfBear = -1e9;

  let stage = 0, dir = 0, stageBar = 0, swExt = 0, entryPx = 0;
  let pos = null;
  const trades = [];

  for (let i = 30; i < bars.length; i++) {
    const b = bars[i];

    // ── açıq mövqenin idarəsi (yeni siqnaldan ƏVVƏL) ──
    if (pos) {
      const long = pos.dir === 1;
      const hitSl = long ? b.l <= pos.sl : b.h >= pos.sl;
      const hitT1 = long ? b.h >= pos.tp1 : b.l <= pos.tp1;
      const hitT2 = long ? b.h >= pos.tp2 : b.l <= pos.tp2;
      if (hitSl) {
        pos.r += pos.half ? 0 : -1;           // BE-yə çəkilmiş yarı 0R verir
        trades.push({ ...pos, exit: pos.half ? "BE" : "SL", i });
        pos = null;
      } else if (hitT2) {
        pos.r += pos.half ? 0.5 * pos.rr2 : 0.5 + 0.5 * pos.rr2;
        trades.push({ ...pos, exit: "TP2", i });
        pos = null;
      } else if (hitT1 && !pos.half) {
        pos.half = true; pos.r += 0.5; pos.sl = pos.entry;
      } else if (i - pos.openBar >= P.maxBarsTrade) {
        const live = ((b.c - pos.entry) / pos.risk) * pos.dir;
        pos.r += (pos.half ? 0.5 : 1) * live;
        trades.push({ ...pos, exit: "vaxt", i });
        pos = null;
      }
    }

    if (curDay !== b.date) {
      if (curDay !== null) { pdh = dayHi; pdl = dayLo; pdhLive = true; pdlLive = true; }
      curDay = b.date; dayHi = -Infinity; dayLo = Infinity;
    }
    dayHi = Math.max(dayHi, b.h); dayLo = Math.min(dayLo, b.l);
    const wasPdh = pdhLive, wasPdl = pdlLive;
    if (pdhLive && b.h > pdh) pdhLive = false;
    if (pdlLive && b.l < pdl) pdlLive = false;

    for (const [k, w] of Object.entries(SESS)) {
      const now = inW(b.min, w), prev = inW(bars[i - 1].min, w), s = lv[k];
      if (now && !prev) { s.cH = b.h; s.cL = b.l; }
      else if (now) { s.cH = Math.max(s.cH, b.h); s.cL = Math.min(s.cL, b.l); }
      if (!now && prev) { s.hi = s.cH; s.lo = s.cL; s.hiLive = true; s.loLive = true; }
      s.wasHi = s.hiLive; s.wasLo = s.loLive;
      if (s.hiLive && s.hi != null && b.h > s.hi) s.hiLive = false;
      if (s.loLive && s.lo != null && b.l < s.lo) s.loLive = false;
    }

    while (hIdx < h1.length && h1[hIdx].t <= b.t) hIdx++;
    if (hIdx >= 4) {
      const H1 = h1[hIdx - 2], H3 = h1[hIdx - 4], H2 = h1[hIdx - 3];
      if (H1 && H3 && H2) {
        if (H1.l > H3.h && H2.c > H2.o) htfBull = { top: H1.l, bot: H3.h };
        if (H1.h < H3.l && H2.c < H2.o) htfBear = { top: H3.l, bot: H1.h };
      }
    }
    if (htfBull && b.c < (htfBull.top + htfBull.bot) / 2) htfBull = null;
    if (htfBear && b.c > (htfBear.top + htfBear.bot) / 2) htfBear = null;
    if (htfBull && b.l <= htfBull.top && b.h >= htfBull.bot) lastHtfBull = i;
    if (htfBear && b.h >= htfBear.bot && b.l <= htfBear.top) lastHtfBear = i;
    const htfNearU = i - lastHtfBull <= P.htfWin;
    const htfNearD = i - lastHtfBear <= P.htfWin;

    const swLoL = [[pdl, wasPdl], [lv.AS.lo, lv.AS.wasLo], [lv.LO.lo, lv.LO.wasLo], [lv.AM.lo, lv.AM.wasLo], [lv.PM.lo, lv.PM.wasLo]];
    const swHiL = [[pdh, wasPdh], [lv.AS.hi, lv.AS.wasHi], [lv.LO.hi, lv.LO.wasHi], [lv.AM.hi, lv.AM.wasHi], [lv.PM.hi, lv.PM.wasHi]];
    const dolHi = [[pdh, pdhLive], [lv.AS.hi, lv.AS.hiLive], [lv.LO.hi, lv.LO.hiLive], [lv.AM.hi, lv.AM.hiLive], [lv.PM.hi, lv.PM.hiLive]];
    const dolLo = [[pdl, pdlLive], [lv.AS.lo, lv.AS.loLive], [lv.LO.lo, lv.LO.loLive], [lv.AM.lo, lv.AM.loLive], [lv.PM.lo, lv.PM.loLive]];
    const nLo = swLoL.filter(([v, l]) => l && v != null && b.l < v && b.c > v).length;
    const nHi = swHiL.filter(([v, l]) => l && v != null && b.h > v && b.c < v).length;

    if (stage === 0) {
      if ((nLo > 0 || nHi > 0) && !pos) {
        const d = nLo > 0 ? 1 : -1;
        const ok = HTF_ON ? (d === 1 ? htfNearU : htfNearD) : true;
        if (ok) { stage = 1; dir = d; stageBar = i; swExt = d === 1 ? b.l : b.h; }
      }
    } else if (stage === 1) {
      swExt = dir === 1 ? Math.min(swExt, b.l) : Math.max(swExt, b.h);
      if (i - stageBar > P.maxWaitMss) stage = 0;
      else {
        const mss = dir === 1 ? swH[i] != null && b.c > swH[i] : swL[i] != null && b.c < swL[i];
        if (mss) {
          let f = null;
          for (let j = 0; j <= P.fvgLookback && !f; j++) {
            const k = i - j;
            const cand = dir === 1 ? bullFvg(k) : bearFvg(k);
            if (cand && (dir === 1 ? cand.bot < b.c : cand.top > b.c)) f = cand;
          }
          if (!f) stage = 0;
          else { entryPx = (f.top + f.bot) / 2; stage = 2; stageBar = i; }
        }
      }
    } else if (stage === 2) {
      if (i - stageBar > P.maxWaitFill) stage = 0;
      else if (dir === 1 ? b.l <= entryPx : b.h >= entryPx) {
        stage = 0;
        const okWin = inW(b.min, P.tradeWin) && !inW(b.min, P.noTrade) && !inW(b.min, P.lunch);
        if (okWin && !pos && atr[i]) {
          const ent = entryPx;
          let sl = dir === 1 ? swExt - atr[i] * P.slBufAtr : swExt + atr[i] * P.slBufAtr;
          if (Math.abs(ent - sl) < atr[i] * P.minStopAtr)
            sl = dir === 1 ? ent - atr[i] * P.minStopAtr : ent + atr[i] * P.minStopAtr;
          const risk = Math.abs(ent - sl);
          const cands = (dir === 1 ? dolHi : dolLo)
            .filter(([v, l]) => l && v != null && (dir === 1 ? v > ent : v < ent))
            .map(([v]) => v);
          const dol = cands.length ? (dir === 1 ? Math.min(...cands) : Math.max(...cands)) : null;
          const rr2 = dol ? Math.abs(dol - ent) / risk : 3;
          if (risk > 0 && rr2 >= P.minRR)
            pos = {
              dir, entry: ent, sl, risk, tp1: ent + dir * risk, tp2: ent + dir * risk * rr2,
              rr2, half: false, r: 0, openBar: i, t: b.t,
            };
        }
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
  const losses = rs.filter((x) => x <= 0);
  let eq = 0, peak = 0, dd = 0;
  for (const r of rs) { eq += r; peak = Math.max(peak, eq); dd = Math.min(dd, eq - peak); }
  return {
    n, sum, mean, sd,
    t: sd > 0 ? mean / (sd / Math.sqrt(n)) : 0,
    wr: (100 * wins.length) / n,
    avgW: wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
    avgL: losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
    dd,
  };
}

const pad = (s, n) => String(s).padStart(n);

(async () => {
  console.log("\n═══ ICT MODEL — GƏLİRLİLİK ÖLÇMƏSİ ═══");
  console.log(`konfiqurasiya: HTF qapısı ${HTF_ON ? "AÇIQ" : "SÖNÜK"} · pəncərə ${P.tradeWin.join("-")} · minRR ${P.minRR}\n`);
  const all = [];
  console.log("alət        trade  qazanc%   orta R   cəmi R   maks.düşüş");
  for (const s of SYMS) {
    let bars, h1;
    try {
      bars = await fetchYahoo(s, "5m", "60d");
      h1 = await fetchYahoo(s, "60m", "60d");
    } catch (e) { console.log(`${s.padEnd(10)} data alınmadı (${e.message})`); continue; }
    if (bars.length < 500) { console.log(`${s.padEnd(10)} az data (${bars.length})`); continue; }
    const rs = run(bars, h1).map((x) => x.r);
    all.push(...rs);
    const st = stats(rs);
    if (!st.n) { console.log(`${s.padEnd(10)} ${pad(0, 5)}        —        —        —            —`); continue; }
    console.log(
      `${s.padEnd(10)} ${pad(st.n, 5)} ${pad(st.wr.toFixed(0) + "%", 8)} ` +
      `${pad((st.mean >= 0 ? "+" : "") + st.mean.toFixed(3), 8)} ` +
      `${pad((st.sum >= 0 ? "+" : "") + st.sum.toFixed(1), 8)} ${pad(st.dd.toFixed(1) + "R", 12)}`,
    );
  }

  const T = stats(all);
  console.log("─".repeat(62));
  if (!T.n) { console.log("Heç bir trade yaranmadı."); return; }
  console.log(
    `CƏMİ       ${pad(T.n, 5)} ${pad(T.wr.toFixed(0) + "%", 8)} ` +
    `${pad((T.mean >= 0 ? "+" : "") + T.mean.toFixed(3), 8)} ` +
    `${pad((T.sum >= 0 ? "+" : "") + T.sum.toFixed(1), 8)} ${pad(T.dd.toFixed(1) + "R", 12)}`,
  );
  console.log(`\norta qazanan +${T.avgW.toFixed(2)}R · orta itirən ${T.avgL.toFixed(2)}R · t = ${T.t.toFixed(2)}`);

  console.log("\n══ QƏBUL MEYARI (knowledge/KITAB-DERSLERI.md) ══");
  const c1 = T.n >= 50;
  const c2 = T.mean >= 0.15;
  const c3 = T.t >= 2;
  console.log(`  ${c1 ? "✅" : "❌"} ≥ 50 trade                → ${T.n}`);
  console.log(`  ${c2 ? "✅" : "❌"} expectancy ≥ +0.15R       → ${(T.mean >= 0 ? "+" : "") + T.mean.toFixed(3)}R`);
  console.log(`  ${c3 ? "✅" : "❌"} statistik əhəmiyyət t ≥ 2 → t = ${T.t.toFixed(2)}`);
  console.log(`\n${c1 && c2 && c3 ? "✅ MEYARLARI KEÇİR" : "❌ MEYARLARI KEÇMİR — real pul qoyulmamalıdır"}\n`);
})();
