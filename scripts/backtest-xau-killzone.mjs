// XAU Kill Zone Sniper strategiyasının müstəqil backtest-i.
//
// tradingview/XAU_KZ_Sniper.pine faylındakı məntiqin EYNİSİNİ Node-da qurur və
// real 15 dəqiqəlik data üzərində qaçırır. Məqsəd: TradingView cədvəlindəki
// rəqəmi (yalnız görünən şamlara aid) müstəqil, daha uzun dövrdə yoxlamaq.
//
// Qaydalar (Pine ilə eyni):
//   • Seanslar NEW YORK vaxtı ilə (DST avtomatik) — Asiya/London/NY + 4 kill zone
//   • Likidite sweep: fitil seans High/Low-unu dəlir, şam o tayda bağlanır
//   • Bias: 1H EMA50 (yalnız BAĞLANMIŞ 1H şamdan — lookahead yoxdur)
//   • Təsdiq: 15m EMA21
//   • DXY filtri: LONG üçün DXY öz EMA21-inin altında olmalıdır (və əksinə)
//   • SL: sweep fitilindən ATR×0.25 kənarda, minimum ATR×0.60 məsafə
//   • TP1 = 1R, TP2 = 2R; TP1-dən sonra stop girişə (breakeven)
//   • SL TP-dən ƏVVƏL yoxlanılır (konservativ — eyni şamda ikisi də toxunubsa itki)

const GOLD_SYMBOLS = ["GC=F", "XAUUSD=X"];
const DXY_SYMBOL = "DX-Y.NYB";
// Yahoo limitləri: 5m/15m/30m → maks 60 gün, 1h → 730 gün.
// "Son 3 ay" tələbi yalnız 1H-də tam örtülür.
const CONFIGS = [
  { interval: "1h", range: "3mo", label: "1 SAAT · son 3 ay  ← sənin baxdığın qrafik" },
  { interval: "15m", range: "60d", label: "15 DƏQİQƏ · son 60 gün" },
  { interval: "5m", range: "60d", label: "5 DƏQİQƏ · son 60 gün" },
];

// ── Parametrlər (Pine default-ları ilə eyni) ──
const P = {
  atrLen: 14,
  emaFast: 21,
  htfEma: 50,
  dxyEma: 21,
  slBufAtr: 0.25,
  minSlAtr: 0.6,
  tp1RR: 1.0,
  tp2RR: 2.0,
  kzFilter: true,
  useDxy: true,
  scalp: true, // Scalp rejim: bias yumşaq (close>EMA21 VƏ YA HTF bias)
  // Spread + sürüşmə (qiymət vahidi ilə). XM-də XAUUSD spread-i adətən
  // 0.20-0.35 $ olur, xəbər vaxtı daha geniş. Bu, kiçik SL məsafələrində
  // nəticənin ƏSAS düşməninin ola bilər — ona görə modelə daxil edilir.
  spread: 0.30,
};

const SESSIONS = {
  asia:   [1900, 400],
  london: [300, 1130],
  ny:     [800, 1700],
};
const KILLZONES = {
  kzAsia: [2000, 0],
  kzLon:  [200, 500],
  kzNyAm: [830, 1100],
  kzNyPm: [1330, 1600],
};

// ── Data ──────────────────────────────────────────────────────────────────
async function fetchYahoo(symbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error(`${symbol}: nəticə yoxdur`);
  const t = r.timestamp || [];
  const q = r.indicators.quote[0];
  const out = [];
  for (let i = 0; i < t.length; i++) {
    if (q.close[i] == null || q.high[i] == null || q.low[i] == null || q.open[i] == null) continue;
    out.push({ t: t[i] * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] });
  }
  return out;
}

// ── NY vaxtı (DST avtomatik) ──────────────────────────────────────────────
const nyFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function nyHHMM(ms) {
  const p = nyFmt.formatToParts(new Date(ms));
  const h = +p.find((x) => x.type === "hour").value;
  const m = +p.find((x) => x.type === "minute").value;
  return h * 100 + m;
}
// Gecəyarısını keçən seansları da düzgün tutur (məs. 1900-0400)
function inSession(hhmm, [start, end]) {
  return start <= end ? hhmm >= start && hhmm < end : hhmm >= start || hhmm < end;
}

// ── İndikatorlar ──────────────────────────────────────────────────────────
function emaSeries(vals, period) {
  const out = new Array(vals.length).fill(null);
  if (vals.length < period) return out;
  const k = 2 / (period + 1);
  let e = vals.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = e;
  for (let i = period; i < vals.length; i++) {
    e = vals[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

function atrSeries(bars, period) {
  const out = new Array(bars.length).fill(null);
  if (bars.length < period + 1) return out;
  const tr = [null];
  for (let i = 1; i < bars.length; i++) {
    tr.push(Math.max(
      bars[i].h - bars[i].l,
      Math.abs(bars[i].h - bars[i - 1].c),
      Math.abs(bars[i].l - bars[i - 1].c),
    ));
  }
  let a = tr.slice(1, period + 1).reduce((x, y) => x + y, 0) / period;
  out[period] = a;
  for (let i = period + 1; i < bars.length; i++) {
    a = (a * (period - 1) + tr[i]) / period;
    out[i] = a;
  }
  return out;
}

function correlation(a, b, len, i) {
  if (i < len - 1) return null;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, n = 0;
  for (let k = i - len + 1; k <= i; k++) {
    const x = a[k], y = b[k];
    if (x == null || y == null) return null;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; n++;
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return den === 0 ? null : num / den;
}

// 15m şamlardan 1H şam qurur; hər 15m barı üçün SON BAĞLANMIŞ 1H EMA-nı verir.
function htfEmaAligned(bars, period) {
  const hourly = [];
  const idxOfHourStart = [];
  let cur = null;
  for (let i = 0; i < bars.length; i++) {
    const hourKey = Math.floor(bars[i].t / 3_600_000);
    if (!cur || cur.key !== hourKey) {
      if (cur) hourly.push(cur);
      cur = { key: hourKey, c: bars[i].c, endIdx: i };
      idxOfHourStart.push(i);
    }
    cur.c = bars[i].c;
    cur.endIdx = i;
  }
  if (cur) hourly.push(cur);

  const hEma = emaSeries(hourly.map((h) => h.c), period);
  const out = new Array(bars.length).fill(null);
  // Bar i üçün: yalnız TAM BAĞLANMIŞ 1H şamların EMA-sı (lookahead yoxdur)
  let hi = 0;
  for (let i = 0; i < bars.length; i++) {
    while (hi + 1 < hourly.length && hourly[hi + 1].endIdx < i) hi++;
    const closedIdx = hourly[hi].endIdx < i ? hi : hi - 1;
    out[i] = closedIdx >= 0 ? hEma[closedIdx] : null;
  }
  return out;
}

// ── Simulyasiya ───────────────────────────────────────────────────────────
function simulate(bars, dxyC, opts = {}) {
  const p = { ...P, ...opts };
  const closes = bars.map((b) => b.c);
  const ema21 = emaSeries(closes, p.emaFast);
  const atr = atrSeries(bars, p.atrLen);
  const htf = htfEmaAligned(bars, p.htfEma);
  const dxyEma = emaSeries(dxyC.map((v) => (v == null ? NaN : v)), p.dxyEma);

  // Seans high/low izləmə
  const st = {};
  for (const k of Object.keys(SESSIONS)) st[k] = { hi: null, lo: null, pHi: null, pLo: null, prevActive: false };

  let prevDayKey = null, dayHi = null, dayLo = null, pdHigh = null, pdLow = null;

  const trades = [];
  let pos = null;

  for (let i = 1; i < bars.length; i++) {
    const b = bars[i];
    const hhmm = nyHHMM(b.t);

    // ── Açıq mövqe idarəsi (Pine ilə eyni sıra: SL → TP2 → TP1) ──
    if (pos) {
      const long = pos.dir === 1;
      const slHit = long ? b.l <= pos.sl : b.h >= pos.sl;
      const tp2Hit = long ? b.h >= pos.tp2 : b.l <= pos.tp2;
      const tp1Hit = long ? b.h >= pos.tp1 : b.l <= pos.tp1;
      // Spread hər əməliyyatda bir dəfə (giriş+çıxış) riskin faizi kimi çıxılır
      const cost = p.spread / pos.risk;
      if (slHit) {
        pos.result = pos.tp1Hit ? "BE" : "SL";
        pos.r = (pos.tp1Hit ? 0 : -1) - cost;
        pos.exitT = b.t;
        trades.push(pos);
        pos = null;
      } else if (tp2Hit) {
        pos.tp1Hit = true;
        pos.result = "TP2";
        pos.r = p.tp2RR - cost;
        pos.exitT = b.t;
        trades.push(pos);
        pos = null;
      } else if (tp1Hit && !pos.tp1Hit) {
        pos.tp1Hit = true;
        pos.sl = pos.entry; // breakeven
      }
    }

    // ── Gün dəyişimi (PDH/PDL) ──
    const dayKey = new Date(b.t).toISOString().slice(0, 10);
    if (dayKey !== prevDayKey) {
      if (dayHi != null) { pdHigh = dayHi; pdLow = dayLo; }
      dayHi = b.h; dayLo = b.l;
      prevDayKey = dayKey;
    } else {
      dayHi = Math.max(dayHi, b.h);
      dayLo = Math.min(dayLo, b.l);
    }

    // ── Seans high/low ──
    for (const [name, range] of Object.entries(SESSIONS)) {
      const active = inSession(hhmm, range);
      const s = st[name];
      if (active && !s.prevActive) { s.hi = b.h; s.lo = b.l; }
      else if (active) { s.hi = Math.max(s.hi, b.h); s.lo = Math.min(s.lo, b.l); }
      if (!active && s.prevActive) { s.pHi = s.hi; s.pLo = s.lo; }
      s.prevActive = active;
    }

    if (pos) continue;
    if (atr[i] == null || ema21[i] == null) continue;

    const inKz = Object.values(KILLZONES).some((r) => inSession(hhmm, r));
    if (p.kzFilter && !inKz) continue;

    // ── Sweep aşkarlaması ──
    const lvlsLo = [st.asia.pLo, st.london.pLo, st.ny.pLo, pdLow];
    const lvlsHi = [st.asia.pHi, st.london.pHi, st.ny.pHi, pdHigh];
    const sweepUp = lvlsLo.some((L) => L != null && b.l < L && b.c > L && b.c > b.o);
    const sweepDn = lvlsHi.some((L) => L != null && b.h > L && b.c < L && b.c < b.o);
    if (!sweepUp && !sweepDn) continue;

    // ── Bias ──
    const hb = htf[i];
    const bullBias = hb != null && b.c > hb;
    const bearBias = hb != null && b.c < hb;
    // Diqqət: default Scalp rejimində "VƏ YA" işlədilir — yəni EMA21 və ya HTF
    // biasdan BİRİ kifayətdir. Bu, praktikada demək olar heç nəyi süzmür.
    // strictBias hər ikisini tələb edir (nə qədər sərt olduğunu ölçmək üçün).
    const biasL = p.strictBias ? (b.c > ema21[i] && bullBias)
                : p.scalp ? (b.c > ema21[i] || bullBias) : bullBias;
    const biasS = p.strictBias ? (b.c < ema21[i] && bearBias)
                : p.scalp ? (b.c < ema21[i] || bearBias) : bearBias;

    // ── DXY ──
    const dc = dxyC[i], de = dxyEma[i];
    const dxyOk = dc != null && de != null && !Number.isNaN(de);
    const dxyDown = dxyOk && dc < de;
    const dxyUp = dxyOk && dc > de;
    const okL = !p.useDxy || !dxyOk || dxyDown;
    const okS = !p.useDxy || !dxyOk || dxyUp;

    const goLong = sweepUp && biasL && okL;
    const goShort = sweepDn && biasS && okS;
    if (!goLong && !goShort) continue;

    const dir = goLong ? 1 : -1;
    const entry = b.c;
    const rawSl = dir === 1
      ? Math.min(b.l, bars[i - 1].l) - atr[i] * p.slBufAtr
      : Math.max(b.h, bars[i - 1].h) + atr[i] * p.slBufAtr;
    const minD = atr[i] * p.minSlAtr;
    const sl = dir === 1 ? Math.min(rawSl, entry - minD) : Math.max(rawSl, entry + minD);
    const risk = Math.abs(entry - sl);
    if (!(risk > 0)) continue;

    pos = {
      dir, entry, sl, risk, entryT: b.t,
      tp1: dir === 1 ? entry + risk * p.tp1RR : entry - risk * p.tp1RR,
      tp2: dir === 1 ? entry + risk * p.tp2RR : entry - risk * p.tp2RR,
      tp1Hit: false, result: null, r: null,
    };
  }

  return { trades, openAtEnd: pos ? 1 : 0 };
}

// ── Hesabat ───────────────────────────────────────────────────────────────
function report(label, trades) {
  if (!trades.length) { console.log(`  ${label}: 0 əməliyyat`); return; }
  const n = trades.length;
  const tp2 = trades.filter((t) => t.result === "TP2").length;
  const be = trades.filter((t) => t.result === "BE").length;
  const sl = trades.filter((t) => t.result === "SL").length;
  const tp1 = tp2 + be; // TP1-ə çatanlar
  const totR = trades.reduce((s, t) => s + t.r, 0);
  const wr = (100 * tp1) / n;
  const mean = totR / n;
  // Statistik əhəmiyyət: nəticə sıfırdan fərqlidirmi, yoxsa təsadüf ola bilər?
  const varR = trades.reduce((s, t) => s + (t.r - mean) ** 2, 0) / n;
  const se = Math.sqrt(varR / n);
  const tStat = se > 0 ? mean / se : 0;
  const sig = Math.abs(tStat) >= 2 ? "✅ statistik əhəmiyyətli" : "⚠️ təsadüfdən fərqlənmir";
  console.log(
    `  ${label}: ${n} əməliyyat | TP1 ${tp1} (${wr.toFixed(0)}%) | tam TP2 ${tp2} | BE ${be} | SL ${sl} | net ${totR >= 0 ? "+" : ""}${totR.toFixed(1)}R | ${mean >= 0 ? "+" : ""}${mean.toFixed(3)}R/əməliyyat | t=${tStat.toFixed(2)} ${sig}`,
  );
}

// ── Əsas ──────────────────────────────────────────────────────────────────
async function loadPair(interval, range) {
  let gold = null, goldSym = null;
  for (const s of GOLD_SYMBOLS) {
    try {
      const d = await fetchYahoo(s, interval, range);
      if (d.length > 300) { gold = d; goldSym = s; break; }
    } catch { /* növbəti simvola keç */ }
  }
  if (!gold) return null;

  let dxyRaw = [];
  try { dxyRaw = await fetchYahoo(DXY_SYMBOL, interval, range); } catch { /* filtr sönəcək */ }

  const dxyMap = new Map(dxyRaw.map((d) => [d.t, d.c]));
  const dxyC = [];
  let last = null;
  for (const b of gold) {
    if (dxyMap.has(b.t)) last = dxyMap.get(b.t);
    dxyC.push(last);
  }
  return { gold, goldSym, dxyC, dxyBars: dxyRaw.length };
}

console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
console.log("║   XAU KILL ZONE SNIPER — TAYMFREYMƏ GÖRƏ BACKTEST                   ║");
console.log("╚══════════════════════════════════════════════════════════════════════╝");

for (const cfg of CONFIGS) {
  const data = await loadPair(cfg.interval, cfg.range);
  if (!data) { console.log(`\n### ${cfg.label}\n  Data alınmadı — keçildi.`); continue; }
  const { gold, goldSym, dxyC, dxyBars } = data;
  const useDxy = dxyBars > 100;
  const days = (gold[gold.length - 1].t - gold[0].t) / 86_400_000;

  console.log(`\n\n### ${cfg.label}`);
  console.log(`    ${goldSym} · ${gold.length} şam · ${days.toFixed(0)} gün · ` +
    `${new Date(gold[0].t).toISOString().slice(0, 10)} → ${new Date(gold[gold.length - 1].t).toISOString().slice(0, 10)}` +
    ` · DXY ${useDxy ? "✓" : "✗"}`);

  const main = simulate(gold, dxyC, { useDxy });
  console.log("  ── Pine default konfiqurasiyası ──");
  report("TAM DÖVR", main.trades);
  const mid = Math.floor(main.trades.length / 2);
  report("  1-ci yarı", main.trades.slice(0, mid));
  report("  2-ci yarı", main.trades.slice(mid));
  report("  Yalnız LONG", main.trades.filter((t) => t.dir === 1));
  report("  Yalnız SHORT", main.trades.filter((t) => t.dir === -1));
  if (main.openAtEnd) console.log("  (1 mövqe sonda açıq qalıb — sayılmayıb)");

  console.log("  ── Dəyişikliklər ──");
  const variants = [
    ["Bias SƏRT (EMA21 VƏ HTF, 'və ya' yox)", { strictBias: true, useDxy }],
    ["Swing rejim (yalnız HTF bias)", { scalp: false, useDxy }],
    ["Kill zone filtri SÖNÜLÜ", { kzFilter: false, useDxy }],
    ["DXY filtri SÖNÜLÜ", { useDxy: false }],
    ["TP1 = 1.5R", { tp1RR: 1.5, tp2RR: 3.0, useDxy }],
    ["Min SL 1.00×ATR (geniş stop)", { minSlAtr: 1.0, useDxy }],
    ["Spread SIFIR", { spread: 0, useDxy }],
  ];
  for (const [name, o] of variants) {
    report(name, simulate(gold, dxyC, o).trades);
  }
}

console.log("\n\n1R = əməliyyat başına risk. $1000 hesab + 1.5% risk = $15 → +10R ≈ +$150.");
console.log("t ≥ 2 olmayanda nəticə statistik olaraq təsadüfdən fərqlənmir.\n");
