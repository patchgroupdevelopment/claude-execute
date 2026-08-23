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
