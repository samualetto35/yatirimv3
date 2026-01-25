# 🔧 W02 Status Düzeltme Rehberi

## Problem
- W02 yanlışlıkla `settled` olarak işaretlenmiş
- Bu yüzden Top Gainers/Losers gözükmüyor (W02 için veri yok)

## Çözüm Seçenekleri

### Seçenek 1: Firebase Console'dan Manuel Düzeltme (En Hızlı)

1. Firebase Console'a git: https://console.firebase.google.com
2. Firestore Database → `weeks` collection → `2026-W02` document
3. `status` field'ını bul
4. Değerini `settled`'dan `upcoming` veya `open`'a değiştir
5. Kaydet

### Seçenek 2: Admin Fonksiyonu ile Düzeltme

Yeni eklenen `adminFixWeekStatus` fonksiyonunu kullan:

#### Firebase Console'dan:
```json
{
  "data": {
    "weekId": "2026-W02",
    "newStatus": "upcoming"
  }
}
```

#### CLI'den (curl):
```bash
TOKEN=$(gcloud auth print-identity-token)

curl -X POST https://us-central1-yatirimv3.cloudfunctions.net/adminFixWeekStatus \
  -H "Authorization: bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "weekId": "2026-W02",
      "newStatus": "upcoming"
    }
  }'
```

### Seçenek 3: Script ile Düzeltme (Local)

```bash
cd functions
node fixW02Status.js
```

**Not**: Bu script Firebase authentication gerektirir. Eğer çalışmazsa, Seçenek 1 veya 2'yi kullan.

---

## Kontrol Listesi

Düzeltmeden sonra kontrol et:

- [ ] `weeks/2026-W01` → status: `settled` (veya `closed`)
- [ ] `weeks/2026-W02` → status: `upcoming` veya `open` (settled DEĞİL!)
- [ ] `marketData/2026-W01` → veri var
- [ ] `marketData/2026-W02` → veri YOK (veya silinmiş)
- [ ] Frontend'de Top Gainers/Losers W01 için gösteriliyor

---

## Gelecek İçin

Bu sorunun tekrar olmaması için:

1. `settleWeek` fonksiyonunun log'larını kontrol et
2. `getISOWeekId()` fonksiyonunun doğru çalıştığından emin ol
3. Timezone ayarlarını kontrol et (Europe/Istanbul)
4. Her Cuma gecesi otomasyonların doğru çalıştığını doğrula

