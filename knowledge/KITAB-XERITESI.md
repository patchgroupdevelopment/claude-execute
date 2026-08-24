# Kitab xəritəsi — hansı kitab bizim hansı problemimizi həll edir

100 kitablıq siyahıdan (`TRADING-KITABLARI-SIYAHI.md`) bizim layihəyə **faktiki
aidiyyatı olanlar**. Qalanların əksəriyyəti bioqrafiya/jurnalistikadır
(Liar's Poker, Flash Boys, The Big Short, Dark Pools) — maraqlıdır, amma
strategiya qurmağa kömək etmir.

**Bizim açıq problemimiz:** ICT strategiyası videolardan çıxarılıb, kodlanıb,
amma **ÖLÇÜLMƏYİB**. Köhnə qızıl versiyamız ölçüləndə **-0.331 ATR, t=-2.66**
verdi — yəni etibarlı şəkildə itirən sistem idi. Aşağıdakı sıralama məhz bu
problemi həll etmək ardıcıllığı ilədir.

---

## 🔴 1-ci dərəcə — METODOLOJİ BOŞLUĞUMUZU birbaşa doldurur

### `Evidence-Based Technical Analysis` — David Aronson
**Bizim üçün ən vacib kitab budur.** Bütün mövzusu: texniki qaydanı statistik
olaraq necə yoxlamaq və özünü aldatmamaq.

Bizə lazım olan konkret şeylər:
- **Data-mining bias** — 100 variant sınayıb ən yaxşısını seçmək = özünü
  aldatmaq. Biz `minRR`, `htfWin`, `minSweep` kimi parametrləri tənzimləyəndə
  məhz bu tələyə düşürük.
- **Monte Carlo permutation test** — nəticəni təsadüfi qarışdırılmış data ilə
  müqayisə etmək. Bizim `t=2` həddimizdən daha güclü metoddur.
- **Benchmark məcburiyyəti** — hər qayda "heç nə etməmək"lə müqayisə
  edilməlidir. Bizim `diagnose-xau-edge.mjs` skriptindəki baseline məntiqi
  elə buradan gəlir.
- *"Texniki analizin çoxu elmi deyil, çünki falsifikasiya edilə bilən iddia
  irəli sürmür."* — ICT konseptləri üçün bu, birbaşa xəbərdarlıqdır.

### `Building Winning Algorithmic Trading Systems` — Kevin Davey
Praktik tərəf: **walk-forward analiz**, out-of-sample ayırma, Monte Carlo ilə
drawdown paylanması. Davey real dünya çempionu olub, kitab "sistemin 90%-i
zibildir, onları necə ayıklayacağını göstərirəm" tonundadır.
→ Bizim növbəti addım (backtest infrastrukturu) üçün şablon.

### `Van Tharp's Definitive Guide to Position Sizing`
Bizim **anti-martingale nərdivanı** (1%→0.5%→0.5%→0.25%) burada riyazi
əsaslandırılır. Tharp-ın əsas tezisi: *"Sistemin gəlirliliyini giriş yox,
POZİSYON ÖLÇÜSÜ müəyyən edir."*
→ D37-dəki qaydanı riyazi olaraq yoxlamaq üçün.

---

## 🟠 2-ci dərəcə — "edge həqiqətənmi var?" sualı

### `Fooled by Randomness` + `The Black Swan` — Nassim Taleb
Bizim vəziyyətə birbaşa dəyən sual: **43 videoda göstərilən bütün nümunələr
TradingView Replay ilə keçmişə baxılaraq seçilib.** Taleb bunu "survivorship
bias + narrative fallacy" adlandırır: uğurlu nümunələr göstərilir, uğursuzlar
göstərilmir, sonra hekayə qurulur.

Müəllim D31-də **qəsdən** uğursuz nümunə göstərir — bu, onun xeyrinədir və
nadir hallardandır. Amma qalan bütün nümunələr seçilmişdir.

### `Thinking, Fast and Slow` — Daniel Kahneman
Bizim üçün ən aktual fəsillər: **kiçik ədədlər qanunu** (az nümunədən
nəticə çıxarmaq), **təsdiq meyli** (indikatoru işlədiyinə inandığımız üçün
işləyən nümunələri görmək).
→ Cədvəldəki "NƏTİCƏ" sətrinə niyə inanmalıyıq, göz qərarına niyə yox.

### `What I Learned Losing a Million Dollars` — Jim Paul
Tezis: uğur hekayələri müxtəlifdir, **uğursuzluq hekayələri eynidir**.
Zərəri şəxsiləşdirmək, planı ortada dəyişmək. Bizim "siqnal az gəlir,
filtrləri boşaldaq" impulsumuz məhz bu kateqoriyadandır.

---

## 🟡 3-cü dərəcə — ICT-ni tamamlayan texniki mənbələr

### `Trades About to Happen` — David Weis (Wyckoff metodu)
⭐ Müəllim D23 @00:09:23-də özü deyir: *"ICT-nin konseptləri **Wyckoff**-a da
bənzəyir — illər əvvəlki sadələşmiş Wyckoff da deyirlər."*
→ Akkumulyasiya/manipulyasiya/distribusiya (bizim **Power of Three**) əslində
Wyckoff-un sxemidir. Kökünü anlamaq üçün.

### `Trading Price Action Trends` / `... Reversals` — Al Brooks
Şam-bəşam price action. ICT-dən fərqli məktəbdir, amma eyni şeyi ölçür:
displacement, geri çəkilmə, struktur qırılması. **İkinci rəy** kimi dəyərlidir
— əgər Brooks-un tərifləri ilə də eyni nöqtələr çıxırsa, quruluş realdır.

### `Mind Over Markets` — Dalton (Market Profile)
Likiditenin harada olduğunu **həcm profili** ilə göstərir. Bizim
"toxunulmamış likidite" anlayışımızın müstəqil təsdiqi/təkzibi üçün.

### `Trading Systems and Methods` — Perry Kaufman
Ensiklopediya. Konkret bir metod yox, **arayış kitabı** — bir texnikanın
əvvəllər sınandığını və nəticəsini yoxlamaq üçün.

### `A Complete Guide to Volume Price Analysis` — Anna Coulling
Bizim modeldə **həcm ümumiyyətlə yoxdur**. Displacement-i həcmlə təsdiqləmək
mümkün olan ən sadə əlavə filtrdir.

---

## 🟢 4-cü dərəcə — psixologiya (müəllimin özünün tövsiyəsi)

### `Trading in the Zone` — Mark Douglas
⭐ **Bootcamp-ın son dərsində (D45) müəllimin tövsiyə etdiyi kitab məhz budur**
(adı aydın deyildi, amma təsvirə tam uyğun gəlir).
Əsas tezis: *"Hər əməliyyatın nəticəsi təsadüfidir, amma böyük seriyada
nəticə müəyyəndir."* — bizim "5 SL ardıcıl gəldi, sistem xarabdır" reaksiyamıza
qarşı.

### `The Disciplined Trader` — Mark Douglas
Yuxarıdakının əvvəlki, daha xam versiyası.

### `Trading Psychology 2.0` — Brett Steenbarger
Praktik: **öz əməliyyat jurnalını necə analiz etmək**. Bizim journal
sistemimizə birbaşa tətbiq olunur.

---

## ❌ Bizim üçün əhəmiyyətsiz (siyahının böyük hissəsi)

- **Bioqrafiya/jurnalistika:** Liar's Poker, Flash Boys, The Big Short,
  Dark Pools, When Genius Failed, More Money Than God, The Quants,
  The Greatest Trade Ever — maraqlı, dərs yox.
- **Uzunmüddətli investisiya:** The Intelligent Investor, Security Analysis,
  Common Stocks and Uncommon Profits, Little Book of Common Sense Investing,
  A Random Walk Down Wall Street — bizim 5 dəqiqəlik intraday modelinə aid deyil.
- **Hisse-spesifik:** How to Make Money in Stocks, Insider Buy Superstocks,
  Momentum Masters, Trade Like a Stock Market Wizard — indeks/forex üçün yox.
- **Opsion:** Option Volatility (Natenberg), Options as a Strategic Investment
  — bizim alət dəstində opsion yoxdur.
- **Elliott Wave** (2 kitab) — falsifikasiya edilməsi çətin metod; Aronson-un
  tənqidinə birbaşa düşür. Vaxt itkisi.

---

## 📌 NƏTİCƏ — praktik tövsiyə

100 kitabdan **1 dənəsi** bizim indiki mərhələmiz üçün digər 99-dan vacibdir:

> **Evidence-Based Technical Analysis — David Aronson**

Çünki bizim problemimiz **bilik çatışmazlığı deyil** — ICT qaydalarını artıq
45 videodan çıxarmışıq, kodlamışıq. Problemimiz **yoxlama metodudur**.
Daha çox strategiya kitabı oxumaq bu boşluğu doldurmur, əksinə artırır.

**Növbəti addım kitab oxumaq deyil — ÖLÇMƏKDİR:**
1. NASDAQ 5m datasında Fərziyyə 1-i yoxla (günün low-u London-da yaranırmı?)
2. Sweep+MSS+FVG girişini baseline ilə müqayisə et
3. HTF filtrinin **tək başına** effektini ölç (D31-in statistik versiyası)

Bunlar t-testi və MFE/MAE ilə ölçüləndən sonra Aronson-un permutation testi
ilə təsdiqlənməlidir.
