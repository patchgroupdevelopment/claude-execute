# Ticarət Bilikləri — damıdılmış nəticələr

Bu fayl **qalıcı yaddaşdır**. Videolardan, PDF-lərdən, kanal təhlillərindən və öz
backtestlərimizdən çıxan nəticələr burada toplanır ki, hər sessiya sıfırdan
başlamasın. Xam transkriptlər `video-train/` altındadır — onlar mənbədir, bu fayl
isə nəticədir.

**Qayda:** buraya yalnız YOXLANMIŞ və ya AÇIQ ŞƏKİLDƏ "yoxlanmayıb" damğalı
şeylər yazılır. "Filan youtuber belə deyir" özü-özlüyündə bilik deyil — fərziyyədir.

---

## 1. ÖZ TESTLƏRİMİZDƏN ÇIXAN NƏTİCƏLƏR

### ✅ TƏSDİQLƏNİB — Qızıl günlük Donchian(20) breakout
- 25 illik GC=F testi: BUY tərəfi +195%, 151 əməliyyat, 55% qazanma
- Hər iki yarı dövrdə sabit → overfitting deyil
- SHORT tərəfi -70% (32% qazanma) → **bilərəkdən yalnız LONG** işlədilir
- ATR×2.0 trailing stop, sabit TP yoxdur
- Canlıda `bot.js`-dədir (`GOLD=1`)

### ✅ TƏSDİQLƏNİB — SP500/US100 Connors mean-reversion
- Günlük RSI(3) < 15, yalnız SMA200-dən yuxarı (bull rejim)
- Çıxış: RSI(3) ≥ 65 və ya ATR-əsaslı SL/TP

### ⚠️ VALİDASİYA EDİLMƏYİB — Neft (Brent) trend-following
- 10 illik test: ADX həddi 20→25 dəyişəndə nəticə **+1.4%-dən -2.8%-ə sıçrayır**
- Qonşu parametrlər arasında bu qədər fərq = overfitting əlaməti
- Tarixdə tək əməliyyatda -18.8% (gap stopu aşdı)
- İstifadəçinin açıq qərarı ilə aktivdir, mesajda xəbərdarlıq var

### ❌ RƏDD EDİLİB — 1H mean-reversion (tezliyi artırmaq cəhdi)
- Fikir: eyni RSI(3) 15/85 qaydalarını 4H yerinə 1H-də işlətmək
- 3 illik test: BTC **-65.9%**, ETH **-43.3%**; hibrid variant daha pis
- Hər iki simvolda, hər iki yarı dövrdə ardıcıl itki
- **Dərs:** siqnal tezliyini sadəcə taymfreymi qısaltmaqla artırmaq olmur
- Kod: `scripts/backtest-fast-mr.mjs`

### ❌ RƏDD EDİLİB — Kill Zone likidite-sweep dönüş sistemi (XAU)
Bu, ən vacib dərsdir. Ətraflı: bölmə 3.

---

## 2. XARİCİ MƏNBƏLƏRDƏN ÇIXAN NƏTİCƏLƏR

### Borsa Workout / OTOBOT (Telegram qrupu + PDF + video, 2026-06→08)
Qrupun 1481 mesajlıq tam tarixçəsi oxunub (`data/audit-borsaworkout-group.json`).

**Manual trading hissəsi:** ~89 qazanc / ~21 itki / ~9 breakeven (özü-bəyan,
yoxlanmayıb). İtkiləri gizlətmir — bu, dürüstlük əlamətidir.

**OTOBOT (satılan bot) — TƏHLÜKƏLİ, öz sənədlərində etiraf olunur:**
- PDF s.4: *"STOP KULLANMIYORUZ"*, *"hiç bir ne kadar düşerse düşsün işleme devam edeceğiz"*
- PDF s.8 konfiqurasiya paneli: **"Zararda (Lot Çarpan Səviyyəsi)"**, **"Zararda Lot Artırma Sayısı"** → martingale hərfi mənada məhsulun parametridir
- PDF s.5-6: *"derin bir düşüşte TÜM KASAYI KAYBETME İLE SONLANIR"*, *"1000$ bakiyesini 1 günde likit edenide gördük"*
- "100% qazanma norması" cədvəli = lot ölçüsünə görə mexaniki vurulmuş rəqəmlər, real performans deyil

**Dərs:** yüksək win rate + stop-suz + zərərdə əlavə = itki gizlədilir, yox edilmir.
Nadir bir hadisədə hesab bir dəfəyə sıfırlanır.

### Girsta / "$68 → $750,000" tipli iddialar
Sübutsuz, seçilmiş nümunə. Ciddiyə alınmır.

### GitHub repoları
- `tradermonty/claude-trading-skills` — **faydalı**, iki fikir götürüldü:
  iqtisadi təqvim xəbərdarlığı + intizam/circuit-breaker qatı
- `JOSEPHEKEIGI/XAUSD_Trader` — **anti-pattern**: LLM-dən backtest olmadan
  BUY/SELL soruşur; `risk_manager.py`-də `NameError` verəcək kod var
- `nautechsystems/nautilus_trader`, `QuantConnect/Lean` — legitim, peşəkar,
  amma bizim yığcam sxem üçün həddindən artıq ağır
- `NoFxAiOS/nofx` — *"the strategy IS a language model"*, backtest yoxdur → rədd
- `OpenByteInc/QuantDinger` — backtest addımı var, fəlsəfə daha yaxın
- `TraderAlice/OpenAlice` — 3 contributor, validasiya yoxdur, "beta" etirafı

---

## 3. ƏN VACİB METOD DƏRSİ (2026-08-22)

**Səhv etdiyimiz iş:** strategiyanı əvvəlcə qurduq, sonra backtest etdik.
Bu, gecdir — o vaxta qədər fərziyyə artıq koda hopur və sən parametr fırlatmağa
başlayırsan (bu, overfitting-in düz yoludur).

**Düzgün sıra:**
1. Fərziyyəni **təkbaşına ölç** — TP/SL/filtr olmadan
2. MFE/MAE + irəli hərəkət (ATR vahidi ilə), **baza ilə müqayisəli**
3. Yalnız asimmetriya sübut olunandan sonra strategiya qur
4. Sonra backtest, parametr qonşuları, dövrü yarıya bölmək

**Konkret nümunə — nə üçün Kill Zone sweep sistemi uğursuz oldu:**

| Ölçü (15m, 72 gün) | Nəticə |
|---|---|
| Sweep → DÖNÜŞ (bizim fərziyyə) | **-0.331 ATR** (t=-2.66) ❗ |
| Sweep → DAVAM (əksi) | +0.331 ATR (t=+2.66) |
| MFE/MAE (dönüş) | **0.79** — asimmetriya ƏLEYHİMİZƏ |
| "Aşağı sweep → LONG" | **-0.476 ATR** (t=-2.39) |
| Baza: sadəcə "hər şamda LONG" | **+0.204 ATR** (t=4.94) |

Yəni: gözü yumulu hər şamda long açmaq bizim siqnaldan **iki dəfə yaxşı** idi.
Filtrlərimiz məhz trendin əleyhinə girişləri seçirdi.

**Kill Zone konsepti qızılda heç nə süzmür:** içəridə -0.327 ATR, xaricdə -0.338.
Fərq yoxdur.

**Açıq qalan fərziyyə (hələ yoxlanmayıb):** qırılma → DAVAM (breakout).
1H-də +0.450 ATR (t=2.98), MFE/MAE 1.46. Trend effekti ola bilər — istiqamətə
görə ayrılıb uzun dövrdə yoxlanmalıdır.

Kod: `scripts/diagnose-xau-edge.mjs`

---

## 4. RİSK QAYDALARI (dəyişməz)

- Mövqe ölçüsü **riskdən** hesablanır, əksinə yox: `risk$ / SL məsafəsi`
- Default: hesabın 1.5%-i əməliyyat başına ($1000 → $15)
- **Sabit 0.1 lot $1000 hesabda ~10-13% riskdir** — qəbuledilməz
- Data anomaliyası tavanı: notional > hesab×10 olarsa ölçü məhdudlaşır
  (`computeXmUnits` in bot.js)
- Martingale / zərərdə əlavə: **heç vaxt**
- Eyni şamda həm SL, həm TP toxunubsa → **SL sayılır** (konservativ)
- Qızılda spread+sürüşmə 20-40 sent: SL məsafəsi ATR×0.6-dan dar olmamalıdır

---

## 5. VİDEO TRANSKRİPTLƏRİ

Xam mətnlər: `video-train/`
- 11 video (ekran yazısı + YouTube), `<qovluq>/transcript.txt`
- Playlist toplusu: `node scripts/fetch-playlist-transcripts.mjs "<url>" <ad>`

**Damıdılmış dərslər buraya yazılır ↓** (hələ boşdur — bootcamp playlisti gözlənilir)

<!-- BOOTCAMP-START -->
<!-- BOOTCAMP-END -->
