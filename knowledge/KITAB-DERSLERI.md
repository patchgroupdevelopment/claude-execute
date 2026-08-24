# Kitab dərsləri — bizim sistemə tətbiq edilən hissə

`KITAB-XERITESI.md`-də hansı kitabın niyə aid olduğunu yazdıq. Bu fayl isə
həmin kitablardan **konkret, icra oluna bilən** qaydaları çıxarır və bizim
sistemə bağlayır. Nəzəri xülasə deyil — hər bənd ya kodu, ya da iş üsulumuzu
dəyişir.

---

# 🔴 I. ARONSON — "Evidence-Based Technical Analysis"

Bizim mərhələmiz üçün digər 99 kitabdan vacibdir, çünki problemimiz bilik
çatışmazlığı deyil, **yoxlama metodudur**.

## 1. Falsifikasiya edilə bilməyən iddia = bilik deyil

Aronson-un əsas tənqidi: texniki analiz ədəbiyyatının çoxu **yoxlanıla bilməyən**
formada yazılır. Nümunə: *"FVG likidite boşluğudur, bazar onu doldurmağa
meyllidir."* — bu cümlə nə vaxt YANLIŞ olardı? Deyilmir.

**Bizə tətbiqi:** hər ICT qaydasını yoxlana bilən formaya çevir.

| Videodakı forma | Yoxlana bilən forma |
|---|---|
| *"Günün low-u London-da yaranır"* | Bullish günlərdə günün low-u 02:00–05:00 NY-də yaranma faizi > təsadüfi 3 saatlıq pəncərədən statistik yüksəkdirmi? |
| *"FVG doldurulur"* | FVG yarandıqdan sonra N şam ərzində 50%-inə toxunma faizi nədir? Baseline: təsadüfi eyni ölçülü zona. |
| *"Vacib səviyyə olmadan OB işləmir"* | HTF FVG filtri OLAN və OLMAYAN eyni setup dəstinin MFE/MAE fərqi statistik əhəmiyyətlidirmi? |

⭐ Bunu artıq bir dəfə etmişik: `scripts/diagnose-xau-edge.mjs` məhz bu
məntiqlə köhnə sistemi **-0.331 ATR, t=-2.66** ilə rədd etdi. Metod işləyir,
sadəcə yeni modelə hələ tətbiq edilməyib.

## 2. ⭐ DATA-MINING BIAS — bizim ən böyük təhlükəmiz

Aronson-un mərkəzi xəbərdarlığı: **N variant sınayıb ən yaxşısını seçsən,
ən yaxşının nəticəsi təsadüfən şişirdilmiş olur.** N artdıqca şişmə artır.

Bizim indikatorda **tənzimlənən 20+ parametr** var: `minRR`, `htfWin`,
`minSweep`, `minDispAtr`, `maxWaitMss`, `maxWaitFill`, `fvgLookback`,
`pivLen`, `slBufAtr`, preset rejimləri...

> Əgər bunları backtest nəticəsinə baxa-baxa tənzimləsək, **zəmanətlə**
> keçmişdə gözəl, gələcəkdə işləməyən sistem alacağıq.

**Məcburi qaydalar (indi qəbul edilir):**
1. Parametrləri **videolardan gələn dəyərlərdə dondur** (pivLen=1, TP 1:2,
   RR≥2, killzone saatları). Bunlar backtest-dən yox, mənbədən gəlir — bu,
   data-mining deyil.
2. Optimallaşdırma edilsə → **neçə variant sınandığı yazılmalıdır** və
   nəticəyə Aronson-un düzəlişi tətbiq edilməlidir.
3. **Qonşu parametr testi:** parametri ±1 addım dəyişəndə nəticə kəskin
   dəyişirsə → overfitting. (Bunu artıq neftdə görmüşük: ADX 20→25 nəticəni
   +1.4%-dən -2.8%-ə sıçratdı → `TRADING-LEARNINGS.md`-də qeyd olunub.)

## 3. Monte Carlo permutation test — bizim t-testindən güclüdür

t-testi normal paylanma fərz edir; qiymət qaytarımları isə **fat-tailed**-dir.
Aronson-un təklifi:

```
1. Real strategiyanın nəticəsini hesabla (məs. net R)
2. Qiymət seriyasını N=1000 dəfə təsadüfi qarışdır (və ya siqnal
   vaxtlarını təsadüfi sürüşdür), hər dəfə eyni strategiyanı işlət
3. Real nəticə bu 1000 nəticənin neçə faizindən yaxşıdır?
4. > 95% olmasa → EDGE YOXDUR
```

**Bizim variant (daha realdır):** qiyməti qarışdırmaq əvəzinə **siqnal
vaxtlarını** təsadüfi sürüşdürmək — bazarın öz strukturu qorunur, yalnız
"bizim seçdiyimiz an"ın xüsusi olub-olmadığı yoxlanılır.

## 4. Benchmark məcburidir

*"Bir qayda yalnız alternativlə müqayisədə mənalıdır."*
Bizim baseline həmişə olmalıdır:
- **Baseline A:** hər şamda eyni istiqamətdə giriş (bazarın öz drift-i)
- **Baseline B:** eyni sweep-lər, amma displacement/MSS filtri OLMADAN
  (= rədd etdiyimiz köhnə sistem)
- **Baseline C:** təsadüfi giriş, eyni sayda, eyni SL/TP

---

# 🔴 II. DAVEY — "Building Winning Algorithmic Trading Systems"

## 5. ⭐ Out-of-sample ayrılması — TOXUNULMAZ

Davey-nin qaydası: datanın **ən azı 30%-i** kənara qoyulur və **yalnız bir dəfə**
istifadə edilir — sonda, təsdiq üçün. Ona baxıb parametr dəyişsən, o data
artıq "istifadə olunmuş" sayılır və dəyərini itirir.

**Bizim plan:**
```
NASDAQ 5m datası:
  ├─ 2023-01 … 2025-06  →  IN-SAMPLE (qurma, tənzimləmə)
  └─ 2025-07 … 2026-08  →  OUT-OF-SAMPLE (bir dəfəlik test, TOXUNMA)
```

## 6. Walk-forward — parametr sabitliyi testi

Sabit backtest "bu parametr keçmişdə yaxşı idi" deyir. Walk-forward "bu
parametr **vaxt keçdikcə** yaxşı qalırmı" deyir:
```
[qur 6 ay] → [test 2 ay] → sürüşdür → [qur 6 ay] → [test 2 ay] → ...
```
Yalnız test pəncərələrinin nəticəsi toplanır. Bu, real ticarətin simulyasiyasıdır.

## 7. Davey-nin "90% zibildir" prinsipi

> *"Sınadığım sistemlərin 90%-i işləmir. Uğur, işləməyəni tez atmaqdadır."*

**Bizə tətbiqi:** ICT modeli ölçülüb işləməsə — **onu düzəltməyə çalışma,
at.** Bizim köhnə qızıl sistemi ilə düzgün davrandıq (rədd etdik). Eyni
intizam yeni modelə də tətbiq edilməlidir, nə qədər çox əmək qoyulsa da.

⚠️ Bu, **sunk cost** tələsidir: 45 video, 493 kadr, minlərlə sətir kod
qoymuşuq. Bu, modelin doğru olduğunu **sübut etmir**.

## 8. Monte Carlo ilə drawdown paylanması

Backtest tək bir ardıcıllıq göstərir. Əməliyyatların sırasını 1000 dəfə
qarışdırıb **ən pis drawdown paylanmasına** baxmaq lazımdır.
→ "Backtest-də maks. drawdown 12%" ≠ "gələcəkdə 12%". 95-ci persentil 25%
ola bilər — hesab ölçüsü ona görə seçilməlidir.

---

# 🟠 III. VAN THARP — "Definitive Guide to Position Sizing"

## 9. Gəlirliliyi giriş yox, ölçü müəyyən edir

Tharp-ın klassik təcrübəsi: eyni sistem, eyni siqnallar, fərqli position
sizing → nəticələr **10 dəfə** fərqlənir.
→ Bizim `riskPct` və anti-martingale nərdivanı sistemin girişindən daha
təsirlidir.

## 10. Expectancy (gözlənilən dəyər) — əsl ölçü

```
Expectancy = (Qazanma% × Orta qazanc) − (İtirmə% × Orta itki)
```
R vahidində ölçülür. **Win rate tək başına mənasızdır** — 35% qazanma ilə
1:3 RR, 60% qazanma ilə 1:1-dən yaxşıdır.

⭐ **Kodda dəyişiklik:** indikator cədvəlində `TP1 %` göstəririk — bu,
yanıldıcıdır. **Expectancy (R/əməliyyat)** əlavə edilməlidir.

## 11. Anti-martingale nərdivanının riyazi əsası

D37-dəki 1%→0.5%→0.5%→0.25% nərdivanı Tharp-ın **"reduced risk after
drawdown"** kateqoriyasındadır. Riyazi effekti:
- Ardıcıl itki seriyasında hesabın çökməsini **ləngidir**
- Bərpa sürətini də azaldır (mübadilə)
- Edge MÜSBƏT olduqda ümumi gəliri azaldır, MƏNFİ olduqda ömrü uzadır

→ Yəni: **nərdivan edge-i yaratmır, sağ qalmağa kömək edir.** Edge yoxdursa,
nərdivan yalnız daha yavaş itirməyə xidmət edir.

---

# 🟠 IV. TALEB + KAHNEMAN — bizim öz meyllərimiz

## 12. ⭐ Replay ≠ irəli test (survivorship + narrative bias)

Bootcamp-ın **43 videosunun demək olar hamısı** TradingView Replay ilə
keçmişə baxılaraq çəkilib (kadrlarda su nişanı görünür).

Taleb-in "narrative fallacy"si: keçmişə baxanda hər hərəkətin izahı tapılır.
İzah tapılması onun **əvvəlcədən proqnozlaşdırıla biləcəyini göstərmir**.

⭐ Müəllimin özü bir yerdə düzgün davranır (D31-də **qəsdən uğursuz** nümunə
göstərir) — bu nadir və dürüstdür. Qalan bütün nümunələr seçilmişdir.

## 13. Kiçik ədədlər qanunu (Kahneman)

Az sayda nümunədən nəticə çıxarmaq. Bizim indikator cədvəli 8 siqnaldan sonra
"TP1 75%" göstərsə — bu **məlumat deyil, səs-küydür**.

⭐ **Kodda dəyişiklik:** cədvəldə siqnal sayı **30-dan az** olduqda win rate
boz/xəbərdarlıqlı göstərilməlidir.

## 14. Təsdiq meyli — ən təhlükəli anımız

İndikatoru qurduq, ona əmək qoyduq → işlədiyi nümunələri görmək,
işləmədiklərini "xüsusi hal" saymaq meyli yaranır.

**Qarşı tədbir:** qərar **əvvəlcədən yazılmış meyara** görə verilir:
> *"Out-of-sample-də expectancy > 0.15R və permutation testi > 95% olmasa,
> model rədd edilir."*
Bu meyar **testdən ƏVVƏL** yazılır və sonradan dəyişdirilmir.

## 15. Jim Paul — uğursuzluqlar eynidir

> *"Uğur hekayələri müxtəlifdir, uğursuzluq hekayələri eynidir:
> zərəri şəxsiləşdirmək, planı ortada dəyişmək."*

Bizim konkret riskimiz: *"siqnal az gəlir, filtrləri boşaldaq"* impulsu.
İndikatordakı **"Sıx (çox siqnal)" preseti məhz bu tələdir** — ona görə
tooltip-də açıq xəbərdarlıq var.

---

# 🟡 V. TEXNİKİ TAMAMLAYICILAR

## 16. ⭐ Wyckoff — ICT-nin kökü (müəllim özü deyir)

D23 @00:09:23: *"ICT-nin konseptləri **Wyckoff**-a da bənzəyir — illər əvvəlki
sadələşmiş Wyckoff da deyirlər."*

| ICT / bootcamp termini | Wyckoff qarşılığı |
|---|---|
| Power of Three / AMD | Accumulation → Markup/Manipulation → Distribution |
| Asiya konsolidasiyası | Accumulation range |
| London sweep-i | **Spring** (aşağı) / **Upthrust** (yuxarı) |
| Sweep + dönüş | Spring test |
| MSS | Sign of Strength / Weakness (SOS/SOW) |
| Original consolidation (MMXM) | Cause (səbəb) zonası |

**Praktik dəyəri:** Wyckoff **həcm** tələb edir. ICT versiyası həcmi atıb —
bu, sadələşdirmədir, təkmilləşdirmə deyil. Həcmi geri qaytarmaq ən sadə
əlavə filtrdir (bax №18).

## 17. Al Brooks — müstəqil ikinci rəy

Brooks eyni hadisələri fərqli adlandırır: bizim "displacement" onun
**"strong trend bar"**-ı, bizim "FVG geri çəkilməsi" onun
**"pullback to breakout point"**-udur.

⭐ **Metodoloji dəyər:** iki müstəqil məktəb eyni nöqtəni göstərirsə,
quruluşun real olma ehtimalı artır. Bu, ucuz bir çarpaz yoxlamadır.

Brooks-un bizim üçün ən faydalı konkret qaydası: **"Always in" məntiqi** —
hər an bazarın istiqaməti ya yuxarı, ya aşağıdır, neytral yoxdur. Bizim
"neytral bias" halımızda siqnal verməmək bununla uyğundur.

## 18. Anna Coulling — həcm bizim modelin ƏN BÖYÜK boşluğudur

Bizim indikatorda **həcm ümumiyyətlə yoxdur**. Halbuki:
- Displacement **həcmsiz** olarsa — bu, əsl institusional hərəkət deyil
- Sweep **həcm sıçrayışı ilə** olmalıdır (stoplar tetiklənir = həcm)

⭐ **Ən sadə, ən çox dəyər verən əlavə filtr:**
```
displacement şamının həcmi > son 20 şamın orta həcmi × 1.5
```
Bu, **ölçülə bilən** və **tənzimlənən parametr sayı az** olan bir əlavədir.

⚠️ Qeyd: NAS100 CFD-də həcm brokerə görə dəyişir; NQ1! futures-də realdır.

## 19. Market Profile (Dalton) — likiditenin müstəqil ölçüsü

Bizim "toxunulmamış likidite" fərziyyəmizi **həcm profili** ilə çarpaz
yoxlamaq olar: əgər bizim DOL hədəflərimiz həcm profilinin **aşağı həcmli
düyünləri** ilə üst-üstə düşürsə — fərziyyə güclənir. Düşmürsə — zəifləyir.

---

# 🟢 VI. PSİXOLOGİYA (müəllimin öz tövsiyəsi — D45)

## 20. Mark Douglas — "Trading in the Zone"

D45-də tövsiyə edilən kitab çox güman məhz budur. Əsas 5 prinsip:
1. Hər şey ola bilər
2. Pul qazanmaq üçün **növbəti hərəkəti bilmək lazım deyil**
3. Qazanc/itki **təsadüfi paylanır**
4. Edge = sadəcə **ehtimal üstünlüyü**
5. Hər an bazarda **unikaldır**

⭐ №3 bizim üçün ən vacibidir: **5 ardıcıl SL sistemin xarab olduğunu
göstərmir.** 60% win rate-li sistemdə 5 ardıcıl itki ehtimalı ~1%-dir —
yəni 100 seriyada bir dəfə **normaldır**.

## 21. Steenbarger — jurnal analizi

Bizim `journal/` sistemimizə birbaşa tətbiq olunur: hər əməliyyat üçün
**qərar keyfiyyəti** ilə **nəticəni** ayrı qeyd et. Yaxşı qərar + pis nəticə
= sistem işləyir. Pis qərar + yaxşı nəticə = **ən təhlükəli hal** (yanlış
davranış mükafatlandırılır).

---

# 📋 NƏTİCƏ — kodda və iş üsulunda konkret dəyişikliklər

Bu kitablardan çıxan və **indi tətbiq edilməli** olan şeylər:

| № | Dəyişiklik | Mənbə | Status |
|---|---|---|---|
| 1 | Cədvələ **Expectancy (R/əməliyyat)** əlavə et | Tharp №10 | ⬜ ediləcək |
| 2 | Siqnal sayı < 30 olanda win rate-i **xəbərdarlıqlı** göstər | Kahneman №13 | ⬜ ediləcək |
| 3 | **Həcm filtri** (displacement həcmi > 1.5× orta) | Coulling №18 | ⬜ ediləcək |
| 4 | Parametrləri video dəyərlərində **dondur**, optimallaşdırma sayını qeyd et | Aronson №2 | ⬜ qayda |
| 5 | **Out-of-sample** ayır (son 12 ay), bir dəfə istifadə et | Davey №5 | ⬜ qayda |
| 6 | Qəbul meyarını **testdən əvvəl** yaz | Kahneman №14 | ⬜ qayda |
| 7 | Permutation testi (siqnal vaxtlarını sürüşdür) | Aronson №3 | ⬜ ediləcək |
| 8 | Walk-forward pəncərələri | Davey №6 | ⬜ ediləcək |

**Əvvəlcədən yazılmış qəbul meyarı (№6 — indi qeyd olunur, sonra dəyişməz):**

> ICT Universal Model NASDAQ 5m out-of-sample datasında:
> - **Expectancy ≥ +0.15R** əməliyyat başına, VƏ
> - ən azı **50 əməliyyat**, VƏ
> - permutation testində **> 95%** persentil, VƏ
> - HTF filtrinin təsiri baseline-dan statistik olaraq **fərqli**
>
> Bu dördü birlikdə ödənilməsə → **model rədd edilir və atılır.**
> Filtr boşaldıb yenidən sınamaq bu meyarı pozmaq deməkdir.
