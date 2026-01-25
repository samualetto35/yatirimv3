# 2026-W01 Verilerini Çekmek İçin Çözüm

## Sorun
Firebase Console'dan test yaparken "Auth required" hatası alıyorsunuz çünkü `adminTestHangikredi` authentication gerektiriyor.

## ✅ En Kolay Çözüm: Cloud Scheduler'dan Manuel Tetikleme

### Adımlar:

1. **Cloud Console'a git:**
   https://console.cloud.google.com/cloudscheduler?project=yatirimv3

2. **`fetchTefasDataFromHangikredi` job'ını bul**

3. **"RUN NOW" butonuna tıkla**

   ⚠️ **Not:** Bu scheduled function `getISOWeekId()` kullanıyor, yani şu anki hafta için çalışır. Şu an cumartesi olduğu için 2026-W01 için çalışacak!

## ✅ Alternatif: gcloud ile Curl (Authentication ile)

Eğer gcloud kuruluysa:

```bash
cd /Users/a.sametyildiz/yatirimv3/functions
./CALL_W01.sh
```

Veya manuel:

```bash
curl -m 70 -X POST https://us-central1-yatirimv3.cloudfunctions.net/adminTestHangikredi \
  -H "Authorization: bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "weekId": "2026-W01",
      "dryRun": false
    }
  }'
```

## ✅ En İyi Çözüm: Scheduled Function'ı Tetikle

Scheduled function (`fetchTefasDataFromHangikredi`) authentication gerektirmiyor ve şu anki hafta için otomatik çalışır. Cloud Scheduler'dan "RUN NOW" yapın.

