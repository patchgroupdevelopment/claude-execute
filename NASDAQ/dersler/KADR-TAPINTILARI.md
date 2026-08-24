# Kadrlardan çıxarılan tapıntılar (transkriptdə OLMAYAN detallar)

Bu fayl yalnız **ekranda görüb**, danışıqda deyilməyən şeyləri toplayır.
Hər tapıntının yanında video + kadr + vaxt göstərilir ki, yoxlanıla bilsin.

---

## 🔑 Seans indikatorunun DƏQİQ ayarları
**Mənbə:** Video 02, `frames/f_00021.jpg`, 00:02:40 · qrafik: NQ1! (NASDAQ 100
E-mini, CME), 5 dəqiqəlik

İndikator parametr sətri tam oxunur:
```
26 30 America/New_York Normal 1200-1201 70 50
Asia 2000-0000
London 0200-0500
NY AM 0930-1100
NY Lunch 1200-1300
NY PM 1330-1600
Until Mitigated · Most Recent
AS.H AS.L LO.H LO.L NYAM.H NYAM.L NYL.H NYL.L NYPM.H NYPM.L
Solid 1 5 Top Right
```

### Bundan çıxan 3 kritik düzəliş

**1. NY AM = 09:30–11:00 (NY vaxtı), 08:30 DEYİL**
Dərs 17-də şifahi olaraq *"endeks marketinde 8.5 ile 11 arası"* deyir, amma
öz qrafiğində indikator **0930-1100** qurulub. Fərq mühümdür:
- **08:30 NY** = ABŞ makro datasının çıxdığı vaxt (CPI, NFP, Claims)
- **09:30 NY** = NASDAQ/NYSE **nağd bazarının açılışı**

Bakı vaxtı ilə (yay): **16:30–18:00**. Qışda: **17:30–19:00**.

**2. NY Lunch (12:00–13:00 NY) AYRICA seans kimi işarələnir**
Transkriptdə heç vaxt izah edilmir, amma qrafikdə həmişə var və öz H/L
etiketləri (NYL.H, NYL.L) var. Nahar saatı klassik olaraq **aşağı keyfiyyətli**
dövrdür — likidite azalır, yalançı hərəkətlər artır. Bakı: **20:00–21:00** (yay).

**3. "Until Mitigated" — səviyyələr toxunulana qədər yaşayır**
Seans High/Low xətləri sonsuza qədər qalmır: qiymət ora toxunanda (mitigate)
səviyyə "istifadə olunmuş" sayılır və silinir. Yəni **hansı likiditenin hələ
ALINMAMIŞ olduğu** avtomatik görünür — strategiyanın hədəf seçimi məhz budur.

**4. İşarələnən likidite səviyyələrinin TAM siyahısı**
`AS.H · AS.L · LO.H · LO.L · NYAM.H · NYAM.L · NYL.H · NYL.L · NYPM.H · NYPM.L`
Yəni **hər 5 seansın həm high, həm low-u** — cəmi 10 səviyyə, üstəgəl
True Day Open. Bizim indikatorda yalnız 3 seans (Asiya/London/NY) var idi.

**5. "True Day Open" = 1200-1201 NY**
İndikatorda gündəlik açılış xətti **12:00 NY**-a qurulub (gecə yarısı deyil).
Qrafikdə üfüqi xətt kimi çəkilir və qiymət ona nisbətən premium/discount
qiymətləndirilir.

---

## Qrafik quraşdırması (bütün videolarda sabit)
- Platforma: **TradingView**, dil türkcə
- Simvol: **NAS100 (US 100 Nakit CFD, FOREX.COM)** və/və ya **NQ1! (CME futures)**
- Əsas iş taymfreymi: **5 dəqiqə**
- Qrafik saat qurşağı: **UTC-4 (Nyu-York)** — ekranın sağ altında görünür
- Seans rəngləri: Asiya = **mavi**, London = **çəhrayı/qırmızı**,
  NY AM = **yaşıl**, NY Lunch = **sarı**, NY PM = **bənövşəyi**

---

## Video 40 — kadrlardan çıxan icra detalları

**Sheet 4 (00:06:40–00:07:44), NAS100 5m:**
Klassik quruluş vizual olaraq təsdiqləndi:
Asiya (mavi qutu) yanakı konsolidasiya → **London (çəhrayı qutu)** açılışında
qiymət AS.L-in altına düşüb **LO.L** yaradır (likidite alınır) → sonra sərt
yuxarı displacement → LO.H-a qədər.
Müəllim Asiya qutusunun altına ziqzaq çəkərək "kelde/konsolidasiya"nı göstərir.

**Sheet 6 (00:09:20–00:10:24) — TradingView mövqe aləti ilə real ölçülər:**
Ekranda long/short position tool açıqdır və dəqiq rəqəmlər oxunur:
- `Stop: 27.4 (0.14%) 274 · Amount: 750`
- `Open P&L: 11.0 · Qty: 9 · Risk/Reward Ratio: 3.1`
- `Target: 74.6 · Amount: 1133.21`
- Başqa kadrlarda RR: **2.02**, **1.5**, **3.1**

Yəni:
1. **Risk məbləği sabitdir (~$750)**, lot/qty ondan hesablanır (Qty 9 kontrakt)
2. Stop məsafəsi qiymətin **~0.14%-i** — NAS100-də çox dar (≈27 punkt)
3. RR ekranda canlı göstərilir və **2.0–3.1** arasında saxlanılır
4. Rəng kodu: **sarı qutu = FVG giriş zonası**, **qırmızı = stop zonası**,
   **yaşıl = hədəf zonası**

**Vizual iş axını (kadrlarda təkrarlanır):**
`Asiya qutusu → London sweep → sarı FVG çəkilir → position tool qoyulur
→ stop FVG-nin o tayında → hədəf növbəti likiditeyə`

---

## Dərs 33 — IFVG-nin DƏQİQ qaydası (əvvəl bilmədiyim)

### ⭐ FVG-nin ETİBARSIZ olma qaydası (50% / midpoint)
[00:03:43–00:04:26] — bu, kodda **yox idi**:

> *"Fiyat buraya kadar **iğne** atabilir, 50 noktasına kadar... ama **gövde**
> burada, bu 50 noktasının **altında** kapattığı zaman — bilin ki o FVG'nin
> hayrı yok."*

**Qayda:**
- FVG-yə **fitil** girməsi (hətta 50%-dən aşağı) → FVG **hələ də etibarlıdır**
- FVG-nin **50% orta nöqtəsindən o tayda GÖVDƏ ilə bağlanış** → FVG **ölür**

Bu, order block-dakı "min threshold" məntiqinin eynisidir.

### IFVG bu ölmüş FVG-dir
Ölmüş bullish FVG geri qayıdanda artıq **müqavimət** kimi işləyir (dəstək idi).
Klassik "dəstək→müqavimətə çevrildi" məntiqi.

**Giriş:** gövdə ilə bağlanışdan sonra qiymət ora geri çəkiləndə giriş.
(Dərs 43-də əlavə edir: bəzən IFVG geri çəkilmə vermir — o halda gövdə
bağlanışından **sonrakı şamda** girilir.)

### 🔴 ƏN VACİB QAYDA — sıra pozulmamalıdır
[00:16:02–00:16:46]:
> *"FVG'leri nerede kullanacağız? **Likiditeyi aldıktan sonra kullanacaksınız.**
> Birinci adım: likidite."*
> *"Bir likiditeyi aldıktan sonra oluşması lazım. Yoxsa **random durduk yere
> bir FVG'ye işleme girip çıkmayın lütfen.**"*

Yəni məcburi ardıcıllıq: **LİKİDİTE ALINIR → sonra FVG/IFVG yaranır → giriş.**
Boş yerdə yaranan FVG siqnal DEYİL.

### RR seçimi — orta nöqtə girişin səbəbi
[00:08:29–00:08:49] FVG-nin kənarından girsə **1.38 R** çıxır → *"olmaz ki"*.
Orta nöqtədən (50%) girsə **3 R** çıxır. Yəni midpoint girişi estetik deyil,
**RR-i 2 dəfə yaxşılaşdıran** riyazi qərardır.

### Stop haqqında etiraf
[00:12:00–00:12:08] *"Ben stopu kısa tutuyorum, tecrübeli olduğum için.
Siz bu kadar kısa stop kullanmayın, biraz daha nefes alacak yer bırakın."*

---

## Dərs 30 — ORDER BLOCK (CISD) — indikatorumda YOX İDİ

Müəllim: *"Türkçe kaynaklarda çok yanlış anlatılıyor. Mən ICT-nin öyrətdiyi
kimi deyirəm."* Order Block = **Change in State of Delivery** (təhvil
rejiminin dəyişməsi).

### Bearish OB (aşağı gözləyirik) — addım-addım
1. Qiymət **vacib likidite səviyyəsinə** gəlir
2. Həmin likiditeni **ALIR** (sweep)
3. Likiditeni **ALAN son YAŞIL şam** işarələnir
   ⚠️ *"likiditeyi almadan əvvəlki yaşıl şam DEYİL"* — məhz alan şam
4. Qiymət aşağı **displace** olur və həmin yaşıl şamın **altında GÖVDƏ ilə
   bağlanır** ← bu şərt olmasa, order block **etibarsızdır**
5. Bağlanış olan kimi → o yaşıl şam **etibarlı order block** olur
6. **Giriş:** qiymət o şamın **açılışına (open)** geri qayıdanda
7. **Stop:** gövdəyə və ya fitilə — müəllim *"biz sinka (fitilə) qoyacağıq"*
8. **Hədəf:** növbəti likidite (məs. London low)

Bullish OB: eyni şey, güzgü — likiditeni alan son **QIRMIZI** şam, yuxarı
displacement, onun **üstündə** gövdə bağlanışı.

### Bir neçə şam olarsa
Likiditeni alan şamlar birdən çoxdursa, **likiditeni faktiki alanı** götür,
ondan əvvəlkini yox.

### Etibarsızlıq nümunəsi
[00:07:44–00:08:13] Likidite alınır, displacement olur, **amma şamın altında
bağlanmır** → bu order block DEYİL. Sonra bazar yeni high yapır, yeni
likidite alır, bu dəfə bağlanır → **indi** etibarlıdır.

---

## Dərs 25 — IRL / ERL: HƏDƏFİN harada olduğunu deyən qayda

- **ERL (External Range Liquidity)** = range-in **XARİCİNDƏKİ** likidite:
  köhnə swing high/low-lar (buyside / sellside)
- **IRL (Internal Range Liquidity)** = range-in **İÇİNDƏKİ** likidite:
  FVG / imbalance

### ⭐ Növbələşmə qaydası (hədəf seçimi)
> **External → Internal → External → Internal → ...**

[00:07:13] *"Likiditeyi alacak, ondan sonra bu dengesizlikleri kapatacak,
ondan sonra bir daha likiditeyi alacak."*

Praktik tətbiq:
- İndicə swing high/low alındı (**ERL**) → **növbəti hədəf: range içindəki FVG (IRL)**
- İndicə FVG dolduruldu (**IRL**) → **növbəti hədəf: növbəti swing (ERL)**

Bu, bizim indikatorda **hədəf seçimini sabit RR-dən struktura keçirməyə**
imkan verir: TP1 = 1:2 R yerinə "növbəti əks IRL/ERL".

Müəllimin öz xəbərdarlığı: *"Hər zaman %100 belə işləmir, amma yüksək
ehtimalla. Texniki analizdə %100 deyə bir şey yoxdur."*

### Tam intraday iş axını (bu dərsdə xülasə edilir)
[00:13:38–00:14:14]:
`1H FVG-ni yadda saxla → aşağıda sellside hədəfi var → 5m-ə en →
5m-də displacement + FVG/OB → geri çəkilmə → giriş → hədəf: sellside`

---

## Dərs 24 — Low Resistance Liquidity Run (hədəf KEYFİYYƏTİ filtri)

### Tərif
- **Low Resistance Liquidity (LRL)** = **ALINMAMIŞ** likidite. Qiymət swing
  high yapır, əvvəlkini ala bilmir, geri dönür → o səviyyədə likidite
  **toxunulmamış yığılır**. Belə səviyyələr üst-üstə düzülübsə → **müqavimətsiz
  yol**.
- **High Resistance Liquidity (HRL)** = **ARTIQ ALINMIŞ** likidite (stoplar
  artıq partladılıb). Oraya qayıtmaq az ehtimallıdır.

### Qayda
> Hədəf olaraq **daha çox ALINMAMIŞ likidite olan tərəfi** seç.
> Artıq təmizlənmiş sahəyə doğru hədəf qoyma.

[00:12:18] *"Belə gördüyünüz zaman bilin ki market bu nöqtələri yaxın vaxtda
**parça-parça edəcək**."*

**Vizual imza:** ardıcıl swing high-lar, hər biri əvvəlkindən yuxarı, amma
heç biri alınmayıb — *"bir öncekinin üstünde, üstünde"*.

### ⭐ Premium/Discount + Order Flow uyğunluğu (FVG SEÇİMİ filtri)
[00:04:13–00:04:51] — bu da kodda yoxdur:

- Bazarın istiqaməti (order flow) **BEARISH** isə → FVG-ni **PREMIUM**
  (range-in yuxarı yarısı) hissəsində axtar
- **BULLISH** isə → FVG-ni **DISCOUNT** (aşağı yarı) hissəsində axtar

> *"Market yönü yukarı yönlü ise, **tam ters yönlü FVG aramayın**."*

Yəni FVG-nin harada olduğu vacibdir: trend istiqamətinə uyğun yarıda olmalıdır.

---

## Dərs 27 — Draw on Liquidity (DOL): HƏDƏFİN necə seçilməsi

### Əsas prinsip
[00:05:10] *"Fiyatın hareket etmesinin **TƏK səbəbi** budur: likidite.
Başqa bir şey yoxdur."*

**DOL = qiymətin maqnit kimi çəkildiyi yer = ən yaxın məntiqli likidite.**

[00:04:36] *"TP nöqtən haradır, hara gedəcəyini necə bilirsən? Budur:
draw on liquidity — **ən yaxın likidite haradadır**, onu düşünəcəksiniz."*

### 🔴 ÜÇÜNCÜ dəfə təkrarlanan qayda (biz məhz bunu pozmuşduq)
[00:02:06–00:02:38]:
> *"Buradan **hemen bu aldığı anda işlem açmayın** arkadaşlar. Önce bekleyin —
> yukarıya bir **displace** olacak mı diye. **Hareketi gördükten sonra**
> işleme girebilirsiniz."*

Bu qayda artıq 3 ayrı dərsdə (27, 32, 33) eyni sözlərlə təkrarlanır.

### Fitil vs Displacement — və fitilin GİZLİ FUNKSİYASI
[00:06:10–00:07:12]:
- **Gövdə ilə keçmə** = displacement = real struktur dəyişikliyi
- **Fitil atıb geri çəkilmə** = displacement DEYİL

**Vacib əlavə:** uğursuz cəhd (fitil) **yeni likidite hədəfi YARADIR**:
> *"Buraya iğne attı, burayı burada bıraktı — **burası daha sonra bizim için
> likidite noktası**."*

Yəni hər uğursuz cəhd gələcək hədəfə çevrilir. Bu, LRLR (Dərs 24) ilə
birləşir: toxunulmamış səviyyələr yığılır və sonra "parça-parça" alınır.

### DOL + IRL/ERL birləşməsi (hədəf ardıcıllığı)
[00:12:18–00:12:46] Köhnə high-lar alındısa → range içindəki FVG-lərə;
FVG-dədirsə → köhnə high/low-lara. Növbələşmə davam edir.

---

## Dərs 23 — Hansı likidite səviyyəsi ƏN vacibdir

### Prioritet
[00:10:45] *"Ən önəmli likidite səviyyəsi haradaydı? **New York seansında
yaranmış PM session likiditesi**"* — yəni NY PM (13:30–16:00 NY) ərzində
formalaşan high/low. Videoda indikatoru GMT-5-ə düzəldib *"tam 1.5 ilə 4
arası"* deyir.

### Günlük bias təyini — praktik axın
[00:14:35–00:18:07]:
1. **Günlük** qrafiğə keç
2. Qiymət range-in harasındadır? (**premium / discount**)
3. Günlükdə likidite hara yığılıb: swing high/low **+ günlük FVG-lər**
4. Onlar **hədəf** olur
5. Günlük hədəflər yuxarıdadırsa → aşağı taymfreymdə **bias = LONG**

### 🔴 Vacib dürüstlük qeydi (müəllimin öz sözü)
[00:16:04–00:16:30]:
> *"Market günlükdə tam tərsinə gedir. Belə olanda **manipulyasiya** deyə
> düşünə bilərsiniz. Market heç vaxt gözlədiyiniz şeyi əlinizə tepsi ilə
> vermir. **Nə gözləyirsinizsə, market onun tam tərsini etməyi sevir** —
> çünki stop partladır."*

Yəni bias səhv çıxa bilər və bu **normaldır**. Ona görə MSS təsdiqi
olmadan girməmək qaydası bu qədər vurğulanır.

### Fitil/gövdə qaydası yenə təkrarlanır
[00:13:15] *"İğnələr = manipulyasiya. **Gövdə heç bir şəkildə çöldə
qalmır**."* — yəni real hərəkətdə gövdələr zonanın içində qalır, yalnız
fitillər kənara çıxır.

### Konseptin məntiqi əsaslandırması
[00:08:30–00:09:15] Müəllim klassik pattern-lərə qarşı arqument gətirir:
*"Sizcə market 'fincan-kulp' olduğu üçün mü hərəkət edir, yoxsa insanların
stop-loss-larının tetiklənməsi və o pul ilə mi?"*

---

## Dərs 26 — Likiditenin əsası + ⚠️ SWING TƏRİFİ (kodumda SƏHV idi)

### Swing High / Low — dəqiq tərif
[00:01:56–00:02:26]:
> *"**3 mum** alırıq. Sağına, soluna baxırıq. Ortadakı — solundakı və
> sağındakından **daha alçaqda** olacaq. Bu bir **swing low**."*

Yəni **pivot uzunluğu = 1** (sol 1 şam, sağ 1 şam), 3 deyil!

⚠️ Mənim `NAS100_ICT_Model.pine`-da `pivLen = 3` qoyulmuşdu — bu, müəllimin
tərifindən **xeyli sərtdir** və nəticədə:
- swing nöqtələri az tapılır
- MSS hadisələri az olur
- siqnal sayı süni azalır

**Düzəliş lazımdır: `pivLen = 1` (input kimi, default 1).**

### Equal High / Equal Low
[00:06:30–00:06:47] İki low/high bir-birinə çox yaxın (bərabər) olanda →
**equal low/high**. Bu, adi swing-dən **daha güclü likidite hovuzudur**,
çünki stoplar bir yerdə cəmlənir.

### Nə üçün likidite işləyir (institusional məntiq)
[00:00:48–00:01:45] Böyük oyunçular (banklar, hedge fondlar) bizim kimi
"düymə basıb" girə bilmirlər — $100M-lıq əmr üçün bazarda o qədər dövriyyə
lazımdır. Ona görə stopları partladıb likidite yaradırlar.
Bank analogiyası: 20.000 lirə çəkmək üçün bankdan "sabah gəl" deyilir —
o an o qədər nağd yoxdur.

### 🔑 HANSI BAZARLARDA İŞLƏYİR (istifadəçinin sualına birbaşa cavab)
[00:03:37–00:03:50]:
> *"Bu dediyim şey **kriptoda da işə yarar, forexdə də, indekslərdə də** —
> yəni **NASDAQ-da da**, EURUSD-də də, Bitcoin-də də. Hamısında."*

[00:05:36–00:06:00] **İSTİSNA — harada İŞLƏMİR:**
> *"Saçma-sapan coinlərdə və ya hisselərdə sınamayın. **Bankların diqqətini
> çəkəcək** şeylər olmalıdır — **böyük pulun olduğu yerlərdə** işə yarayır.
> Adamın kefinə görə qaldırıb endirdiyi hissədə texniki analiz etmə."*

**Nəticə:** konseptlər NASDAQ-a xas deyil — likvid, institusional bazarlara
xasdır. NASDAQ, qızıl, major forex cütləri, BTC — hamısı uyğundur.
Kiçik kapitallı hisselər və az likvid altcoinlər — uyğun DEYİL.

---

## Dərs 41 — CANLI STRATEGİYA QURMA (1.5 saat, Discord) — ən dolğun qaydalar

### 1. ⭐ HANSI FVG-dən girilir (əvvəl dəqiq bilmirdim)
[00:35:46–00:36:08] və [00:39:54–00:39:58] — tamaşaçı məhz bunu soruşur:
> *"Bir sürü FVG olur arxa-arxaya, hansı vacibdir?"*
> **"Market yapısının DƏYİŞDİYİ YERDƏKİ FVG-dən girəcəksən."**
> *"FVG-ni haradan çəkirsən? Market yapısının dəyişdiyi yer var ya — **o
> tərəfdən** axtaracaqsan. Buradan yox."*

Yəni FVG **MSS-i yaradan ayaqda** olmalıdır. Təsadüfi yaxın FVG yox.

### 2. ⭐ İki FVG üst-üstə olanda stop qaydası
[00:37:05–00:37:43]:
> *"Stopu ya swing-ə, ya FVG dibinə qoya bilərsən. Amma **2 FVG üst-üstə
> olanda oraya stop atmayın** — qiymət bir az geri çəkilib o biri FVG-də
> əmr ala bilər. Biz **ilk (yaxın) FVG-yə girəcəyik** (əməliyyatı
> qaçırmamaq üçün), amma **stop ikinci FVG-nin o tayında** olmalıdır."*

Konkret qayda: **giriş yaxın FVG-də, stop dərin FVG-nin arxasında.**

### 3. ⭐ ANTİ-MARTİNGALE ölçü qaydası (OTOBOT-un tam əksi!)
[00:38:04–00:38:18]:
> *"%1-in üstünə çıxmayın. %1-lik əməliyyat açdınız, %1-i itirdiniz →
> **mövqeni %0.5-ə endirirsən**. 0.5-i də itirdin → **%0.25-ə** endirirsən,
> **zərərin çıxana qədər**."*

Yəni **itkidən sonra ölçü KİÇİLİR**, böyümür. Bu, martingale-in tam əksidir
və bizim `checkCircuitBreaker` məntiqimizlə eyni fəlsəfədir.

### 4. Hədəf
[00:37:47–00:38:00] Default **1:2**. *"**1:1 də olar** — yeni başlayırsınızsa
1:1 də gözəldir."*

### 5. Tezlik gözləntisi (dəqiq rəqəm)
[00:33:16–00:33:24]:
> *"Bu strategiya **hər həftə 2-3 dəfə** rahat olur. Seanslarda — London, NY.
> **Bəzən gündə iki dəfə** də olur."*

### 6. HTF FVG = ehtiyat zonası (qismən çıxış nöqtəsi)
[00:34:03–00:34:30]:
> *"4 saatlikdə bir FVG var — onu yadda saxlayacaqsınız. Nə qədər bullish
> olsanız da, bu FVG-yə çatanda tepki alıb aşağı ata bilər. Oradan ya
> **yarısını bağlayacaqsan**, ya da stopu ona görə tənzimləyəcəksən."*

Yəni HTF FVG hədəf deyil — **təhlükə zonasıdır**, orada qismən çıxış edilir.

### 7. Tam ardıcıllıq (müəllimin öz xülasəsi)
[00:38:55–00:39:08]:
> *"Likidite alımı gözləyirsən → reversal gözləyirsən → **displacement ilə
> market yapısının dəyişməsini** gözləyirsən → **FVG-yə geri çəkiləndə
> girirsən** → 1:2 hədəfləyirsən → çıxırsan."*

### 8. Taymfreymlər (üçüncü dəfə təsdiq)
[00:33:48] **4 saat · 1 saat · 15 dəqiqə · 5 dəqiqə**

### 9. Nə vaxt GİRİLMİR
[00:33:29–00:33:34]:
> *"Bu strategiyanı gördüyünüz an girəcəksiniz. **Olmadığı an
> girməyəcəksiniz.** Başqa heç nə yoxdur."*

---

## Dərs 42 — IRL/ERL-in əsas funksiyası: FİLTR
[00:00:12–00:00:40]:
> *"Internal/external likiditeni anlamaq trade həyatınızda **çağ atladacaq**
> bir şeydir. IFVG olsun, order block olsun — fərq etmir, internal/external
> tətbiq etsəniz trade-iniz **2-3 dəfə yaxşı** olacaq. Ya da **almalısınız,
> almamalısınız** — onu gözəl anlayacaqsınız."*

Yəni IRL/ERL yalnız hədəf seçimi deyil — **əməliyyatı ALIB-ALMAMAQ qərarının
filtridir**.

**Range necə təyin olunur:** [00:06:13] son **swing low ↔ swing high** arası.
Yeni swing yaranan kimi range **yenilənir**.

---

## Dərs 34 — SHARP TURN strategiyası (müəllimin ƏN ÇOX güvəndiyi)

[00:00:07] *"Mənə **ən çox pul qazandıran**, ən çox güvəndiyim setup."*

### Dəqiq mexanika (mən bunu sadəcə "təsdiq bayrağı" sanmışdım — səhv)
1. Vacib likidite səviyyəsi / DOL müəyyən olunur
2. Qiymət likiditeni **ALARKƏN displace olur** → **1-ci FVG** (sweep
   istiqamətində) yaranır
3. Aldıqdan **dərhal sonra U dönüşü**: əks istiqamətdə **displace** →
   **2-ci FVG** yaranır
4. **Hər iki FVG çəkilir. KƏSİŞDİKLƏRİ yerin orta nöqtəsindən girilir.**
   [00:04:56] *"İkisinin kəsişdiyi yerdən, orta nöqtədən işləmə girirsiniz"*
5. **Stop:** FVG-lərdən birinin sonuna; kəsişmirlərsə gövdəyə.
   Dərində başqa FVG varsa → **onun da o tayına** (Dərs 41 ilə eyni qayda)
6. **Hədəf:** yeni başlayan → 1:2; təcrübəli → növbəti DOL (likidite)

### ⚠️ Vacib istisna
[00:03:10]:
> *"Bunda **Market Structure Shift gözləməyinizə elə də ehtiyac yoxdur**."*

Yəni Sharp Turn **müstəqil giriş siqnalıdır**, MSS olmadan da işləyir.

**Amma dərhal xəbərdarlıq edir** [00:03:13–00:03:24]:
> *"Ancaq nə etdiyinizi bilirsinizsə. Bilmirsinizsə o cür şeylərə girməyin,
> təcrübəniz yoxdursa riskli əməliyyatlara girməyin. 'MSS gözləyim' desəniz —
> bax burada onsuz da MSS də olur."*

**Bizim üçün qərar:** indikatorda Sharp Turn-u ayrıca giriş tipi kimi
əlavə etmək olar, amma **default olaraq MSS tələbi qalsın** (mühafizəkar).

---

## Dərs 20 — FVG (detallı) — TEXNİKİ İNCƏLİKLƏR

### ⚠️ FVG fitildən, Premium/Discount GÖVDƏDƏN çəkilir (fərqlidir!)
- **FVG-nin özü:** [00:08:19] *"FVG 3 mumdan oluşur. Bak 1-2-3. **Bunun
  iğnesinden bunun da iğnesini alıyorsun, çekiyorsun**"* → **fitillərdən**
- **Premium/Discount aralığı:** [00:07:39] *"**Ben gövdeyi kullanıyorum**,
  kimi wick'i de kullanıyor... gövde daha sağlıklı geliyor, **daha yüksək
  ihtimallı**"* → **gövdələrdən**

Yəni iki fərqli ölçmə. Kodda qarışdırmaq olmaz.

### Etibarlı FVG-nin 3 şərti
[00:09:58–00:10:16]:
1. **Likidite alınmış olmalı**
2. **Market yapısı dəyişməli** (MSS)
3. **Displacement olmalı**

[00:10:20] *"**Antin-kuntin boşluqlardan dalmayın işləmə.**"*
[00:08:38] Etibarsız nümunə: *"Burada da FVG var, amma **niyə məntiqli deyil**?
**Likiditeni almayıb, hədəf yoxdur.**"*

### 🔑 TƏRS QAYDA — displacement YOXDURSA, davam deməkdir
[00:17:26–00:17:36]:
> *"Londranın low-unu aldıqdan sonra yuxarı doğru **displacement olmadısa**
> nə olar? **Deməli market aşağı getmək istəyir.**"*

Bu, çox faydalı əks-siqnaldır: sweep var, amma dönüş displacement-i yoxdursa
→ **sweep istiqamətində davam** gözlənilir. (Bizim köhnə sistem məhz burada
tərsinə girirdi!)

### FVG hansı taymfreymdə axtarılır
[00:18:17] 5 dəqiqədə görünməyən FVG **15 dəqiqədə görünür** — tapa
bilmirsənsə bir üst taymfreymə bax.

### Stop yeri — müəllim burada GÖVDƏ deyir
[00:20:06] *"Stopu hara qoydun? Ən son low-a. **Mən gövdələrə qoyuram
genəlliklə.**"*
⚠️ Dərs 30-da isə *"biz sinka (fitilə) qoyacağıq"* demişdi — **hər ikisi
işlədilir**, kontekstə görə. İndikatorda hər iki variant seçim kimi var.

### NY saatı müşahidəsi
[00:19:03] *"New York saatına yaxınlaşdığımız zaman gedir və buyside alır."*

### Real nümunə rəqəmləri
[00:16:35] 4R əməliyyat, 1% risk = **$500 risk → $2000 qazanc**
($50.000-lıq TopStep fond hesabında)

---

## 🔴🔴 Dərs 29 — MÜƏLLİM UĞURSUZ NÜMUNƏ GÖSTƏRİR VƏ SƏBƏBİNİ DEYİR

Bu, bütün kursda bizim üçün ən dəyərli andır. Müəllim **qəsdən stop olan**
bir order block əməliyyatı göstərir, sonra soruşur: *"Niyə belə oldu?
Videonu dayandırın və düşünün."*

### Cavab [00:05:11–00:05:56]
> *"Order block olması üçün **önəmli bir səviyyəyə gəlməsi lazımdır**.
> Önəmli səviyyə — bu nədir? **Bu bir önəmli səviyyədirmi? Heç nə, mənası
> yoxdur.** Saatlığa getdiyimizdə... önəmli səviyyə haradadır? Burada.
> **Biz oraya gəlmişikmi?** [Xeyr]"*

### 🔑 Və birbaşa diaqnoz [00:06:25–00:06:46]
> *"Bu order block-ların **İŞLƏMƏMƏSİNİN TƏK SƏBƏBİ budur** — **önəmli bir
> səviyyəyə gəlmədən**. Hər swing high-ı aldı, sonra düşdü, displace oldu,
> geri dönüşündə dərhal işləmə girim... **HEÇ BİR İŞƏ YARAMAZ.**
> Çünki o, order block olmur."*

[00:06:49] *"Türkiyədə SMC öyrədən çox adam bu şəkildə anladır. **Bu səbəbdən
order block-lar heç işə yaramır.**"*

### ⚠️ BİZİM SİSTEMİMİZİN ÖLÜM SƏBƏBİ MƏHZ BUDUR
Bizim rədd edilmiş sistem tam olaraq bunu edirdi: *"hər swing/səviyyə alındı →
dərhal gir"*. HTF-də **vacib səviyyədə olub-olmadığını yoxlamırdıq**.

Diaqnostikamızın rəqəmi (-0.331 ATR, t=-2.66) bunun riyazi təsdiqidir.

### Düzgün iş axını (müəllim göstərir) [00:07:44–00:09:24]
```
1. 1H-ə keç → vacib səviyyəni tap (swing high + 1H FVG)
2. DOL müəyyən et (likidite harada — yuxarıda/aşağıda)
3. Qeyd et: 1H FVG əvvəlcə doldurulmalıdır
   ("market düz getmir, geri çəkiləcək")
4. 5 dəqiqəyə en
5. ⚠️ Qiymətin HƏMİN 1H səviyyəsinə ÇATMASINI GÖZLƏ
6. Orada swing-in alınmasını gözlə
7. Alan şam o tayda gövdə ilə bağlanmalı → etibarlı order block
8. Geri çəkilmədə gir
```

**İndikator üçün nəticə:** hazırkı kodda sweep izlənilən səviyyələrdə
(PDH/PDL/PWH/PWL/seans) yoxlanılır — bu, qismən HTF-dir. Amma müəllimin
tələbi daha sərtdir: **qiymət HTF-in vacib zonasında (1H/4H FVG və ya
əsas səviyyə) OLMALIDIR**. Bu filtri əlavə etmək lazımdır.

---

## Qalan dərslər (03-07, 10-15, 22, 28, 35, 38, 39, 45) — xülasə

Bunlar əsas/təşkilati dərslərdir. Strategiyanı dəyişən yeni qayda **yoxdur**,
amma bir neçə dizayn qeydi var:

**D14 — mənbə:** Strategiya **ICT-nin "2022 modeli"nə** (41 videoluq seriya)
əsaslanır + müəllimin öz şərhləri.

**D11 — indikator siyasəti:** *"Biz Price Action etdiyimiz üçün **indikator
çox işlətmirik**"*. İşlədilən yeganə şey: seans/killzone indikatoru + swing
işarələmə. → Bizim indikatora EMA/RSI kimi klassik göstəricilər **əlavə
etməmək** lazımdır.

**D10 — fokus:** Yalnız Price Action mənbələrindən öyrən, indikator əsaslı
kanallarla qarışdırma.

**D28 — hədəf zənciri qaydası** [00:01:52–00:02:23]:
> *"Bunu aldı — displacement varmı? Yox. Onda **növbəti likiditeye gedəcək**.
> ... Yuxarı doğru displacement yox, market dəyişimi yox → **davam, növbəti
> likiditeye baxacaqsınız**."*

Alqoritm: səviyyə alınır → displacement/MSS yoxdursa → **növbəti səviyyə hədəf
olur** → təkrarla. (D20-dəki tərs qayda ilə eynidir.)

**D28 — səviyyə gücü:** [00:05:10] *"**Zaman dilimi artdıqca tepki daha çox
olur**"* — HTF səviyyə = güclü reaksiya. Həftəlik FVG *"böyük hədəf"*dir.

**D05 — kapital:** Sərmayə şərt deyil — fond hesabları (TopStep, MyFundedFutures).
Aylıq hədəf realistik olaraq **%4–10**.

**D45 — bağlanış tövsiyəsi:**
1. Keçmiş datada **çox pratika** (backtest)
2. Sonra **demo/paper trading** (irəli test)
3. Yalnız sonra fond hesabı
4. Psixologiya kitabı oxu (adı aydın deyil — *"Trading psikolojisi ilə bağlı
   çox vacib kitab"*, çox güman **"Trading in the Zone" – Mark Douglas**)

> *"Daha çox şey öyrənməyinizə **ehtiyac yoxdur**: sadə strategiya + yaxşı
> risk idarəetməsi + sağlam psixologiya. Mən sizə **sadə, anlaşılması asan**
> bir strategiya verdim — **detayı qəsdən çıxardım** ki sadə olsun."*

---

## ✅ TRANSKRİPT ƏHATƏSİ: 43/43 TAMAM

---

## Kadr baxışı — davam edən qeydlər

**D43 sheet_003 (00:04:16–00:05:20), NQ1! 5m:** FVG-nin necə çəkildiyi vizual
olaraq təsdiqləndi — boz düzbucaqlı, **1-ci şamın fitilindən 3-cü şamın
fitilinə**, üzərində "FVG" etiketi. Transkriptlə üst-üstə düşür.

**D43 sheet_015 (00:20:32) — SMT işarəsi:** Ekran ikiyə bölünür —
yuxarıda **NQ1!**, aşağıda **Gold (XAUUSD, FOREX.COM)**. Yəni korrelyasiyalı
alətləri yan-yana müqayisə edir (SMT — Smart Money Technique divergensiyası).
D40-da bunu "strategiyaya əlavə edilə bilən şey" kimi qeyd etmişdi, amma
ayrıca izah etmir.

**D29 sheet_004 (00:07:04–00:08:08) — uğursuzluq dərsinin vizual təsdiqi:**
5 dəqiqədən **1 saatlığa qalxır**, orada "vacib səviyyəni" tapır və onu
**qırmızı qutu ilə (1H FVG)** işarələyir. Sonra yenidən 5 dəqiqəyə enir.
Bu, "əvvəlcə HTF-də vacib səviyyəni tap" qaydasının ekranda görünüşüdür.

---

## 🔴 D43 [00:35:37–00:36:05] — MÜƏLLİMİN ÖZ SÖZÜ İLƏ TAM KONFLUENS

Bu, bütün kursda bizim üçün **ən dəyərli tək cümlədir**. Kadr `f_00268`–`f_00272`
ilə birlikdə oxunur (orada ekranda boz **"4H FVG"** qutusu görünür):

> *"Düşük dirençli de çox önəmli. Bax **high-lar necə toxunulmur**, görürsən mi?
> ... Bax high-ların **heç biri toxunulmur** — **TA Kİ 4 saatlikdə, yüksək zaman
> dilimində bir likidite alımımız olduğu zaman**... internal likiditeni aldığı
> zaman — **4 saatlik FVG** — ondan sonra nə olur? **Ondan sonra SETUP VERİR
> mənə. Və bunların hamısı KILLZONE-un içində olur.** Puzzle parçaları necə
> oturur gördünüz mü?"*

### Bundan çıxan MƏCBURİ konfluens siyahısı (4 şərt eyni anda)
```
1. LRLR    — hədəf tərəfdə toxunulmamış high/low silsiləsi var
2. HTF     — qiymət 4 saatlik FVG-yə çatıb və oradakı likiditeni ALIB
3. SETUP   — yalnız BUNDAN SONRA LTF-də displacement + MSS + FVG/IFVG
4. KILLZONE— hər şey killzone pəncərəsinin içində baş verir
```
Bizim köhnə (uğursuz) sistemimizdə **yalnız 1 və 4** var idi.
2 və 3 yox idi — ölçülmüş **-0.331 ATR** nəticəsinin səbəbi budur.

### Kadr təsdiqi (`43/sheet_028`, 00:35:36–00:36:08)
- Ekranda **boz böyük qutu**, sol altında etiket: **"4H FVG"**
- Qiymət o qutunun içinə enir, ardıcıl low-ların altını süpürür
  (hər low ayrıca qısa üfüqi boz xətlə işarələnib = sellside hovuzları)
- Position tool: **çəhrayı (stop) AŞAĞIDA — 4H FVG-nin dibindən aşağı**,
  **yaşıl (hədəf) YUXARIDA**
- Yəni **stop HTF FVG-nin o tayına qoyulur**, LTF swing-ə yox

## D43 — çıxış qaydası (əvvəl qeyd etməmişdim)
[00:33:52–00:34:05]:
> *"Market **PM seansının sonlarına doğru konsolidə** olmağa başlayır.
> Nə edərsən? **Bağlayarsan əməliyyatı**, ya da stopu çəkərsən; icazə verirsə
> overnight tutarsan — əgər nə etdiyini bilirsənsə."*

→ Kodda: **NY PM bitişinə yaxın konsolidasiya başlayırsa mövqeyi bağla.**
Standart davranış = gün sonunda bağla.

## D43 — intermediate term high/low
[00:35:18–00:35:30]: LTF-də yaranan swing-lər **"intermediate term high/low"**
adlanır. Bullish ayaqdasan → **ITL-lərə hörmət ediləcəyini**, ITH-ların
**qırılacağını** gözləyirsən. Bearish ayaqda əksi.

## D43 [00:26:36–00:27:15] — SETUP-I QAÇIRDINSA
> *"Bunu aldın amma **qaçırdın**. New York-a gəldin, qrafiki açdın, dedin ki
> 'bunu qaçırmışam'. İndi nə gözləyəcəksən? Harada likidite var? Şurada var —
> açılışda gəlsin, ora qədər düşsün, mən buradan girim."*
> *"Sən buraya qədər düşəcəyini öngörürsənsə — **niyə short-a daxil olmursan,
> niyə İLLA reversal gözləyirsən?**"*

→ Bias aydındırsa, **davam (continuation) girişi** də etibarlıdır; hər dəfə
dönüş quruluşu gözləmək lazım deyil. Növbəti killzone açılışında növbəti
likidite hədəf götürülür.

## D43 [00:24:01–00:25:20] — IFVG girişinin İKİ variantı və RR-ləri
1. **Gövdə bağlanışından sonra geri çəkilmədə** gir → daha yaxşı qiymət
2. Geri çəkilmə vermirsə → **gövdə bağlanışından sonrakı şamda** gir
   → müəllim: *"1:3 alırsan"*, başqa nümunədə *"2.5 aldım"*

Yəni gecikmiş giriş belə **1:2–1:3** verir. Bu, bizim TP1 = 1:2 seçimini
təsdiqləyir.

## D43 kadr `sheet_020` (00:25:36–00:26:40) — seans rənglərinin TƏSDİQİ
Tam gün görüntüsündə (kadr `f_00201`) bütün seans qutuları eyni anda görünür.
Etiketlərdən oxunur: **"Asia" = MAVİ**, **"PM" = BƏNÖVŞƏYİ**,
London = **çəhrayı/qırmızı**, NY AM = **yaşıl**, NY Lunch = **sarı**,
üstündə **"True Day Open"** üfüqi xətti.
→ Əvvəl yazdığım rəng sxemi doğrudur, indi vizual təsdiqi var.

---

## 📏 D40 `sheet_010` (00:14:32–00:15:36) — NAS100-də REAL ÖLÇÜLƏR

Ekrandakı TradingView position tool-larından oxunan dəqiq rəqəmlər
(NAS100, 5 dəqiqə, qiymət ≈ 19,550):

| Kadr | Stop | Hədəf | RR | Qty |
|---|---|---|---|---|
| `f_00111` | **-21.8 punkt (0.11%)** | +85.5 punkt (0.43%) | ~3.9 | 5 |
| `f_00113` | **-38.7 punkt (0.20%)** | +104.5 punkt (0.53%) | **2.7** | 5 |
| `f_00118` | — | +116.1 punkt (0.59%) | **2.06** | 5 |
| (D41 `f_00281`) | -27.4 punkt (0.14%) | +74.6 punkt | **3.1** | 9 |

**Nəticə — NAS100 üçün gözlənilən parametrlər:**
- Stop məsafəsi: **20–40 punkt** = qiymətin **0.10%–0.20%**-i
- Hədəf: **85–116 punkt** = **0.43%–0.59%**
- RR: **2.0–3.9** (orta ≈ 2.7)
- Qty riskdən hesablanır (5 və ya 9 kontrakt — hesab ölçüsündən asılı)

Bu, bizim indikatorda `TP = 2R` seçiminin müəllimin praktikası ilə üst-üstə
düşdüyünü göstərir. Stopun **çox dar** olduğunu da göstərir — 5 dəqiqəlik
NAS100-də 20-40 punkt ≈ 1 ATR civarı. Bunu backtest-də yoxlamaq lazımdır.

**Ekranda görünən səviyyə etiketləri (indikatorun çıxışı):**
`AS.H · AS.L · LO.H · LO.L · NYAM.H · NYAM.L · NYL.H · NYL.L · NYPM.H ·
NYPM.L · True Day Open` — 11 səviyyə. Bizim Pine faylında hamısı var. ✅
Qrafikdə həmçinin **"mss"** mətn etiketi əl ilə yazılır.

## 🔴 D40 [00:15:11–00:15:41] — RESEPTİN BİR CÜMLƏDƏ TƏKRARI
> *"Neydi? **Yüksək zaman dilimində likidite var — alır. Reversal pattern
> olaraq DISPLACEMENT. Market yapısı dəyişimi — MUM KAPANIŞI olduğu üçün.**
> Market structure shift-lə olan yerin **altındakı** FVG-yə girirsiniz —
> **ORTA NÖQTƏSİNDƏN**. Stopu **swing low**-a buraxırsınız. **1:3 / 1:2**
> hədəfləyirsiniz. Zatən market onu da sizə verir."*

Stop yeri dəqiqləşdi: **"ən son oluşan swing low"** [00:14:46–00:14:59].
İki variant göstərir, ikisi də 1:2–1:3 verir.

## D40 [00:13:44] — Sharp Turn-un tərifi (kod üçün)
> *"Alırken **Sharp Turn dediyimiz pattern FVG bırakıyor**, aldıqdan sonra da
> FVG bırakıyor."*

İki FVG: biri likiditeni **alarkən**, biri **aldıqdan sonra**. Bizim Pine
kodundakı iki-FVG kəsişməsi tərifi doğrudur. ✅

## D40 [00:14:22–00:14:43] — MSS-in "yumşaq" variantı
Müəllim etiraf edir: bəzən gövdə bağlanışı olmadan da pattern-ə görə MSS
deyir. Amma **bizə tövsiyəsi**: *"Siz **düz qaydaya uyub** buraya **body**
deyin və oradan, **orta nöqtəsindən** giriş edin."*
→ Kodda **yalnız gövdə bağlanışı** qəbul edilməlidir. Müəllimin "göz qərarı"
istisnası avtomatlaşdırıla bilməz.

---

## 🌍 BAZAR ƏHATƏSİ — kadrlardan çıxan faktiki sübut

Müəllimin ekranda **hansı alətlərdə** eyni modeli tətbiq etdiyi:

| Dərs | Alət | Qeyd |
|---|---|---|
| D40, D41 | **NAS100 / NQ1!** | əsas nümunə, killzone-larla |
| D42 | **GC1! Gold Futures (COMEX)** | IRL/ERL nümunəsinin HAMISI qızıl üzərində |
| D42 | **GBPUSD (FOREX.com)** | killzone qutuları forex-də də tətbiq olunur |
| D43 | **NQ1! + XAUUSD yan-yana** | SMT korrelyasiya müqayisəsi |
| D44 | **EURCAD, USDJPY, GBP, BTC, NQ** | "universal model" — hamısında eyni |

→ Sualın cavabı: **SP500 / NASDAQ / GOLD / BTC — bəli**, müəllim özü
göstərir. **ETH** üçün ayrıca nümunə yoxdur, amma BTC ilə eyni kateqoriyadır
(likvid, institusional). Yeganə şərt: *"siko-siko coinlərin üstündə
sınamayın"* (D44 @00:01:09).
⚠️ Kriptoda **killzone hissəsi zəifləyir** (24/7 bazar) — orada yalnız
likidite + FVG + struktur qalır.

---

## 🔴 D32 — "MSS-Mİ, YOXSA SADƏCƏ LİKİDİTE ALIMI?" — AYIRD ETMƏ QAYDASI

Bu dərs bizim köhnə sistemin **məhz uğursuz olduğu nöqtəni** izah edir.
Kadr `32/sheet_003` (00:02:32–00:03:36), NQ1! 5m, 11 Yanvar 2024.

### ❌ SADƏCƏ likidite alımıdır (girmə!) [00:02:15–00:02:40]
> *"Market gedir, bax buranın üstünə çıxır, bunun üstünə **iğnə atır**, daha
> sonra **sərt şəkildə özünü aşağı atır**. Belə olduğu zaman anlayın ki market
> **sadəcə likidite almağa çalışır**. Bax **displacement gəlməyib** yuxarı
> doğru. Yuxarı gedib, orada **qapada bilməyib**, aşağı atdı özünü."*

İmza: **uzun fitil + gövdə bağlanışı YOX + əks displacement YOX**.

### ✅ HƏQİQİ market yapısı dəyişimidir [00:05:12–00:05:28]
> *"Buraları **wick-lə** aşağı atsaydı, deyərdik ki yox, market yapısı
> dəyişmədi. **Displacement-la bərabər GÖVDƏ KAPANIŞI yapıyorsa, GAP-i bıraka
> bıraka, doldura doldura gidiyorsa — bilin ki market yapısı DƏYİŞMİŞDİR.**"*

Üç şərt birlikdə:
1. **Displacement** (enerjili, tək istiqamətli)
2. **Gövdə bağlanışı** səviyyənin o tayında
3. ⭐ **Ardıcıl FVG buraxıb-doldurma** — bir yox, **zəncirvari** boşluqlar

Üçüncü şərt mənim üçün **yeni**: tək FVG kifayət deyil, hərəkət **davamlı
olaraq** boşluq buraxıb onları geri doldura-doldura getməlidir.

### ⭐ LİKİDİTE SAYI = ehtimal artırıcı [00:04:23–00:04:36]
> *"Neden önemli? **Kaç tane likiditeyi aldı** burada? ... **Bir önceki günün
> likiditesini de aldıysa, session likiditelerini de aldıysa**..."*

→ Kodlanabilən filtr: **bir sweep-də neçə izlənən səviyyə süpürülüb?**
(AS.L, LO.L, NYPM.L, əvvəlki gün low-u, equal low...) Say nə qədər çoxdursa,
dönüş ehtimalı o qədər yüksəkdir. Bizim Pine-da **sweep konfluens sayğacı**
əlavə edilməlidir.

D34-də eyni şey praktikada: *"o sırada zatən **PM session low-u ilə Asya-nın
low-u** likiditesini də alır"* — yəni **iki** hovuz eyni anda.

### 🔴 FİTİL vs GÖVDƏ — mərkəzi qayda [00:03:26–00:03:42]
> *"**İğneleri takmayın arkadaşlar. İğneler genelde manipülasyonda çox hikayə
> anladır bizə. GÖVDƏLƏRƏ odaklanın.** Gövdələr fair value gap-ə nə qədər
> içində qaldığına baxın."*

Bu qayda kursda **ən azı 4 dəfə** təkrarlanır (D32, D33 FVG ölümü, D30 order
block etibarlılığı, D43 günlük bias). Kodda hər yerdə `close`/`open` ilə
işləmək lazımdır, `high`/`low` ilə yox — yalnız sweep aşkarlanmasında fitil.

### Müəllimin praktika tövsiyəsi [00:07:25–00:07:58]
> *"Bu şeyləri qrafikdə **incələyin, izləyin**. İşlem açın demirəm, **demo
> hesabda da işlem açın demirəm**. Sadəcə **izləyin, işarələyin**. Gözünüz
> alışsın — gözünüz gördükcə anlayacaq."*

---

## 🔴🔴 D31 — MÜƏLLİMİN A/B TƏCRÜBƏSİ: EYNİ PATTERN, FƏRQLİ NƏTİCƏ

Bu, bütün kursda **bizim üçün ən çox dəyəri olan didaktik hissədir**, çünki
müəllim **eyni order block pattern-ini iki dəfə** göstərir — biri **UĞURSUZ**,
biri **UĞURLU** — və aradakı **yeganə fərqi** adlandırır.

### A) UĞURSUZ nümunə [00:05:06–00:06:11]
Hər şey "kitaba uyğun"dur:
- likidite nöqtəsi var ✅
- qiymət onu alır ✅
- şamın üstündə **gövdə ilə bağlanır** ✅ → *"burası bizim üçün order block
  oluyor, değil mi?"*
- limit əmri qoyulur, hədəf 1:2

**Nəticə:** *"Aa, olmadık."* (TP olmadı, stop oldu.)

Müəllimin öz izahı:
> *"Peki **niyə** oldu bu? ... Burada **o önəmli səviyyə dediyim yer var mı?
> YOX.** O zaman bu bizim üçün nə olur? **Bir şey olmur.**"*

### B) UĞURLU nümunə [00:06:44–00:08:25]
Fərq **yalnız bir şeydir**: yüksək taymfreymdə **vacib səviyyə**.
> *"Yüksək zaman diliminə baxdığımızda... **important level dediyimiz önəmli
> səviyyə əslində BİR SAATLİKDƏ burada varmış.** ... Burada nə var? **1 saatlik
> FVG var. Point of interest dediyimiz bir yer var.** 5 dəqiqəliyə endik."*

Tam yoxlama siyahısı (müəllimin ardıcıllığı ilə):
```
1. HTF (1H) FVG-nin İÇİNDƏYİK          ← "important level" / point of interest
2. HTF istiqamət UYĞUNDUR              ← "1 saatlik trendimiz yuxarı, buy modeldeyiz"
3. LTF likidite ALINIR                 ← "buradaki low'u alıyor"
4. Likiditeni alan ƏKS-RƏNGLİ şam      ← "down close candle, kırmızı bir mum"
5. Onun ÜSTÜNDƏ GÖVDƏ bağlanışı        ← "bunun üstüne kapatırsa → CISD/order block"
6. GİRİŞ: order block gövdəsi və ya ORTA NÖQTƏSİ
7. STOP: OB-nin fitilinə (RR 1.68) və ya gövdəsinə (daha yaxşı RR)
8. HƏDƏF: yuxarıdakı high, ya da 1:2
```
> *"**Hər şey uyuyor.** Hani zaman dilimini də uydururuq özümüzcə. Önəmli
> səviyyəni də aldı."*

### ⭐ YENİ TERMİN: "MEAN THRESHOLD" [00:08:39]
> *"Şimdi bunun **orta nöqtələri — mean threshold** olduğunu... bunu çəkib
> **orta nöqtədən** giriş arayanlar olur."*

Yəni order block-un da FVG kimi **50% orta nöqtəsi** var və giriş oradandır.
Bizim kodda FVG üçün bu var, **order block üçün əlavə edilməlidir**.

### 🎯 BİZİM ÜÇÜN NƏTİCƏ
Köhnə XAU sistemimizin **-0.331 ATR** nəticəsi məhz A) variantı idi:
sweep var, pattern var, **HTF vacib səviyyə YOX**.
Müəllim eyni səhvi ekranda edib nəticəni göstərir.

**Kodda məcburi şərt:** siqnal yalnız qiymət **HTF FVG / OB / vacib səviyyənin
içində və ya ona toxunma məsafəsində** olarsa verilir. Bu filtr olmadan
qalan bütün məntiq **statistik olaraq mənasızdır**.

---

## 🔴 D23 — "VACİB SƏVİYYƏ" NƏDİR? (D31-in itən yarısı)

D31 dedi ki *"important level olmadan order block işləmir"* — amma **hansı
səviyyənin vacib olduğunu** D23 təyin edir.

### Vacib likidite səviyyələrinin RANQI [00:10:45–00:11:18]
> *"Buradakı **ən önəmli likidite səviyyəsi harası idi? New York seansında
> oluşmuş PM SESSION likiditesi** — New York-un öğlen saatlerinde... **1.5 ilə
> 4 arası** oluşmuş o **biriken** likidite. Bir də o **düşük dirençli**
> likidite... **oralara getməsi çox daha yüksək ehtimallıdır.**"*

Sıralama (yüksəkdən aşağı):
1. **NY PM seansında yığılmış likidite** (13:30–16:00 NY) ← ən vacib
2. **Low Resistance Liquidity** — toxunulmamış, üst-üstə yığılan səviyyələr
3. **Günlük (Daily) FVG** — HTF hədəfi
4. **Günlük swing high/low** — external hədəf
5. Seans high/low-ları (AS/LO/NYAM/NYL/NYPM)

### Tərəf seçimi qaydası [00:10:07–00:10:21]
> *"Burada bu qədər **heyvan kimi likidite var — TOXUNULMAMIŞ**. Para para
> para var burada. Burada da var para, **amma məntiqən hara getməsi daha
> OPTIMAL olur?**"*

→ İki tərəfdə də likidite var. **Daha çox toxunulmamış** olan tərəfi seç.
Kodda: hər iki tərəfdəki alınmamış səviyyələri **say**, çox olanı hədəf götür.

### ⭐ FVG-lər HƏDƏF kimi [00:03:37]
> *"**FVG-ləri arkadaşlar LİKİDİTE HƏDƏFİ olaraq istifadə edə bilərsiniz.**"*
Yəni TP həmişə swing olmaq məcburiyyətində deyil — qarşı tərəfdəki
doldurulmamış FVG də etibarlı TP-dir. (IRL/ERL növbələşməsi ilə eynidir.)

### Günlük qrafikdən bias qurma resepti [00:14:38–00:19:33]
```
1. GÜNLÜK qrafiyə keç
2. İşarələ: swing high/low (external) + doldurulmamış günlük FVG (internal)
3. Yuxarıda swing high, aşağıda doldurulmamış FVG varsa →
   gözlənti: əvvəl aşağı geri çəkilmə (FVG-ni doldurmaq üçün), SONRA long
4. LTF bias bu hədəfə görə qurulur
5. İki günlük FVG varsa: qiymət birincidən tepki alıb ikinciyə heç
   uğramadan hədəfə gedə bilər
```

### ⭐ FVG-nin NİYƏ yarandığı (kökündəki məntiq) [00:13:36–00:13:47]
> *"**FVG-lərin və displacement-in oluşma səbəbi: qiymətin TƏK TƏRƏFLİ
> sunulması.** Tək tərəfli olaraq sunur qiyməti market/alqoritma bizə, daha
> sonra oranı **REBALANCE edir, dengeliyor.**"*

Ona görə FVG geri doldurulur — bu, "tarazlığın bərpası"dır.

### 🧊 SOYUDUCU DUŞ — müəllimin öz etirafları
[00:16:07–00:16:30]:
> *"Market günlükdə aşağı gedir — **tam tərsi**... **Market heç vaxt sizin
> gözlədiyiniz şeyləri net, əlinizə tepsi ilə sunmaz.** ... **Nə
> gözləyirsinizsə, TAM TƏRSİNİ etməyi market sevir** — stop partladır çünki."*

[00:16:59–00:17:12]:
> *"**Belə canlı-canlı seçərək nümunə etməyi sevmirəm**, çünki heç vaxt
> **mükəmməl nümunəni** önünüzə qoymaq istəmirəm — çünki heç vaxt mükəmməl
> nümunə olmayacaq. **Bu şeylər sürəkli %100 işləməyəcək.**"*

→ Bizim mövqeyimizi təsdiqləyir: **ölçmədən inanma.** Müəllim özü də
"həmişə işləyir" demir.

### D23 real əməliyyat ölçüləri
[00:04:04–00:04:20]: *"36,5 point... **60 point-lik bir işlem**"* — NAS100-də.
Yenə **20–60 punkt** aralığı. ✅ (D40/D41 ölçüləri ilə uyğun.)

---

## 🔴 D17 — İNDİKATORUN TAM AYARLARI (kadrdan hərfbəhərf oxundu)

Kadr `17/f_00051` böyüdüləndə TradingView-ün başlıq sətrində indikatorun
bütün parametrləri oxunur. Bu, təxmin deyil — **ekrandan oxunan mətndir**:

```
3 30  GMT-5  Normal 1200-1201  70 50
Asia      2000-0000
London    0200-0500
NY AM     0930-1100
NY Lunch  1200-1300
NY PM     1330-1600
AS.H AS.L LO.H LO.L NYAM.H NYAM.L NYL.H NYL.L NYPM.H NYPM.L
Solid 1 Bottom  Midnight  D.OPEN  W.OPEN  M.OPEN  Solid 1  True Day Open
```

### ✅ Təsdiqləndi
- **NY AM = 0930-1100** (əvvəlki düzəlişim DOĞRU idi — kontakt vərəqində
  kiçildilmiş mətn "0830" kimi görünürdü, tam ölçüdə **0930**-dur)
- Digər bütün seans saatları bizim Pine faylındakı kimidir ✅
- True Day Open = **1200-1201** ✅

### ⚠️ ƏLAVƏ EDİLMƏLİ — 4 yeni istinad səviyyəsi
İndikator bunları da çəkir, bizdə **YOX**:
- **Midnight Open** (00:00 NY)
- **D.OPEN** — günlük açılış
- **W.OPEN** — həftəlik açılış
- **M.OPEN** — aylıq açılış

### ⚠️ Saat qurşağı xəbərdarlığı
Ayarda **GMT-5** (sabit) yazılıb — bu, NY qış vaxtıdır. Yayda NY **GMT-4**
olur. Kadrların altında bəzən `(UTC-4)`, bəzən `(UTC-5)` görünür — müəllim
əl ilə dəyişir (D23 @00:10:53: *"şu indikatörü də düzəldim, GMT-5 yapalım"*).
→ **Bizim Pine-da sabit ofset yox, `America/New_York` istifadə edilməlidir**
ki, yay/qış avtomatik keçsin. Bu, müəllimin əl işini avtomatlaşdırır.

Taymfreym bu dərsdə: **NQ1! 15 dəqiqə** (seans qutularına baxmaq üçün).

---

## 🔴 D17 — POWER OF THREE (PO3): GÜNÜN MAKRO ŞABLONU

[00:05:29–00:07:31] — bunu heç yerdə qeyd etməmişdim, halbuki **bütün
strategiyanın çərçivəsidir**:

```
ASİYA   → AKKUMULYASİYA  — smart money mövqe yığır, hərəkət yoxdur
LONDON  → MANİPULYASİYA  — Asiyanın likiditesini alır, stopları partladır
NY      → DİSTRİBUSİYA   — əsl hərəkət, hədəfə gedir
```

> *"Asya seansında hərəkət yoxdur, **orderlar birikir**. Londra seansına
> gəldiyimiz zaman **manipulyasiya başlayır**. Tam **8.5-a, endekslər
> açıldığı zaman** bütün biriken likiditeni alır, ondan sonra
> **distribution** — yəni hədəfinə davam edir."*

### ⭐⭐ KODLANA BİLƏN QAYDA [00:05:12–00:05:28]
> *"**Bullish olduğu zaman market — günün LOW-unu LONDRA-da yapar.**"*

Yəni:
- Gün **bullish** olacaqsa → **günün ən aşağı nöqtəsi London seansında** yaranır
- Gün **bearish** olacaqsa → **günün ən yüksək nöqtəsi London seansında** yaranır

Bu, "London sweep-i günün ekstremumudur" fərziyyəsidir və **ölçülə bilər**:
NASDAQ datasında *"günün low-u London saatlarında yaranıbmı?"* faizini
hesablamaq — birbaşa yoxlanıla bilən statistik iddia.

---

## 🔴 D17 — SEANS SAATLARI: İNDİKATOR ≠ TRADE PƏNCƏRƏSİ

[00:02:43–00:02:57] Müəllimin **öz trade pəncərələri** (NY vaxtı):

| Bazar | Ən yaxşı pəncərə |
|---|---|
| London (hər ikisi) | **02:00–05:00** |
| **Forex** NY | **07:00–10:00** |
| **ENDEKS (NASDAQ)** NY | **08:30–11:00** ⭐ |

⚠️ Diqqət: indikatorun **NY AM qutusu 09:30–11:00**-dır, amma müəllimin
**endekslər üçün dediyi pəncərə 08:30–11:00**-dır — yəni **08:30 iqtisadi
data buraxılışı** daxildir. D43 @00:27:24-də də *"New York açılışından əvvəl
8.5-a"* deyir.

→ Bizim Pine-da **NAS100 üçün trade pəncərəsi 08:30–11:00** olmalıdır
(indikator qutusu 09:30-da başlasa da).

### PM haqqında zidd görünən iki ifadə — həlli
- D17 @00:03:45: *"Mən bu **PM session-a çox baxmıram**, sadəcə Londra ilə
  New York tərəfinə baxıram."* → **PM-də trade etmir**
- D23 @00:10:45: *"ən önəmli likidite səviyyəsi **PM session likiditesi**"*
  → **PM-in likiditesi HƏDƏF kimi ən vacibdir**

Ziddiyyət yoxdur: **PM-də girmir, amma PM-in qoyduğu likiditeni hədəf alır.**
Kodda: NYPM.H/L səviyyələri **hədəf siyahısında** qalsın, amma PM pəncərəsi
**giriş üçün defolt bağlı** olsun.

### Asiya haqqında
[00:02:00–00:02:08] *"Asya seansının çox işlem açmağa uyğun bir saat dilimi
olduğunu düşünmürəm, çünki **çoğu şey hərəkət etmir**."* → Asiya = trade YOX.

---

## 🔴 D43 [00:12:15–00:13:56] — İKİ YENİ MEXANİKİ QAYDA

### 1️⃣ FVG girişi ≠ IFVG girişi (bunu qarışdırmışdım)
> *"IFVG-yə **necə girəcəksən**? Hani buraya **geri dönməsini mi
> gözləyəcəksən? KƏSİNLİKLƏ XEYR.** ... **Böyük ehtimalla retrace verməz
> oralar. IFVG retrace olmaz.** FVG olabilir, amma bu tərz vəziyyətlərdə
> IFVG geri dönüş çox olmaz. Nə edərsən? IFVG harada bağlamış — **gövdə
> bağlanışı** — **BİR SONRAKI ŞAMDA dahil olursan.**"*

| Quruluş | Giriş üsulu |
|---|---|
| **FVG** | Geri çəkilməni gözlə → **50% orta nöqtədən** limit |
| **IFVG** | Gözləmə → **gövdə bağlanışından SONRAKI şamda market** |

Bizim Pine kodunda hazırda hər ikisi üçün "50%-ə qayıt" gözlənilir —
**IFVG üçün bu SƏHVDİR** və siqnalların itməsinə səbəb olur.

### 2️⃣ ⭐ STOP YERİ RR-ə GÖRƏ SEÇİLİR (mexaniki qayda)
> *"Nə etdim? **Gövdəyə atdım.** Çünki niyə? **Swing low-a atsam 1.37 verir —
> RR çox pisdir.** Nə etdim? Buraya atdım — **3.2** işlemimi aldım."*

Alqoritm:
```
1. Stopu swing low/high-a qoy → RR hesabla
2. RR < 2 isə → stopu FVG/IFVG-nin GÖVDƏSİNƏ çək (daha dar)
3. Yenidən RR hesabla; hələ də < 2 isə → BU SETUP-I BURAX
```
Bu, D40/D41-dəki **çox dar stopların (0.10–0.20%)** səbəbini izah edir:
stop "təhlükəsizlik" üçün deyil, **RR-i 2-nin üstünə çıxarmaq üçün** seçilir.

⚠️ Diqqət: D33 @00:12:00-də özü xəbərdarlıq edir — *"Mən stopu qısa tuturam,
təcrübəli olduğum üçün. Siz bu qədər qısa stop işlətməyin."* İki ifadə birgə
oxunmalıdır: **RR-i stopu daraltmaqla düzəltmək təcrübəli davranışdır.**

### 3️⃣ Müəllim özü MEXANİKİ yanaşmanı seçir [00:12:45–00:12:53]
> *"Bunu **RR-ə görə ayarlayacaqsan. MEXANİKİ yaxınlaşırıq.** Mən, daha
> doğrusu, **mexaniki yaxınlaşmaq daha xoşuma gedir.**"*

→ Strategiyanın kodlaşdırılmasına müəllimin öz mövqeyi maneə deyil.

### 4️⃣ Hədəf seçimi — acgözlük yox [00:12:56–00:13:17]
> *"**Həftənin likiditesi var** — belə tutmaqdansa... Twitter-də hava atacağam
> deyə yox. **Birbaşa baxıram: burada likidite var, toxunulmamış** — buranı
> hədəflədim."*
→ Hədəf = **ən yaxın TOXUNULMAMIŞ likidite**, ən böyüyü yox.

### 5️⃣ Konfluens yenidən sadalanır [00:11:32–00:11:47]
> *"Həm **yüksək zaman dilimində internal çəkilir**, həm **düşük zaman
> dilimində likidite alır**, həm **external/internal məntiqinə** görə hərəkət
> edir. Artı olaraq **günlük bias-ın da bəllidir**. Oranı alarkən nə yaradır?
> **IFVG.** Aldıqdan sonrakı **Sharp Turn**."*

---

## 📋 D41 kadr `f_00082` — ORİJİNAL ICT KILLZONE CƏDVƏLİ (ekrandan oxundu)

Canlı yayımda müəllim Google-da axtarıb ekrana gətirir: *"ICT Killzones And
Ranges"* (mənbə: Tradinator, X/Twitter). Saatlar **NY vaxtı**:

| Zona | Xarakter | Vaxt (NY) | Sweetspot |
|---|---|---|---|
| **London Open KZ** | ⭐ *"Generally creates the **High or Low of the day**"* | **02:00–05:00** | **03:00** |
| London Lunch | Konsolidasiya; dönüş/davam ola bilər | 05:00–07:00 | — |
| **New York Open KZ** | *"Generally provides **Continuation or Reversal**"* | **07:00–10:00** | **09:00–09:30** |
| London Close KZ | *"For **profit taking**; can also create the High or Low of the day"* | 10:00–12:00 | — |
| ICT Asian Range | JPY/AUD/NZD daha volatil | 20:00–00:00 | — |
| **ICT Central Bank Dealers Range** | 🚫 ***"No-Trade zone"*** | **16:00–20:00** | — |
| ICT Flout Range | Flout+Asia; 🚫 *"also no-trade zone"* | 16:00–00:00 | — |

### Bundan çıxan yeni qaydalar
1. ⭐ **"London Open KZ günün high və ya low-unu yaradır"** — D17-dəki
   *"bullish gündə günün low-u Londra-da yaranır"* ifadəsinin **yazılı
   təsdiqi**. Bu, ölçülə bilən konkret iddiadır.
2. 🚫 **16:00–20:00 NY = TRADE YOX** (Central Bank Dealers Range). Bizim
   indikatorda bu pəncərə **bloklanmalıdır** — hazırda yoxdur.
3. **London Close KZ (10:00–12:00 NY)** = qazanc götürmə zonası → açıq
   mövqeni orada bağlamaq məntiqlidir (D43-dəki "PM sonunda bağla" ilə uyğun).
4. **Sweetspot** anlayışı: killzone içində **ən aktiv dəqiqələr** —
   London 03:00, NY 09:00–09:30. Siqnal ağırlığı üçün istifadə oluna bilər.

⚠️ Diqqət: bu cədvəl **ICT-nin klassik** saatlarıdır (forex mərkəzli).
Müəllimin **öz indikatoru** endekslər üçün fərqlidir (NY AM 09:30–11:00).
İkisi ziddiyyət deyil — **forex vs endeks** fərqidir (D17 @00:02:54).

---

## Kadr baxışı — kod düzəlişindən sonrakı davam (3-cü keçid)

### D30 kadr `sheet_002` (00:06:40, `f_00051`) — order block RR real ölçü
Position tool: **Stop 30.50 (0.20%) 122 · Amount 49500 · Open P&L 30.25 ·
Qty 0.52 · Risk/Reward Ratio 1.88 · Target 57.75 (0.37%) 231**

NAS100-də daha bir real nümunə — bu dəfə **RR 1.88** (bizim kodda default
`minRR=2.0`-dan bir az aşağı). Transkriptlə üst-üstə düşür [00:06:30-00:06:44]:
> *"Satış əmri order block seçdim, stopu **sinkə** qoydum. Hədəf: **London-un
> low-u.**"*
Stop = fitil ("sink"), hədəf = London seansının low-u (əvvəlki seansın
swing-i). Bu, D31-in "mean threshold"undan fərqli — burada stop **fitilə**
qoyulub, gövdəyə yox. Deməli order block-da stop seçimi iki variantlıdır
(fitil = təhlükəsiz, gövdə = aqressiv/yaxşı RR) — D31 @00:12:00-dəki
xəbərdarlıqla eynidir.

### D30 [00:05:00–00:06:15] — Order block-un TAM addım-addım nümunəsi
> *"Vacib likidite səviyyəsini aldı, aşağı atdı... **bunun dibində
> qapatmadı**. Yenidən gedir oraya. Bax indi bu **da aldı**. Bu şama
> baxacaqsınız. Bu, artıq **son alış proqramı üçün satışa** — bunun
> **altında** qapatması lazım. Onun altında qapatır. Nə gözləyə bilərsiniz?
> İndi buraya geri gəlib tepki almasını gözləyə bilərsiniz, çünki bu
> **valid bir order block.**"*

Diqqət: burada order block **iki cəhddən sonra** valid olur — birinci
cəhddə (ilk yaşıl şam) gövdə bağlanışı olmayıb (etibarsız), bazar YENİDƏN
gəlib həmin səviyyəni alıb, İKİNCİ dəfə gövdə ilə bağlanıb və VALID olub.
Bu, D30-un STRATEGIYA-SPEC-də olan "bir neçə şam olarsa, likiditeni faktiki
alanı götür" qaydasının canlı nümunəsidir.

### D24 [00:07:20–00:09:24] — LRLR + FVG birgə gözləmə ardıcıllığı (NAS100)
Kadr `24/sheet_005` (f_00062–f_00065): yaşıl support qutusu (order block/FVG)
NAS100 1m/15m qrafikdə.
> *"Bax burada da mesela bir likidite buraxdı, FVG-ni də buraxdı. Nə
> gözləməliyik bu nöqtədə? Bu FVG-yə bir geri çəkilmə, daha sonra bu
> likidite nöqtələrini almasını gözləyə bilərik — niyə DÜŞÜK DİRƏNCLİ
> likidite nöqtəsi olduğu üçün."*
> *"Ən optimal olaraq: displacement, sol aşağı FVG buraxdı, aşağıda
> düşük-dirənc kompleksimiz var, aşağıda FVG-yə geri çəkilir, o daha sonra
> alır."*

Bu, bizim indi kodladığımız DOL-hədəf + FVG-giriş kombinasiyasının sözlə
tam təsviridir: **giriş FVG-dən, hədəf LRLR-dən seçilir.**

### D42 [00:24:31–00:27:03] — Tam kaskad nümunəsi (Qızıl, GC1!)
Həftəlik → 4H → 15m tam iş axını, real RR ilə:
```
Həftəlik bullish bias (gövdə bağlanışı ilə təsdiqlənib)
  → 4H-də internal FVG identifikasiya edilir
  → geri çəkilmə gözlənilir
  → 15m-ə enilir
  → geri çəkilmə HƏM FVG-ni doldurur HƏM stopları partladır (LRLR + FVG konfluensi)
  → CISD (order block) gözlənilir: son likidite-alan şam öz əksində gövdə ilə bağlanır
  → giriş: o şamın bağlanışında
  → hədəf: external likidite (əvvəlki HƏFTƏNİN high-ı)
  → nəticə: RR ~2.5-3
```
> *"Stop niyə belə qoyulmuşdu? Çünki bu **mean threshold**-a hörmət edib
> **oradan çıxmasını** gözləyirdik. Nə oldu — zatən stop [olmadı], o üzdən
> **order body-yə atdıq**, zatən getdi gəldi."*

Bu, D31-in HTF-FVG + order block birgə istifadəsinin **ikinci tam təsdiqi**dir
(Qızıl üzərində) — bizim kodda indi tətbiq olunan HTF filtri + DOL hədəfi
birbaşa bu nümunənin məntiqidir.

---

## ⭐ D25 kadr `sheet_002` — SP500 BİRBAŞA TƏSDİQİ

Kadr `f_00029`–`f_00038`: simvol sətri **"S&P 500 E-mini Futures · 1W · CME"**
(ES1!) — **HƏFTƏLİK** qrafikdə IRL/ERL nümunəsi göstərilir.

Bu, əvvəlki qeydimdəki "SP500 üçün ayrıca nümunə yoxdur" fikrini **düzəldir** —
əslində var: D25-in bütün IRL/ERL izahı ES1! həftəlik qrafikdə aparılır,
NQ1!-ə keçid YOX bu dərsdə. Deməli sualın "SP500-də işləyir?" hissəsinə
indi **birbaşa vizual sübut** var (əvvəl yalnız NQ/Gold/Forex/BTC idi).

Məzmun özü əvvəlki qeydlə eynidir (external→internal→external
növbələşməsi), fərq yalnız simvoldur.

---

## ⭐ D26/D29 — YENİ BAZAR NÜMUNƏLƏRİ: NZD, OIL

- **D26** [00:18:34-00:18:50]: *"Bitcoin ve NZD üzerinde de örneklerini
  göstereceğim"* — Sharp Turn NZDUSD-də də göstərilir (kadr baxılmadı, amma
  sözlə təsdiqlənib).
- **D29** kadr `sheet_008` (`f_00108`–`f_00117`): simvol **"CFDs on Crude Oil
  (WTI) · 5"** — order block-un çoxlu-sweep qaydası burada **NEFT (OIL)**
  üzərində göstərilir. Bazar siyahımıza əlavə: ✅ **OIL/WTI də nümunə var.**

Yekun bazar siyahısı indi: NASDAQ/NQ, Gold, GBPUSD, EURCAD, USDJPY, EURUSD,
BTC, **SP500 (ES1!, birbaşa)**, **NZD**, **OIL/WTI**. Yəni müəllim demək
istədiyi *"hər paritedə işləyir"* iddiası kadr sübutları ilə geniş
təsdiqlənir — sırf "sadece indeks/gold" deyil.

---

## ⭐ D31 [00:14:30–00:16:20] — MEAN THRESHOLD GİRİŞİNİN PROS/CONS TƏHLİLİ

Neft (Crude Oil, FOREX.com) üzərində, çox aşağı RR verən bir order block
nümunəsində müəllim **orta nöqtədən (mean threshold) giriş**in üstünlük və
çatışmazlıqlarını açıq şəkildə sadalayır — bu, bizim kodun FVG/OB girişini
default olaraq **50% orta nöqtədən** etməsini birbaşa əsaslandırır:

> *"Bunun zərərləri nə, artıları nə? **Artısı**: belə vəziyyətlərdə **daha
> çox R ala bilirsin, daha çox pul qazana bilirsin, daha gözəl bir entry
> olursun.** **Zərərləri**: bəzən spread-dən, ondan-bundan; **bəzən qiymət
> oraya gəlmir**. Bəzən fiyat belə gedir, oraya heç toxunmur. Bu
> vəziyyətlərdə **qaçıra bilirsin. Zərərləri bunlardır. Başqa zərəri yoxdur.**"*

**Nəticə bizim kod üçün:** `entryPx := (ft + fb) / 2` (FVG/OB orta nöqtəsi)
seçimimiz **düz mexanizmdir**, amma "qiymət 50%-ə çatmadan gedə bilər" —
bu, `maxWaitFill` parametrinin niyə mövcud olduğunu təsdiqləyir (setup vaxt
bitəndə ləğv olunur, əbədi gözləmir). Sürətli bazarlarda (məs. FOMC) bu
itki sayı artacaq — gözlənilən, dizayn kompromisidir.

### Yenidən təsdiq: çox-mumlu order block (Neft üzərində)
[00:15:08–00:15:37]: *"Üç dənə böyük gövdəli mum var... likiditesini də
almış... En son alan yer harasıdır? O zaman alan mum haradır? Şu üç mum,
arxası təqib edən ARDICIL mumlar."* — D29/D30-dakı "çoxlu sweep-dən sonra
FAKTİKİ alan şam(lar)ı götür" qaydasının **üçüncü** bazarda (neft) təkrarı.

---

## ⭐ D40 [00:05:56–00:06:04] — HTF FVG-yə TOXUNMA ≠ GİRİŞ SİQNALI

Bu, bizim yeni kodlaşdırdığımız HTF filtrinin yanına əlavə olunmalı vacib
incəlik idi, indi mətnlə təsdiqlənir:

> *"Yüksek zaman diliminden tepki almış — yani şu FVG'ye **DOKUNDUĞU AN
> işleme girmiyorsunuz**. Şu yükselişi gördüğünüz an, **başladığı an dönüşü
> gördüğünüz an** işleme dahil olacaksınız. **Kural bu.**"*

Yəni: **HTF FVG-nin içində olmaq VACİB, amma KİFAYƏT DEYİL** — LTF-də
displacement/MSS ilə təsdiqlənən **faktiki dönüşün BAŞLADIĞI** görünməlidir.
Bizim kodda bu artıq düzgün strukturlaşdırılıb: `htfFilterOn` HTF-in içində
olmağı sweep-in **şərti** edir, amma giriş yalnız sonrakı MSS+FVG
mərhələsindən sonra baş verir — yəni bu qayda onsuz da tətbiq olunur,
sadəcə **niyə belə qurduğumuzun sözlə təsdiqidir.**

---

## 🔴🔴 D40 [00:23:10–00:24:01] — MÜƏLLİMİN ÖZ AĞZINDAN "HAMISI EYNİDİR" TƏSDİQİ

Bu, "bazarlar" sualına verilə biləcək **ən avtoritetli cavabdır** — çünki
bu, digər dərslərdəki əlavə nümunələr yox, məhz **flagman NASDAQ strategiya
dərsinin (D40) özündə** deyilir, kadr `40/sheet_016` (Qızıl GC1! nümunəsi)
ilə birlikdə:

> *"NQ1 ilə forex paritəsi NZD1 **eynidir arkadaşlar**. O üzdən NQ1-də
> göstərmədim, futures tərəfində NQ1 — bunları trade edəcəksiniz. Ya da bu
> mesela **qızılın futures-ı, fərq etmir — hamısı eyni paritə zatən.**
> İndi sizə **qızılda** da bir nümunə göstərəcəyəm, sonra videonu
> **Bitcoin**-də də göstərəcəyəm, bağlayacağıq."*

> *"Sadəcə bu paritə deyil — anlatdığım şeyləri, yəni **likidite ilə IFVG
> məntiqi, DOL məntiqi, draw on liquidity** — yəni likiditenin harada
> olduğunu anlasanız, zatən **ufaq-təfək öz-özünüzə işləm ala bilərsiniz.**
> Sadəcə bu strategiyaya uysa da, uymasa da, öz-özünüzə fərqli-fərqli
> şeylər yarada bilərsiniz."*

**Nəticə:** metodun bazar-aqnostik olduğu iddiası bu dəfə **ehtimal və ya
əlavə nümunə deyil** — bilavasitə NASDAQ dərsinin öz mətnindədir. Qızıl
nümunəsi eyni kadrda Sharp Turn + IFVG + MSS + 1:2/1:3 RR ilə göstərilir,
sonra Bitcoin nümunəsi gəlir (D40-un sonrakı hissəsi, hələ baxılmayıb).

## D40 [00:28:01–00:29:52] — Bitcoin əlavəsi: nə işləyir, nə işləmir + öz etirafı

> *"Bitcoin edərkən **kill zon-lar falan olmadığı üçün** — yəni zaman
> dilimi, borsa açılış saatı olmadığı üçün — sadəcə gene eyni şeyləri:
> IFVG-i, likiditeyə görə işlem alacaksınız."*
> *"Bax buralar — 'Asya' yazdığına baxmayın. **Bunlar çalışmır Bitcoin-də,
> yəni kilon deyə bir şey yox.**"*
> *"IFVG hər türlü zatən işləyir."*

⭐ **Öz etirafı** [00:29:17–00:29:52]:
> *"Bitcoin dediğim kimi **çox bildiyim bir şey deyil.** Amma ümumi olaraq
> likidite məntiqi, FVG məntiqi burada da işləyir... **Bitcoin-də niyə
> işləm alasınız bu dediyim paritələr varkən** — sadəcə arkadaşlar
> strategiya budur."*

Bu, layihəmizin başlanğıcındakı **"ETH BTC xaric, əsas NASDAQ üçün edirik"**
qərarını müəllimin öz ağzından dolayı təsdiqləyir — o özü də BTC-ni digər
paritələr (NASDAQ, qızıl, forex) mövcud olarkən ikinci dərəcəli sayır və
BTC-də özünün az təcrübəli olduğunu açıq deyir.

**Yekun qayda:** killzone/seans filtri Bitcoin-ə tətbiq OLUNMAMALIDIR
(bizim NAS100 skriptimiz onsuz da NASDAQ üçündür, bu, üzr istəməyə ehtiyac
yaratmır — sadəcə gələcəkdə BTC üçün ayrı indikator lazım olsa, killzone
hissəsini söndürmək lazım olacaq).

---

## ⭐ D28 — VACİB SƏVİYYƏNİN PSİXOLOJİ ƏSASI (yeni "niyə")

D23-də vacib səviyyə **ranqını** (NY PM > LRLR > günlük FVG > swing) yazmışdıq.
D28 bunun **SƏBƏBİNİ** izah edir — hansı səviyyələr niyə "vacib":

> *"[Reaksiya olmadı] — **niyə? Çünki bu vacib bir likidite deyil.** Məsələn
> bir əvvəlki günün low-u olar, əvvəlki günün high-ı olar — yəni
> **insanların əmr ata biləcəyi yerləri düşünün.** İnsanlar haradan işləmə
> girir? Məntiqən düşündüyünüz zaman deyirsiniz ki: bir hissə, bir paritə,
> kripto — deyirsiniz ki **aylıq ən yüksəyə gəldi, buradan nə olar, düşər**
> — **retail düşüncəsi**, hər kəsin düşündüyü kimi düşünəcəksiniz. İnsanlar
> belə düşünür, orada pul olur. Amma **smart money** nə edir? Oralardan
> girənləri **partladır** — stopları, əmrləri."*

**Qayda:** vacib səviyyə = **bariz, hamının gördüyü, retail-in ora əmr
qoyacağı səviyyə** (əvvəlki gün H/L, həftəlik/aylıq H/L, round nömrələr).
Nə qədər "gözəgörünən" və hamı tərəfindən izlənirsə, bir o qədər likidite
yığılır və smart money-nin hədəfi olur.

### Hədəf iyerarxiyası (dəqiqləşdirilmiş)
[00:04:23]: *"Haftalıkta **ən böyük likidite hədəfi** budur."*
→ **Həftəlik səviyyələr** günlük/seans səviyyələrindən **daha böyük**
maqnitdir. Sıra: **Aylıq > Həftəlik > Günlük > Seans (AS/LO/NY H-L)**.
Bu, D23-ün ranqına **yuxarı ucdan** əlavədir (əvvəl NY PM-i "ən vacib" kimi
yazmışdıq — bu, seans-daxili səviyyələr arasında düzgündür, amma
Həftəlik/Aylıq onlardan da yuxarıdadır).

---

## 🔴 D34 [00:15:39–00:17:02] — SP500-DƏ "DAHA GÖZƏL İŞLƏYİR" + IFVG-nin minimal giriş qaydası

Kadr `34/sheet_012` (`f_00119`–`f_00127`): simvol **"S&P 500 E-mini
Vadeliler · 5"** (ES1!), tam killzone rəngləri (Asia/London/NY AM/NY
Lunch/NY PM) ilə. Position tool: **Risk/Ödül Oranı: 3.08** (Kapalı K/Z 10.00,
Miktar 0.032).

> *"Qısa bahs etmək istədim — **SMP 500-də də göstərəyim, bax bu HƏR
> PARİTEDƏ işləyir. Bu arada SMP 500-də falan DAHA GÖZƏL işləyir.**"*

⭐ **IFVG-nin minimal giriş qaydası (yeni incəlik)** [00:16:42–00:16:51]:
> *"Burada body ilə bağlamış, daha sonra bax **ufacıq bir wick-lə gəlmiş
> buraya** — görürsünüz, **inversion artıq olduğu üçün bunun içinə ən
> ufaq bir tepkidən girə bilərsiniz.**"*

Bu, D43-dəki "IFVG retrace olmaz, sonrakı şamda gir" qaydasını
**dəqiqləşdirir**: bəzən **çox kiçik bir fitil** belə kifayət edir (tam
retrace şərt deyil) — bizim kodda `sharpFastEntry` məntiqi (MSS-dən sonrakı
şamda bazar qiymətindən giriş) bunun praktik ekvivalentidir, çünki gözləmə
tamamilə aradan qaldırılır.

Nəticələr: 1:2 tez tutulur, bir nümunədə **3.56R**-ə qədər uzanır.

---

## ⭐ D43 [00:22:29–00:23:05] — ƏN BÖYÜK YENİ BAŞLAYAN SƏHVİ (metodoloji xəbərdarlığı)

> *"**Sizin ən böyük etdiyiniz səhv** budur — bunları görmədən **birbaşa
> gözləyirsiniz.** Londra-da bazarı izləyərkən deyirsiniz: 'belə gələcək,
> buraya alacaq, buradan bir setup olacaq, FVG olacaq, mən oradan daxil
> olacağam.' Ə qardaşım, **o qədər elə bir şey ola bilərmi?** O zatən
> alacağını **artıq alıb.** Yüksək zaman dilimindən bir çıxsan, **5
> dəqiqəlikdən başını çıxarsan**, zatən yüksək zaman diliminde **nə
> etdiyini/etməyə çalışdığını görərsən.**"*

**Praktik nəticə:** 5m-də əvvəlcədən dəqiq mikro-ssenari qurub gözləmək
("bura gələcək, sonra bura, sonra FVG olacaq...") səhvdir — çünki bazar
adətən artıq lazım olanı alıb qurtarıb. Düzgün yanaşma: **HTF-ə çıx,
bazarın ARTIQ NƏ ETDİYİNİ (tamamlanmış strukturu) oxu**, gələcəyi təxmin
etməyə çalışma. Bu, bizim kodun **HTF filtrini SWEEP-dən ƏVVƏL yoxlaması**
məntiqi ilə üst-üstə düşür — sistemin "əvvəl HTF vəziyyətinə bax, sonra
LTF-ə en" ardıcıllığının doğruluğunu bir daha təsdiqləyir.

---

## D33 [00:14:07] — "AMD" = Power of Three-nin digər adı

> *"Market Maker modeli gerçəkləşdi. Market Maker modelleri, **AMD, Power of
> 3** falan irəlidə gələcək."*

**AMD = Accumulation / Manipulation / Distribution** — bizim D17-də
sənədləşdirdiyimiz **Power of Three**-nin sinonimidir (Asiya=Accumulation,
London=Manipulation, NY=Distribution). Terminologiya arayışında hər ikisi
eyni şeyi göstərir, qarışdırılmasın.

Kadr `33/sheet_009`: Qızıl **GÜNLÜK (1D)** qrafikdə **stacked (üst-üstə)
IFVG-lər** dəstək zənciri kimi göstərilir — bir IFVG doldurulub keçildikdən
sonra bazar bir sonrakına doğru davam edir, hər biri ardıcıl dəstək rolunu
oynayır (D42-dəki "hər FVG bir sonrakının yanına aparır" məntiqi ilə eyni,
bu dəfə günlük TF-də IFVG zənciri kimi).

---

## D32 kadr `sheet_012` (`f_00112`) — NAS100-də RR 6.26 real nümunə

Position tool: **Stop 21.75 (0.13%) 87 · Amount 61878 · Target 143.75
(0.84%) 571 · Amount 55849 · Qty 0.313 · Risk/Reward Ratio 6.26**

Ən yüksək qeydə alınan real RR nümunəsi (əvvəlki aralıq 1.88–3.9 idi).
Stop çox dar (0.13%), hədəf uzaq bir likidite idi — deməli DOL-hədəf
yanaşması bəzən **çox böyük RR** verə bilir, xüsusilə stop OB/FVG gövdəsinə
sıxıldıqda.

### D32 [00:14:36–00:15:21] — Fərdi icra sərbəstliyi (dizayn fəlsəfəsi)
> *"Sizə desəm ki 'buradan dalırsan, buraya stop atırsan, buraya qədər
> tutursan, 6.5 R-lık işlem bitdi' — belə işlem heç vaxt **inkişaf edə
> bilməzsiniz.** Mən buradan açaram, sən buradan açarsan, sən elə bu kiçik
> mumdan girərsən — **hər yediyin yoğurdun yeyişi fərqlidir.** Mən sizə
> göstərirəm, **özünüz bir yol tapacaqsınız.**"*

→ Dəqiq giriş/çıxış nöqtəsi konfiqurasiya edilə bilən olmalıdır (bizim
kodda artıq `slMode`, `useDolTp`, `minRR` kimi seçimlər var) — müəllim
özü tək bir "doğru" icra tərzi olduğunu israrla rədd edir.

---

## ⭐ D43 [00:15:55–00:16:49] — İKİ HƏDƏF FƏLSƏFƏSİ, İKİSİ DƏ ETİBARLI

Bu, bizim kodda `useDolTp` seçicisinin (DOL-hədəf vs sabit R-multiple) niyə
**hər ikisinin düzgün** olduğunu izah edən açıqlamadır:

> *"Sizə 1:2, 1:3 deyirəm — **mexaniki yanaşma** deyirəm. Çünki bəzən bizim
> etdiyimiz şey... **təcrübəli insanlar** nə edir? Bu likiditeni görürlər,
> **internal-external məsələsinə hakim olanlar**, riski həll etmiş insanlar
> — **bu şəkildə daxil olub gedirlər.** Bu buradakı likiditeyə qədər
> tutur, adam **daha çox R alır**, daha gözəl işlemlər ala bilir. Amma
> mənə görə **1:2, 1:3 zatən kifayətdir.**"*

İki fəlsəfə:
1. **Mexaniki/sadə** (yeni başlayan) → sabit **1:2 / 1:3 R** hədəflə, dayan.
2. **Təcrübəli** → **DOL-a qədər tut**, likidite zəncirini izlə, daha çox R al.

> *"Buraya atdığın zaman **1.74** alırsan, body-yə atdığın zaman **1:3**
> alırsan, burada **1:2** alırsan. Ararın yaxşı deyilsə **stopu bir az daha
> çəkərsən, ya da daha gözəl bir giriş axtararsan.**"*

Bizim kodda `useDolTp=true` = təcrübəli fəlsəfə (DOL-a qədər), `false` =
mexaniki fəlsəfə (sabit `tp1RR`/`tp2RR`). **Hər iki rejim müəllimin özü
tərəfindən legitim sayılır** — bu, bizim dizayn qərarımızı təsdiqləyir.

---

## D43 [00:28:03–00:28:33] — Aşağı TF-ə enmə qaydası ŞƏRTLİDİR

> *"Əgər 5 dəqiqəlikdə IFVG varsa, **bir aşağı zaman dilimə enmək lazım
> deyil.** Amma əgər yoxdursa, 5 dəqiqədən **3 dəqiqəyə enəcəksən.**"*

Yəni 5m→3m→1m enmə **avtomatik addım deyil**, yalnız 5m-də FVG/IFVG **aydın
görünmürsə** tətbiq olunur. Bu, D44-dəki "salaq-saçma price action-da
taymfreymi yüksəlt" qaydasının **əksi/tamamlayıcısı**dır: struktur
görünmürsə aşağı en (aydınlıq üçün), amma artıq aydındırsa aşağı enmə.
