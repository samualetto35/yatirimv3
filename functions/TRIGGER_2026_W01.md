# 2026-W01 Verilerini Database'e Yazmak İçin

## En Mantıklı Yöntem: Firebase Console'dan adminTestHangikredi Çağırmak

### Adımlar:

1. **Firebase Console'a git:**
   - https://console.firebase.google.com/project/yatirimv3/functions

2. **adminTestHangikredi fonksiyonunu bul ve "Test" butonuna tıkla**

3. **Test verilerini gir:**
   ```json
   {
     "weekId": "2026-W01",
     "dryRun": false
   }
   ```

4. **"Test" butonuna tıkla**

### Alternatif: Cloud Scheduler'dan Manuel Tetikleme

1. **Cloud Console'a git:**
   - https://console.cloud.google.com/cloudscheduler?project=yatirimv3

2. **fetchTefasDataFromHangikredi job'ını bul**

3. **"RUN NOW" butonuna tıkla**

### Neden adminTestHangikredi?

✅ Test fonksiyonu ama `dryRun: false` ile gerçek database'e yazıyor
✅ Detaylı log ve feedback veriyor
✅ Hata durumunda daha iyi bilgi veriyor
✅ Yahoo verilerini koruduğunu doğruluyor
✅ Week status kontrolü yapıyor

### Beklenen Sonuç:

- 13/13 TEFAS fonu için veri çekilecek
- Chart'tan gerçek haftalık return hesaplanacak
- Database'e yazılacak (merge: true)
- Yahoo verileri korunacak

