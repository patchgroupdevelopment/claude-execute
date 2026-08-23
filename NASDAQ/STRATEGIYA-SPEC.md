# NASDAQ ICT Strategiyası — tam spesifikasiya

43 videonun hamısından çıxarılmış qaydalar. Hər qaydanın yanında mənbə var
(dərs nömrəsi + vaxt damğası) ki, yoxlanıla bilsin.

**Status: ÖLÇÜLMƏYİB.** Bu, videolardan çıxarılmış fərziyyələr toplusudur.
Backtest edilməyib. Real pul qoymazdan əvvəl ölçülməlidir.

---

## 0. QURAŞDIRMA

| | |
|---|---|
| Simvol | **NAS100** (CFD) və ya **NQ1!** (CME futures) |
| Qrafik saat qurşağı | **UTC-4 (New York)** — məcburi (D18 @00:01:00) |
| Taymfreymlər | **4H → 1H → 15m → 5m** (D08 @00:06:32, D41 @00:33:48) |
| Giriş taymfreymi | **5m** (lazım olsa 3m/1m) |

> D18: *"Hər şeyi New York saatinə görə edəcəyik, çünki **market onsuz da NY
> saatına görə hərəkət edir — alqoritm o saata görə işləyir**."*

## 1. SEANSLAR (NY vaxtı → Bakı yay/qış)

| Seans | NY | Bakı (yay) | Bakı (qış) | Xarakter |
|---|---|---|---|---|
| Asiya | 20:00–00:00 | 04:00–08:00 | 05:00–09:00 | **Konsolidasiya** — likidite yığır, trade üçün uyğun deyil |
| London | 02:00–05:00 | 10:00–13:00 | 11:00–14:00 | Hərəkət başlayır |
| **NY AM** | **09:30–11:00** | **16:30–18:00** | **17:30–19:00** | **Ən yaxşı** — əsl volatillik |
| NY Lunch | 12:00–13:00 | 19:00–20:00 | 20:00–21:00 | **Zəif — qaçın** |
| NY PM | 13:30–16:00 | 20:30–23:00 | 21:30–00:00 | Yaxşı |

Mənbə: müəllimin indikator ayarları (kadr `02/f_00021`), D17, D18.
İzlənən səviyyələr: **AS.H/L · LO.H/L · NYAM.H/L · NYL.H/L · NYPM.H/L** +
**True Day Open** (12:00 NY). Səviyyələr **toxunulana qədər** yaşayır.

## 2. ANLAYIŞLAR (dəqiq təriflər)

**Swing High/Low** — 3 şam: ortadakı sol və sağdakından yüksək/alçaq.
→ **pivot = 1** (D26 @00:01:56, D41 @00:02:23, D16 @00:00:23)

**Buyside Liquidity (BSL)** = swing high-lardan **YUXARI** (short stopları)
**Sellside Liquidity (SSL)** = swing low-lardan **AŞAĞI** (long stopları)

**Equal High/Low** — iki yaxın/bərabər səviyyə → **daha güclü** likidite hovuzu

**FVG** — 3 şam, 1-ci şamın high-ı ilə 3-cü şamın low-u üst-üstə düşmür;
ortadakı displacement boşluq buraxır (D19 @00:01:15)

**FVG-nin ölümü** — qiymət FVG-nin **50% orta nöqtəsindən o tayda GÖVDƏ ilə
bağlanarsa** FVG etibarsızdır. **Fitil girsə problem yoxdur.** (D33 @00:03:43)

**IFVG** — ölmüş FVG. Dəstək idisə → müqavimət olur. (D33)

**Order Block / CISD** — vacib səviyyədə likidite alınır → likiditeni **alan
son əks-rəngli şam** → qiymət displace olub həmin şamın **o tayında gövdə ilə
bağlanır** → o şam order block olur. Giriş: şamın açılışına/orta nöqtəsinə
geri dönüşdə. (D30, D31)

**Displacement** — enerjili, tək istiqamətli, FVG buraxan hərəkət.
Fitil ≠ displacement. (D27 @00:06:10)

**BOS** — trend istiqamətində strukturun qırılması (davam)
**MSS** — ƏKS strukturun **gövdə ilə** qırılması (dönüş) (D09 @00:07:26)

**IRL/ERL** — ERL = range xaricindəki swing-lər; IRL = range içindəki FVG-lər.
Növbələşir: **External → Internal → External → ...** (D25, D42)

**LRLR** — alınmamış, yığılmış likidite = müqavimətsiz yol = ehtimallı hədəf
(D24)

**DOL** — qiymətin çəkildiyi ən yaxın məntiqli likidite = **TP nöqtəsi** (D27)

## 3. ⭐ GİRİŞ ARDICILLIĞI (məcburi sıra)

```
1. HTF (1H/4H/1D) vacib likidite səviyyəsi müəyyən et
2. Qiymət ora gəlir və LİKİDİTENİ ALIR (sweep)
   ⛔ BURADA GİRMƏ — bu, təkbaşına siqnal DEYİL
3. DISPLACEMENT gözlə (enerjili, FVG buraxan hərəkət)
4. MSS gözlə — əks strukturun GÖVDƏ ilə qırılması
5. MSS-i yaradan ayaqdakı FVG-ni tap  ← "market yapısının dəyişdiyi yerdəki"
6. Qiymət FVG-nin 50% ORTA NÖQTƏSİNƏ geri çəkiləndə GİR
7. Stop: swing və ya FVG dibi. İki FVG üst-üstədirsə → DƏRİNİN arxasına
8. Hədəf: 1:2 (və ya növbəti DOL/likidite)
```

**Bu qayda 4 ayrı dərsdə eyni sözlərlə təkrarlanır:**
- D33 @00:16:41: *"Random durduk yere bir FVG-yə işləmə girip çıkmayın"*
- D27 @00:02:06: *"Hemen aldığı anda işlem açmayın. Önce displace olacak mı bekleyin"*
- D32 @00:02:26: *"Displacement gəlməyibsə — market sadəcə likidite alır"*
- D43 @00:18:48: *"Çoğunuzun **en büyük yaptığı yanlış**: likidite aldı, IFVG
  oluştu, ben giriyorum. **Bu saçma sapan işler yapmayın.**"*

### İstisna: Sharp Turn (MSS-siz giriş)
Likiditeni **alarkən** bir FVG + **aldıqdan dərhal sonra əks istiqamətdə**
ikinci FVG → "U dönüşü". **İkisinin kəsişdiyi yerin orta nöqtəsindən** girilir.
Burada MSS gözləmək məcburi deyil (D34 @00:03:10) — amma müəllim
*"nə etdiyinizi bilmirsinizsə girməyin"* deyir.

## 4. FİLTRLƏR

| Filtr | Qayda | Mənbə |
|---|---|---|
| **Günlük bias** | Əvvəlki gün səviyyəni alıb **gövdə ilə o tayda** bağlanıb? → davam. Yalnız **fitil** atıb geri qayıdıb? → əks (rədd) | D43 @00:20:07 |
| **Premium/Discount** | Bias bearish → FVG-ni **premium**-da axtar. Bullish → **discount**-da. Əks yarıda FVG axtarma | D24 @00:04:13 |
| **IRL/ERL** | Növbəti hədəf növbələşməyə uyğundurmu? Uyğun deyilsə **girmə** | D42 @00:00:12 |
| **Kill Zone** | London / NY AM / NY PM. **Nahar saatından qaç** | D17, D18 |
| **LRLR** | Hədəf tərəfində alınmamış likidite yığılıbmı? | D24 |

## 5. RİSK (dəyişməz)

- Əməliyyat başına **maksimum 1%** (adətən 0.5–1%)
- **⭐ ANTİ-MARTİNGALE nərdivanı** (D41 @00:38:04, D37 @00:02:34):
  ```
  1% itirdin  → növbəti əməliyyat 0.5%
  0.5% itirdin → növbəti 0.25%
  ... zərər çıxana qədər, sonra yenidən 1%
  ```
  **İtkidən sonra ölçü KİÇİLİR** — OTOBOT-un martingale-inin tam əksi
- Hədəf **1:2** (yeni başlayan üçün 1:1 də olar)
- Lot riskdən hesablanır, əksinə yox
- HTF FVG-yə çatanda **yarısını bağla** (D41 @00:34:03)

## 6. TEZLİK GÖZLƏNTİSİ

> D41 @00:33:16: *"Hər həftə **2-3 dəfə** rahat olur. Bəzən **gündə iki dəfə**."*
> D40 @00:19:45: *"Hər gün olur mu? **Xeyr.** Hər həftə olur mu? **Olur.**"*

## 7. HANSI BAZARLARDA İŞLƏYİR

✅ **İşləyir:** NASDAQ/indekslər, major forex, qızıl, BTC — **institusional
pul olan, likvid bazarlar** (D26 @00:03:37)

⚠️ **Killzone hissəsi işləmir:** kripto 24/7-dir, birja açılışı yoxdur →
orada yalnız likidite + FVG məntiqi qalır (D40 @00:28:03, D41 @00:09:43)

❌ **İşləmir:** kiçik kapitallı hisselər, az likvid altcoinlər —
*"adamın kefinə görə qaldırıb-endirdiyi hissədə texniki analiz etmə"*
(D26 @00:05:36)

---

## 8. ⚠️ NƏYİ HƏLƏ BİLMİRİK

Müəllim heç bir yerdə **statistika vermir**: nə "N əməliyyat", nə "X% win
rate", nə də backtest. Bütün nümunələr **keçmişə baxıb seçilmiş** nümunələrdir.

Öz sözü (D40 @00:03:01): *"Yatırım tavsiyesi kesinlikle değildir...
herkes için sonuçlar farklı olur."*

**Növbəti addım — kod yazmaq deyil, ÖLÇMƏK:**

> **Fərziyyə:** HTF likidite sweep-indən sonra displacement + MSS baş verərsə,
> FVG-nin 50%-inə geri çəkilmədə giriş müsbət asimmetriya verir.
>
> **Nəzarət qrupu:** displacement/MSS OLMADAN eyni sweep-lər — yəni bizim
> rədd etdiyimiz köhnə sistem (ölçülüb: **-0.331 ATR, t=-2.66**).
>
> Əgər fərq statistik olaraq görünmürsə, bu strategiya da bizim üçün işləmir.
