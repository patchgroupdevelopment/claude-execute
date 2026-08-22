// XAU DİAQNOSTİKA — "nədə səhv edirik?" sualına cavab.
//
// Strategiya qurmaq ƏVƏZİNƏ, onun altındakı FƏRZİYYƏLƏRİ təkbaşına ölçür.
// Əsas sual: likidite sweep-dən sonra qiymət həqiqətən dönürmü?
//
// Metod: hər hadisədən sonra N şam ərzində
//   MFE = maksimum xeyrimizə hərəkət (ATR vahidi ilə)
//   MAE = maksimum əleyhimizə hərəkət (ATR vahidi ilə)
// Əgər MFE ≈ MAE isə → edge yoxdur, TP/SL harada qoyulsa da fərq etməz.
// Nəticələr HƏMİŞƏ baza ilə (təsadüfi şam) müqayisə edilir — çünki bazarın
// öz trendi hər ölçünü şişirdə bilər.

const SYMBOL = "GC=F";
const CONFIGS = [
  { interval: "1h", range: "3mo" },
  { interval: "15m", range: "60d" },
];
const HORIZONS = [4, 12, 24]; // neçə şam sonraya baxılır

async function fetchYahoo(symbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const r = (await res.json())?.chart?.result?.[0];
  const t = r.timestamp || [];
  const q = r.indicators.quote[0];
  const out = [];
  for (let i = 0; i < t.length; i++) {
    if (q.close[i] == null || q.high[i] == null || q.low[i] == null || q.open[i] == null) continue;
    out.push({ t: t[i] * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] });
  }
  return out;
}

function atrSeries(bars, period = 14) {
  const out = new Array(bars.length).fill(null);
  const tr = [null];
  for (let i = 1; i < bars.length; i++) {
    tr.push(Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - bars[i - 1].c), Math.abs(bars[i].l - bars[i - 1].c)));
  }
  if (bars.length < period + 1) return out;
  let a = tr.slice(1, period + 1).reduce((x, y) => x + y, 0) / period;
  out[period] = a;
  for (let i = period + 1; i < bars.length; i++) {
    a = (a * (period - 1) + tr[i]) / period;
    out[i] = a;
  }
  return out;
}

const nyFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
function nyHHMM(ms) {
  const p = nyFmt.formatToParts(new Date(ms));
  return +p.find((x) => x.type === "hour").value * 100 + +p.find((x) => x.type === "minute").value;
}
function inSess(hhmm, [s, e]) { return s <= e ? hhmm >= s && hhmm < e : hhmm >= s || hhmm < e; }

const SESSIONS = { asia: [1900, 400], london: [300, 1130], ny: [800, 1700] };
const KZ = [[2000, 0], [200, 500], [830, 1100], [1330, 1600]];

// Hadisədən sonrakı MFE/MAE-ni ATR vahidi ilə ölçür.
// dir = +1 (yuxarı gözləyirik), -1 (aşağı gözləyirik)
function excursion(bars, i, dir, horizon, atr) {
  const entry = bars[i].c;
  let mfe = 0, mae = 0;
  const end = Math.min(i + horizon, bars.length - 1);
  for (let k = i + 1; k <= end; k++) {
    const up = (bars[k].h - entry) / atr;
    const dn = (entry - bars[k].l) / atr;
    if (dir === 1) { mfe = Math.max(mfe, up); mae = Math.max(mae, dn); }
    else { mfe = Math.max(mfe, dn); mae = Math.max(mae, up); }
  }
  const fwd = ((bars[end].c - entry) / atr) * dir;
  return { mfe, mae, fwd };
}

function stats(arr) {
  if (!arr.length) return null;
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const varr = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const se = Math.sqrt(varr / n);
  return { n, mean, se, t: se > 0 ? mean / se : 0 };
}

function line(label, ev, hz) {
  const f = stats(ev.map((e) => e.fwd));
  const mfe = stats(ev.map((e) => e.mfe));
  const mae = stats(ev.map((e) => e.mae));
  if (!f) { console.log(`    ${label.padEnd(34)} — hadisə yoxdur`); return; }
  const ratio = mae.mean > 0 ? mfe.mean / mae.mean : 0;
  const flag = Math.abs(f.t) >= 2 ? (f.mean > 0 ? " ✅" : " ❗") : "";
  console.log(
    `    ${label.padEnd(34)} n=${String(f.n).padStart(4)} | ` +
    `irəli ${f.mean >= 0 ? "+" : ""}${f.mean.toFixed(3)} ATR (t=${f.t.toFixed(2)})${flag} | ` +
    `MFE ${mfe.mean.toFixed(2)} / MAE ${mae.mean.toFixed(2)} = ${ratio.toFixed(2)}`,
  );
}

for (const cfg of CONFIGS) {
  const bars = await fetchYahoo(SYMBOL, cfg.interval, cfg.range);
  const atr = atrSeries(bars);
  const days = (bars[bars.length - 1].t - bars[0].t) / 86_400_000;

  console.log(`\n\n╔═══ ${cfg.interval.toUpperCase()} · ${bars.length} şam · ${days.toFixed(0)} gün ═══╗`);

  // Seans High/Low izlə
  const st = {};
  for (const k of Object.keys(SESSIONS)) st[k] = { hi: null, lo: null, pHi: null, pLo: null, prev: false };
  let prevDay = null, dayHi = null, dayLo = null, pdH = null, pdL = null;

  // Hadisə siyahıları
  const ev = {
    baseUp: [], baseDn: [],
    sweepRev: [],      // sweep → DÖNÜŞ gözləyirik (bizim hazırkı fərziyyə)
    sweepCont: [],     // sweep → DAVAM gözləyirik (əks fərziyyə)
    breakCont: [],     // sadə qırılma (şam o tayda bağlanır) → davam
    sweepInKz: [],     // sweep + kill zone
    sweepOutKz: [],    // sweep + kill zone-dan kənar
    sweepPd: [],       // yalnız dünənki High/Low sweep-i
    sweepSess: [],     // yalnız seans High/Low sweep-i
    swLowRevUp: [],    // aşağı sweep → YUXARI (long dönüş)
    swHighRevDn: [],   // yuxarı sweep → AŞAĞI (short dönüş)
  };

  for (const hz of [12]) { /* placeholder — aşağıda hər horizont üçün yığılır */ }

  const HZ = HORIZONS[1]; // əsas horizont: 12 şam
  for (let i = 30; i < bars.length - HZ - 1; i++) {
    const b = bars[i];
    const a = atr[i];
    if (a == null || a <= 0) continue;
    const hhmm = nyHHMM(b.t);

    // gün
    const dk = new Date(b.t).toISOString().slice(0, 10);
    if (dk !== prevDay) {
      if (dayHi != null) { pdH = dayHi; pdL = dayLo; }
      dayHi = b.h; dayLo = b.l; prevDay = dk;
    } else { dayHi = Math.max(dayHi, b.h); dayLo = Math.min(dayLo, b.l); }

    // seans
    for (const [name, rng] of Object.entries(SESSIONS)) {
      const act = inSess(hhmm, rng);
      const s = st[name];
      if (act && !s.prev) { s.hi = b.h; s.lo = b.l; }
      else if (act) { s.hi = Math.max(s.hi, b.h); s.lo = Math.min(s.lo, b.l); }
      if (!act && s.prev) { s.pHi = s.hi; s.pLo = s.lo; }
      s.prev = act;
    }

    // Baza: hər şamdan sonrakı hərəkət (edge olmayan hal)
    ev.baseUp.push(excursion(bars, i, 1, HZ, a));
    ev.baseDn.push(excursion(bars, i, -1, HZ, a));

    const sessLo = [st.asia.pLo, st.london.pLo, st.ny.pLo];
    const sessHi = [st.asia.pHi, st.london.pHi, st.ny.pHi];
    const allLo = [...sessLo, pdL];
    const allHi = [...sessHi, pdH];

    const swUp = allLo.some((L) => L != null && b.l < L && b.c > L && b.c > b.o);
    const swDn = allHi.some((L) => L != null && b.h > L && b.c < L && b.c < b.o);
    // Sadə qırılma: səviyyəni keçib O TAYDA bağlanır (davam fərziyyəsi)
    const brUp = allHi.some((L) => L != null && b.c > L && bars[i - 1].c <= L);
    const brDn = allLo.some((L) => L != null && b.c < L && bars[i - 1].c >= L);

    const inKz = KZ.some((r) => inSess(hhmm, r));

    if (swUp || swDn) {
      const d = swUp ? 1 : -1;
      ev.sweepRev.push(excursion(bars, i, d, HZ, a));
      ev.sweepCont.push(excursion(bars, i, -d, HZ, a));
      (inKz ? ev.sweepInKz : ev.sweepOutKz).push(excursion(bars, i, d, HZ, a));
      const pdOnly = swUp ? (pdL != null && b.l < pdL && b.c > pdL) : (pdH != null && b.h > pdH && b.c < pdH);
      (pdOnly ? ev.sweepPd : ev.sweepSess).push(excursion(bars, i, d, HZ, a));
      // NƏZARƏT: istiqamətə görə ayır. Bazar trenddə olanda "davam" fərziyyəsi
      // sırf trendə görə yaxşı görünə bilər — bunu ayırd etmək üçün hər tərəf
      // ÖZ bazası ilə müqayisə edilməlidir.
      if (swUp) ev.swLowRevUp.push(excursion(bars, i, 1, HZ, a));
      if (swDn) ev.swHighRevDn.push(excursion(bars, i, -1, HZ, a));
    }
    if (brUp || brDn) {
      ev.breakCont.push(excursion(bars, i, brUp ? 1 : -1, HZ, a));
    }
  }

  console.log(`\n  ── ${HZ} şam irəli baxış (ATR vahidi ilə) ──`);
  console.log(`  BAZA (edge olmasa nə görünür):`);
  line("Hər şam · yuxarı fərz et", ev.baseUp, HZ);
  line("Hər şam · aşağı fərz et", ev.baseDn, HZ);

  console.log(`\n  BİZİM FƏRZİYYƏ (sweep → dönüş):`);
  line("Sweep → DÖNÜŞ", ev.sweepRev, HZ);
  line("Sweep → DAVAM (əks fərziyyə)", ev.sweepCont, HZ);

  console.log(`\n  ALT-QRUPLAR:`);
  line("Sweep · kill zone İÇİNDƏ", ev.sweepInKz, HZ);
  line("Sweep · kill zone XARİCİNDƏ", ev.sweepOutKz, HZ);
  line("Sweep · dünənki H/L", ev.sweepPd, HZ);
  line("Sweep · seans H/L", ev.sweepSess, HZ);

  console.log(`\n  NƏZARƏT — istiqamətə görə (öz bazası ilə müqayisə et!):`);
  line("Aşağı sweep → LONG", ev.swLowRevUp, HZ);
  line("   ↳ bazası: hər şam · yuxarı", ev.baseUp, HZ);
  line("Yuxarı sweep → SHORT", ev.swHighRevDn, HZ);
  line("   ↳ bazası: hər şam · aşağı", ev.baseDn, HZ);

  console.log(`\n  ALTERNATİV FƏRZİYYƏ:`);
  line("Qırılma → DAVAM (breakout)", ev.breakCont, HZ);
}

console.log(`
────────────────────────────────────────────────────────────────────────
NECƏ OXUNUR:
 • "irəli" = ${HORIZONS[1]} şam sonra orta hərəkət (ATR vahidi, işarə fərziyyə lehinə)
 • t ≥ 2 → real siqnal.  t < 2 → təsadüfdən fərqlənmir.
 • MFE/MAE nisbəti: 1.00 = simmetrik (edge YOX). 1.3+ = əsl asimmetriya.
 • Bazanı mütləq müqayisə et — bazar özü trenddədirsə, hər ölçü şişir.
────────────────────────────────────────────────────────────────────────
`);
