# 📊 DURUM ÖZETİ - Ne Oldu, Ne Yaptık, Ne Olacak?

## 🎯 NE YAPTIK?

### 1. TEFAS Veri Çekme Sorunu Çözüldü
- **Sorun**: Fintables'den veri çekilemiyordu (Cloud Functions'da çalışmıyordu)
- **Çözüm**: HangiKredi.com'dan scraping yaparak TEFAS verilerini çekiyoruz
- **Özellik**: Chart verilerinden gerçek haftalık return hesaplıyoruz (Monday open → Friday close)

### 2. Yeni Otomasyonlar Eklendi
- **`fetchTefasDataFromHangikredi`**: Her Cuma 23:25 TRT'de çalışır
  - TEFAS fonlarının verilerini HangiKredi'den çeker
  - `marketData` collection'ına `merge: true` ile yazar (Yahoo verilerini korur)
  
- **`fetchMarketData`**: Her Cuma 23:30 TRT'de çalışır
  - Yahoo Finance verilerini çeker
  - TEFAS verilerini de fallback olarak çeker (ama genelde 23:25'te zaten gelmiş olur)

- **`settleWeek`**: Her Cuma 23:45 TRT'de çalışır
  - Haftanın sonlandırılması (settlement)
  - Kullanıcıların getirilerini hesaplar
  - Week status'unu `settled` yapar

- **`openNextWeekWindow`**: Her Cuma 23:58 TRT'de çalışır
  - Bir sonraki hafta için allocation window'u açar
  - Week status'unu `open` yapar

### 3. Test Fonksiyonları
- **`adminTestHangikredi`**: Manuel test için (weekId parametresi ile)
- Local test scriptleri: `testHangikrediSafe.js`, `testW01.js`, vb.

---

## ⚠️ ŞU ANKİ SORUN: W02 Settled Olarak İşaretlenmiş

### Problem
- Şu an **Cumartesi, 3 Ocak 2026**
- **2026-W01** haftası henüz bitmedi (Pazartesi 29 Aralık - Cuma 2 Ocak)
- Ama database'de **2026-W02** `settled` olarak görünüyor
- Bu yüzden frontend'de Top Gainers/Losers gözükmüyor (W02 için veri yok)

### Neden Oldu?
Muhtemelen:
1. **`settleWeek`** fonksiyonu yanlış hafta için çalıştı (timezone sorunu?)
2. Veya manuel olarak W02 settle edildi
3. Veya `getISOWeekId()` fonksiyonu yanlış hafta ID'si döndürdü

### Frontend Mantığı
- `TopGainersLosers` component'i `getLatestSettledWeek()` kullanıyor
- Bu fonksiyon en son `settled` olan haftayı buluyor
- Eğer W02 `settled` ise, W02'yi gösteriyor
- Ama W02 için market data yok (henüz hafta başlamadı)
- Bu yüzden Top Gainers/Losers boş görünüyor

---

## 🔧 ÇÖZÜM PLANI

### 1. Database Durumunu Kontrol Et
```bash
# Firebase Console'da kontrol et:
# - weeks/2026-W01 → status nedir?
# - weeks/2026-W02 → status nedir? (settled olmamalı!)
# - marketData/2026-W01 → veri var mı?
# - marketData/2026-W02 → veri var mı? (olmamalı!)
```

### 2. W02'yi Düzelt
Eğer W02 `settled` ise:
- W02'nin status'unu `settled`'dan kaldır
- W02'yi sil veya status'unu `upcoming` yap
- Veya W02 document'ini tamamen sil (henüz başlamadı)

### 3. W01'i Settle Et (Gerekirse)
Eğer W01 henüz settle edilmediyse:
- `adminSettleWeek` fonksiyonunu kullanarak W01'i manuel settle et
- Veya otomatik olarak Cuma gecesi 23:45'te çalışacak

### 4. Otomasyonları Kontrol Et
- `settleWeek` fonksiyonunun `getISOWeekId()` kullanımını kontrol et
- Timezone ayarlarını kontrol et (Europe/Istanbul)
- Log'lara bak: hangi hafta için settle çalıştı?

---

## 📅 OTOMASYON ZAMAN ÇİZELGESİ (Her Cuma)

| Saat (TRT) | Fonksiyon | Ne Yapar |
|------------|-----------|----------|
| 23:25 | `fetchTefasDataFromHangikredi` | TEFAS verilerini çeker |
| 23:30 | `fetchMarketData` | Yahoo + TEFAS verilerini çeker |
| 23:45 | `settleWeek` | Haftayı settle eder (status: `settled`) |
| 23:58 | `openNextWeekWindow` | Bir sonraki haftayı açar (status: `open`) |

---

## 🎯 ŞU AN YAPILMASI GEREKENLER

1. **Database'i kontrol et** → W02'nin status'unu gör
2. **W02'yi düzelt** → Eğer `settled` ise, kaldır veya sil
3. **W01'i kontrol et** → Veri var mı? Settle edilmiş mi?
4. **Top Gainers/Losers'ı test et** → W01 için gösteriyor mu?

---

## 🔍 DEBUG İÇİN

### Firebase Console'da Kontrol Et:
```
weeks/2026-W01
  - status: "settled" olmalı (eğer Cuma gecesi çalıştıysa)
  - startDate: 2025-12-29 (Pazartesi)
  - endDate: 2026-01-02 (Cuma)

weeks/2026-W02
  - status: "open" veya "upcoming" olmalı (settled OLMAMALI!)
  - startDate: 2026-01-05 (Pazartesi)
  - endDate: 2026-01-09 (Cuma)

marketData/2026-W01
  - Veri olmalı (TEFAS + Yahoo)
  - sources: ["yahoo-finance2", "hangikredi"]

marketData/2026-W02
  - Veri OLMAMALI (henüz hafta başlamadı)
```

### Log'lara Bak:
```
Firebase Console → Functions → Logs
- "settleWeek" action'ını ara
- Hangi weekId için çalıştı?
- Ne zaman çalıştı?
```

---

## ✅ BAŞARILI SONUÇ

- W01: `settled` status'ünde, market data dolu
- W02: `open` veya `upcoming` status'ünde (settled DEĞİL)
- Top Gainers/Losers: W01 için gösteriliyor
- Frontend: Doğru haftayı gösteriyor

