# Trendyol Yorum Çekme & Gösterim Sistemi — Tasarım Spec'i

- **Tarih:** 2026-09-08
- **Durum:** Onaylandı (brainstorming aşaması tamamlandı, implementasyon planı bekliyor)

## 1. Amaç ve Kapsam

Kullanıcının Trendyol'da satıcı olarak sahip olduğu ürünlerin müşteri yorumlarını otomatik olarak çekip, kendi (mevcut) web sitesine bir widget veya REST API üzerinden entegre etmek. Yorumlar **gerçek veridir** (Trendyol'dan canlı çekilir, üretilmez/simüle edilmez). Sistem; yıldız, tarih, fotoğraf varlığı, anahtar kelime ve sıralama bazlı filtreleme sunar ve basit bir admin panelden yönetilir.

**Kapsam dışı (bu spec'te ele alınmayan):**
- Trendyol dışındaki pazaryerlerinden (Hepsiburada, Amazon vb.) yorum çekme
- Sahte/duplicate yorum tespiti için makine öğrenmesi tabanlı filtreleme (gerekirse ayrı bir spec)
- Otomatik e2e test altyapısı (ilk sürümde manuel test yeterli)
- Silinen/düzenlenen yorumların Trendyol tarafında senkronize takibi (ilk sürümde sadece yeni yorum ekleme)

## 2. Kullanım Senaryosu

Kullanıcı Trendyol'da satıcı; kendi ürünlerinin yorumlarını mevcut web sitesinde göstermek istiyor (sosyal kanıt / güven unsuru). Site teknolojisi esnek olduğundan, entegrasyon hem gömülebilir bir JS widget'ı hem de doğrudan tüketilebilir bir REST API olarak sunulacak.

## 3. Mimari Genel Bakış

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Scraper Worker  │────▶│   PostgreSQL DB   │◀────│   Admin Panel    │
│ (zamanlı görev)  │     │ (products,        │     │  (Next.js sayfa) │
└─────────────────┘     │  reviews,         │     └─────────────────┘
                         │  scrape_logs)     │
                         └────────┬──────────┘
                                  │
                         ┌────────▼──────────┐
                         │   REST API         │
                         │ (Next.js API route)│
                         └────────┬──────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                            │
           ┌────────▼────────┐         ┌─────────▼────────┐
           │ Embeddable Widget│         │ Doğrudan API      │
           │ (herhangi bir site│         │ tüketimi (mevcut  │
           │  <script> ile)    │         │ site kendi UI'ı   │
           └──────────────────┘         │ ile render eder)  │
                                         └───────────────────┘
```

**Tek dil / tek repo:** Node.js + TypeScript. Next.js hem API route'ları hem admin panel sayfalarını barındırır. Scraper worker aynı repoda ayrı bir script/servis olarak çalışır (cron ile tetiklenir).

**Önerilen stack:**
- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- node-cron veya sistem cron'u (deployment ortamına göre) ile zamanlanmış scraping
- Zod ile API girdi/çıktı doğrulama

## 4. Veri Modeli

```prisma
model Product {
  id                String   @id @default(cuid())
  trendyolProductId String   @unique
  trendyolUrl       String
  name              String
  isTracked         Boolean  @default(true)
  lastScrapedAt     DateTime?
  createdAt         DateTime @default(now())
  reviews           Review[]
  scrapeLogs        ScrapeLog[]
}

model Review {
  id               String   @id @default(cuid())
  productId        String
  product          Product  @relation(fields: [productId], references: [id])
  trendyolReviewId String   @unique
  rating           Int      // 1-5
  comment          String
  authorName       String
  hasPhoto         Boolean  @default(false)
  photoUrls        String[] @default([])
  reviewDate       DateTime
  helpfulCount     Int      @default(0)
  isApproved       Boolean  @default(true)  // admin moderasyonu
  isHidden         Boolean  @default(false) // admin tarafından gizlendi
  createdAt        DateTime @default(now())

  @@index([productId, rating])
  @@index([productId, reviewDate])
}

model ScrapeLog {
  id           String   @id @default(cuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id])
  startedAt    DateTime @default(now())
  finishedAt   DateTime?
  status       String   // "success" | "failed" | "partial"
  newReviews   Int      @default(0)
  errorMessage String?
}
```

**Notlar:**
- `trendyolReviewId` üzerindeki unique kısıt, tekrar çekimlerde dedup sağlar (sadece yeni kayıtlar eklenir, `createMany({ skipDuplicates: true })` ile).
- `isApproved` / `isHidden` alanları admin moderasyonu için; varsayılan olarak tüm gerçek yorumlar onaylı gelir, admin isterse gizler.

## 5. Scraping Stratejisi

1. **Endpoint tespiti:** Trendyol ürün detay sayfası açıldığında tarayıcı network sekmesinde yorumların çekildiği iç JSON endpoint'i (muhtemelen `public-mdc.trendyol.com` veya benzeri bir alan altında) tespit edilir. Bu endpoint resmi/dokümante değildir.
2. **Çekim akışı:** Her `Product` için, `trendyolProductId` kullanılarak sayfalı (paginated) yorum isteği yapılır; tüm sayfalar gezilerek yeni yorumlar toplanır.
3. **Nezaket kuralları:**
   - İstekler arası rastgele 1-3 saniye gecikme
   - Gerçekçi User-Agent header'ı
   - Aynı anda tek ürün işlenir (paralel istek yok) — hem risk azaltmak hem sunucuya yük bindirmemek için
4. **Zamanlama:** Cron ile her 2-4 saatte bir tüm `isTracked=true` ürünler sırayla taranır (kullanıcı "sık güncelleme" istediği için).
5. **Hata toleransı:** Bir ürünün çekimi başarısız olursa `ScrapeLog`'a `status: failed` ve hata mesajı yazılır, sıradaki ürüne geçilir (tek ürün hatası tüm taramayı durdurmaz).
6. **Exponential backoff:** Trendyol 429/403 dönerse istek artan gecikmelerle (örn. 5s, 15s, 45s) yeniden denenir; 3 denemeden sonra o ürün için tarama başarısız sayılır ve bir sonraki zamanlı çalıştırmaya bırakılır.

## 6. REST API

Base: `/api/v1`

| Endpoint | Açıklama |
|---|---|
| `GET /products/:id/reviews` | Filtrelenmiş/sayfalanmış yorum listesi |
| `GET /products/:id/summary` | Ortalama puan, toplam yorum sayısı, yıldız dağılımı (1-5 her biri için sayı) |

**`GET /products/:id/reviews` query parametreleri:**

| Param | Tip | Açıklama |
|---|---|---|
| `stars` | `1,2,3,4,5` (virgülle çoklu) | Belirli yıldız değerlerine filtrele |
| `dateFrom`, `dateTo` | ISO tarih | Tarih aralığı |
| `hasPhoto` | `true/false` | Sadece fotoğraflı/fotoğrafsız yorumlar |
| `q` | string | Yorum metninde anahtar kelime arama |
| `sort` | `newest`\|`oldest`\|`mostHelpful`\|`longest` | Sıralama (varsayılan: `newest`) |
| `page`, `pageSize` | int | Sayfalama (varsayılan `pageSize=20`, max `100`) |

Yanıt sadece `isApproved=true AND isHidden=false` yorumları döner (admin moderasyonu API seviyesinde uygulanır). Geçersiz parametrelerde `400 Bad Request` + hata detayı.

## 7. Embeddable Widget

- Tek `<script src=".../widget.js" data-product-id="...">` etiketiyle herhangi bir siteye eklenir.
- Widget kendi stilini bir `<iframe>` veya Shadow DOM içinde izole eder ki host sitenin CSS'i ile çakışmasın.
- Widget içinde: ortalama puan özeti, yıldız dağılım grafiği, filtre kontrolleri (yıldız checkbox'ları, tarih seçici, "sadece fotoğraflı" toggle, arama kutusu, sıralama dropdown'ı), sayfalanmış yorum listesi.
- Widget doğrudan `GET /api/v1/products/:id/reviews` ve `/summary` endpoint'lerini tüketir; state tamamen client-side.

## 8. Admin Panel

Basit, tek-kullanıcı admin paneli (`/admin` altında, env-based şifre veya basit session auth ile korunur):

- **Ürün Yönetimi:** Trendyol ürün URL'si yapıştırarak ürün ekleme (`trendyolProductId` URL'den parse edilir), ürünü takipten çıkarma (`isTracked=false`).
- **Yorum Moderasyonu:** Ürün bazlı yorum listesi, her yorumda "gizle/göster" toggle'ı.
- **Scraper İzleme:** Son çalıştırma zamanları, başarı/hata durumları, hata mesajları (`ScrapeLog` tablosundan).

## 9. Hata Yönetimi & Dayanıklılık

- Scraper: yukarıda 5. bölümde açıklanan izole retry + backoff.
- API: standart HTTP durum kodları (400 geçersiz parametre, 404 ürün bulunamadı, 500 beklenmeyen hata); tüm yanıtlar tutarlı JSON hata formatında (`{ error: { code, message } }`).
- Widget: API'den hata dönerse kullanıcıya sessiz bir "yorumlar şu an yüklenemiyor" mesajı gösterilir, widget host sayfayı bozmaz (try/catch ile izole).

## 10. Risk ve Kısıtlar

- **ToS riski:** Trendyol'un resmi/public bir yorum API'si yoktur. Bu sistem dokümante edilmemiş iç endpoint'leri kullanacağından Trendyol'un kullanım şartlarına aykırı olabilir. Kendi ürünleriniz için düşük hacimli, nazik istek pattern'i (bkz. bölüm 5) riski azaltır ama sıfırlamaz.
- **Kırılganlık:** Trendyol'un iç API yapısı önceden haber verilmeden değişebilir; bu durumda scraper parser'ının güncellenmesi gerekir. `ScrapeLog` üzerinden bu tür arızalar admin panelde görünür olacak şekilde tasarlandı.
- **IP kısıtlaması:** Sık ve/veya tespit edilebilir pattern'li istekler IP engellemesine yol açabilir. Gerekirse ileride proxy rotasyonu değerlendirilebilir (ilk sürüm kapsamında değil).

## 11. Test Stratejisi

- **Unit testler:** Scraper'ın JSON parse mantığı, sabit (fixture) örnek API yanıtlarıyla test edilir (gerçek ağ isteği yapılmaz).
- **Entegrasyon testleri:** API filtreleme mantığı (yıldız, tarih, fotoğraf, arama, sıralama, sayfalama) test DB'sine seed edilen örnek yorumlarla doğrulanır.
- **Manuel test:** Widget'ın gerçek bir HTML sayfasına gömülüp görsel/işlevsel kontrolü (otomatik e2e ilk sürüm kapsamında değil).

## 12. Aşamalı Teslim Planı (öneri, implementasyon planında detaylandırılacak)

1. **Faz 1 — Çekirdek:** DB şeması, scraper (tek ürün için manuel tetiklenebilir), temel API (filtresiz liste).
2. **Faz 2 — Filtreleme:** Tüm filtre/sıralama parametreleri, `/summary` endpoint'i.
3. **Faz 3 — Widget:** Embeddable JS widget, filtre UI'ı.
4. **Faz 4 — Admin Panel:** Ürün yönetimi, yorum moderasyonu, scraper izleme.
5. **Faz 5 — Zamanlama & Dayanıklılık:** Cron entegrasyonu, retry/backoff, ScrapeLog izleme.

## 13. Açık Kalan Kararlar (implementasyon planı öncesi netleşecek)

- Trendyol'un tam iç API endpoint yapısı ve response şeması (implementasyon başında gerçek bir ürün sayfası incelenerek tespit edilecek).
- Deployment ortamı (VPS/cron mu, yoksa managed bir platform mu) — mevcut sitenin barındığı ortama göre belirlenecek.
- Admin auth yöntemi (basit şifre mi, tam kullanıcı sistemi mi) — tek kullanıcı olduğu için basit tutulacak, implementasyon planında netleştirilecek.
