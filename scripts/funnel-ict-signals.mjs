// ════════════════════════════════════════════════════════════════════════════
//  ICT UNIVERSAL MODEL — SİQNAL HUNİSİ (funnel) analizi
//
//  Sual: "siqnalları necə artıraq?" — TƏXMİN ETMƏK ƏVƏZİNƏ ÖLÇÜRÜK.
//  Pine kodundakı eyni qapılar burada təkrarlanır və hər mərhələdə neçə
//  namizədin itdiyi sayılır. Beləliklə hansı filtrin əsl əngəl olduğu görünür.
//
//  İstifadə: node scripts/funnel-ict-signals.mjs [SIMVOL] [TF]
// ════════════════════════════════════════════════════════════════════════════

const SYMBOL = process.argv[2] || "NQ=F";
const TF = process.argv[3] || "5m";

// Pine defoltları ilə eyni
const P = {
  htfWin: +(process.env.HTFW || 20), minSweep: 1, minRR: +(process.env.MINRR || 2.0), minDispAtr: 0.5,
  maxWaitMss: +(process.env.WMSS || 12), maxWaitFill: 20, fvgLookback: 10, pivLen: 1,
  slBufAtr: 0.15,
  tradeWin: (process.env.TW || '510,660').split(',').map(Number),
  noTrade: [960, 1200],                   // 16:00–20:00 CBDR
  lunch: [720, 780],
};

async function fetchYahoo(sym, interval, range) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = (await r.json())?.chart?.result?.[0];
  const t = d.timestamp || [], q = d.indicators.quote[0];
  const out = [];
  for (let i = 0; i < t.length; i++) {
    if ([q.open[i], q.high[i], q.low[i], q.close[i]].some((x) => x == null)) continue;
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
  const out = new Array(b.length).fill(null), tr = [null];
  for (let i = 1; i < b.length; i++)
    tr.push(Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c)));
  if (b.length < n + 1) return out;
  let a = tr.slice(1, n + 1).reduce((x, y) => x + y, 0) / n;
  out[n] = a;
  for (let i = n + 1; i < b.length; i++) { a = (a * (n - 1) + tr[i]) / n; out[i] = a; }
  return out;
}

(async () => {
  console.log(`\n═══ SİQNAL HUNİSİ — ${SYMBOL} ${TF} ═══\n`);
  const bars = await fetchYahoo(SYMBOL, TF, "60d");
  const atr = atrSeries(bars);
  for (const b of bars) Object.assign(b, ny(b.t));
  console.log(`Data: ${bars.length} şam · ${new Set(bars.map(b => b.date)).size} gün\n`);

  // ── Seans H/L səviyyələri (canlı izlənir) ──
  const SESS = { AS: [1200, 1440], LO: [120, 300], AM: [570, 660], PM: [810, 960] };
  const lv = {};   // ad → {hi, lo, hiLive, loLive}
  for (const k of Object.keys(SESS)) lv[k] = { hi: null, lo: null, hiLive: false, loLive: false, cH: -Infinity, cL: Infinity };
  let pdh = null, pdl = null, pdhLive = false, pdlLive = false;
  let dayHi = -Infinity, dayLo = Infinity, curDay = null;

  // ── FVG köməkçiləri ──
  const bullFvg = (i) => {
    if (i < 2 || !atr[i]) return null;
    const top = bars[i].l, bot = bars[i - 2].h;
    const disp = bars[i - 1].h - bars[i - 1].l;
    return top > bot && disp >= atr[i] * P.minDispAtr && bars[i - 1].c > bars[i - 1].o ? { top, bot } : null;
  };
  const bearFvg = (i) => {
    if (i < 2 || !atr[i]) return null;
    const top = bars[i - 2].l, bot = bars[i].h;
    const disp = bars[i - 1].h - bars[i - 1].l;
    return top > bot && disp >= atr[i] * P.minDispAtr && bars[i - 1].c < bars[i - 1].o ? { top, bot } : null;
  };

  // ── HTF (1H) FVG — 12 x 5m şamdan qurulur ──
  const h1 = [];
  { let cur = null;
    for (const b of bars) {
      const slot = Math.floor(b.t / 3600000);
      if (!cur || cur.slot !== slot) { if (cur) h1.push(cur); cur = { slot, o: b.o, h: b.h, l: b.l, c: b.c, t: b.t }; }
      else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; }
    }
    if (cur) h1.push(cur);
  }
  let htfBull = null, htfBear = null, hIdx = 0;
  let lastHtfBull = -1e9, lastHtfBear = -1e9;

  // ── Swing pivotlar ──
  const swH = new Array(bars.length).fill(null), swL = new Array(bars.length).fill(null);
  { let lh = null, ll = null;
    for (let i = P.pivLen; i < bars.length - P.pivLen; i++) {
      let isH = true, isL = true;
      for (let k = 1; k <= P.pivLen; k++) {
        if (bars[i].h <= bars[i - k].h || bars[i].h <= bars[i + k].h) isH = false;
        if (bars[i].l >= bars[i - k].l || bars[i].l >= bars[i + k].l) isL = false;
      }
      if (isH) lh = bars[i].h;
      if (isL) ll = bars[i].l;
      swH[i + P.pivLen] = lh; swL[i + P.pivLen] = ll;
    }
  }

  // ── Huni sayğacları ──
  const F = { sweep: 0, htfOk: 0, mss: 0, fvgFound: 0, filled: 0, filterOk: 0, rrOk: 0, signal: 0 };
  const rejBy = { htf: 0, kz: 0, noTr: 0, lunch: 0, inTrade: 0, rr: 0, timeout: 0, noFvg: 0 };

  let stage = 0, dir = 0, stageBar = 0, swExt = 0, fvg = null, entryPx = 0;
  let inTrade = false;

  for (let i = 30; i < bars.length; i++) {
    const b = bars[i];
    // gün dəyişimi → PDH/PDL
    if (curDay !== b.date) {
      if (curDay !== null) { pdh = dayHi; pdl = dayLo; pdhLive = true; pdlLive = true; }
      curDay = b.date; dayHi = -Infinity; dayLo = Infinity;
    }
    dayHi = Math.max(dayHi, b.h); dayLo = Math.min(dayLo, b.l);
    // ⚠️ ŞAM AÇILANDA canlı idimi — sweep yoxlaması BUNU işlətməlidir.
    // Əks halda qiymət səviyyəni deldiyi anda səviyyə "ölü" olur və sweep
    // heç vaxt aşkarlanmır (kök buq).
    const wasPdh = pdhLive, wasPdl = pdlLive;
    if (pdhLive && b.h > pdh) pdhLive = false;
    if (pdlLive && b.l < pdl) pdlLive = false;

    // seans H/L
    for (const [k, w] of Object.entries(SESS)) {
      const now = inW(b.min, w), prev = inW(bars[i - 1].min, w);
      const s = lv[k];
      if (now && !prev) { s.cH = b.h; s.cL = b.l; }
      else if (now) { s.cH = Math.max(s.cH, b.h); s.cL = Math.min(s.cL, b.l); }
      if (!now && prev) { s.hi = s.cH; s.lo = s.cL; s.hiLive = true; s.loLive = true; }
      s.wasHi = s.hiLive; s.wasLo = s.loLive;      // şam açılışındakı vəziyyət
      if (s.hiLive && s.hi != null && b.h > s.hi) s.hiLive = false;
      if (s.loLive && s.lo != null && b.l < s.lo) s.loLive = false;
    }

    // HTF FVG yenilə
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

    // sweep aşkarlanması
    // sweep aşkarlanması: şam AÇILANDAKI canlılıq
    const swLoLevels = [[pdl, wasPdl], [lv.AS.lo, lv.AS.wasLo], [lv.LO.lo, lv.LO.wasLo],
                        [lv.AM.lo, lv.AM.wasLo], [lv.PM.lo, lv.PM.wasLo]];
    const swHiLevels = [[pdh, wasPdh], [lv.AS.hi, lv.AS.wasHi], [lv.LO.hi, lv.LO.wasHi],
                        [lv.AM.hi, lv.AM.wasHi], [lv.PM.hi, lv.PM.wasHi]];
    // DOL hədəfi üçün: HƏLƏ toxunulmamış (cari) səviyyələr
    const dolHi = [[pdh, pdhLive], [lv.AS.hi, lv.AS.hiLive], [lv.LO.hi, lv.LO.hiLive],
                   [lv.AM.hi, lv.AM.hiLive], [lv.PM.hi, lv.PM.hiLive]];
    const dolLo = [[pdl, pdlLive], [lv.AS.lo, lv.AS.loLive], [lv.LO.lo, lv.LO.loLive],
                   [lv.AM.lo, lv.AM.loLive], [lv.PM.lo, lv.PM.loLive]];
    const nLo = swLoLevels.filter(([v, live]) => live && v != null && b.l < v && b.c > v).length;
    const nHi = swHiLevels.filter(([v, live]) => live && v != null && b.h > v && b.c < v).length;

    // ── Mərhələ 1 ──
    if (stage === 0) {
      if (nLo > 0 || nHi > 0) {
        F.sweep++;
        if (inTrade) { rejBy.inTrade++; }
        else {
          const d = nLo > 0 ? 1 : -1;
          const ok = d === 1 ? htfNearU : htfNearD;
          const cnt = d === 1 ? nLo : nHi;
          if (!ok) rejBy.htf++;
          else if (cnt < P.minSweep) { /* sayı azdır */ }
          else { F.htfOk++; stage = 1; dir = d; stageBar = i; swExt = d === 1 ? b.l : b.h; fvg = null; }
        }
      }
    } else if (stage === 1) {
      swExt = dir === 1 ? Math.min(swExt, b.l) : Math.max(swExt, b.h);
      if (i - stageBar > P.maxWaitMss) { stage = 0; rejBy.timeout++; }
      else {
        const mss = dir === 1 ? (swH[i] != null && b.c > swH[i]) : (swL[i] != null && b.c < swL[i]);
        if (mss) {
          F.mss++;
          let f = null;
          for (let j = 0; j <= P.fvgLookback && !f; j++) {
            const k = i - j;
            const cand = dir === 1 ? bullFvg(k) : bearFvg(k);
            if (cand && (dir === 1 ? cand.bot < b.c : cand.top > b.c)) f = cand;
          }
          if (!f) { stage = 0; rejBy.noFvg++; }
          else { F.fvgFound++; fvg = f; entryPx = (f.top + f.bot) / 2; stage = 2; stageBar = i; }
        }
      }
    } else if (stage === 2) {
      if (i - stageBar > P.maxWaitFill) { stage = 0; rejBy.timeout++; }
      else {
        const filled = dir === 1 ? b.l <= entryPx : b.h >= entryPx;
        if (filled) {
          F.filled++;
          const kzOk = inW(b.min, P.tradeWin);
          const noTrOk = !inW(b.min, P.noTrade);
          const lunchOk = !inW(b.min, P.lunch);
          if (!kzOk) rejBy.kz++;
          else if (!noTrOk) rejBy.noTr++;
          else if (!lunchOk) rejBy.lunch++;
          else {
            F.filterOk++;
            const ent = entryPx;
            const sl = dir === 1 ? swExt - atr[i] * P.slBufAtr : swExt + atr[i] * P.slBufAtr;
            // DOL hədəfi
            const cands = (dir === 1 ? dolHi : dolLo)
              .filter(([v, live]) => live && v != null && (dir === 1 ? v > ent : v < ent))
              .map(([v]) => v);
            const dol = cands.length ? (dir === 1 ? Math.min(...cands) : Math.max(...cands)) : null;
            const risk = Math.abs(ent - sl);
            const rr = dol && risk > 0 ? Math.abs(dol - ent) / risk : null;
            if (dol && rr < P.minRR) rejBy.rr++;
            else { F.rrOk++; F.signal++; inTrade = true; }
            stage = 0;
          }
          if (stage === 2) stage = 0;
        }
      }
    }
    // sadələşdirilmiş mövqe bağlanışı: 40 şam sonra
    if (inTrade && i % 40 === 0) inTrade = false;
  }

  const days = new Set(bars.map(b => b.date)).size;
  const pr = (n) => String(n).padStart(5);
  console.log("── HUNİ ──");
  console.log(`sweep aşkarlandı        ${pr(F.sweep)}`);
  console.log(`  → HTF şərtini keçdi   ${pr(F.htfOk)}   (itki: HTF ${rejBy.htf} · açıq mövqe ${rejBy.inTrade})`);
  console.log(`  → MSS oldu            ${pr(F.mss)}   (itki: vaxt bitdi ${rejBy.timeout})`);
  console.log(`  → FVG tapıldı         ${pr(F.fvgFound)}   (itki: FVG yox ${rejBy.noFvg})`);
  console.log(`  → giriş dolduruldu    ${pr(F.filled)}`);
  console.log(`  → seans filtri keçdi  ${pr(F.filterOk)}   (itki: pəncərə ${rejBy.kz} · CBDR ${rejBy.noTr} · nahar ${rejBy.lunch})`);
  console.log(`  → RR ≥ ${P.minRR} keçdi      ${pr(F.rrOk)}   (itki: RR ${rejBy.rr})`);
  console.log(`\n✅ SİQNAL: ${F.signal}  →  ${(F.signal / days).toFixed(2)} / gün · ${(F.signal / days * 5).toFixed(1)} / həftə`);

  console.log("\n── ƏN BÖYÜK İTKİ HARADADIR? ──");
  const losses = [
    ["HTF FVG şərti", rejBy.htf],
    ["açıq mövqe blokladı", rejBy.inTrade],
    ["MSS gəlmədi (vaxt bitdi)", rejBy.timeout],
    ["MSS-də FVG tapılmadı", rejBy.noFvg],
    ["trade pəncərəsi (08:30–11:00)", rejBy.kz],
    ["RR minimumdan az", rejBy.rr],
    ["CBDR / nahar", rejBy.noTr + rejBy.lunch],
  ].sort((a, b) => b[1] - a[1]);
  for (const [name, n] of losses) if (n > 0) console.log(`  ${String(n).padStart(5)}  ${name}`);

  console.log("\n⚠️ Bu, Pine məntiqinin sadələşdirilmiş JS təkrarıdır — dəqiq rəqəm yox,");
  console.log("   HANSI QAPININ ƏSAS ƏNGƏL olduğunu göstərən nisbi mənzərədir.\n");
})();
