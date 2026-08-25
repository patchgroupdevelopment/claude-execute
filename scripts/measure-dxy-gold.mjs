// ════════════════════════════════════════════════════════════════════════════
//  DXY ↔ QIZIL TƏRS KORRELYASİYASI — ölçmə
//
//  İddia: "DXY qalxanda qızıl düşür, DXY düşəndə qızıl qalxır."
//  Bu, məlum əlaqədir — AMMA bizim qaydamız (knowledge/KITAB-DERSLERI.md §1):
//  kodlamazdan əvvəl FALSİFİKASİYA EDİLƏ BİLƏN formada ölç.
//
//  Üç ayrı sual ölçülür:
//   1. Korrelyasiya nə qədər güclüdür? (5m qaytarımları üzərində)
//   2. SABİTDİRMİ, yoxsa dövr-dövr pozulur? (yuvarlanan korrelyasiya)
//   3. ⭐ ƏSAS SUAL: DXY istiqaməti qızılın SONRAKI hərəkətini
//      proqnozlaşdırırmı? (korrelyasiya ≠ proqnoz — eyni anda hərəkət
//      etmək bir şeydir, ƏVVƏLCƏDƏN xəbər vermək tam başqa şey.)
//
//  İstifadə: node scripts/measure-dxy-gold.mjs
// ════════════════════════════════════════════════════════════════════════════

const GOLD = "GC=F";
const DXY_CANDIDATES = ["DX=F", "DX-Y.NYB"];

async function fetchY(sym, interval = "5m", range = "60d") {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`${sym}: HTTP ${r.status}`);
  const d = (await r.json())?.chart?.result?.[0];
  if (!d?.timestamp) throw new Error(`${sym}: boş`);
  const t = d.timestamp, q = d.indicators.quote[0], o = [];
  for (let i = 0; i < t.length; i++) {
    if (q.close[i] == null) continue;
    o.push({ t: t[i] * 1000, c: q.close[i] });
  }
  return o;
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    sab += da * db; sa += da * da; sb += db * db;
  }
  return sa > 0 && sb > 0 ? sab / Math.sqrt(sa * sb) : 0;
}

function stats(arr) {
  const n = arr.length;
  if (!n) return { n: 0, mean: 0, se: 0, t: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const v = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const se = Math.sqrt(v / n);
  return { n, mean, se, t: se > 0 ? mean / se : 0 };
}

(async () => {
  console.log("\n═══ DXY ↔ QIZIL — ÖLÇMƏ ═══\n");

  // DXY üçün işləyən ticker tap
  let dxy = null, dxySym = null;
  for (const s of DXY_CANDIDATES) {
    try { dxy = await fetchY(s); dxySym = s; break; }
    catch (e) { console.log(`  ${s}: alınmadı (${e.message})`); }
  }
  if (!dxy) { console.error("DXY datası alınmadı."); process.exit(1); }
  const gold = await fetchY(GOLD);
  console.log(`DXY  : ${dxySym}  ${dxy.length} şam`);
  console.log(`QIZIL: ${GOLD}  ${gold.length} şam\n`);

  // Vaxta görə birləşdir (yalnız hər ikisində olan anlar)
  const dm = new Map(dxy.map((x) => [x.t, x.c]));
  const rows = [];
  for (const g of gold) { const d = dm.get(g.t); if (d != null) rows.push({ t: g.t, g: g.c, d }); }
  console.log(`Uyğunlaşan şam: ${rows.length}\n`);
  if (rows.length < 500) { console.error("Kifayət qədər üst-üstə düşən data yoxdur."); process.exit(1); }

  // Qaytarımlar
  const rg = [], rd = [];
  for (let i = 1; i < rows.length; i++) {
    rg.push((rows[i].g - rows[i - 1].g) / rows[i - 1].g);
    rd.push((rows[i].d - rows[i - 1].d) / rows[i - 1].d);
  }

  // ── 1. Ümumi korrelyasiya ──
  const r = pearson(rg, rd);
  console.log("── 1. EYNİ ANDA korrelyasiya (5m qaytarımları) ──");
  console.log(`   r = ${r.toFixed(3)}`);
  console.log(`   ${r < -0.5 ? "✅ güclü tərs" : r < -0.25 ? "🟡 orta tərs" : r < -0.1 ? "⚪ zəif tərs" : "❗ tərs əlaqə YOXDUR"}`);
  console.log(`   (İddia doğrudursa mənfi olmalıdır. -1 = mükəmməl tərs.)\n`);

  // ── 2. Sabitdirmi? Yuvarlanan korrelyasiya ──
  const W = 288; // ~1 gün (5m)
  const roll = [];
  for (let i = W; i < rg.length; i += 12) roll.push(pearson(rg.slice(i - W, i), rd.slice(i - W, i)));
  const neg = roll.filter((x) => x < 0).length;
  const strong = roll.filter((x) => x < -0.4).length;
  const pos = roll.filter((x) => x > 0.1).length;
  console.log("── 2. SABİTDİRMİ? (1 günlük yuvarlanan pəncərə) ──");
  console.log(`   pəncərə sayı: ${roll.length}`);
  console.log(`   tərs (r<0)      : ${(neg / roll.length * 100).toFixed(0)}%`);
  console.log(`   güclü tərs (<-0.4): ${(strong / roll.length * 100).toFixed(0)}%`);
  console.log(`   ❗ TƏRS DEYİL (r>+0.1): ${(pos / roll.length * 100).toFixed(0)}%`);
  console.log(`   min ${Math.min(...roll).toFixed(2)} · max ${Math.max(...roll).toFixed(2)}\n`);

  // ── 3. ⭐ PROQNOZ GÜCÜ — əsas sual ──
  // DXY-nin SON hərəkəti qızılın SONRAKI hərəkətini xəbər verirmi?
  console.log("── 3. ⭐ PROQNOZ GÜCÜ (korrelyasiya ≠ proqnoz) ──");
  console.log("   DXY son N şamda düşübsə → qızıl sonrakı N şamda qalxırmı?\n");
  console.log("   pəncərə   qızılın sonrakı hərəkəti (bp)          n      t");
  for (const N of [3, 6, 12, 24]) {
    const upAfterDxyDown = [], upAfterDxyUp = [];
    for (let i = N; i < rows.length - N; i++) {
      const dxyMove = (rows[i].d - rows[i - N].d) / rows[i - N].d;
      const goldFwd = (rows[i + N].g - rows[i].g) / rows[i].g * 10000; // bp
      if (dxyMove < -0.0005) upAfterDxyDown.push(goldFwd);
      else if (dxyMove > 0.0005) upAfterDxyUp.push(goldFwd);
    }
    const a = stats(upAfterDxyDown), b = stats(upAfterDxyUp);
    const diff = a.mean - b.mean;
    const sed = Math.sqrt(a.se ** 2 + b.se ** 2);
    const tdiff = sed > 0 ? diff / sed : 0;
    const flag = Math.abs(tdiff) >= 2 ? (diff > 0 ? " ✅" : " ❗tərs!") : " ⚪";
    console.log(
      `   ${String(N).padStart(2)} şam   DXY↓ sonra: ${a.mean >= 0 ? "+" : ""}${a.mean.toFixed(2)}  |  ` +
      `DXY↑ sonra: ${b.mean >= 0 ? "+" : ""}${b.mean.toFixed(2)}  |  fərq ${diff >= 0 ? "+" : ""}${diff.toFixed(2)}` +
      `  ${String(a.n + b.n).padStart(5)}  t=${tdiff.toFixed(2)}${flag}`,
    );
  }

  console.log("\n═══ NƏTİCƏ ═══");
  console.log("1 və 2 → əlaqənin MÖVCUDLUĞU və SABİTLİYİ haqqındadır.");
  console.log("3 → FİLTR kimi istifadə edilə bilərmi, onu göstərir.");
  console.log("\n⚠️ Vacib fərq: güclü tərs korrelyasiya olsa BELƏ, əgər 3-cü");
  console.log("   testdə t < 2 çıxırsa, DXY qızılın GƏLƏCƏYİNİ xəbər vermir —");
  console.log("   sadəcə EYNİ ANDA əks istiqamətdə hərəkət edir. Belə halda");
  console.log("   filtr kimi istifadə etmək FAYDA VERMƏZ.\n");
})();

// ── 4. SMT DİVERGENSİYASI (ICT-nin öz üsulu — D43 kadr sheet_015) ──
// Müəllim NQ və Qızılı yan-yana qoyub müqayisə edir. SMT məntiqi:
// qızıl low-u süpürəndə DXY MÜVAFİQ high-ı süpürməlidir. Süpürmürsə —
// divergensiyadır və ICT-yə görə bu, əsl dönüş siqnalıdır.
export {};
