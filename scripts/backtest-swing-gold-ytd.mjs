// ════════════════════════════════════════════════════════════════════════════
//  SWING SİQNALLARI — QIZIL, YANVARDAN BƏRİ
//
//  Botun işlətdiyi EYNİ funksiya (swing-sweep-engine.mjs → runSweepStrategy)
//  qızıl üzərində işlədilir və YALNIZ seçilmiş tarixdən sonrakı əməliyyatlar
//  hesablanır. Ayrıca "canlı" məntiq yoxdur — nəticə botun real davranışıdır.
//
//  İstifadə: node scripts/backtest-swing-gold-ytd.mjs [BAŞLANĞIC] [SIMVOL]
//     məs.  node scripts/backtest-swing-gold-ytd.mjs 2026-01-01 GC=F
// ════════════════════════════════════════════════════════════════════════════

import { runSweepStrategy, swingStats, SWING_DEFAULTS } from "../swing-sweep-engine.mjs";

const FROM = process.argv[2] || "2026-01-01";
const SYM = process.argv[3] || "GC=F";
const FROM_MS = new Date(FROM + "T00:00:00Z").getTime();

async function fetchYahoo(sym, interval = "60m", range = "730d") {
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

const dstr = (ms) => new Date(ms).toISOString().slice(0, 10);
const mstr = (ms) => new Date(ms).toISOString().slice(0, 7);
const pad = (s, n) => String(s).padStart(n);

(async () => {
  console.log(`\n═══ SWING SİQNALLARI — ${SYM}, ${FROM} tarixindən ═══`);
  console.log(`${SWING_DEFAULTS.interval} · diapazon ${SWING_DEFAULTS.rangeLen} · ` +
    `trailing ATR×${SWING_DEFAULTS.trailAtr} · xərc ${SWING_DEFAULTS.costPct}% daxil\n`);

  const bars = await fetchYahoo(SYM);
  if (bars.length < 300) { console.log("kifayət qədər data yoxdur"); return; }
  console.log(`data: ${dstr(bars[0].t)} → ${dstr(bars[bars.length - 1].t)}  (${bars.length} saatlıq şam)\n`);

  const { trades, open } = runSweepStrategy(bars);
  const win = trades.filter((x) => x.t >= FROM_MS);
  if (!win.length) { console.log("bu dövrdə əməliyyat yoxdur"); return; }

  // ── hər əməliyyat ──
  console.log("№   tarix        istiqamət  giriş      çıxış      nəticə   səbəb");
  win.forEach((x, k) => {
    console.log(
      `${pad(k + 1, 2)}  ${dstr(x.t)}   ${(x.dir === 1 ? "LONG" : "SHORT").padEnd(9)}` +
      `${pad(x.entry.toFixed(2), 9)}  ${pad(x.exitPx.toFixed(2), 9)}  ` +
      `${pad((x.r >= 0 ? "+" : "") + x.r.toFixed(2) + "R", 8)}  ${x.reason}`,
    );
  });

  // ── aylıq bölgü ──
  const byMonth = {};
  for (const x of win) {
    const m = mstr(x.t);
    (byMonth[m] ||= []).push(x.r);
  }
  console.log("\n── AYLIQ ──");
  console.log("ay        trade  uğurlu   uğur%    cəm R");
  for (const m of Object.keys(byMonth).sort()) {
    const rs = byMonth[m];
    const w = rs.filter((x) => x > 0).length;
    const sum = rs.reduce((a, b) => a + b, 0);
    console.log(`${m}   ${pad(rs.length, 5)}  ${pad(w, 6)}  ${pad(((100 * w) / rs.length).toFixed(0) + "%", 6)}  ` +
      `${pad((sum >= 0 ? "+" : "") + sum.toFixed(2), 7)}`);
  }

  // ── yekun ──
  const rs = win.map((x) => x.r);
  const S = swingStats(rs);
  const losses = rs.filter((x) => x <= 0);
  let eq = 0, peak = 0, dd = 0;
  for (const r of rs) { eq += r; peak = Math.max(peak, eq); dd = Math.min(dd, eq - peak); }
  const avgL = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

  console.log("\n── YEKUN ──");
  console.log(`  əməliyyat sayı     : ${S.n}`);
  console.log(`  ⭐ UĞURLULUQ FAİZİ : ${S.wr.toFixed(1)}%   (${rs.filter((x) => x > 0).length} uğurlu / ${losses.length} itkili)`);
  console.log(`  orta qazanan       : +${S.avgW.toFixed(2)}R`);
  console.log(`  orta itirən        : ${avgL.toFixed(2)}R`);
  console.log(`  expectancy         : ${S.mean >= 0 ? "+" : ""}${S.mean.toFixed(3)}R / əməliyyat`);
  console.log(`  cəmi               : ${S.sum >= 0 ? "+" : ""}${S.sum.toFixed(2)}R`);
  console.log(`  ən dərin düşüş     : ${dd.toFixed(2)}R`);
  console.log(`  t-statistika       : ${S.t.toFixed(2)}${Math.abs(S.t) < 2 ? "  (|t|<2 → bu nümunə sıfırdan fərqləndirilə bilmir)" : ""}`);
  if (open && open.t >= FROM_MS)
    console.log(`  açıq mövqe         : ${open.dir === 1 ? "LONG" : "SHORT"} @ ${open.entry.toFixed(2)}, stop ${open.sl.toFixed(2)}`);

  console.log(`\n  💵 1% risklə: ${S.sum >= 0 ? "+" : ""}${S.sum.toFixed(1)}% · ` +
    `$1000 hesabda ${S.sum >= 0 ? "+" : ""}$${(S.sum * 10).toFixed(0)}`);

  console.log(`\n⚠️ Trailing stop sistemində AŞAĞI uğur faizi normaldır — dizayn belədir:`);
  console.log(`   çox kiçik itki, az sayda böyük qazanc. Uğur faizinə TƏK BAŞINA baxma,`);
  console.log(`   expectancy (uğur% × ortaQazanc − itki% × ortaİtki) həlledicidir.`);
  console.log(`\n⚠️ ${S.n} əməliyyat az nümunədir (Kahneman: <30 = gurultu). Bu rəqəm`);
  console.log(`   2 illik ölçmənin (2148 əməliyyat, +0.082R) yerini TUTMUR.\n`);
})();
