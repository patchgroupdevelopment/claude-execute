// ════════════════════════════════════════════════════════════════════════════
//  ICT ENGINE — bootcamp modelinin server tərəfi (Telegram botu üçün)
//
//  NASDAQ/ICT_Universal_Model.pine ilə EYNİ məntiq, JS-də. Pine indikatoru
//  qrafikdə göstərir; bu modul isə hər 15 dəqiqədə işləyib Telegram-a siqnal
//  göndərmək üçündür — Anthropic API tələb ETMİR (pulsuz işləyir).
//
//  Mənbə qaydalar: NASDAQ/STRATEGIYA-SPEC.md (45 videodan çıxarılıb)
//  Ölçmə qeydləri: knowledge/TRADING-LEARNINGS.md §6
//
//  ⚠️ STATUS: GƏLİRLİLİK BAXIMINDAN ÖLÇÜLMƏYİB.
//  Botun mövcud strategiyaları (qızıl Donchian, Connors MR) backtest edilib.
//  Bu — edilməyib. Ona görə siqnalları "TƏCRÜBİ" damğası ilə göndərilir və
//  mövcud strategiyaları ƏVƏZ ETMİR.
//
//  ⭐ Bu faylda Pine-dakı kök buqun düzəlişi var: səviyyənin "canlı" bayrağı
//  sweep yoxlanışından ƏVVƏL söndürülürdü → sweep heç vaxt aşkarlanmırdı.
//  İndi şam açılışındakı vəziyyət (wasLive) ayrıca saxlanılır.
// ════════════════════════════════════════════════════════════════════════════

// ── Defolt parametrlər (ölçülmüş — scripts/funnel-ict-signals.mjs) ──
export const ICT_DEFAULTS = {
  htfWin: 60,        // HTF zonasına toxunma pəncərəsi (şam) — huni analizi: 20→60
  minSweep: 1,       // eyni anda süpürülən minimum səviyyə sayı
  minRR: 2.0,        // D43: RR azdırsa stop daralır, hələ də azdırsa setup buraxılır
  minDispAtr: 0.5,   // displacement ən azı bu qədər ATR olmalıdır
  maxWaitMss: 24,    // sweep→MSS gözləmə
  maxWaitFill: 20,   // MSS→giriş gözləmə
  fvgLookback: 20,   // MSS-dən geriyə FVG axtarışı
  pivLen: 1,         // D26: müəllimin swing tərifi 3 şamlıqdır
  slBufAtr: 0.15,
  // ⚠️ Stop döşəməsi: spread+sürüşmə səviyyəsində stop mənasızdır.
  // knowledge/TRADING-LEARNINGS.md §4: "SL məsafəsi ATR×0.6-dan dar olmamalıdır".
  // Bu olmadan "RR-i yaxşılaşdırmaq üçün stopu daralt" qaydası absurd
  // nəticələr verir (test: SP500-də 0.7 punktluq stop, RR 19.67).
  minStopAtr: 0.5,
};

// Seanslar — NY vaxtı, dəqiqə (gün başından)
export const SESSIONS = {
  AS: [1200, 1440],  // Asiya  20:00–00:00
  LO: [120, 300],    // London 02:00–05:00
  AM: [570, 660],    // NY AM  09:30–11:00
  PM: [810, 960],    // NY PM  13:30–16:00
};
const LUNCH = [720, 780];      // 12:00–13:00
const CBDR = [960, 1200];      // 16:00–20:00 — ICT "No-Trade zone"

// Bazara görə trade pəncərəsi (D17 @00:02:43 — müəllimin ÖZ saatları)
export function tradeWindowFor(kind) {
  if (kind === "crypto") return null;              // 24/7, killzone yoxdur
  if (kind === "index") return [510, 660];         // 08:30–11:00
  if (kind === "gold") return [480, 660];          // 08:00–11:00
  return [420, 600];                               // forex 07:00–10:00
}

const nyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function nyParts(ms) {
  const p = Object.fromEntries(nyFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
const inWin = (m, w) => (w ? (w[0] <= w[1] ? m >= w[0] && m < w[1] : m >= w[0] || m < w[1]) : true);

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

/**
 * ICT setup axtarışı.
 * @param {Array<{t,o,h,l,c}>} bars  5 dəqiqəlik şamlar (köhnədən yeniyə)
 * @param {object} opt  { kind: "index"|"gold"|"crypto"|"forex", ...ICT_DEFAULTS }
 * @returns {object|null}  siqnal və ya null; həmçinin `diag` ilə huni məlumatı
 */
export function findIctSetup(bars, opt = {}) {
  const P = { ...ICT_DEFAULTS, ...opt };
  const kind = opt.kind || "index";
  const tradeWin = tradeWindowFor(kind);
  if (!bars || bars.length < 200) return { signal: null, diag: { reason: "data azdır" } };

  const atr = atrSeries(bars);
  for (const b of bars) Object.assign(b, nyParts(b.t));

  // ── Səviyyə vəziyyəti ──
  const lv = {};
  for (const k of Object.keys(SESSIONS))
    lv[k] = { hi: null, lo: null, hiLive: false, loLive: false, wasHi: false, wasLo: false, cH: -Infinity, cL: Infinity };
  let pdh = null, pdl = null, pdhLive = false, pdlLive = false;
  let dayHi = -Infinity, dayLo = Infinity, curDay = null;

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

  // HTF (1 saatlıq) FVG — "vacib səviyyə" (D31 A/B təcrübəsi)
  const h1 = [];
  { let cur = null;
    for (const b of bars) {
      const slot = Math.floor(b.t / 3600000);
      if (!cur || cur.slot !== slot) { if (cur) h1.push(cur); cur = { slot, o: b.o, h: b.h, l: b.l, c: b.c, t: b.t }; }
      else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; }
    }
    if (cur) h1.push(cur);
  }
  let htfBull = null, htfBear = null, hIdx = 0, lastHtfBull = -1e9, lastHtfBear = -1e9;

  // Swing pivotlar
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

  let stage = 0, dir = 0, stageBar = 0, swExt = 0, fvg = null, entryPx = 0, sweptName = "", sweepCnt = 0;
  let last = null;
  // Son şamda hansı mərhələdəyik — tamamlanmış siqnal olmasa belə istifadəçiyə
  // "setup formalaşır" deyə bilmək üçün (istifadəçinin əsas tələbi: tez-tez analiz).
  let liveState = null;
  const diag = { sweeps: 0, htfOk: 0, mss: 0, fvg: 0, filled: 0, rejHtf: 0, rejRR: 0, rejWin: 0 };

  for (let i = 30; i < bars.length; i++) {
    const b = bars[i];

    if (curDay !== b.date) {
      if (curDay !== null) { pdh = dayHi; pdl = dayLo; pdhLive = true; pdlLive = true; }
      curDay = b.date; dayHi = -Infinity; dayLo = Infinity;
    }
    dayHi = Math.max(dayHi, b.h); dayLo = Math.min(dayLo, b.l);

    // ⭐ Şam AÇILANDAKI canlılıq — sweep yoxlaması bunu işlədir (kök buq düzəlişi)
    const wasPdh = pdhLive, wasPdl = pdlLive;
    if (pdhLive && b.h > pdh) pdhLive = false;
    if (pdlLive && b.l < pdl) pdlLive = false;

    for (const [k, w] of Object.entries(SESSIONS)) {
      const now = inWin(b.min, w), prev = inWin(bars[i - 1].min, w), s = lv[k];
      if (now && !prev) { s.cH = b.h; s.cL = b.l; }
      else if (now) { s.cH = Math.max(s.cH, b.h); s.cL = Math.min(s.cL, b.l); }
      if (!now && prev) { s.hi = s.cH; s.lo = s.cL; s.hiLive = true; s.loLive = true; }
      s.wasHi = s.hiLive; s.wasLo = s.loLive;
      if (s.hiLive && s.hi != null && b.h > s.hi) s.hiLive = false;
      if (s.loLive && s.lo != null && b.l < s.lo) s.loLive = false;
    }

    while (hIdx < h1.length && h1[hIdx].t <= b.t) hIdx++;
    if (hIdx >= 4) {
      const H1 = h1[hIdx - 2], H2 = h1[hIdx - 3], H3 = h1[hIdx - 4];
      if (H1 && H2 && H3) {
        if (H1.l > H3.h && H2.c > H2.o) htfBull = { top: H1.l, bot: H3.h };
        if (H1.h < H3.l && H2.c < H2.o) htfBear = { top: H3.l, bot: H1.h };
      }
    }
    // D33: 50% orta nöqtədən o tayda gövdə bağlanışı → FVG ölür
    if (htfBull && b.c < (htfBull.top + htfBull.bot) / 2) htfBull = null;
    if (htfBear && b.c > (htfBear.top + htfBear.bot) / 2) htfBear = null;
    if (htfBull && b.l <= htfBull.top && b.h >= htfBull.bot) lastHtfBull = i;
    if (htfBear && b.h >= htfBear.bot && b.l <= htfBear.top) lastHtfBear = i;
    const htfNearU = i - lastHtfBull <= P.htfWin;
    const htfNearD = i - lastHtfBear <= P.htfWin;

    // Sweep — şam açılışındakı canlılıqla
    const loLv = [["PDL", pdl, wasPdl], ["AS.L", lv.AS.lo, lv.AS.wasLo], ["LO.L", lv.LO.lo, lv.LO.wasLo],
                  ["NYAM.L", lv.AM.lo, lv.AM.wasLo], ["NYPM.L", lv.PM.lo, lv.PM.wasLo]];
    const hiLv = [["PDH", pdh, wasPdh], ["AS.H", lv.AS.hi, lv.AS.wasHi], ["LO.H", lv.LO.hi, lv.LO.wasHi],
                  ["NYAM.H", lv.AM.hi, lv.AM.wasHi], ["NYPM.H", lv.PM.hi, lv.PM.wasHi]];
    const hitLo = loLv.filter(([, v, live]) => live && v != null && b.l < v && b.c > v);
    const hitHi = hiLv.filter(([, v, live]) => live && v != null && b.h > v && b.c < v);

    // DOL hədəfi üçün — hələ toxunulmamış səviyyələr
    const dolHi = hiLv.filter(() => true).map(([n, v], k) => [n, v, [pdhLive, lv.AS.hiLive, lv.LO.hiLive, lv.AM.hiLive, lv.PM.hiLive][k]]);
    const dolLo = loLv.filter(() => true).map(([n, v], k) => [n, v, [pdlLive, lv.AS.loLive, lv.LO.loLive, lv.AM.loLive, lv.PM.loLive][k]]);

    if (stage === 0) {
      if (hitLo.length || hitHi.length) {
        diag.sweeps++;
        const d = hitLo.length ? 1 : -1;
        const ok = d === 1 ? htfNearU : htfNearD;
        const cnt = d === 1 ? hitLo.length : hitHi.length;
        if (!ok) diag.rejHtf++;
        else if (cnt >= P.minSweep) {
          diag.htfOk++;
          stage = 1; dir = d; stageBar = i; swExt = d === 1 ? b.l : b.h;
          sweptName = (d === 1 ? hitLo : hitHi)[0][0]; sweepCnt = cnt;
        }
      }
    } else if (stage === 1) {
      swExt = dir === 1 ? Math.min(swExt, b.l) : Math.max(swExt, b.h);
      if (i - stageBar > P.maxWaitMss) stage = 0;
      else {
        // MSS = GÖVDƏ ilə struktur qırılması (D32 @00:05:12)
        const mss = dir === 1 ? (swH[i] != null && b.c > swH[i]) : (swL[i] != null && b.c < swL[i]);
        if (mss) {
          diag.mss++;
          let f = null;
          for (let j = 0; j <= P.fvgLookback && !f; j++) {
            const k = i - j, cand = dir === 1 ? bullFvg(k) : bearFvg(k);
            if (cand && (dir === 1 ? cand.bot < b.c : cand.top > b.c)) f = cand;
          }
          if (!f) stage = 0;
          else { diag.fvg++; fvg = f; entryPx = (f.top + f.bot) / 2; stage = 2; stageBar = i; }
        }
      }
    } else if (stage === 2) {
      if (i - stageBar > P.maxWaitFill) stage = 0;
      else if (dir === 1 ? b.l <= entryPx : b.h >= entryPx) {
        diag.filled++;
        const winOk = !tradeWin || inWin(b.min, tradeWin);
        const blockOk = kind === "crypto" || (!inWin(b.min, CBDR) && !inWin(b.min, LUNCH));
        if (!winOk || !blockOk) { diag.rejWin++; stage = 0; }
        else {
          const ent = entryPx;
          let sl = dir === 1 ? swExt - atr[i] * P.slBufAtr : swExt + atr[i] * P.slBufAtr;
          // D43: RR azdırsa stopu FVG gövdəsinə daralt
          const floor = atr[i] * P.minStopAtr;
          const tightRaw = dir === 1 ? Math.max(fvg.bot, sl) : Math.min(fvg.top, sl);
          // daraldılmış stop döşəmədən yaxın ola bilməz
          const tight = dir === 1
            ? Math.min(tightRaw, ent - floor)
            : Math.max(tightRaw, ent + floor);
          const cands = (dir === 1 ? dolHi : dolLo)
            .filter(([, v, live]) => live && v != null && (dir === 1 ? v > ent : v < ent)).map(([, v]) => v);
          const dol = cands.length ? (dir === 1 ? Math.min(...cands) : Math.max(...cands)) : null;
          // geniş stop da döşəməyə tabedir
          if (dir === 1 && ent - sl < floor) sl = ent - floor;
          if (dir === -1 && sl - ent < floor) sl = ent + floor;
          let risk = Math.abs(ent - sl);
          let rr = dol && risk > 0 ? Math.abs(dol - ent) / risk : null;
          if (dol && rr < P.minRR) { sl = tight; risk = Math.abs(ent - sl); rr = Math.abs(dol - ent) / risk; }
          if (dol && rr < P.minRR) { diag.rejRR++; stage = 0; }
          else {
            const tp1 = dol ?? (dir === 1 ? ent + risk * 2 : ent - risk * 2);
            last = {
              bar: i, time: bars[i].t, dir, entry: ent, sl, tp1,
              tp2: dir === 1 ? ent + (tp1 - ent) * 1.5 : ent - (ent - tp1) * 1.5,
              rr: rr ?? 2, risk, sweptName, sweepCnt, dolUsed: !!dol,
              barsAgo: bars.length - 1 - i,
            };
            stage = 0;
          }
        }
      }
    }
    // son şamda vəziyyəti yadda saxla
    if (i === bars.length - 1 && stage > 0) {
      liveState = {
        stage, dir, sweptName, sweepCnt,
        barsWaiting: i - stageBar,
        entryPx: stage === 2 ? entryPx : null,
        fvg: stage === 2 ? fvg : null,
        swExt,
        needs: stage === 1 ? "MSS (gövdə ilə struktur qırılması)" : "FVG orta nöqtəsinə geri çəkilmə",
      };
    }
  }
  return { signal: last, live: liveState, diag };
}

/** Siqnalı Telegram mesajına çevir (HTML). */
export function formatIctSignal(sig, label, price) {
  const side = sig.dir === 1 ? "AL 🟢" : "SAT 🔴";
  const f = (v) => (v >= 1000 ? v.toFixed(1) : v.toFixed(2));
  return (
    `🧪 <b>ICT SİQNAL — ${label}</b>  (TƏCRÜBİ)\n\n` +
    `${side}  ·  RR <b>${sig.rr.toFixed(2)}</b>\n` +
    `Sweep: ${sig.sweptName}${sig.sweepCnt > 1 ? ` ×${sig.sweepCnt}` : ""}\n\n` +
    `Giriş : <b>${f(sig.entry)}</b>\n` +
    `Stop  : ${f(sig.sl)}\n` +
    `TP1   : ${f(sig.tp1)}${sig.dolUsed ? " (DOL)" : ""}\n` +
    `TP2   : ${f(sig.tp2)}\n` +
    (price ? `Cari  : ${f(price)}\n` : "") +
    `\n⚠️ Bu strategiya <b>gəlirlilik baxımından ölçülməyib</b>.\n` +
    `Botun digər siqnalları backtest edilib — bu, edilməyib.\n` +
    `Yalnız müşahidə üçün, avtomatik icra edilmir.`
  );
}

/** Formalaşan (hələ tamamlanmamış) setup üçün bildiriş. */
export function formatIctForming(live, label, price) {
  const yon = live.dir === 1 ? "AL 🟢" : "SAT 🔴";
  const f = (v) => (v == null ? "—" : v >= 1000 ? v.toFixed(1) : v.toFixed(2));
  const bar = live.stage === 1 ? "1️⃣" : "2️⃣";
  let m =
    `⏳ <b>ICT SETUP FORMALAŞIR — ${label}</b>

` +
    `${bar} Mərhələ ${live.stage}/2  ·  gözlənilən istiqamət: <b>${yon}</b>
` +
    `Süpürülən likidite: ${live.sweptName}${live.sweepCnt > 1 ? ` ×${live.sweepCnt}` : ""}
` +
    `Gözləmə: ${live.barsWaiting} şam

` +
    `<b>İndi nə gözlənilir:</b> ${live.needs}
`;
  if (live.stage === 2 && live.entryPx != null) {
    m += `
Giriş səviyyəsi: <b>${f(live.entryPx)}</b>  (FVG 50%)
` +
         `Cari qiymət: ${f(price)}
` +
         `→ qiymət giriş səviyyəsinə çatarsa tam siqnal göndəriləcək.
`;
  }
  m += `
⚠️ Bu, ƏMR DEYİL — setup hələ tamamlanmayıb. Diqqətdə saxla.`;
  return m;
}

// ════════════════════════════════════════════════════════════════════════════
//  DXY KONTEKSTİ (qızıl/gümüş üçün) — ⚠️ FİLTR DEYİL, MƏLUMATDIR
//
//  Ölçüldü (knowledge/TRADING-LEARNINGS.md §7, 12,897 şam):
//    • Korrelyasiya REAL və SABİT: r = -0.473, yuvarlanan pəncərələrin
//      100%-i mənfi (1051-dən heç biri müsbət deyil)
//    • ❌ PROQNOZ GÜCÜ YOXDUR: t = 1.58 / 1.18 / 0.96 / -0.51 — heç biri
//      t≥2 həddinə çatmır. DXY-nin keçmiş hərəkəti qızılın gələcəyini
//      xəbər vermir; əlaqə EYNİ ANLIDIR, önə keçən deyil.
//    • ❌ SMT divergensiyası da edge vermir (fərq 0.76 bp, t=0.33)
//
//  Ona görə DXY siqnalı BLOKLAMIR — yalnız iki halda kontekst göstərir:
//    1. Korrelyasiya pozulubsa (anomal rejim)
//    2. Siqnal DXY ilə ziddiyyətlidirsə (diqqət üçün)
// ════════════════════════════════════════════════════════════════════════════

export async function fetchDxy() {
  const u = "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=5m&range=5d";
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return null;
  const d = (await r.json())?.chart?.result?.[0];
  if (!d?.timestamp) return null;
  const t = d.timestamp, q = d.indicators.quote[0], o = [];
  for (let i = 0; i < t.length; i++) {
    if (q.close[i] == null) continue;
    o.push({ t: t[i] * 1000, c: q.close[i] });
  }
  return o;
}

/**
 * Qızıl siqnalı üçün DXY konteksti.
 * @returns {{line: string, conflict: boolean, broken: boolean}|null}
 */
export function dxyContext(dxyBars, goldBars, dir) {
  if (!dxyBars || dxyBars.length < 60 || !goldBars) return null;
  const map = new Map(dxyBars.map((x) => [x.t, x.c]));
  const pairs = [];
  for (const g of goldBars.slice(-300)) { const d = map.get(g.t); if (d != null) pairs.push([g.c, d]); }
  if (pairs.length < 60) return null;

  // yuvarlanan korrelyasiya (qaytarımlar üzərində)
  const rg = [], rd = [];
  for (let i = 1; i < pairs.length; i++) {
    rg.push((pairs[i][0] - pairs[i - 1][0]) / pairs[i - 1][0]);
    rd.push((pairs[i][1] - pairs[i - 1][1]) / pairs[i - 1][1]);
  }
  const n = rg.length;
  const ma = rg.reduce((a, b) => a + b, 0) / n, mb = rd.reduce((a, b) => a + b, 0) / n;
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { const x = rg[i] - ma, y = rd[i] - mb; sab += x * y; sa += x * x; sb += y * y; }
  const corr = sa > 0 && sb > 0 ? sab / Math.sqrt(sa * sb) : 0;

  // DXY-nin son 12 şamdakı hərəkəti
  const last = dxyBars[dxyBars.length - 1].c;
  const prev = dxyBars[Math.max(0, dxyBars.length - 13)].c;
  const move = ((last - prev) / prev) * 100;
  const rising = move > 0.05, falling = move < -0.05;

  // Ziddiyyət: qızılda AL, amma DXY qalxır (və ya əksi)
  const conflict = (dir === 1 && rising) || (dir === -1 && falling);
  const broken = corr > -0.2;   // ölçüldü: normalda 100% pəncərə mənfidir

  let line = `📉 DXY: ${last.toFixed(2)} (${move >= 0 ? "+" : ""}${move.toFixed(2)}% son 1s)  ·  korr ${corr.toFixed(2)}`;
  if (broken) line += `\n⚠️ Korrelyasiya POZULUB (normalda −0.4…−0.8). Anomal rejim — ehtiyatlı ol.`;
  else if (conflict) line += `\n⚠️ DXY siqnalla ZİDDİR (${dir === 1 ? "qızılda AL, amma dollar qalxır" : "qızılda SAT, amma dollar düşür"}).`;
  else line += `\n✅ DXY siqnalı təsdiqləyir.`;
  line += `\nℹ️ Ölçülüb: DXY proqnoz vermir (t<2) — bu, BLOKLAYICI filtr deyil, kontekstdir.`;
  return { line, conflict, broken, corr, move };
}
