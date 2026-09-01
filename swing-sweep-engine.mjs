// ════════════════════════════════════════════════════════════════════════════
//  SWING SWEEP MÜHƏRRİKİ — "Powerful Gold Strategy 2026" (swing variantı)
//
//  Mənbə: tradingview.com/chart/XAUUSD/EGLuCHK8 (yazılı ideya, skript deyil).
//  Müəllifin məntiqi: qiymət aydın high/low-u qırır → FOMO → geri qayıdır və
//  ƏSL istiqamətdə gedir.
//
//  ⚠️ BU FAYL PRODUKSİYA KONFİQURASİYASININ YEGANƏ MƏNBƏYİDİR.
//  Bot və doğrulama skripti EYNİ funksiyanı çağırır ki, canlı davranış
//  ölçdüyümüz davranışdan sürüşməsin. Konfiqurasiyanı dəyişirsənsə,
//  `node scripts/verify-swing-engine.mjs` işlət — rəqəmlər aşağıdakı ilə
//  üst-üstə düşməlidir.
//
//  ── ÖLÇÜLMÜŞ NƏTİCƏ (7 alət × 2 il × 60 dəqiqəlik, XM spredi 0.006% daxil) ──
//     2148 əməliyyat · qazanma 35% · orta qazanan 1.6R
//     expectancy +0.082R · t = 2.18
//     zaman-yarısı: +0.082R / +0.094R  (ən sabit bölünmə)
//     parametr sabitliyi (trailing): ×2 −0.016 · ×3 +0.088 · ×4 +0.124 ·
//                                    ×5 +0.059 · ×6 +0.074  → 5-dən 4-ü müsbət
//
//  ⚠️ +0.082R bizim qəbul həddimizdən (+0.15R) AŞAĞIDIR. Fuad ölçməni
//  biləndən sonra swing kimi qurmağı istədi — modul EKSPERİMENTAL damğası
//  ilə işləyir, real pul üçün deyil, irəli nəticəni toplamaq üçündür.
//
//  ── NİYƏ YALNIZ SWING ──
//  Eyni giriş 5 dəqiqəlikdə xərclə −0.036R verir (t=−1.21), geniş spredlə
//  −0.092R (t=−3.08). Səbəb: xərcinR = qiymət × xərc% / stopMəsafəsi.
//  Scalpda stop dar olduğu üçün spred R-in böyük hissəsini yeyir.
//  → Bu mühərrik AŞAĞI TAYMFREYMƏ KEÇİRİLMƏMƏLİDİR.
// ════════════════════════════════════════════════════════════════════════════

export const SWING_DEFAULTS = {
  interval: "60m",     // ⚠️ dəyişmə — 5m-də üstünlük ölçülərək rədd edilib
  rangeLen: 20,        // diapazonu təyin edən şam sayı
  maxWaitMss: 24,      // sweep-dən sonra struktur qırılmasını gözləmə
  slBufAtr: 0.15,      // stop buferi (sweep ekstremumundan kənara)
  trailAtr: 3,         // ⚠️ 3 seçilib, 4 DEYİL: 4 bir az yaxşıdır (+0.124R),
                       // amma "ən yaxşını seç" = keçmişə uyğunlaşdırma.
                       // 3 standart dəyərdir və əvvəlcədən seçilmişdi.
  maxBars: 240,        // praktik təhlükəsizlik (nəticəyə təsiri yoxdur)
  costPct: 0.006,      // gediş-gəliş spred+komissiya, qiymətin %-i
};

export const SWING_ASSETS = [
  { t: "GC=F", label: "QIZIL", xm: "XAUUSD", measured: +0.186 },
  { t: "SI=F", label: "GÜMÜŞ", xm: "XAGUSD", measured: -0.011 },
  { t: "NQ=F", label: "NASDAQ 100", xm: "US100Cash", measured: +0.102 },
  { t: "ES=F", label: "S&P 500", xm: "US500Cash", measured: -0.034 },
  { t: "CL=F", label: "NEFT (WTI)", xm: "OILUSD", measured: +0.041 },
  { t: "BTC-USD", label: "BITCOIN", xm: "BTCUSD", measured: +0.102 },
  { t: "ETH-USD", label: "ETHEREUM", xm: "ETHUSD", measured: +0.212 },
];

export function atrSeries(b, n = 14) {
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

/**
 * Strategiyanı bütün tarixçə üzərində işlədir.
 *
 * Canlı botda da EYNİ funksiya çağırılır: hər dövrədə tarixçə yenidən
 * hesablanır və CARİ açıq mövqe qaytarılır. Belədə artan (incremental)
 * vəziyyət saxlanmır — canlı məntiq backtestdən sürüşə bilmir.
 *
 * @returns {{trades: Array, open: Object|null}} open = hazırda açıq mövqe
 */
export function runSweepStrategy(bars, opt = {}) {
  const P = { ...SWING_DEFAULTS, ...opt };
  const atr = atrSeries(bars);

  // sadə pivot (fraktal) — struktur qırılması üçün istinad nöqtələri
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
  let pos = null;

  for (let i = P.rangeLen + 20; i < bars.length; i++) {
    const b = bars[i];

    // ── açıq mövqenin idarəsi ──
    if (pos) {
      const long = pos.dir === 1;
      // mühafizəkar: stop və hədəf eyni şamda olsa stop əvvəl sayılır
      if (long ? b.l <= pos.sl : b.h >= pos.sl) {
        pos.r = ((pos.sl - pos.entry) / pos.risk) * pos.dir - (pos.entry * P.costPct) / 100 / pos.risk;
        pos.exitPx = pos.sl;
        trades.push({ ...pos, exitBar: i, exitT: b.t, reason: "trailing stop" });
        pos = null;
      } else if (i - pos.openBar >= P.maxBars) {
        pos.r = ((b.c - pos.entry) / pos.risk) * pos.dir - (pos.entry * P.costPct) / 100 / pos.risk;
        pos.exitPx = b.c;
        trades.push({ ...pos, exitBar: i, exitT: b.t, reason: "vaxt stopu" });
        pos = null;
      } else if (atr[i]) {
        // trailing: qiymət lehinə getdikcə stop irəli çəkilir, heç vaxt geri
        const t = pos.dir === 1 ? b.c - atr[i] * P.trailAtr : b.c + atr[i] * P.trailAtr;
        if (pos.dir === 1 ? t > pos.sl : t < pos.sl) pos.sl = t;
      }
      if (pos) continue;
    }

    // ── diapazon: cari şamdan ƏVVƏLKİ rangeLen şam ──
    const win = bars.slice(i - P.rangeLen, i);
    const hi = Math.max(...win.map((x) => x.h));
    const lo = Math.min(...win.map((x) => x.l));

    if (stage === 0) {
      // sweep: sərhəd fitillə deşildi, amma GÖVDƏ diapazona qayıtdı
      const sweptLow = b.l < lo && b.c > lo;
      const sweptHigh = b.h > hi && b.c < hi;
      if (sweptLow || sweptHigh) {
        stage = 1; dir = sweptLow ? 1 : -1; stageBar = i;
        swExt = sweptLow ? b.l : b.h;
      }
    } else if (stage === 1) {
      swExt = dir === 1 ? Math.min(swExt, b.l) : Math.max(swExt, b.h);
      if (i - stageBar > P.maxWaitMss) { stage = 0; continue; }
      const mss = dir === 1 ? swH[i] != null && b.c > swH[i] : swL[i] != null && b.c < swL[i];
      if (!mss) continue;
      stage = 0;
      const ent = b.c;
      const sl = dir === 1 ? swExt - (atr[i] || 0) * P.slBufAtr : swExt + (atr[i] || 0) * P.slBufAtr;
      const risk = Math.abs(ent - sl);
      if (risk > 0)
        pos = { dir, entry: ent, sl, initialSl: sl, risk, r: 0, openBar: i, t: b.t };
    }
  }
  return { trades, open: pos };
}

export function swingStats(rs) {
  const n = rs.length;
  if (!n) return { n: 0, mean: 0, t: 0, wr: 0, sum: 0 };
  const sum = rs.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sd = Math.sqrt(rs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  const wins = rs.filter((x) => x > 0);
  return {
    n, sum, mean,
    t: sd > 0 ? mean / (sd / Math.sqrt(n)) : 0,
    wr: (100 * wins.length) / n,
    avgW: wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
  };
}
