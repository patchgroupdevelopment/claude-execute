// ════════════════════════════════════════════════════════════════════════════
//  SWING MÜHƏRRİKİNİN DOĞRULANMASI
//
//  Botun işlətdiyi MƏHZ həmin funksiya (swing-sweep-engine.mjs → runSweepStrategy)
//  tarixçə üzərində işlədilir və nəticə ölçdüyümüz rəqəmlərlə müqayisə olunur.
//  Məqsəd: canlı davranışın backtestdən SÜRÜŞMƏDİYİNİ sübut etmək.
//
//  Gözlənilən (7 alət × 2 il × 60m, xərc 0.006%):
//     ~2148 əməliyyat · qazanma ~35% · expectancy ~+0.082R · t ~2.18
//
//  İstifadə: node scripts/verify-swing-engine.mjs
// ════════════════════════════════════════════════════════════════════════════

import { runSweepStrategy, swingStats, SWING_ASSETS, SWING_DEFAULTS } from "../swing-sweep-engine.mjs";

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

const pad = (s, n) => String(s).padStart(n);

(async () => {
  console.log("\n═══ SWING MÜHƏRRİKİ — DOĞRULAMA ═══");
  console.log(`${SWING_DEFAULTS.interval} · diapazon ${SWING_DEFAULTS.rangeLen} · ` +
    `trailing ATR×${SWING_DEFAULTS.trailAtr} · xərc ${SWING_DEFAULTS.costPct}%\n`);
  console.log("alət        trade  qazanc%    orta R      t   açıq mövqe");

  const all = [];
  const allT = [];
  for (const a of SWING_ASSETS) {
    let bars;
    try { bars = await fetchYahoo(a.t, SWING_DEFAULTS.interval); }
    catch (e) { console.log(`${a.t.padEnd(11)} data alınmadı (${e.message})`); continue; }
    if (bars.length < 300) { console.log(`${a.t.padEnd(11)} az data`); continue; }
    const { trades, open } = runSweepStrategy(bars);
    const rs = trades.map((x) => x.r);
    all.push(...rs);
    allT.push(...trades.map((x) => x.t));
    const st = swingStats(rs);
    console.log(
      `${a.t.padEnd(11)}${pad(st.n, 5)}${pad(st.wr.toFixed(0) + "%", 9)}` +
      `${pad((st.mean >= 0 ? "+" : "") + st.mean.toFixed(3), 10)}${pad(st.t.toFixed(2), 7)}   ` +
      (open ? `${open.dir === 1 ? "LONG" : "SHORT"} @ ${open.entry.toFixed(2)}` : "—"),
    );
  }

  const T = swingStats(all);
  console.log("─".repeat(62));
  console.log(`${"CƏMİ".padEnd(11)}${pad(T.n, 5)}${pad(T.wr.toFixed(0) + "%", 9)}` +
    `${pad((T.mean >= 0 ? "+" : "") + T.mean.toFixed(3), 10)}${pad(T.t.toFixed(2), 7)}`);

  // zaman-yarısı sabitliyi
  if (allT.length === all.length && all.length >= 40) {
    const idx = allT.map((t, k) => [t, all[k]]).sort((x, y) => x[0] - y[0]);
    const m = Math.floor(idx.length / 2);
    const h1 = swingStats(idx.slice(0, m).map((x) => x[1]));
    const h2 = swingStats(idx.slice(m).map((x) => x[1]));
    console.log(`zaman-yarısı: 1-ci ${(h1.mean >= 0 ? "+" : "") + h1.mean.toFixed(3)}R · ` +
      `2-ci ${(h2.mean >= 0 ? "+" : "") + h2.mean.toFixed(3)}R  ` +
      `${h1.mean > 0 === h2.mean > 0 ? "✅ eyni işarə" : "❌ işarə dəyişir"}`);
  }

  // sürüşmə yoxlaması
  const ok = T.n > 1800 && T.n < 2500 && T.mean > 0.05 && T.mean < 0.12;
  console.log(`\n${ok ? "✅ Mühərrik ölçülmüş davranışa UYĞUNDUR" :
    "❌ SÜRÜŞMƏ — canlı məntiq ölçmədən fərqlənir, dərhal araşdır"}` +
    `  (gözlənilən ~2148 trade · ~+0.082R)`);
  console.log(`\n⚠️ +0.082R qəbul həddindən (+0.15R) aşağıdır — modul EKSPERİMENTAL,` +
    ` kağız üzərində izlənilir.\n`);
})();
