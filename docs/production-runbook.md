# Production Runbook

Bu belge, uygulama web sunucusundan bağımsız çalışan scraper worker'ı için teslim kontrol listesidir.

## Worker çalıştırma

Scraper, GitHub Actions veri merkezi IP'lerinde güvenilir değildir. Residential IP'li, sürekli açık bir makine veya müşterinin kendi makinesi kullanılır. Linux üzerinde:

```bash
npm ci
npx prisma migrate deploy
npx playwright install --with-deps chromium
sudo apt-get install -y xvfb
xvfb-run -a npm run scheduler:start
```

`scheduler:start` haftada bir (Pazartesi 03:00) takipteki ürünleri sıralı tarar. Worker için process manager (systemd, PM2 veya Docker restart policy) kullanılmalıdır.

## Başarısızlık izleme

- Tek seferlik worker çalıştırması için `xvfb-run -a npm run scheduler:run-once` kullanın. En az bir ürün başarısızsa komut **exit code 1** ile biter.
- `SCRAPE_ALERT_WEBHOOK_URL` secret'ını alarm sisteminizin kabul ettiği bir webhook receiver URL'si olarak ayarlayın. Başarısız ürün olduğunda worker bu adrese `scrape.failed` olayıyla JSON POST eder.
- Yönetici oturumu ile `GET /api/admin/health` çağrısı yapın. Endpoint, sekiz günden eski taramayı (haftalık zamanlamaya bir günlük tolerans payı) veya son başarısız taramayı `503 degraded` olarak döndürür.

## Yedekleme ve geri dönüş

- Yönetilen PostgreSQL sağlayıcısında günlük yedekleme ve point-in-time recovery etkinleştirilmelidir.
- Aylık olarak boş bir veritabanında `pg_restore` ile geri yükleme testi yapılmalıdır.
- Uygulama sürümü geri alınacaksa önce sürümün mevcut migration'larla uyumluluğu kontrol edilir. Prisma migration'ları production'da geriye otomatik alınmaz.

## Veri ve gizlilik

- Yalnızca yazılı Trendyol izni veya resmî, izinli bir API ile canlı kullanım yapılmalıdır.
- Yorum sahibi adı, yorum metni ve fotoğraf URL'leri kişisel veri içerebilir. Müşteri; aydınlatma metni, saklama süresi, silme/itiraz talebi kanalı ve erişim yetkilerini hukuk/KVKK danışmanıyla belirlemelidir.
- Production secret'ları yalnızca hosting/worker secret store'da saklanır; `.env` dosyası ve git geçmişine konmaz.
