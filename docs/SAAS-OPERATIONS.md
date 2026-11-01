# SaaS Operasyon Rehberi

Bu rehber yalnız yetkili operatörler içindir. Komutlar production'a bağlanmadan
önce hedef ortam ve `DIRECT_URL` doğrulanarak çalıştırılır. Secret değerleri
asla terminal çıktısına, ticket'a veya Git'e kopyalanmaz.

## Yeni müşteri daveti

```bash
npm run invite:create -- <email> <hesap-adı> <https://uygulama-adresi> [STARTER|PRO]
```

- Davet bağlantısı 7 gün geçerlidir ve yalnız bir kez kullanılabilir.
- Link yalnız hedef müşteriye güvenilir bir kanaldan iletilir.
- Davet kullanılınca müşteri kendi şifresini belirler; operatör şifre görmez.

## Plan değişikliği

```bash
npm run plan:change -- <hesap-sahibi-email> <LEGACY|STARTER|PRO>
```

Komut, hesabın mevcut ürün sayısı yeni plan kotasını aşıyorsa değişikliği
reddeder. Mevcut müşteri için `LEGACY` planı kotasızdır; açık müşteri onayı
olmadan planı değiştirmeyin.

## Production'a SaaS sürümü çıkarma

1. Supabase backup/PITR etkin ve güncel olmalı.
2. Ayrı test veritabanında tüm migration'lar uygulanmalı.
3. CI; migration, test, lint ve build adımlarını yeşil tamamlamalı.
4. Deploy sonrası bir test hesabında: davet açma, hesap oluşturma, login, ürün
   ekleme, widget API ve analytics kontrol edilmeli.
5. Mevcut müşteri hesabının `LEGACY` planında olduğu; ürün, widget ve scraper
   akışının değişmediği doğrulanmalı.

## Geri alma

Yeni migration'ı geri almak yerine uygulama düzeltmesiyle ileri düzeltme tercih
edilir. Plan veya davet sorunu olduğunda deploy geri alınabilir; mevcut hesap,
ürün ve yorum verileri silinmez.
