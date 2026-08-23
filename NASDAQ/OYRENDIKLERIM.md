# Bootcamp-dan öyrəndiklərim — xülasə

**Mənbə:** 43 video, ~13 saat 50 dəqiqə, tam kadr + səs + vaxt damğalı transkript
(`NASDAQ VIDEO/`). Kanal: ICT/SMC konseptləri üzrə türkdilli bootcamp.

**Ən vacib kəşf:** bu sistem bizim rədd etdiyimiz sistemə **oxşayır, amma
mexanikası tamamilə fərqlidir** — və fərq məhz bizim uğursuzluğumuzun səbəbini
izah edir.

---

## 1. ƏSAS STRATEGİYA (Dərs 40 — müəllimin ekranda yazdığı 7 addım)

Qrafik: **NAS100, 5 dəqiqəlik** (kadr `f_00006.jpg`)

```
1- Vacib likidite səviyyələrindən REAKSİYA gözlə (1H / 4H / 1D)
2- Kiçik taymfreymdə dönüş əlamətlərinə bax (DISPLACEMENT, IFVG, SHARP TURN)
3- MSS gözlə (Market Structure Shift)
4- IFVG və ya FVG-dən giriş et
5- Stop: son swing high/low-un GÖVDƏSİNƏ (və ya FVG-ni yaradan şamın gövdəsinə)
6- 1:2 – 1:3 R hədəflə
7- Hesabın 0.5% – 1%-ni riskə at
```

## 2. NİYƏ BİZİM SİSTEM UĞURSUZ OLDU — dəqiq cavab

Bizim sistem: **sweep aşkarla → həmin şamın bağlanışında gir.**
Bootcamp: **sweep → displacement → MSS → FVG-yə geri çəkilmə → gir.**

Dərs 32 bu fərqi birbaşa izah edir:

> *"Üstünə iğnə atır, sonra sərt şəkildə özünü aşağı atır — belə olanda anlayın ki
> market **sadəcə likidite almağa çalışır**... baxın, **displacement gəlməyib**."*

Yəni: **fitil + geri qayıtmaq özü-özlüyündə heç nə demək deyil.** Bu, ən çox
rast gəlinən haldır və biz məhz onu siqnal sayırdıq. Real dönüş üçün ardınca
**displacement** (enerjili, tək istiqamətli, FVG buraxan hərəkət) və **MSS**
lazımdır.

Bizim diaqnostikamızın nəticəsi (sweep→dönüş = -0.331 ATR, t=-2.66) bu dərsi
**riyazi olaraq təsdiqləyir**: təsdiqsiz sweep-ə girmək uduzan əməliyyatdır.

**Digər kritik qayda (Dərs 32):**
> *"İğnələrə baxmayın — iğnələr manipulyasiyada çox hekayə danışır.
> **GÖVDƏLƏRƏ** odaklanın."*

## 3. TAYMFREYM İYERARXİYASI (Dərs 44 — "Universal Model")

Hər taymfreymin **öz sualı** var:

| Baxış | Sual | Nəyə baxılır |
|---|---|---|
| Uzun vadə | Qiymət **NİYƏ** ora getməlidir? | Draw on Liquidity, HTF hədəflər |
| Orta vadə | **NECƏ** gedəcək? | Struktur, MSS/BOS, continuation purge |
| Qısa vadə | **HARADAN** girim? | FVG / IFVG / OB — icra |

**Üsluba görə dəstlər:**
- **Swing**: Aylıq → Günlük → 1H giriş
- **Intraday** ← *bizim NASDAQ üçün seçimimiz*: Həftəlik+Günlük → 1H/4H → **15m/5m giriş**
- **Scalp**: 4H → 15m → 1m/3m giriş

## 4. KİLLZONE SAATLARI (Dərs 17) — NASDAQ üçün FƏRQLİDİR

Nyu-York vaxtı ilə, **Bakı qarşılığı ilə birlikdə** (yay / qış):

| Seans | NY vaxtı | Bakı (yay) | Bakı (qış) |
|---|---|---|---|
| Asiya KZ | 20:00–00:00 | 04:00–08:00 | 05:00–09:00 |
| London KZ | 02:00–05:00 | 10:00–13:00 | 11:00–14:00 |
| **NY — İNDEKS** | **08:30–11:00** | **16:30–19:00** | **17:30–20:00** |
| NY — Forex | 07:00–10:00 | 15:00–18:00 | 16:00–19:00 |

> ⚠️ **Vacib**: indeks bazarı (NASDAQ) üçün NY killzone **08:30–11:00**-dir,
> forex-in 07:00–10:00-undan fərqlidir. Bizim Pine scriptdə təsadüfən düz
> qoyulmuşdu.

Müəllim: *"Ən sürətli və ən yaxşı əməliyyat verən — Nyu-York."*
Asiya: *"demək olar heç hərəkət etmir, orada mövqe yığılır (akkumulyasiya)"*.

## 5. ANLAYIŞLAR (dəqiq təriflərlə)

**FVG (Fair Value Gap)** — 3 şamlıq quruluş: 1-ci şamın high-ı ilə 3-cü şamın
low-u üst-üstə düşmür; 2-ci şamın displacement-i boşluq buraxır. Bu boşluq
"dengesizlik"dir və bazar onu doldurmağa meyllidir.

**IFVG (Inversion FVG)** — doldurulmuş/pozulmuş FVG. Əvvəl dəstək idisə, indi
müqavimətə çevrilir. Dərs 40: *"bu FVG doldurulub, artıq qiymət ora
gəlməməlidir; gəlirsə bizim analizimiz səhvdir."*

**MSS (Market Structure Shift)** — struktur nöqtəsinin **gövdə ilə** (fitil yox)
qırılması.

**Displacement** — enerjili, tək istiqamətli hərəkət (arxasında FVG qoyur).
Bu, likidite alımını real dönüşdən ayıran əsas əlamətdir.

**⭐ Sharp Turn** (müəllimin ən yüksək win-rate patterni):
> Likiditeni **almağa gedərkən** bir FVG yaranır → likiditeni alır → **dərhal
> tam əks istiqamətdə** başqa FVG yaranır. "U dönüşü" görüntüsü.
> *"Gerçekten high probability. Mən işlemə girmək üçün məhz bunu axtarıram."*

**Continuation Purge** — bias istiqamətində davam etməzdən əvvəl bazarın əks
istiqamətdə "yanacaq axtarması" (qısa manipulyasiya).

**Premium / Discount** — range-in yuxarı yarısı = premium (satış), aşağı yarısı
= discount (alış). Qayda: premium-dan sat, discount-dan al.

**Engineering / Low Resistance Liquidity** — eyni səviyyədə təkrarlanan
low/high-lar (equal highs/lows) → süni yığılmış likidite, alınması demək olar
zəmanətlidir.

## 6. RİSK (Dərs 21)

- Riski **əvvəlcə dollarla sabitlə**, sonra stop məsafəsinə görə ölçünü hesabla
  — bizim `computeXmUnits` ilə eyni məntiq ✅
- 1:3 RR-də **10 əməliyyatın 7-si uduzsa belə** mənfəətdə qalırsan
- Hesabın 0.5–1%-i (bizim hazırkı 1.5%-dən daha mühafizəkar)

## 7. TEZLİK GÖZLƏNTİSİ (dürüst hissə)

> *"Hər gün olur mu? **Xeyr.** Hər həftə olur mu? **Olur.**"*
> *"Hər gün işlemə girmək məcburiyyətində deyilsiniz."*

Yəni bu sistem də **gündə onlarla siqnal vermir** — həftədə bir neçə keyfiyyətli
setup. Sənin əvvəlki "ayda 1 siqnal az deyilmi?" narahatlığına cavab: bu
peşəkarın özü də tezliyi az saxlayır.

## 8. NƏYİ QƏBUL ETMİRİK (dürüstlük qeydi)

Müəllim öz sözü ilə deyir: *"para qazanmanın garantisini vermiyorum"*, *"yatırım
tavsiyesi kesinlikle değildir"* — bu, yaxşı əlamətdir (OTOBOT-un "100% qazanma"
iddiasının əksi).

**Amma:** videoda göstərilən bütün nümunələr **keçmişə baxaraq seçilmiş
nümunələrdir** (backtest deyil). Heç bir yerdə "N əməliyyat, X% win rate"
statistikası yoxdur. Ona görə bu strategiya bizim üçün **hələ də sınanmamış
fərziyyədir**, nə qədər məntiqli görünsə də.

`CLAUDE.md`-dəki metod qaydasına uyğun olaraq növbəti addım **kod yazmaq deyil** —
əvvəlcə əsas fərziyyəni ölçmək:

> **Ölçüləcək fərziyyə:** "HTF likidite səviyyəsindən sonra displacement + MSS
> baş verərsə, FVG-yə geri çəkilmədə giriş müsbət asimmetriya verir"
>
> Nəzarət qrupu: **displacement/MSS OLMADAN** eyni sweep-lər (bizim köhnə
> sistem). Əgər fərq statistik olaraq görünmürsə, bu strategiya da bizim üçün
> işləmir.

Bu ölçmə hazır infrastrukturla (`scripts/diagnose-xau-edge.mjs` şablonu) NASDAQ
datası üzərində edilə bilər.
