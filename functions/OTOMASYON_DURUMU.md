# 🚀 OTOMASYON DURUMU - Güncel Özet

## ✅ NE YAPILDI?

### 1. W01 İçin TEFAS Fonları Eklendi ✅
- **Tarih**: 3 Ocak 2026 (Cumartesi)
- **Hafta**: 2026-W01 (29 Aralık - 2 Ocak)
- **Yapılan**: Tüm TEFAS fonlarının verileri HangiKredi'den çekildi ve database'e yazıldı
- **Sonuç**: 12 TEFAS fonu için haftalık return verileri mevcut
- **Veri Kaynağı**: HangiKredi.com chart verilerinden gerçek haftalık return (Monday open → Friday close)

### 2. Frontend'de Fonlar Aktif Edildi ✅
- **Dosya**: `src/config/instruments.js`
- **Yapılan**: Tüm 12 TEFAS fonunun `enabled: true` yapıldı
- **Sonuç**: Kullanıcılar artık allocation form'da TEFAS fonlarını görebilir ve yatırım yapabilir

### 3. Otomasyon Hazır ✅
- **Fonksiyon**: `fetchTefasDataFromHangikredi`
- **Zamanlama**: Her Cuma 23:25 TRT (Europe/Istanbul timezone)
- **Durum**: Kod hazır, deploy edilmiş olmalı

---

## 📅 OTOMASYON ZAMAN ÇİZELGESİ (Her Cuma)

### Cuma 23:25 TRT - TEFAS Verileri Çekiliyor 🎯
**Fonksiyon**: `fetchTefasDataFromHangikredi`

**Ne Yapıyor?**
1. Mevcut haftanın weekId'sini hesaplar (örn: 2026-W01)
2. Haftanın Pazartesi ve Cuma tarihlerini belirler
3. HangiKredi.com'dan tüm TEFAS fonlarının verilerini çeker:
   - Chart verilerinden Monday open ve Friday close fiyatlarını alır
   - Gerçek haftalık return'i hesaplar: `returnPct = ((close - open) / open) * 100`
4. Database'e yazar:
   - `marketData/{weekId}` collection'ına
   - `merge: true` kullanarak mevcut Yahoo verilerini korur
   - Sadece TEFAS fonlarını günceller

**Özellikler:**
- ✅ Yahoo verilerini korur (sadece TEFAS fonlarını günceller)
- ✅ Hata durumunda log yazar ama durmaz (fetchMarketData çalışmaya devam eder)
- ✅ Detaylı log'lar (kaç fon başarılı, kaç fon başarısız)
- ✅ Timeout: 540 saniye (9 dakika)
- ✅ Memory: 512MB

**Örnek Log:**
```
🚀 Fetching TEFAS data from HangiKredi for week 2026-W01
   Date range: 2025-12-29 to 2026-01-02
   Existing Yahoo instruments: 15
📊 Results: 12/12 successful, 0 failed
✅ Updated marketData for 2026-W01 (merge: true - Yahoo data preserved)
✅ Verified: Yahoo data preserved (15 instruments)
```

---

### Cuma 23:30 TRT - Yahoo + TEFAS Verileri Çekiliyor
**Fonksiyon**: `fetchMarketData`

**Ne Yapıyor?**
1. Yahoo Finance verilerini çeker (15 enstrüman)
2. TEFAS verilerini fallback olarak çeker (ama genelde 23:25'te zaten gelmiş olur)
3. Tüm verileri `marketData/{weekId}` collection'ına yazar

**Not**: TEFAS verileri genelde 23:25'te zaten gelmiş olur, bu yüzden burada sadece fallback olarak çalışır.

---

### Cuma 23:45 TRT - Hafta Settle Ediliyor
**Fonksiyon**: `settleWeek`

**Ne Yapıyor?**
1. Haftanın gerçekten bitip bitmediğini kontrol eder (validation)
2. Kullanıcıların allocation'larını alır
3. Market data'dan her enstrümanın return'ünü hesaplar
4. Kullanıcıların getirilerini hesaplar
5. Week status'unu `settled` yapar

**Yeni Özellik**: Validation eklendi - hafta bitmemişse settle etmez!

---

### Cuma 23:58 TRT - Bir Sonraki Hafta Açılıyor
**Fonksiyon**: `openNextWeekWindow`

**Ne Yapıyor?**
1. Bir sonraki hafta için allocation window'u açar
2. Week status'unu `open` yapar
3. Kullanıcılar yeni hafta için yatırım yapabilir

---

## 🔍 OTOMASYON NASIL ÇALIŞIYOR?

### 1. Cloud Scheduler
Firebase Cloud Functions, Google Cloud Scheduler kullanarak otomatik çalışır:
- **Cron Format**: `25 23 * * FRI` = Her Cuma 23:25
- **Timezone**: `Europe/Istanbul` (TRT)
- **Trigger**: `pubsub.schedule()`

### 2. Veri Akışı

```
Cuma 23:25 → fetchTefasDataFromHangikredi
    ↓
HangiKredi.com'dan scraping
    ↓
12 TEFAS fonu için veri çekiliyor
    ↓
marketData/{weekId} → merge: true ile yazılıyor
    ↓
Yahoo verileri korunuyor ✅
```

### 3. Güvenlik Önlemleri

**Merge: True Kullanımı:**
- Mevcut Yahoo verileri korunur
- Sadece TEFAS fonları güncellenir
- Veri kaybı olmaz

**Hata Yönetimi:**
- Hata durumunda log yazar
- Fonksiyon durmaz (fetchMarketData çalışmaya devam eder)
- Detaylı error log'ları

**Validation:**
- Haftanın bitip bitmediği kontrol edilir
- Market data var mı kontrol edilir
- Yahoo verileri korunuyor mu kontrol edilir

---

## 📊 VERİ YAPISI

### marketData/{weekId} Collection

```javascript
{
  // Metadata
  window: {
    period1: "2025-12-29T00:00:00.000Z",
    period2: "2026-01-02T23:59:59.999Z",
    tz: "UTC",
    sources: ["yahoo-finance2", "hangikredi"]
  },
  fetchedAt: Timestamp,
  sources: ["yahoo-finance2", "hangikredi"],
  
  // Yahoo Finance Instruments (15 adet)
  XU100: { open: 12345.67, close: 12500.00, returnPct: 1.25, source: "yahoo-historical" },
  USDTRY: { open: 34.50, close: 34.75, returnPct: 0.72, source: "yahoo-historical" },
  // ... diğer Yahoo enstrümanları
  
  // TEFAS Fonları (12 adet)
  NVB: { 
    open: 10.50, 
    close: 10.52, 
    returnPct: 0.19, 
    source: "hangikredi-chart",
    openDate: "2025-12-29",
    closeDate: "2026-01-02"
  },
  AFA: { 
    open: 15.30, 
    close: 15.45, 
    returnPct: 0.98, 
    source: "hangikredi-chart",
    openDate: "2025-12-29",
    closeDate: "2026-01-02"
  },
  // ... diğer TEFAS fonları
}
```

---

## ✅ OTOMASYON DURUMU

### Şu Anki Durum:
- ✅ **Kod Hazır**: `fetchTefasDataFromHangikredi` fonksiyonu yazıldı
- ✅ **Zamanlama Ayarlı**: Her Cuma 23:25 TRT
- ✅ **Test Edildi**: W01 için manuel test başarılı
- ⚠️ **Deploy Kontrolü Gerekli**: Firebase'de deploy edilmiş mi kontrol et

### Kontrol Listesi:
- [ ] Firebase Console'da `fetchTefasDataFromHangikredi` fonksiyonu var mı?
- [ ] Cloud Scheduler'da zamanlama ayarlı mı?
- [ ] Son çalışma log'ları var mı?
- [ ] Fonksiyon aktif mi?

---

## 🎯 SONRAKİ ADIMLAR

### 1. Deploy Kontrolü
```bash
cd functions
firebase deploy --only functions:fetchTefasDataFromHangikredi
```

### 2. Test (Opsiyonel)
Bir sonraki Cuma gecesi otomatik çalışacak. Ama isterseniz manuel test edebilirsiniz:
- Firebase Console → Cloud Scheduler → `fetchTefasDataFromHangikredi` → "RUN NOW"
- Veya `adminTestHangikredi` fonksiyonunu kullanın

### 3. Log Takibi
Her Cuma gecesi 23:25'te:
- Firebase Console → Functions → Logs
- `fetchTefasDataFromHangikredi` log'larını kontrol edin
- Başarı/hata durumunu görün

---

## 📝 ÖZET

**✅ Yapılanlar:**
1. W01 için TEFAS fonları eklendi (manuel test)
2. Frontend'de fonlar aktif edildi
3. Otomasyon kodu hazır ve deploy edilmiş olmalı

**🔄 Otomatik Çalışma:**
- Her Cuma 23:25 TRT'de otomatik çalışacak
- Tüm TEFAS fonlarının verilerini çekecek
- Database'e yazacak
- Yahoo verilerini koruyacak
- Manuel müdahale gerektirmeyecek

**📊 Sonuç:**
- Her hafta otomatik olarak TEFAS fonlarının verileri çekilecek
- Kullanıcılar allocation yapabilecek
- Hafta sonunda settle edilecek
- Tam otomatik sistem! 🎉

