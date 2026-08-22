# CLAUDE.md — claude-execute

## ⚠️ HƏR SESSİYANIN ƏVVƏLİNDƏ OXU

**`knowledge/TRADING-LEARNINGS.md`** — bu layihədə indiyə qədər nə öyrənilib,
nə təsdiqlənib, nə rədd edilib. Yeni strategiya təklif etməzdən və ya köhnəni
"düzəltməzdən" əvvəl mütləq oxu. Orada artıq rədd edilmiş fikirlər var —
onları təkrar təklif etmə.

## Sistem nədir

Qızıl, kripto, indekslər və neft üçün siqnal sistemi. GitHub Actions-da işləyir
(server yoxdur, pulsuz), nəticəni Telegram-a göndərir. **Əməliyyat AÇMIR** —
yalnız siqnal verir, icranı istifadəçi XM-də əl ilə edir.

- `bot.js` — əsas siqnal mühərriki (6 aktiv), Node ESM, asılılıqsız
- `channel-relay.mjs` — 5 xarici Telegram kanalını izləyir, Claude ilə süzür
- `tradingview/*.pine` — TradingView indikatorları
- `scripts/` — backtest və diaqnostika alətləri (birdəfəlik işlər)
- State `state` / `relay-state` budaqlarında saxlanılır, `main` yalnız koddur

## Metod qaydası (pozulmamalıdır)

Yeni strategiya fikri gələndə **bu sıra ilə** get:

1. **Fərziyyəni təkbaşına ölç** — TP/SL/filtr olmadan. MFE/MAE + irəli hərəkət,
   ATR vahidi ilə, mütləq **baza ilə müqayisəli** (`scripts/diagnose-xau-edge.mjs`).
2. Asimmetriya sübut olunmayıbsa (MFE/MAE ≈ 1.0, t < 2) — **dayan**. Kod yazma.
3. Sübut olunubsa → strategiya qur, sonra backtest et.
4. Backtest-də mütləq: tam dövr + dövrü yarıya bölmək + parametr qonşuları +
   spread + t-statistika.
5. t < 2 olan nəticəni "işləyir" kimi təqdim etmə.

Səbəb: əvvəllər tərsinə etdik (əvvəl qurduq, sonra test etdik) və nəticədə
**statistik olaraq etibarlı şəkildə uduzan** sistem qurduq. Bax:
`knowledge/TRADING-LEARNINGS.md` bölmə 3.

## Risk qaydaları (dəyişməz)

- Mövqe ölçüsü riskdən hesablanır: `risk$ / SL məsafəsi`. Default 1.5%/əməliyyat.
- Martingale, "zərərdə əlavə", stop-suz mövqe — **heç vaxt**.
- Eyni şamda SL və TP hər ikisinə toxunulubsa → SL sayılır (konservativ).
- Claude rəyi həmişə **məsləhətdir, bloklamır**. Claude xətası siqnalı dayandırmır.

## Dil

İstifadəçi ilə **Azərbaycan dilində** danışılır. Kod şərhləri də Azərbaycancadır.

## Praktik qeydlər

- Yahoo Finance intraday limitləri: 5m/15m/30m → 60 gün, 1h → 730 gün
- Qızıl datası: `GC=F` (fyuçers) və ya `XAUUSD=X`; DXY: `DX-Y.NYB`
- Binance: `data-api.binance.vision` (açar tələb etmir)
- yt-dlp quraşdırılıb — YouTube transkriptləri üçün
- Bakı vaxtı UTC+4, DST yoxdur. NY/London-da DST var — seanslar NY vaxtı ilə
  təyin olunur ki, avtomatik düzəlsin.
