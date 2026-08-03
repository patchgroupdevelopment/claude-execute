# Claude Execute — Ticarət Siqnalı Sistemi

**Yalnız siqnal.** Bu sistem heç bir birjaya qoşulmur, heç vaxt sifariş vermir və heç bir
birja API açarı saxlamır. Binance-in ictimai market datasını oxuyur, deterministik
qaydalarla analiz edir və nəticəni Telegram-a göndərir. İcra qərarı həmişə insandadır.

## Necə işləyir

```
GitHub Actions cron (hər 30 dəq, "7,37 * * * *")
  → bot.js: Binance public API-dən 4H şamlar
  → İndikatorlar: RSI(3) Wilder, ATR(14) Wilder, ADX(14), EMA(9/20/200), VWAP, CVD
  → Strategiya (aktivə görə):
      • BTC/ETH/SOL/BNB — Connors-adaptasiyalı mean-reversion v2:
        EMA(200) rejim filtri + BAĞLANMIŞ şamda RSI(3) hadisə girişi
        (<15 yeni düşdü → BUY, >85 yeni qalxdı → SHORT)
      • GOLD (PAXG) — trend-following: EMA(9)/EMA(20) kəsişməsi bağlanmış şamda
        + ADX≥22 + təsdiq şamı
  → Çıxışlar: SL (ATR×2.5), TP (ATR×2 / qızıl ATR×3), breakeven (0.75×ATR),
    RSI çıxışı (bağlanmış şamla), vaxt limiti (120 saat).
    SL/TP intrabar (şam high/low) yoxlanır və səviyyə qiymətində doldurulur.
  → Telegram: siqnal + XM icra planı (risk-əsaslı ölçü: mövqe = risk məbləği / stop məsafəsi)
  → Virtual balans (paper trading): 30% × kapital, maks 3 paralel mövqe
  → Vəziyyət `state` budağına yazılır (tək commit, tarixçə yığılmır)
```

Bütün qərar məntiqi deterministik kodda yaşayır və 9 illik walk-forward testindən
keçirilib — canlı sistem backtestlə eyni qaydalarla işləyir.

## Fayllar

| Fayl | Rol |
|---|---|
| `bot.js` | Bütün analiz + siqnal məntiqi (sıfır npm asılılığı) |
| `.github/workflows/signals.yml` | Cədvəl, mühit, vəziyyətin saxlanması, xəta bildirişi |
| `dashboard/` | Lokal dashboard (`node dashboard/server.cjs`) — hostlanmır |
| `data/` (`state` budağında) | paper-trading.json, trades.csv, qərar logu |

## Konfiqurasiya

Bütün parametrlər mühit dəyişənləridir — `signals.yml`-in `env:` blokuna bax.
Gizli dəyərlər yalnız GitHub Secrets-dədir: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
istəyə bağlı `ANTHROPIC_API_KEY` (Claude ikinci-rəy qatı üçün).

## Telegram bildirişləri

- 🚨 Siqnal (TP/SL səviyyələri + XM lot hesabı ilə)
- 💰/✅/🔴 Virtual alış-satış və PnL
- ⏳ Fokus bildirişləri (ETH epizod, GOLD kəsişmə yaxınlaşır)
- 🧠 Claude ikinci rəyi (açar qoyulubsa)
- ⚠️ Ardıcıl zərər / drawdown xəbərdarlıqları
- 📊 Həftəlik hesabat (bazar günü) — həm də "sistem sağdır" siqnalı
- 🚨 Dövrə xətası bildirişi (workflow uğursuz olsa)

## Hüquqi qeyd

Bu, maliyyə məsləhəti deyil. Siqnallar tarixi qaydalara əsaslanır; keçmiş nəticələr
gələcəyə zəmanət vermir. Real pulla icra tamamilə istifadəçinin öz məsuliyyətidir.
