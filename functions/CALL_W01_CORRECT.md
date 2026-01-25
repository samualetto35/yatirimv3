# 2026-W01 Verilerini Çekmek İçin Doğru Komut

## Sorun
Firebase callable function'lar için `data` wrapper'ı gerekiyor!

## ❌ Yanlış Format:
```bash
curl -X POST https://us-central1-yatirimv3.cloudfunctions.net/adminTestHangikredi \
  -H "Authorization: bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "weekId": "2026-W01",
    "dryRun": false
  }'
```

## ✅ Doğru Format:
```bash
curl -X POST https://us-central1-yatirimv3.cloudfunctions.net/adminTestHangikredi \
  -H "Authorization: bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "weekId": "2026-W01",
      "dryRun": false
    }
  }'
```

## Fark
- ❌ Yanlış: `{"weekId": "...", "dryRun": false}`
- ✅ Doğru: `{"data": {"weekId": "...", "dryRun": false}}`

## Hazır Script
```bash
cd /Users/a.sametyildiz/yatirimv3/functions
./CALL_W01.sh
```

## Veya Firebase Console'dan
1. https://console.firebase.google.com/project/yatirimv3/functions
2. `adminTestHangikredi` fonksiyonunu bul
3. "Test" butonuna tıkla
4. Şu JSON'u gir (data wrapper OLMADAN - Console otomatik ekler):
   ```json
   {
     "weekId": "2026-W01",
     "dryRun": false
   }
   ```

