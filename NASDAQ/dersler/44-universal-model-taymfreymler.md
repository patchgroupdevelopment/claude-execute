# Dərs 44 — "Universal Model" / Taymfreym iyerarxiyası (47:08)

Mənbə: `NASDAQ VIDEO/44_.../` · https://youtu.be/K7wQPnrGTfM

Müəllim: *"Bu modeli mən tapmadım, ICT-dən gördüyüm modeldir."*
Bütün paritələrdə və bütün trade üslublarında (swing / intraday / scalp) işləyir.

## Üç baxış bucağı — hər birinin ÖZ SUALI var

Bu, modelin nüvəsidir. Hər taymfreym fərqli suala cavab verir:

| Baxış | Sual | Nəyə baxılır |
|---|---|---|
| **Uzun vadə** | *"Qiymət NİYƏ ora getməlidir?"* | Draw on Liquidity, likidite hədəfləri, HTF PD array-lər |
| **Orta vadə** | *"Qiymət ora NECƏ gedəcək?"* | Market strukturu, BOS/MSS, internal vs external likidite, **continuation purge** (manipulyasiya) |
| **Qısa vadə** | *"Mən HARADAN girəcəyəm?"* | Giriş icrası (FVG/IFVG/OB) |

## ⭐ TAYMFREYM DƏSTLƏRİ (üsluba görə)

### Swing (həftələrlə saxlayan) [00:06:18-00:06:48]
- Uzun: **Aylıq** (aydın deyilsə → Həftəlik)
- Orta: **Günlük**
- Giriş: **1 saatlik**

### Intraday (gün içi, saatlarla saxlayan) [00:22:58-00:23:30]
- Uzun: **Həftəlik + Günlük**
- Orta: **1 saatlik və ya 4 saatlik**
- Giriş: **15 dəqiqə – 5 dəqiqə**

### Scalp (dəqiqələrlə) [00:32:37-00:33:05]
- Uzun (Draw on Liquidity / PD array): **4 saatlik** (aydın deyilsə → Günlük)
- Orta (struktur / continuation purge): **15 dəqiqə**
- Giriş: **1 dəqiqə və ya 3 dəqiqə**

> **NASDAQ üçün bizim seçimimiz: INTRADAY dəsti**
> Həftəlik/Günlük bias → 1H/4H struktur → 15m/5m giriş.
> Bu, Dərs 40-dakı strategiya ilə üst-üstə düşür (orada "1H 4H 1D likidite,
> 5 dəqiqədə giriş" deyilir).

## Psixoloji uyğunluq (özünü tanı)
[00:07:08-00:07:51] Swing: səbirlisən, qrafik qarşısında çox otura bilmirsən,
alarm qoyub işə gedirsən.
[00:23:39-00:24:10] Intraday: əməliyyatı seanslar arası saxlayırsan (London-da
açıb NY-a qədər), 3-5 saat, amma gün bitəndə bağlamaq istəyirsən.
[00:33:11-00:33:29] Scalp: uzun saxlaya bilmirsən, tez girib-çıxmaq istəyirsən,
səbirsizsən. *"Erkən girsən 5/15 dəqiqədə panik atak keçirərsən."*

## Continuation Purge (əsas anlayış)
[00:09:01-00:10:31] Bias istiqamətində davam etməzdən əvvəl bazarın **yanacaq
axtarması** — yəni əks istiqamətdə qısa manipulyasiya edib likidite toplaması.

Nümunə: bias LONG-dur, amma bazar günlük qrafikdə səni **aşağı fitillə manipulyasiya
edir**, aşağıdakı low-ları alır, sonra əsl yüksəlişə başlayır.
*"Sən yuxarı yönlüsən. Bazar səni burada manipulyasiya edir."*

Bu, Dərs 40-dakı "likidite alımı"nın daha dəqiq adıdır.

## Vacib praktik qeyd — bias səhv olsa belə
[00:34:50-00:35:14] *"Bias-ın səhv olsa belə, market structure break olduğu üçün
o hərəkəti trade etsən yenə yaxşı əməliyyat qurmuş olacaqsan."*

Yəni MSS-dən sonrakı giriş özü-özlüyündə qorunur — böyük şəkli səhv oxusan da,
struktur dəyişimi sənə ən azı bir hərəkət verir.

## Engineering Liquidity / Low Resistance Liquidity
[00:34:00-00:34:20] Bazar eyni səviyyədə təkrar-təkrar low/high buraxırsa
("string failure"), orada **süni likidite yığılır** — bu, sonradan alınması
demək olar zəmanətli hədəfdir (low resistance = müqavimətsiz yol).

## Premium / Discount
[00:25:22-00:25:43] Range-in yarısından yuxarı = **premium** (satış tərəfi),
aşağı = **discount** (alış tərəfi).
Qayda: **premium-dan sat, discount-dan al.**
Nümunədə: *"Premium tərəfindəyik. Bu da uyğun gəlir."* — yəni short setup üçün
qiymətin premium zonada olması əlavə təsdiqdir.

---

# ⬇ KADR + TRANSKRİPT BİRGƏ BAXIŞI (2-ci keçid)

Kadrları transkriptlə üst-üstə qoyanda dərsdən **əvvəl qaçırdığım** hissələr
çıxdı. Aşağıdakılar spesifikasiyaya girməli olan yeni qaydalardır.

## Lövhədəki modelin öz siyahısı (kadr `f_00057`, 00:07:28)
Ekranda müəllimin öz qeydi:
```
universal model
 *premium discount
 *pd array
 *external internal likidite
 *contunation purge mmxm
 *zaman dilimi ile mmxm

swing
 uzun vade bakış açısı: aylık haftalık
 orta bakış açısı: daily
 kısa bakış açısı: 1h
```
Yəni model **5 komponentdən** ibarətdir və beşincisi **MMXM**-dir —
mən bunu əvvəl heç qeyd etməmişdim.

## ⭐ MMXM — Market Maker Buy / Sell Model
[00:37:47-00:38:33] *"MMXM model trade etdik, dəyil mi? ... Market maker
modelləri."*

Ardıcıllıq (buy model üçün):
```
original consolidation (başlanğıc yığım zonası)
   → aşağı manipulyasiya / continuation purge (turtle soup)
   → ORDER PAIRING — smart money burada sifarişləri cütləşdirir
   → "buy programı AKTİVLƏŞİR"
   → market structure break (yuxarı)
   → FVG-yə retest → GİRİŞ
   → hədəf: original consolidation zonası
```
Sell model: eyni şey güzgüdə.

**Program aktivləşdikdən sonra gözlənti** [00:38:18-00:38:33]:
> *"Berish PDR-lərin sayğı duyulması — **up close candle**-ların, yəni o order
> block-un qiyməti aşağı doğru support-laması."*

- **Sell programı aktivdir** → **yaşıl (up-close) şamlar** müqavimət kimi işləyir
- **Buy programı aktivdir** → **qırmızı (down-close) şamlar** dəstək kimi işləyir

Bu, order block-un niyə işlədiyinin izahıdır: program istiqamətinə **əks rəngli**
şam PD array rolunu oynayır.

## ⭐ ORDER PAIRING (yeni termin)
[00:09:10-00:09:24] *"Buranın likiditesini alır. **Order pairing** dediyimiz
olay burada gerçəkləşir. Smart money artıq burada buy programını aktivləşdirmiş
olur."*

Yəni: likidite alınan **dəqiq nöqtə** = institusional sifarişlərin doldurulduğu
yer. Bizim kodda bu, sweep şamıdır — amma **giriş yeri deyil**, yalnız
"program başladı" siqnalıdır.

## ⭐ ORIGINAL CONSOLIDATION = TP zonası
[00:11:10-00:11:22] və [00:46:29-00:46:32]
> *"Burası bizim üçün **original consolidation** dediyimiz alan."*
> *"Original consolidation dediyimiz qisma qədər tutdum. Çıxdım."*

MMXM-in başladığı yığım zonası **hədəfdir**. Sabit RR-dən əlavə struktur hədəfi.

## ⭐ TURTLE SOUP = continuation purge-in adı
[00:25:43-00:26:00] *"Continuation purge axtaracaqsan... yəni bir **turtle
soup** axtaracaqsan. Bu nə qardaşım? 4 saatlikdə bax buranın **wick**-ini
manipulyasiya edir. **Buradakı FVG ilə də kəsişir**."*

İki şərt birlikdə:
1. Əvvəlki low/high-ın fitillə alınması (turtle soup)
2. Həmin yerin **HTF FVG ilə kəsişməsi**

Bu, Dərs 29-dakı "vacib səviyyəyə gəlmədən order block işləməz" qaydasının
eyni ifadəsidir — **kəsişmə məcburidir**.

## ⭐ SKIP QAYDASI — dərsin ən dürüst hissəsi
[00:44:03-00:44:45]
> *"Bu bir az **ütopik** nümunədir... çox **saçma-sapan və iyrənc price
> action**-ın olduğu bir nümunə. ... Olmayan bir şeyi yaradırmış kimi göstərib
> sizi **aldatmaq istəmərəm**. Belə olduğu zaman maksimum edəcəyiniz şey —
> burada zatən bir şey yoxdur — **bizim anlatdığımız modelə görə SKIP-lərsən**.
> Ertəsi həftə zatən trade edərsən."*

Kodda qarşılığı: **aydın olmayan strukturda siqnal vermə.** Yəni filtr
sərtliyi feature-dur, bug deyil. Az siqnal → doğru davranış.

[00:43:38-00:43:50] Əlavə: *"Belə salaq-saçma yapılar olduğu zaman
**taymfreymi yüksəldin**, bir az netləşər."* — 1m yerinə 3m.

## Fraktallıq iddiası və nümunə paritələr
[00:33:29-00:33:37] *"Zaman **fraktaldır**. Bütün hər şeydə işə yarayır."*

Bu dərsdə eyni model ekranda **ardıcıl olaraq** tətbiq edilir:
- **EURCAD** (aylıq → günlük → 1H) — kadr `f_00068`…`f_00104`
- **USDJPY** — kadr `f_00110`
- **Bitcoin** [00:19:46-00:20:26] — swing nümunəsi
- **GBP** [00:45:10-00:45:20] — *"təsadüfən yanlışlıqla verdim, orada da eyni
  şey işlədi"*
- **NQ (NASDAQ)** [00:42:33-00:43:04] — scalp nümunəsi

→ Bu, "SP500/GOLD/BTC-də işləyirmi?" sualına müəllimin öz cavabıdır: **bəli**,
yalnız *"siko-siko coinlərin üstündə sınamayın, bir işə yaramaz"* [00:01:09].

## Metod qeydi — müəllim TradingView **Replay** rejimindən istifadə edir
Bütün nümunə kadrlarda ekranın ortasında **"Replay"** su nişanı var
(`f_00068`–`f_00110`). Yəni dərsdəki "canlı" analizlər **bar-replay** ilə
edilib. Bizim üçün nəticə: bu nümunələr **irəli-test deyil**, geriyə baxışdır.
Statistik dəyəri yoxdur — yalnız qaydaların illüstrasiyasıdır.

## Kiçik qeydlər
- [00:39:25-00:39:33] **Piramit** (mövqeyə əlavə) mümkündür, amma *"bəzi
  firmalarda qadağandır"*.
- [00:40:04-00:40:13] **Silver Bullet** adlanan pəncərə: *"9,5–10 arası"*
  (NY 09:30–10:00) — killzone içində daha dar pəncərə. Ayrıca izah edilmir.
- [00:34:00-00:34:20] **Engineering liquidity**: bazar qəsdən üst-üstə
  low/high buraxır ("string/swing failure") → alınmamış likidite yığını → DOL.
