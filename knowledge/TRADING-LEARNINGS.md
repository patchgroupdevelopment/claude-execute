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

---

## 6. ⭐ ÖLÇÜLMÜŞ — "London günün ekstremumunu yaradır" TƏKZİB EDİLDİ

**Tarix:** 2026-08-24 · **Skript:** `scripts/test-h1-london-extreme.mjs`
**Data:** Yahoo 5m, 60 gün (49 tam gün) · NQ=F, ES=F, GC=F

### İddia (mənbə)
D17 @00:05:12: *"Bullish olduğu zaman market günün LOW-unu LONDRA-da yapar."*
Kadr `41/f_00082` (ICT arayış kartı): *"London Open Killzone generally creates
the High or Low of the day."*

Bu, **Power of Three** çərçivəsinin təməlidir (Asiya=akkumulyasiya,
London=manipulyasiya/ekstremum, NY=distribusiya).

### Nəticə: ❌ İNDEKSLƏRDƏ TƏKZİB EDİLDİ

Günün ekstremumunu (high və ya low) tutma faizi — təsadüfi gözlənti **23.4%**
(3 saat / 24 saat, iki ekstremumdan biri):

| Bazar | London 02:00–05:00 | z | Sıralama (48 pəncərə) | Ən yaxşı pəncərə |
|---|---|---|---|---|
| **ES=F** (SP500) | **6.1%** | **−2.86** ❗ | **46/48** | 08:30–11:30 → **63.3%** |
| **NQ=F** (NASDAQ) | 12.2% | −1.85 | 41/48 | 08:00–11:00 → **46.9%** |
| **GC=F** (Qızıl) | 24.5% | +0.17 ⚪ | 19/48 | 00:00–03:00 → **57.1%** |

Permutation testi (NQ, 2000 təsadüfi pəncərə): London **9.2 persentil** —
95% həddindən çox uzaq.

### 🔑 Əsas nəticə — mənbənin İKİ ifadəsi ziddiyyətlidir və biri doğrudur

Müəllim **iki fərqli şey** deyir və ölçmə hansının doğru olduğunu göstərir:

1. ❌ **Arayış kartından oxuduğu ICT qaydası** (D41 kadrı): *"London Open KZ
   günün ekstremumunu yaradır"* → **indekslərdə YANLIŞDIR**. Bu qayda
   forex-mərkəzlidir (ICT-nin öz mənşəyi forexdir).
2. ✅ **Öz təcrübəsindən dediyi** (D17 @00:02:54): *"Endeks marketində
   **8.5 ilə 11 arası**"* → **ÖLÇMƏ BUNU TƏSDİQLƏYİR**. ES-də 08:30–11:30
   pəncərəsi 63.3% ilə **birinci yerdədir** (təsadüfidən 2.7 dəfə çox).

Yəni müəllim praktikada haqlıdır, amma ekrana gətirdiyi ümumi ICT kartı
indekslərə aid deyil. Biz kartı kor-koranə köçürsəydik səhv edərdik.

### Bazara görə düzəliş (koda tətbiq edildi)
- **İndekslər (NAS/SPX/DOW):** London killzone **söndürülür** — anti-prediktivdir.
  Yalnız NY 08:30–11:00.
- **Qızıl:** London neytraldır; ən güclü pəncərə **00:00–03:00 NY**
  (Asiya sonu / London açılışından əvvəl) — gözlənilməz, ayrıca yoxlanmalıdır.
- **Forex:** ölçülməyib (ICT-nin öz sahəsidir, iddia orada doğru ola bilər).

### ⚠️ Məhdudiyyət
49 gün **az nümunədir** (Aronson §2). ES-in z=−2.86-sı təkbaşına
əhəmiyyətlidir, NQ-nun −1.85-i sərhəddədir. Amma üç bazarda **eyni istiqamət**
+ sıralama + permutation birlikdə ardıcıl mənzərə verir. Uzun data ilə
təkrarlanmalıdır.

**Metodoloji qeyd:** bu, `KITAB-DERSLERI.md` §4-dəki "benchmark məcburidir"
qaydasının birbaşa nəticəsidir. Yalnız "London 12% tutur" desəydik, bu, heç nə
demirdi. Təsadüfi gözlənti (23.4%) ilə müqayisə **istiqaməti tərsinə çevirdi**.

---

## 7. ⭐ ÖLÇÜLMÜŞ — DXY ↔ QIZIL: əlaqə REALDIR, amma PROQNOZ VERMİR

**Tarix:** 2026-08-24 · **Skript:** `scripts/measure-dxy-gold.mjs`
**Data:** Yahoo 5m, 60 gün · GC=F vs DX-Y.NYB · 12,897 uyğunlaşan şam

### İddia
*"DXY qalxanda qızıl düşür, DXY düşəndə qızıl qalxır."*

### Nəticə: ✅ ƏLAQƏ VAR · ❌ FİLTR KİMİ İŞLƏMİR

**1) Eyni anda korrelyasiya — GÜCLÜ VƏ SABİT**
- `r = -0.473` (5m qaytarımları)
- Yuvarlanan 1 günlük pəncərə: **1051 pəncərədən 100%-i mənfi**, heç biri müsbət deyil
- 72%-i güclü mənfi (< -0.4) · aralıq: -0.82 … -0.15
- → **İstifadəçinin müşahidəsi tamamilə doğrudur.**

**2) Proqnoz gücü — YOXDUR**

| Pəncərə | DXY↓ sonra qızıl | DXY↑ sonra qızıl | fərq | t |
|---|---|---|---|---|
| 3 şam | +1.88 bp | −0.40 bp | +2.28 | 1.58 ⚪ |
| 6 şam | +1.05 bp | −0.34 bp | +1.39 | 1.18 ⚪ |
| 12 şam | +2.50 bp | +1.43 bp | +1.07 | 0.96 ⚪ |
| 24 şam | +1.89 bp | +2.47 bp | −0.58 | −0.51 ⚪ |

Heç biri t≥2 həddinə çatmır. **DXY-nin KEÇMİŞ hərəkəti qızılın GƏLƏCƏK
hərəkətini xəbər vermir.**

**3) SMT divergensiyası (ICT-nin öz üsulu) — EDGE YOXDUR**
Qızıl low süpürür, DXY müvafiq high-ı süpürmür (= divergensiya):
- SMT var: **+0.60 bp** (n=556, t=0.33) ⚪
- SMT yox: **−0.17 bp** (n=205, t=−0.06) ⚪
- Fərq cəmi **0.76 bp** — spread-dən kiçikdir, mənasızdır

### 🔑 ƏSAS DƏRS: KORRELYASİYA ≠ PROQNOZ

Bu, çox rast gəlinən səhvdir. Əlaqə **eyni anlıdır (contemporaneous)**, önə
keçən (leading) deyil. DXY düşdüyünü görəndə qızıl **artıq qalxıb** — yəni
məlumat qiymətə hopub.

→ **DXY-ni istiqamət filtri kimi işlətmək fayda vermir.**

### ✅ Nə üçün İSTİFADƏ EDİLƏ BİLƏR (ölçmə ilə əsaslandırılan)

1. **Korrelyasiya pozulması xəbərdarlığı** — 1051 pəncərədən heç biri müsbət
   deyildi. Əgər yuvarlanan `r` > −0.2 olarsa, bu **anomal vəziyyətdir**
   (rejim dəyişikliyi, mərkəzi bank müdaxiləsi və s.) → diqqət siqnalı.
2. **Ziddiyyət bayrağı (kontekst)** — qızılda LONG siqnalı gələndə DXY də
   eyni anda güclü qalxırsa, siqnal daxilən ziddiyyətlidir. Bu, **bloklayıcı
   filtr deyil**, mesajda göstərilən kontekstdir.

**Tətbiq:** `ict-engine.mjs` → `dxyContext()` — yalnız məlumat, filtr DEYİL.

---

## 8. ⭐ ÖLÇÜLMÜŞ — indekslərdə ICT setup-ları killzone saatlarına DÜŞMÜR

**Tarix:** 2026-08-24 · **Data:** 5m, 30 gün, NQ=F + ES=F + YM=F

İstifadəçinin xahişi ilə indeks trade pəncərəsi genişləndirildi
(08:30–11:00 → 07:00–16:00). Nəticə **gözlənilənin əksinə** çıxdı:

| Pəncərə | Genişlik | Siqnal (3 indeks, 30 gün) |
|---|---|---|
| 08:30–11:00 | 2.5 saat | **0** |
| 07:00–16:00 | 9 saat | **2** |
| Tam sutka (filtrsiz) | 24 saat | **7** |

Pəncərəni 3.6 dəfə genişləndirmək siqnalı yalnız 0→2 etdi.

### Səbəb — setup-lar hansı saatda tamamlanır (NY vaxtı)
```
00:00 █   01:00 █   05:00 █   06:00 █   07:00 █   14:00 █   21:00 █
```
**Səpələnmişdir.** Killzone saatlarında (08:30–11:00) **heç biri yoxdur.**

### Huni müqayisəsi — indeks vs kripto
```
NASDAQ  60 sweep → 22 HTF → 18 MSS → 10 FVG → 5 doldu → pəncərə 5-ni kəsdi → 0
BTC     69 sweep → 30 HTF → 25 MSS → 18 FVG → 12 doldu → pəncərə 0 kəsdi → 12
```
Setup-lar indekslərdə də **tamamlanır** — sadəcə RTH-dan kənarda (gecə/Asiya
saatlarında əvvəlki günün səviyyələri süpürülür).

### 🔑 Nəticə
1. **İndekslərdə tavan ~7 siqnal/ay** (3 alət, filtrsiz). Pəncərə tənzimləməklə
   bunu artırmaq mümkün deyil — setup-ların özü nadirdir.
2. Bu, §6-dakı tapıntı ilə **ardıcıldır**: killzone konsepsiyası indekslərdə
   özünü doğrultmur. §6-da London ekstremum iddiası təkzib edilmişdi; burada
   isə killzone saatlarında setup ümumiyyətlə tamamlanmır.
3. Sistem **praktikada kripto sistemidir**: BTC 12 + ETH 11 = 23 siqnal/ay,
   çünki 24/7 bazarda vaxt filtri tətbiq olunmur.

**Açıq sual (ölçülməyib):** RTH-dan kənarda tamamlanan indeks setup-ları
GƏLİRLİ olurmu? Spread gecə saatlarında genişdir — sayı artırmaq keyfiyyəti
aşağı sala bilər. Qərar verməzdən əvvəl bu ölçülməlidir.
