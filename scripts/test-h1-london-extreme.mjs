// ════════════════════════════════════════════════════════════════════════════
//  FƏRZİYYƏ 1 — "Günün ekstremumu London seansında yaranır"
//
//  Mənbə iddiası (D17 @00:05:12, kadr 41/f_00082):
//    "Bullish olduğu zaman market — günün LOW-unu LONDRA-da yapar."
//    "London Open Killzone generally creates the High or Low of the day."
//
//  Bu, bütün Power of Three çərçivəsinin təməlidir: Asiya=akkumulyasiya,
//  London=manipulyasiya (günün ekstremumu), NY=distribusiya.
//  Əgər bu YANLIŞDIRSA, indikatorun killzone məntiqi əsassız qalır.
//
//  Metodologiya (Aronson — knowledge/KITAB-DERSLERI.md §1, §4):
//    • İddia falsifikasiya edilə bilən formaya çevrilib
//    • BENCHMARK məcburidir: London eyni uzunluqda TƏSADÜFİ pəncərə ilə
//      müqayisə edilir. "60% London-dadır" özü-özlüyündə heç nə demir —
//      əgər təsadüfi 3 saatlıq pəncərə də 55% verirsə, edge ~yoxdur.
//    • Binomial z-testi + permutation testi
//
//  İstifadə:  node scripts/test-h1-london-extreme.mjs [SIMVOL]
// ════════════════════════════════════════════════════════════════════════════

const SYMBOL = process.argv[2] || "NQ=F";

// NY vaxtı ilə seans pəncərələri (dəqiqə, gün başından)
const SESSIONS = {
  "Asiya  (20:00–00:00)": [1200, 1440],
  "London (02:00–05:00)": [120, 300],
  "NY AM  (09:30–11:00)": [570, 660],
  "NY PM  (13:30–16:00)": [810, 960],
};
const LONDON_LEN = 180; // 3 saat — benchmark pəncərəsi eyni uzunluqda olmalıdır

async function fetchYahoo(symbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const r = (await res.json())?.chart?.result?.[0];
  if (!r) throw new Error(`${symbol}: boş cavab`);
  const t = r.timestamp || [];
  const q = r.indicators.quote[0];
  const out = [];
  for (let i = 0; i < t.length; i++) {
    if (q.close[i] == null || q.high[i] == null || q.low[i] == null || q.open[i] == null) continue;
    out.push({ t: t[i] * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] });
  }
  return out;
}

// Şamın NY vaxtı ilə gün-daxili dəqiqəsi və NY tarixi
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function nyParts(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}

function inWin(min, [a, b]) {
  return a <= b ? min >= a && min < b : min >= a || min < b;
}

// ── Statistika ──
// Binomial z: müşahidə edilən nisbət təsadüfi gözləntidən nə qədər fərqlidir
function binomZ(hits, n, p0) {
  if (n === 0) return 0;
  const p = hits / n;
  const se = Math.sqrt((p0 * (1 - p0)) / n);
  return se > 0 ? (p - p0) / se : 0;
}
// İki nisbətin müqayisəsi (London vs benchmark)
function twoPropZ(h1, n1, h2, n2) {
  if (!n1 || !n2) return 0;
  const p1 = h1 / n1, p2 = h2 / n2;
  const pp = (h1 + h2) / (n1 + n2);
  const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  return se > 0 ? (p1 - p2) / se : 0;
}

(async () => {
  console.log(`\n═══ FƏRZİYYƏ 1: günün ekstremumu London-da yaranırmı? ═══`);
  console.log(`Simvol: ${SYMBOL}\n`);

  let bars;
  try {
    bars = await fetchYahoo(SYMBOL, "5m", "60d");   // Yahoo 5m üçün maks ~60 gün
  } catch (e) {
    console.error("Data alınmadı:", e.message);
    process.exit(1);
  }
  if (bars.length < 500) {
    console.error(`Kifayət qədər data yoxdur (${bars.length} şam).`);
    process.exit(1);
  }

  // Günlərə böl (NY tarixi ilə)
  const days = new Map();
  for (const b of bars) {
    const { date, min } = nyParts(b.t);
    if (!days.has(date)) days.set(date, []);
    days.get(date).push({ ...b, min });
  }

  // Yalnız tam günlər: ən azı London + NY AM pəncərələri örtülməlidir
  const full = [];
  for (const [date, list] of days) {
    list.sort((a, b) => a.t - b.t);
    const hasLon = list.some((x) => inWin(x.min, SESSIONS["London (02:00–05:00)"]));
    const hasNy = list.some((x) => inWin(x.min, SESSIONS["NY AM  (09:30–11:00)"]));
    if (hasLon && hasNy && list.length >= 100) full.push({ date, list });
  }
  console.log(`Data: ${bars.length} şam · ${days.size} gün · ${full.length} tam gün analiz edilir\n`);
  if (full.length < 20) {
    console.error("Tam gün sayı çox azdır — nəticə mənasız olar.");
    process.exit(1);
  }

  // ── Hər gün üçün: ekstremum hansı seansda yarandı? ──
  const counts = {};
  for (const k of Object.keys(SESSIONS)) counts[k] = { hi: 0, lo: 0 };
  let bullDays = 0, bearDays = 0;
  let bullLowLondon = 0, bearHighLondon = 0;

  // Benchmark: eyni uzunluqda hər mümkün pəncərə (30 dəq addımla)
  const benchWins = [];
  for (let s = 0; s < 1440; s += 30) benchWins.push([s, (s + LONDON_LEN) % 1440]);
  const benchHit = new Array(benchWins.length).fill(0);

  for (const { list } of full) {
    let hi = -Infinity, lo = Infinity, hiMin = null, loMin = null;
    for (const b of list) {
      if (b.h > hi) { hi = b.h; hiMin = b.min; }
      if (b.l < lo) { lo = b.l; loMin = b.min; }
    }
    const bullish = list[list.length - 1].c > list[0].o;
    if (bullish) bullDays++; else bearDays++;

    for (const [name, win] of Object.entries(SESSIONS)) {
      if (inWin(hiMin, win)) counts[name].hi++;
      if (inWin(loMin, win)) counts[name].lo++;
    }
    // Əsas iddia: bullish gündə günün LOW-u London-da
    if (bullish && inWin(loMin, SESSIONS["London (02:00–05:00)"])) bullLowLondon++;
    if (!bullish && inWin(hiMin, SESSIONS["London (02:00–05:00)"])) bearHighLondon++;

    // Benchmark: ekstremumlardan HƏR HANSI biri pəncərədədirmi
    benchWins.forEach((w, i) => {
      if (inWin(hiMin, w) || inWin(loMin, w)) benchHit[i]++;
    });
  }

  const N = full.length;
  // Təsadüfi gözlənti: pəncərə 24 saatın 3-ü = 12.5%; iki ekstremumdan biri üçün ~23.4%
  const pWin = LONDON_LEN / 1440;
  const pAny = 1 - (1 - pWin) ** 2;

  console.log("── Ekstremum hansı seansda yarandı? ──");
  console.log("seans                   high     low     hər ikisindən biri");
  for (const [name, c] of Object.entries(counts)) {
    const any = ((c.hi + c.lo) / N * 100).toFixed(1);
    console.log(
      `${name.padEnd(22)} ${String((c.hi / N * 100).toFixed(1)).padStart(5)}%  ` +
      `${String((c.lo / N * 100).toFixed(1)).padStart(5)}%   ${String(any).padStart(5)}%`
    );
  }

  const lon = counts["London (02:00–05:00)"];
  const lonAny = lon.hi + lon.lo;
  const zLon = binomZ(lonAny, N, pAny);

  console.log(`\n── ƏSAS TEST ──`);
  console.log(`London pəncərəsi günün 3/24 hissəsidir → təsadüfi gözlənti: ${(pAny * 100).toFixed(1)}%`);
  console.log(`Müşahidə: ${lonAny}/${N} = ${(lonAny / N * 100).toFixed(1)}%   z = ${zLon.toFixed(2)}`);
  console.log(zLon >= 2 ? "  ✅ təsadüfdən statistik olaraq YÜKSƏK" :
              zLon <= -2 ? "  ❗ təsadüfdən AŞAĞI" : "  ⚪ təsadüfdən fərqlənmir");

  // ── Benchmark: London ən yaxşı pəncərədirmi? ──
  const ranked = benchWins.map((w, i) => ({ w, hit: benchHit[i] })).sort((a, b) => b.hit - a.hit);
  const lonRank = ranked.findIndex(r => r.w[0] === SESSIONS["London (02:00–05:00)"][0]) + 1;
  const hh = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  console.log(`\n── BENCHMARK: eyni uzunluqda bütün ${benchWins.length} pəncərə ──`);
  console.log("Ən çox ekstremum tutan 5 pəncərə (NY vaxtı):");
  ranked.slice(0, 5).forEach((r, i) =>
    console.log(`  ${i + 1}. ${hh(r.w[0])}–${hh((r.w[0] + LONDON_LEN) % 1440)}  ${(r.hit / N * 100).toFixed(1)}%`)
  );
  console.log(`\n  London-un yeri: ${lonRank}/${benchWins.length}`);
  if (lonRank > benchWins.length * 0.25) {
    console.log("  ❗ London xüsusi deyil — başqa pəncərələr daha yaxşıdır.");
  } else {
    console.log("  ✅ London yuxarı çeyrəkdədir.");
  }

  // ── Yönə görə iddia ──
  console.log(`\n── "Bullish gündə low London-da" iddiası ──`);
  const zb = binomZ(bullLowLondon, bullDays, pWin);
  const zr = binomZ(bearHighLondon, bearDays, pWin);
  console.log(`Bullish günlər: ${bullLowLondon}/${bullDays} = ${(bullLowLondon / bullDays * 100).toFixed(1)}%  (təsadüfi ${(pWin * 100).toFixed(1)}%)  z=${zb.toFixed(2)}`);
  console.log(`Bearish günlər: ${bearHighLondon}/${bearDays} = ${(bearHighLondon / bearDays * 100).toFixed(1)}%  (təsadüfi ${(pWin * 100).toFixed(1)}%)  z=${zr.toFixed(2)}`);

  // ── Permutation testi (Aronson §3): günləri qarışdır ──
  const perm = 2000;
  let better = 0;
  const allMins = [];
  for (const { list } of full) {
    let hi = -Infinity, lo = Infinity, hiMin = null, loMin = null;
    for (const b of list) {
      if (b.h > hi) { hi = b.h; hiMin = b.min; }
      if (b.l < lo) { lo = b.l; loMin = b.min; }
    }
    allMins.push([hiMin, loMin]);
  }
  for (let p = 0; p < perm; p++) {
    // Pəncərəni təsadüfi yerə sürüşdür, eyni uzunluqda
    const s = Math.floor(Math.random() * 1440);
    const w = [s, (s + LONDON_LEN) % 1440];
    let hit = 0;
    for (const [h, l] of allMins) if (inWin(h, w) || inWin(l, w)) hit++;
    if (hit >= lonAny) better++;
  }
  const pct = (1 - better / perm) * 100;
  console.log(`\n── PERMUTATION TESTİ (${perm} təsadüfi pəncərə) ──`);
  console.log(`London ${pct.toFixed(1)} persentildədir.`);
  console.log(pct >= 95 ? "  ✅ 95% həddini keçir — pəncərə xüsusidir" :
                          "  ❗ 95% həddini KEÇMİR — London təsadüfi pəncərədən fərqlənmir");

  console.log(`\n═══ NƏTİCƏ ═══`);
  const pass = zLon >= 2 && pct >= 95;
  console.log(pass
    ? "Fərziyyə 1 bu datada TƏSDİQLƏNİR. Killzone məntiqinin təməli var."
    : "Fərziyyə 1 bu datada TƏSDİQLƏNMİR.\n" +
      "Bu, killzone filtrinin dəyərini şübhə altına alır — indikatorda\n" +
      "'yalnız trade pəncərəsində siqnal' seçimini söndürüb nəticəni müqayisə et.");
  console.log(`\n⚠️ Məhdudiyyət: Yahoo 5m datası ~60 gün verir (${N} gün). Bu, ilkin\n` +
              `göstəricidir; qəti nəticə üçün daha uzun data lazımdır (Aronson §2 —\n` +
              `az nümunədən nəticə çıxarmaq data-mining bias-ın bir formasıdır).\n`);
})();
