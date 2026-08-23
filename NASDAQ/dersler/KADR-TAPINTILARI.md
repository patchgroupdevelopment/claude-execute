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
