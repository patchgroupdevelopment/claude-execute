# NASDAQ ICT Strategiyası — tam spesifikasiya (v2)

43 videonun **transkripti + kontakt vərəqlərinin kadrları** birlikdə oxunaraq
çıxarılmış qaydalar. Hər qaydanın yanında mənbə var (dərs nömrəsi + vaxt
damğası, bəzən kadr nömrəsi) ki, yoxlanıla bilsin.

**Status: ÖLÇÜLMƏYİB.** Bu, videolardan çıxarılmış **fərziyyələr toplusudur**.
Backtest edilməyib. Real pul qoymazdan əvvəl ölçülməlidir.
(v1-də olmayan, ikinci keçiddə tapılan hər şey ⭐ ilə işarələnib.)

---

## 0. QURAŞDIRMA

| | |
|---|---|
| Simvol | **NAS100** (CFD) və ya **NQ1!** (CME futures) |
| Qrafik saat qurşağı | **America/New_York** ⭐ (sabit GMT-5 YOX — yay/qış keçidi olmalıdır) |
| Taymfreymlər | **1D/W → 4H/1H → 15m → 5m** (D44 @00:23:09) |
| Giriş taymfreymi | **5m** (lazım olsa 3m/1m) |

> D18: *"Hər şeyi New York saatına görə edəcəyik, çünki **market onsuz da NY
> saatına görə hərəkət edir — alqoritm o saata görə işləyir**."*

⭐ Müəllimin indikatoru **GMT-5 sabit** işlədir və yay vaxtında **əl ilə**
düzəldir (D23 @00:10:53). Biz bunu avtomatlaşdırırıq.

---

## 1. SEANSLAR VƏ PƏNCƏRƏLƏR

### İndikatorun çəkdiyi qutular (kadr `17/f_00051`-dən hərfbəhərf oxundu)
| Seans | NY | Bakı (yay) | Bakı (qış) |
|---|---|---|---|
| Asiya | 20:00–00:00 | 04:00–08:00 | 05:00–09:00 |
| London | 02:00–05:00 | 10:00–13:00 | 11:00–14:00 |
| NY AM | 09:30–11:00 | 16:30–18:00 | 17:30–19:00 |
| NY Lunch | 12:00–13:00 | 19:00–20:00 | 20:00–21:00 |
| NY PM | 13:30–16:00 | 20:30–23:00 | 21:30–00:00 |
| True Day Open | 12:00–12:01 | 19:00 | 20:00 |

### ⭐ TRADE PƏNCƏRƏSİ ≠ İNDİKATOR QUTUSU (D17 @00:02:43)
| Bazar | Müəllimin trade pəncərəsi (NY) |
|---|---|
| London | 02:00–05:00 (sweetspot **03:00**) |
| **ENDEKS (NASDAQ)** | **08:30–11:00** ⭐ (08:30 data buraxılışı daxil) |
| Forex | 07:00–10:00 (sweetspot 09:00) |

### ⭐ TRADE QADAĞAN ZONALARI
- **16:00–20:00 NY** — ICT Central Bank Dealers Range: *"No-Trade zone"*
  (kadr `41/f_00082`)
- **12:00–13:00 NY** — NY Lunch (D17, D18)
- **Asiya seansı** — *"çoğu şey hərəkət etmir"* (D17 @00:02:00)
- **NY PM** — müəllim *"PM-ə çox baxmıram"* (D17 @00:03:45) →
  giriş üçün defolt bağlı, amma **NYPM.H/L hədəf kimi qalır** (D23 @00:10:45)

### İzlənən səviyyələr (indikatorun tam siyahısı)
`AS.H · AS.L · LO.H · LO.L · NYAM.H · NYAM.L · NYL.H · NYL.L · NYPM.H · NYPM.L`
⭐ **+ Midnight Open · D.OPEN · W.OPEN · M.OPEN · True Day Open**
Səviyyələr **toxunulana qədər** yaşayır.

---

## 2. ⭐ POWER OF THREE — GÜNÜN MAKRO ŞABLONU (D17 @00:05:29)

```
ASİYA    → AKKUMULYASİYA  (smart money mövqe yığır; hərəkət yox; TRADE ETMƏ)
LONDON   → MANİPULYASİYA  (Asiyanın likiditesini alır; stopları partladır)
NY 08:30 → DİSTRİBUSİYA   (əsl hərəkət; hədəfə gedir)
```

⭐ **Ölçülə bilən iddia:**
> *"Bullish olduğu zaman market — **günün LOW-unu LONDRA-da yapar**."*
> (D17 @00:05:12; kadr `41/f_00082` yazılı təsdiq: *"London Open Killzone
> generally creates the **High or Low of the day**"*)

Yəni: gün bullish → günün low-u London-da; gün bearish → günün high-ı London-da.
**Bu, backtest-də birinci yoxlanacaq fərziyyədir.**

---

## 3. ANLAYIŞLAR (dəqiq təriflər)

**Swing High/Low** — 3 şam: ortadakı sol və sağdakından yüksək/alçaq.
→ **pivot = 1** (D26 @00:01:56, D41 @00:02:23, D16 @00:00:23)

**BSL / SSL** — swing high-lardan **yuxarı** / swing low-lardan **aşağı**.

**Equal High/Low** — iki yaxın/bərabər səviyyə → **daha güclü** hovuz.

**FVG** — 3 şam, 1-cinin high-ı ilə 3-cünün low-u üst-üstə düşmür (D19 @00:01:15).
⭐ *Niyə yaranır:* **qiymətin tək tərəfli sunulması**; sonra bazar oranı
**rebalance edir** (D23 @00:13:36).

**FVG-nin ölümü** — **50% orta nöqtəsindən o tayda GÖVDƏ ilə bağlanış**.
**Fitil girsə problem yoxdur.** (D33 @00:03:43)

**IFVG** — ölmüş FVG; dəstək idisə → müqavimət (D33).

**Order Block / CISD** — vacib səviyyədə likidite alınır → likiditeni **alan
son əks-rəngli şam** → qiymət displace olub həmin şamın **o tayında gövdə ilə
bağlanır** (D30, D31).
⭐ **Mean threshold** = order block-un **50% orta nöqtəsi** — giriş oradan
(D31 @00:08:39).

**Displacement** — enerjili, tək istiqamətli, FVG buraxan hərəkət.
Fitil ≠ displacement (D27 @00:06:10).

**BOS / MSS** — davam / dönüş (D09 @00:07:26).

**IRL/ERL** — növbələşir: **External → Internal → External → …** (D25, D42)

**LRLR** — alınmamış, üst-üstə yığılan likidite = müqavimətsiz yol (D24)

**DOL** — qiymətin çəkildiyi ən yaxın məntiqli likidite = **TP** (D27)

⭐ **Continuation Purge / Turtle Soup** — bias istiqamətində davam etməzdən
əvvəl **əks istiqamətdə qısa manipulyasiya fitili** (D44 @00:25:43).
İki şərt: (1) əvvəlki low/high fitillə alınır, (2) həmin yer **HTF FVG ilə
kəsişir**.

⭐ **Order Pairing** — likiditenin alındığı **dəqiq nöqtə** = institusional
sifarişlərin doldurulduğu yer. *"Smart money buy programını aktivləşdirir."*
(D44 @00:09:10) — **giriş yeri deyil**, "program başladı" siqnalıdır.

⭐ **MMXM (Market Maker Buy/Sell Model)** — D44 @00:37:47:
```
original consolidation → manipulyasiya (turtle soup) → ORDER PAIRING
→ program aktivləşir → MSS → FVG retest → GİRİŞ
→ hədəf: original consolidation zonası
```
Program aktivləşdikdən sonra: **buy** programda **qırmızı (down-close)** şamlar
dəstək, **sell** programda **yaşıl (up-close)** şamlar müqavimətdir.

⭐ **Engineering Liquidity** — bazar qəsdən üst-üstə low/high buraxır
("swing failure") → toxunulmamış likidite yığını → DOL (D44 @00:34:00).

---

## 4. ⭐⭐ MƏCBURİ KONFLUENS (dörd şərt — hamısı eyni anda)

Müəllimin öz cümləsi (D43 @00:35:37 — kursda bizim üçün ən dəyərli ifadə):
> *"High-ların **heç biri toxunulmur — TA Kİ 4 saatlikdə, yüksək zaman
> dilimində bir likidite alımımız olduğu zaman**... **4 saatlik FVG** —
> **ondan sonra SETUP VERİR mənə. Və bunların hamısı KILLZONE-un içində
> olur.**"*

```
1. LRLR      — hədəf tərəfdə toxunulmamış high/low silsiləsi var
2. HTF LEVEL — qiymət 1H/4H FVG (və ya OB / vacib səviyyə) İÇİNDƏDİR
3. SETUP     — yalnız BUNDAN SONRA LTF-də sweep + displacement + MSS + FVG/IFVG
4. KILLZONE  — hər şey icazəli pəncərənin içində baş verir
```

### 🔴 Niyə bu bölmə var — D31-in A/B təcrübəsi
Müəllim **eyni order block pattern-ini iki dəfə** göstərir:
- **A) HTF vacib səviyyə YOX** → *"Aa, olmadık"* (**stop**)
- **B) 1H FVG-nin içində** → **TP**

> *"Burada o önəmli səviyyə dediyim yer var mı? **YOX.** O zaman bu bizim
> üçün nə olur? **Bir şey olmur.**"* (D31 @00:06:03)

Bizim köhnə (uğursuz) XAU sistemimiz **məhz A variantı** idi:
ölçüldü → **-0.331 ATR, t = -2.66**. Bu filtr olmadan qalan məntiq mənasızdır.

### ⭐ "Vacib səviyyə" nədir? (D23 @00:10:45 — ranq sırası)
1. **NY PM seansında yığılmış likidite** (13:30–16:00 NY) — ən vacib
2. **Low Resistance Liquidity** — toxunulmamış, üst-üstə yığılan səviyyələr
3. **Günlük (Daily) FVG**
4. Günlük swing high/low
5. Seans high/low-ları

---

## 5. ⭐ GİRİŞ ARDICILLIĞI

```
1. HTF-də (1D/4H/1H) vacib səviyyə + DOL müəyyən et
2. Qiymət ora gəlir və LİKİDİTENİ ALIR (sweep)
   ⛔ BURADA GİRMƏ — bu, təkbaşına siqnal DEYİL
   ⭐ Neçə hovuz eyni anda süpürüldü? Çox = daha yaxşı (D32 @00:04:23)
3. DISPLACEMENT gözlə
4. MSS gözlə — ⭐ ÜÇ şərt birlikdə (D32 @00:05:12):
      • displacement
      • GÖVDƏ bağlanışı səviyyənin o tayında
      • ardıcıl FVG buraxıb-doldurma (tək FVG kifayət deyil)
5. MSS-i yaradan ayaqdakı FVG/IFVG-ni tap
6. GİRİŞ — quruluşa görə FƏRQLİDİR ⭐:
      • FVG  → geri çəkilməni gözlə, **50% orta nöqtədən** limit
      • IFVG → **gözləmə**, gövdə bağlanışından **sonrakı şamda** market
        (*"IFVG retrace olmaz"* — D43 @00:12:22)
      • OB   → **mean threshold** (50%) və ya gövdə
7. STOP — ⭐ RR-ə görə seçilir (D43 @00:13:44):
      a) əvvəl swing low/high → RR hesabla
      b) RR < 2 → stopu FVG/OB **gövdəsinə** çək
      c) hələ də < 2 → **SETUP-I BURAX**
      • iki FVG üst-üstədirsə → **DƏRİNİN** arxasına (D34 @00:05:05)
8. HƏDƏF: ən yaxın **toxunulmamış** likidite (DOL) — acgözlük yox.
   Sadə variant: **1:2**. FVG-lər də hədəf ola bilər (D23 @00:03:37).
```

**Bu qayda 5 ayrı dərsdə eyni sözlərlə təkrarlanır:**
- D40 @00:15:11 — tam resept bir cümlədə
- D33 @00:16:41: *"Random durduk yere bir FVG-yə işləmə girip çıkmayın"*
- D27 @00:02:06: *"Hemen aldığı anda işlem açmayın"*
- D32 @00:02:26: *"Displacement gəlməyibsə — market sadəcə likidite alır"*
- D43 @00:18:48: *"Çoğunuzun en büyük yaptığı yanlış... Bu saçma sapan işler
  yapmayın."*

### İstisna: Sharp Turn (MSS-siz giriş)
Likiditeni **alarkən** bir FVG + **aldıqdan sonra əks istiqamətdə** ikinci FVG
→ "U dönüşü". **İkisinin kəsişdiyi yerin orta nöqtəsindən** girilir (D26, D34,
D40 @00:13:44). MSS gözləmək məcburi deyil, amma müəllim
*"nə etdiyinizi bilmirsinizsə girməyin"* deyir.

### ⭐ Setup-ı qaçırdınsa (D43 @00:26:36)
Bias aydındırsa **davam (continuation) girişi** də etibarlıdır — hər dəfə
dönüş quruluşu gözləmək lazım deyil. Növbəti killzone açılışında növbəti
likidite hədəf götürülür.

### ⭐ SKIP QAYDASI (D44 @00:44:03)
> *"Çox **saçma-sapan price action**... **bizim anlatdığımız modelə görə
> SKIP-lərsən.** Ertəsi həftə zatən trade edərsən."*

→ Aydın olmayan strukturda **siqnal vermə**. Az siqnal = doğru davranış.
Alternativ: **taymfreymi yüksəlt** (1m → 3m) — struktur netləşir.

---

## 6. FİLTRLƏR

| Filtr | Qayda | Mənbə |
|---|---|---|
| **HTF vacib səviyyə** ⭐ | Qiymət 1H/4H FVG-nin içindədirmi? Yoxdursa **GİRMƏ** | D31, D43 |
| **Günlük bias** | Əvvəlki gün səviyyəni alıb **gövdə ilə o tayda** bağlanıb? → davam. Yalnız **fitil**? → rədd | D43 @00:20:07 |
| **Premium/Discount** | Bearish → FVG-ni **premium**-da; bullish → **discount**-da axtar | D24 @00:04:13 |
| **IRL/ERL** | Növbəti hədəf növbələşməyə uyğundurmu? | D42 @00:00:12 |
| **Kill Zone** | London / NY 08:30–11:00. Nahar və 16:00–20:00 **qadağan** | D17, D18, kadr `41/f_00082` |
| **LRLR** | Hədəf tərəfində alınmamış likidite yığılıbmı? İki tərəfi **say**, çox olanı seç | D24, D23 @00:10:07 |
| **Sweep sayı** ⭐ | Bir sweep-də neçə səviyyə süpürüldü? Çox = güclü | D32 @00:04:23, D34 @00:04:34 |
| **RR ≥ 2** ⭐ | Stop seçimindən sonra RR < 2 isə setup buraxılır | D43 @00:13:48 |

---

## 7. RİSK (dəyişməz)

- Əməliyyat başına **maksimum 1%** (adətən 0.5–1%)
- **⭐ ANTİ-MARTİNGALE nərdivanı — dəqiq mexanizm** (D41 @00:38:04, D37 @00:00:33–00:02:54):
  ```
  100,000$ → risk 1% → itki → 99,000$
  99,000$  → risk 0.5% → itki → 98,500$
  98,500$  → risk YENƏ 0.5% (⭐ İKİ dəfə 0.5% haqqı var) → itki → 98,000$
  98,000$  → risk 0.25%-ə düşür, balans 98,500$-ə QAYIDANA qədər 0.25%-də qalır
  98,500$-ə qayıdanda → risk YENİDƏN 0.5%-ə qalxır (eyni məntiqlə yuxarı)
  ```
  **Qalxma qaydası:** balans əvvəlki pillənin threshold-una **geri çatanda**
  (mütləq xalis qazanc yox, sadəcə həmin pillənin itkisinin bərpası) bir
  yuxarı pilləyə qayıdılır. **Real hesabda maksimum 1%, ASLA 2% yox.**
  Challenge və real/live funded hesabda **eyni** risk metodu tətbiq olunur.
  (Kadr `41/f_00083`–`f_00087`: Google kalkulyatorunda `100000×0.5%=500`,
  `100000×0.25%=250` hesablanır.)
  ⚠️ Bu, hesab-səviyyəli ardıcıl-əməliyyat vəziyyət maşınıdır — TradingView
  indikatoru broker balansını bilmədiyi üçün bunu avtomatlaşdıra bilməz;
  istifadəçi əl ilə tətbiq etməlidir. Pine-da `riskPct` sabit input olaraq qalır.
- Hədəf **1:2** (yeni başlayan üçün 1:1 də olar)
- Lot riskdən hesablanır, əksinə yox
- HTF FVG-yə çatanda **yarısını bağla** (D41 @00:34:03)
- ⭐ **PM seansının sonuna doğru konsolidasiya başlayırsa mövqeyi bağla**
  (D43 @00:33:52). Overnight yalnız *"nə etdiyini bilirsənsə"*.
- ⭐ Piramit (mövqeyə əlavə) mümkündür, amma *"bəzi firmalarda qadağandır"*
  (D44 @00:39:25).

### ⭐ NAS100-də REAL ÖLÇÜLƏR (ekrandakı position tool-lardan)
| Mənbə | Stop | Hədəf | RR |
|---|---|---|---|
| D40 `f_00111` | 21.8 punkt (**0.11%**) | 85.5 punkt (0.43%) | 3.9 |
| D40 `f_00113` | 38.7 punkt (**0.20%**) | 104.5 punkt (0.53%) | **2.7** |
| D40 `f_00118` | — | 116.1 punkt (0.59%) | **2.06** |
| D41 `f_00281` | 27.4 punkt (**0.14%**) | 74.6 punkt | **3.1** |
| D23 @00:04:04 | — | 36.5 / 60 punkt | — |

→ **Stop 20–40 punkt (0.10–0.20%), hədəf 85–116 punkt, RR 2.0–3.9.**
⚠️ D33 @00:12:00: *"Mən stopu qısa tuturam, təcrübəli olduğum üçün.
**Siz bu qədər qısa stop işlətməyin.**"*

---

## 8. TEZLİK GÖZLƏNTİSİ

> D41 @00:33:16: *"Hər həftə **2-3 dəfə** rahat olur. Bəzən **gündə iki dəfə**."*
> D40 @00:19:45: *"Hər gün olur mu? **Xeyr.** Hər həftə olur mu? **Olur.**"*

---

## 9. HANSI BAZARLARDA İŞLƏYİR — kadrlardan faktiki sübut

| Dərs | Ekranda göstərilən alət |
|---|---|
| D40, D41 | **NAS100 / NQ1!** (əsas) |
| D42 | **GC1! Gold Futures (COMEX)** — IRL/ERL-in bütün nümunəsi |
| D42 | **GBPUSD** — killzone qutuları forex-də də |
| D43 | **NQ1! + XAUUSD yan-yana** (SMT korrelyasiya) |
| D44 | **EURCAD, USDJPY, GBP, BTC, NQ** — "universal model" |
| D26 | **BTCUSD** (Sharp Turn nümunəsi) |

✅ **SP500 / NASDAQ / GOLD / BTC** — müəllim özü göstərir.
✅ **ETH** — ayrıca nümunə yoxdur, amma BTC ilə eyni kateqoriya (likvid).
❌ *"Siko-siko coinlərin üstündə sınamayın — bir işə yaramaz"* (D44 @00:01:09);
kiçik kapitallı hisselər (D26 @00:05:36).
⚠️ Kriptoda **killzone hissəsi zəifləyir** (24/7) → orada yalnız likidite +
FVG + struktur qalır (D40 @00:28:03, D41 @00:09:43).

### ⭐ Taymfreym dəstləri (D44) — bazar/üslub dəyişəndə bunu dəyiş
| Üslub | HTF (DOL/PD array) | Orta (struktur/purge) | Giriş |
|---|---|---|---|
| Swing | Aylıq (→ Həftəlik) | Günlük | 1H |
| **Intraday (bizim seçim)** | **Həftəlik + Günlük** | **4H / 1H** | **15m–5m** |
| Scalp | 4H (→ Günlük) | 15m | 1m–3m |

---

## 10. ⚠️ NƏYİ HƏLƏ BİLMİRİK

Müəllim heç bir yerdə **statistika vermir**: nə "N əməliyyat", nə "X% win
rate", nə də backtest. Bütün nümunələr **TradingView Replay ilə keçmişə baxıb
seçilmiş** nümunələrdir (kadrlarda "Replay" su nişanı görünür — D44).

Öz sözləri:
- D40 @00:03:01: *"Yatırım tavsiyesi kesinlikle değildir."*
- D23 @00:16:59: *"Heç vaxt **mükəmməl nümunə** olmayacaq. **Bu şeylər sürəkli
  %100 işləməyəcək.**"*
- D23 @00:16:24: *"**Nə gözləyirsinizsə, TAM TƏRSİNİ etməyi market sevir.**"*
- D25: *"Texniki analizdə %100 deyə bir şey yoxdur."*

**Növbəti addım — kod yazmaq deyil, ÖLÇMƏK:**

> **Fərziyyə 1 (ən sadə, birinci yoxlanır):** NASDAQ-da günün low-u (bullish
> günlərdə) London killzone-unda (02:00–05:00 NY) yaranır.
> Baseline: təsadüfi 3 saatlıq pəncərə.
>
> **Fərziyyə 2:** HTF FVG içində baş verən sweep + displacement + MSS →
> FVG 50%-ə geri çəkilmədə giriş **müsbət asimmetriya** verir.
> **Nəzarət qrupu:** displacement/MSS OLMADAN eyni sweep-lər —
> yəni rədd etdiyimiz köhnə sistem (**-0.331 ATR, t = -2.66**).
>
> **Fərziyyə 3:** HTF FVG filtri **tək başına** nəticəni dəyişirmi?
> (D31-in A/B təcrübəsinin statistik versiyası.)
>
> Fərq statistik olaraq görünmürsə (t < 2), bu strategiya da bizim üçün
> işləmir — nə qədər "məntiqli" səslənsə də.
