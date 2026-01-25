# 2026-W01 Verilerini Database'e Yazmak İçin

## ✅ Test Sonuçları
- 13/13 fon için veri çekildi
- Chart'tan gerçek haftalık return hesaplandı
- Tüm veriler hazır

## 🚀 Database'e Yazmak İçin

### Yöntem 1: Firebase Console (Önerilen)

1. **Firebase Console'a git:**
   https://console.firebase.google.com/project/yatirimv3/functions

2. **adminTestHangikredi fonksiyonunu bul**

3. **"Test" butonuna tıkla**

4. **Test verilerini gir:**
   ```json
   {
     "weekId": "2026-W01",
     "dryRun": false
   }
   ```

5. **"Test" butonuna tıkla**

### Yöntem 2: Cloud Scheduler (Alternatif)

1. **Cloud Console'a git:**
   https://console.cloud.google.com/cloudscheduler?project=yatirimv3

2. **fetchTefasDataFromHangikredi job'ını bul**

3. **"RUN NOW" butonuna tıkla**

   ⚠️ **Not:** Bu yöntem şu anki hafta için çalışır (2026-W01), çünkü `getISOWeekId()` kullanıyor.

## 📊 Beklenen Sonuç

- ✅ 13/13 TEFAS fonu için veri çekilecek
- ✅ Chart'tan gerçek haftalık return hesaplanacak
- ✅ Database'e yazılacak (merge: true)
- ✅ Yahoo verileri korunacak
- ✅ Null olan TEFAS verileri doldurulacak

## 📋 Veriler

| Fon | Weekly Return | Open | Close |
|-----|---------------|------|-------|
| NVB | 0.4340% | 3.7729 | 3.7893 |
| DCB | 0.4098% | 3.7235 | 3.7387 |
| HDA | 0.4893% | 2.5673 | 2.5799 |
| ... | ... | ... | ... |

