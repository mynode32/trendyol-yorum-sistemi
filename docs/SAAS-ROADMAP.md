# SaaS Geçiş Yol Haritası

Bu plan, aktif müşterinin login, widget, analytics ve scraper akışını koruyarak
ürünü kademeli biçimde SaaS'a dönüştürür. Her faz ayrı branch, CI ve canlı
kontrol ile çıkarılır; ödeme veya kota değişikliği mevcut müşteriyi geriye dönük
etkilemez.

## Faz 1 — Plan ve kota temeli

- Hesap planları: `LEGACY`, `STARTER`, `PRO`.
- Mevcut hesaplar `LEGACY` kalır ve ürün kotasına tabi değildir.
- Yeni hesaplar `STARTER` ile açılır; ilk kota takip edilen ürün sayısıdır.
- Plan bilgisi Ayarlar ekranında yalnız bilgilendirme olarak görünür.

Çıkış koşulu: migration önce test veritabanında, sonra backup/PITR doğrulanmış
production ortamında uygulanır. Mevcut müşteri hesabının `LEGACY` kaldığı ve
ürün ekleme/widget/analytics akışının çalıştığı kontrol edilir.

## Faz 2 — Davetli onboarding

- Herkese açık kayıt açılmadan, owner'ın davet ettiği müşteri için hesap açma
  akışı hazırlanır.
- Yeni müşteri ürün URL'sini ekler, mağaza etiketi verir ve widget kodunu alır.
- İlk tarama ve widget doğrulaması açık durum mesajlarıyla izlenir.

Çıkış koşulu: yeni bir deneme hesabı ile uçtan uca kurulum yapılır; hiçbir
gerçek müşteri verisi testte kullanılmaz.

## Faz 3 — Paket yönetimi

- Plan kullanımını (ürün sayısı / kota) panelde göster.
- Plan yükseltme talebini önce manuel operasyon olarak al; ödeme entegrasyonu
  olmadan otomatik plan değiştirme yapma.
- Kota denetimlerini eşzamanlı ürün ekleme durumuna karşı transaction/lock
  tasarımıyla ayrıca güçlendir.

## Faz 4 — Ödeme ve self-service abonelik

- Türkiye için ödeme sağlayıcısı ve faturalandırma süreci ürün/hukuk kararıyla
  seçilir.
- Sağlayıcı webhook'ları imza doğrulaması, idempotency ve audit log ile işlenir.
- İptal, başarısız ödeme, deneme süresi ve erişim politikaları yazılı hale gelir.

Bu faz ayrı güvenlik değerlendirmesi olmadan başlatılmaz.

## Faz 5 — Operasyon ve ölçek

- Scraper heartbeat, backup/PITR restore tatbikatı ve hata alarmı tamamlanır.
- 200+ ürün için ürün listesinde server-side sayfalama; büyük yorum hacminde
  SQL tabanlı analytics agregasyonları eklenir.
- KVKK saklama/silme politikası ve destek/runbook süreçleri tamamlanır.

## Her production çıkışında kontrol listesi

1. CI: migration, test, typecheck, lint ve build yeşil.
2. Production backup/PITR durumu doğrulanmış.
3. Migration geri alma/ileri düzeltme planı yazılı.
4. Login, ürün listesi, analytics, widget ve scraper akışı canlıda kontrol edilmiş.
5. Mevcut müşteri hesabının planı ve kotası doğrulanmış.
