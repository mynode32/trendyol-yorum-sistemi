# Trendyol Yorum Sistemi — Geliştirme Yol Haritası

Bu belge, projenin uçtan uca (performans, güvenlik, kod kalitesi, kullanılabilirlik,
veri doğruluğu, operasyonel dayanıklılık, ölçeklenebilirlik) incelenmesinden
çıkan kanıta dayalı bulguları ve önceliklendirilmiş bir eylem planını içerir.
**Hiçbir kod değişikliği yapılmadan** hazırlanmıştır — mevcut multi-tenant
izolasyonu, widget davranışı ve scraper mimarisi korunmalıdır.

Tarih: 2026-09-11/12 oturumu. Önceki turlarda zaten çözülmüş kalemler (✅) ve
onay bekleyen kalemler (⏳) ayrıca işaretlendi.

---

## Yönetici özeti

Sistem küçük ölçekte (1 müşteri, 38 ürün, 269 yorum) sağlam çalışıyor: multi-tenant
izolasyonu her route'ta tutarlı, widget XSS'e karşı doğru şekilde korunmuş, oturum
yönetimi (HMAC + timing-safe compare + httpOnly/secure/sameSite=strict cookie)
sağlam. Bu turda **iki somut güvenlik açığı** (giriş zamanlama yan kanalı, Vercel'de
işe yaramayan bellek-içi rate limiter) ve **operasyonel görünürlük eksiklikleri**
(yedekleme durumu doğrulanamadı, uygulama hatası için proaktif izleme yok) tespit
edildi. Ölçeklenebilirlik riskleri şimdilik düşük etkili ama büyüme ile ciddileşecek
kalemler (sayfalamasız ürün listesi, tek scraper makinesi = tek arıza noktası).

---

## 1. Güvenlik

### 1.1 Giriş zamanlama yan kanalı (kullanıcı numaralandırma) — **P1**
- **Konum:** `src/app/api/admin/login/route.ts:45`
- **Kanıt:** `const passwordValid = user ? await verifyPassword(...) : false;` —
  kullanıcı DB'de yoksa bcrypt karşılaştırması hiç çalışmıyor (mikrosaniyeler),
  kullanıcı varsa ama şifre yanlışsa bcrypt çalışıyor (bcrypt cost=10 ile ~50-100ms).
  Bu süre farkı, dışarıdan bir e-postanın sistemde kayıtlı olup olmadığını ölçülebilir
  hale getiriyor.
- **Risk:** Orta — hesap numaralandırma saldırısı; şifre kırma değil ama hangi
  e-postaların gerçek müşteri hesabı olduğunu ifşa eder.
- **Öneri:** Kullanıcı bulunamasa bile sabit bir dummy hash'e karşı `verifyPassword`
  çağrısı yapılmalı (süre her koşulda eşitlenir).
- **Efor:** Çok düşük (birkaç satır).

### 1.2 Bellek-içi rate limiter, Vercel serverless'te etkisiz — **P1**
- **Konum:** `src/lib/auth/rateLimit.ts` (`attemptsByKey = new Map()`)
- **Kanıt:** Vercel serverless fonksiyonları eş zamanlı istekler için birden fazla
  izole process/instance açar; her instance'ın kendi belleği vardır. "15 dakikada
  5 deneme" sınırı yalnızca AYNI sıcak instance'a düşen istekler için geçerli —
  paralel/dağıtık bir brute-force denemesi bu sınırı büyük ölçüde atlatabilir.
- **Risk:** Orta-Yüksek — login endpoint'i pratikte rate-limit'siz kalabilir.
- **Öneri:** Kalıcı bir depoya (Supabase'in kendisinde bir tablo, ya da Vercel
  KV/Upstash Redis gibi harici bir hizmet) taşımak. En düşük efor: Postgres'te
  basit bir `LoginAttempt` tablosu (zaten Prisma bağlantısı var, yeni altyapı
  gerekmez).
- **Efor:** Orta — yeni tablo + migration + route güncellemesi.

### 1.3 `npm audit`: 3 yüksek önem dereceli, yalnızca build-time — **P2**
- **Konum:** `prisma` paketi (dependencies, `postinstall`/`build` script'i için) →
  `@prisma/config` → `deepmerge-ts <8.0.0` (stack exhaustion, GHSA-ggr8-5vv4-36mx).
- **Kanıt:** `npm audit --omit=dev` çıktısı. Bu, çalışma zamanında istek işleyen
  `@prisma/client`'ı değil, yalnızca build/migrate sırasında kullanılan `prisma`
  CLI'yi etkiliyor — canlı HTTP isteğiyle tetiklenemez.
- **Risk:** Düşük (üretim trafiğine açık değil) ama build pipeline'ı etkiler.
- **Öneri:** `npm audit fix --force` prisma'yı 6.12.0'a düşürüyor (breaking) —
  bunu körlemesine çalıştırma; üst akışta düzeltme (deepmerge-ts ≥8.0.0'ı
  gerektiren bir prisma sürümü) çıkana kadar izlemeye al.
- **Efor:** Düşük (izleme), üst akış düzeltmesi çıkınca güncelleme orta efor.

### 1.4 Widget XSS koruması — **doğrulandı, güvenli (dokunma)**
- **Konum:** `src/widget/render.ts` — `escapeHtml()` yorum metni, yazar adı ve
  fotoğraf URL'lerine tutarlı uygulanmış; detay modalında `textContent` kullanılıyor
  (en güvenli seçenek). CSS accent rengi `style.setProperty` ile ayarlanıyor
  (string enjeksiyonu değil, CSSOM API — güvenli).
- **Not:** `photoUrls` için `http(s)://` şema doğrulaması yok — teorik olarak
  `javascript:` URI'si `<img src>`'e girebilir (tarayıcılar bunu genelde
  çalıştırmaz ama savunma derinliği için önerilir). **Risk seviyesi: Çok düşük,
  P3.**

### 1.5 Multi-tenant izolasyonu — **doğrulandı, sağlam (dokunma)**
- Önceki oturumda tespit edilen "hesap sahipliği doğrulama sorgusu" tekrarı
  (`prisma.product.findFirst({ where: { id, accountId } })`) — kod tekrarı olsa
  da her route'ta **tutarlı ve doğru** uygulanmış, testlerle ("başka hesaba ait
  ürün için 404" senaryosu) korunuyor. Birleştirme önerisi hâlâ geçerli ama güvenlik
  riski değil, bakım kolaylığı meselesi (bkz. Kod Kalitesi #3.1).

### 1.6 CSRF — **doğrulandı, korunuyor (dokunma)**
- `ty_admin_session` cookie'si `sameSite: "strict"` — modern tarayıcılarda
  cross-site state-changing isteklere karşı güçlü koruma sağlıyor, ayrı bir CSRF
  token mekanizması gerekmiyor.

---

## 2. Operasyonel dayanıklılık

### 2.1 Supabase yedekleme/PITR durumu — **doğrulanamadı, P1**
- **Kanıt:** `docs/production-runbook.md:27` şunu **talimat** olarak yazıyor:
  "Yönetilen PostgreSQL sağlayıcısında günlük yedekleme ve point-in-time recovery
  **etkinleştirilmelidir**" — bu bir onay değil, bir hatırlatma. Supabase
  dashboard'a erişimim yok, gerçekten etkin mi kontrol edemedim.
- **Risk:** Yüksek (doğrulanana kadar) — etkin değilse, bir veri kaybı olayında
  (yanlışlıkla `deleteMany()`, veritabanı bozulması) geri dönüş imkânı olmaz.
- **Öneri:** Supabase Project Settings → Database → Backups sekmesini kontrol et;
  günlük yedekleme yoksa (ücretsiz katmanda olabilir) plan yükseltmeyi değerlendir.
- **Efor:** Kontrol: 5 dakika. Aylık `pg_restore` tatbikatı: runbook'ta zaten
  öneriliyor ama yapıldığına dair kanıt yok.

### 2.2 Uygulama hatası için proaktif izleme yok — **P2**
- **Kanıt:** `package.json`'da Sentry/Datadog/LogRocket vb. hiçbir APM/hata izleme
  paketi yok. Tek alarm mekanizması `SCRAPE_ALERT_WEBHOOK_URL` — yalnızca scraper
  başarısızlıklarını kapsıyor, admin API'sindeki veya widget API'sindeki
  hataları değil. Bu oturumda Vercel'in kendi runtime error log'larını manuel
  sorgulayarak Playwright/Vercel çakışmasını (bkz. #4.1) keşfettim — bu, o hatanın
  aylarca fark edilmeden kalabileceğini gösteriyor.
- **Risk:** Orta — production hataları sessizce birikebilir.
- **Öneri:** Vercel'in kendi "Monitoring" entegrasyonlarından birini (ör. ücretsiz
  katmanlı bir hata izleme servisi) admin API route'larına eklemek — düşük efor,
  yüksek görünürlük kazancı.
- **Efor:** Düşük-Orta.

### 2.3 `/api/admin/health` dış izleme araçlarıyla uyumsuz — **P3**
- **Kanıt:** `src/proxy.ts` matcher'ı `/api/admin/:path*`'i kapsıyor, yani health
  endpoint'i de oturum gerektiriyor. Route'un kendi yorumu "izleme sistemlerinin
  de oturumla çağırabileceği" diyor — ama tipik dış uptime-monitoring servisleri
  (UptimeRobot, Better Uptime vb.) interaktif login yapamaz, statik bir API
  key/URL bekler.
- **Risk:** Düşük — şu an zaten harici bir izleme servisi kullanılmıyor
  (varsayım), ama ileride biri eklenmek istendiğinde bu tasarım engel olur.
- **Öneri:** Ayrı bir API-key korumalı (session değil) `/api/public/health` ucu
  ya da mevcut endpoint'e bir bypass secret eklemek. **Davranış değişikliği —
  ayrı onay gerektirir.**

### 2.4 Tek scraper makinesi = tek arıza noktası — **P2 (bilinen, belgelenmiş)**
- **Kanıt:** `docs/production-runbook.md` ve önceki commit mesajları zaten bunu
  belgelemiş: tüm hesapların taraması tek bir Windows makinesinde, sıralı
  çalışıyor. Bu makine çökerse/kapanırsa tüm müşteriler için tarama durur,
  fark edilmesi `/api/admin/health`'in 8 günlük eşiğine kadar gecikebilir.
- **Risk:** Orta — büyüme ile birlikte artan risk, şu an (1 müşteri) düşük etkili.
- **Öneri:** Kısa vadede: makine için bir "hayattayım" heartbeat + harici izleme
  (ör. her scheduler koşusunda health-check ping). Uzun vadede: ikinci bir
  residential-IP worker makinesi. **Mimari değişiklik — ayrı planlama gerektirir,
  bu turda uygulanmadı.**

### 2.5 Manuel "Tara" / toplu içe aktarma Vercel'de kırık — ⏳ **plan önceki turda sunuldu, onay bekliyor**
- Playwright, Vercel serverless'te çalışmıyor + Vercel'in datacenter IP'si muhtemelen
  Trendyol tarafından engellenir (GitHub Actions'da kanıtlanmış aynı sorun). İki
  seçenek (Windows makinesine yönlendirme / Vercel'den kaldırma) önceki turda
  karşılaştırıldı, henüz karar verilmedi.

---

## 3. Kod kalitesi

### 3.1 Hesap-sahipliği sorgu tekrarı — ⏳ **önceki turda tespit edildi, konsolidasyon onay bekliyor**
- 5+ route dosyasında birebir aynı `prisma.product.findFirst({ where: { id,
  accountId }, select: { id: true } })` deseni. Güvenlik riski değil (tutarlı
  uygulanmış) ama bakım maliyeti — yeni bir route eklendiğinde deseni unutma
  riski var. Güçlü test kapsamıyla, ayrı bir PR'da birleştirilmesi önerilir.

### 3.2 Ölü kod / kullanılmayan varlıklar — ✅ **önceki turda temizlendi**
- 4 tek seferlik enwood migration script'i, 5 varsayılan SVG, kullanılmayan
  `.alert-success` CSS kuralı, CI'daki eski `ADMIN_PASSWORD` değişkeni — hepsi
  silindi, CI yeşil.

### 3.3 `FRONTEND.md` güncelliğini yitirmiş — **doğrulandı, P3**
- Doküman hâlâ eski admin panel yapısını (Analytics/Ayarlar sayfaları, `_components`
  klasörü yok) ve yanlış satır sayısı (~520 vs gerçek 779) içeriyor. Kod riski yok,
  sadece yeni katılan birini yanıltabilir.

### 3.4 `@vitejs/plugin-react` kullanılmayan devDependency — **doğrulanamadı tam kesin, P3**
- Hiçbir `.test.tsx` yok, `vitest.config.ts` kullanmıyor — muhtemelen gereksiz,
  ama dolaylı bir gereksinim olup olmadığı `npm ls` ile teyit edilmeden
  kaldırılmamalı.

---

## 4. Performans (önceki iki turda derinlemesine incelendi — özet)

| Bulgu | Durum |
|---|---|
| Vercel `iad1` ↔ Supabase `ap-southeast-1` bölge uyuşmazlığı | ✅ **Çözüldü** — Vercel `sin1`'e taşındı, canlıda ölçüldü: admin API'leri artık istikrarlı ~300-380ms (önceki tahmini 750ms+'den güçlü iyileşme) |
| Widget public API'lerinde HTTP cache yokluğu | ✅ **Çözüldü** — `s-maxage=60, stale-while-revalidate=300` eklendi, canlıda MISS→HIT ve 314ms→76ms doğrulandı |
| Her admin isteğinde oturum DB'ye karşı yeniden doğrulanıyor | ⏳ Tespit edildi, güvenlik gereği bilinçli — dokunulmadı |
| Ürün listesi sayfalamasız (tüm veri çekilip tarayıcıda filtreleniyor) | ⏳ Tespit edildi, şu an (38 ürün) düşük etkili — ölçek riski |
| Ham `<img>` (Next/Image optimizasyonu yok) | ⏳ Tespit edildi, düşük-orta etki |
| Manuel scrape/bulk-import Vercel'de Playwright hatası | ⏳ Ayrı plan sunuldu (bkz. #2.5) |

---

## 5. Kullanılabilirlik / "yapay zekâ hissi" metin denetimi

### Grup 1 (düşük riskli metin/görsel) — ✅ **uygulandı**
- Hero card sadeleştirme, "örn. enwood" placeholder düzeltmesi, scrape-logs
  geliştirici metni kaldırma, Prisma şema yorumları sadeleştirme, "Analytics" →
  "Yorum Analizi" — hepsi canlıda doğrulandı.

### Grup 2 (davranış/veri etkileyen) — ⏳ **onay bekliyor**
- Widget varsayılan turuncu accent rengi + ham form kontrolleri (`render.ts`) —
  widget davranışını etkiler, ayrı onay gerektirir.
- Analytics sayfasındaki boş-durum metni, "Toplam Yorum" vs "Sitede Gösterilen
  Yorum" terminoloji tutarsızlığı — Analytics'e dokunmama kısıtı nedeniyle
  bekletildi.

---

## 6. Veri doğruluğu ve uyumluluk

### 6.1 Kişisel veri saklama/silme mekanizması yok — **doğrulandı, P2**
- **Kanıt:** `docs/production-runbook.md:34` yorum sahibi adı, yorum metni ve
  fotoğraf URL'lerinin kişisel veri içerebileceğini belirtiyor ve "hukuk/KVKK
  danışmanıyla belirlenmeli" diyor — ama kodda hiçbir saklama süresi (TTL),
  otomatik silme veya "bu yorumu/kullanıcıyı sil" mekanizması yok. Veriler
  süresiz saklanıyor.
- **Risk:** Orta — gerçek müşteri sayısı arttıkça ve KVKK/GDPR talepleri
  geldiğinde manuel müdahale gerekecek, otomatik bir süreç yok.
- **Öneri:** Önce hukuki değerlendirme (kapsam dışı, teknik değil), sonra
  gerekirse bir "N ay sonra otomatik anonimleştir" cron görevi. **Bu turda
  kapsam dışı — iş kararı gerektirir.**

### 6.2 Analytics ile Products sayfası arasında rakam farkı — **bilinen, belgelenmiş, dokunma**
- Analytics tüm gizlenmemiş yorumları sayar, Products sayfası yalnızca
  `isDisplayed` (vitrin sınırı `maxDisplayedReviews`) olanları — bu kasıtlı bir
  tasarım kararı, kod yorumlarında açıkça belgelenmiş. Karışıklık riski var ama
  bir hata değil; Analytics'e dokunmama kısıtı nedeniyle bu turda ele alınmadı.

---

## 7. Ölçeklenebilirlik

| Bulgu | Risk | Ne zaman ciddileşir |
|---|---|---|
| Ürün listesi API'si sayfalamasız (`findMany` limitsiz) | Düşük→Orta | ~200+ ürün/hesap |
| Tek scraper worker, tüm hesapları sıralı tarıyor | Orta | Müşteri sayısı artıp haftalık pencereye sığmayınca |
| Haftalık hacim grafiği tüm yorum satırlarını çekip JS'te kovalıyor | Düşük | ~10.000+ yorum |
| Bellek-içi rate limiter (bkz. #1.2) | Zaten şimdi geçersiz | — |

---

## Önceliklendirilmiş eylem planı

**P0 — hemen kontrol edilmeli (kod değişikliği gerektirmiyor, sadece doğrulama):**
1. Supabase yedekleme/PITR durumunu dashboard'dan kontrol et (#2.1)

**P1 — düşük efor, gerçek güvenlik/dayanıklılık kazancı (onay sonrası uygulanabilir):**
2. Giriş zamanlama yan kanalını kapat (#1.1) — birkaç satır, davranış değişikliği yok
3. Rate limiter'ı Postgres tablosuna taşı (#1.2) — yeni tablo + migration

**P2 — planlı, ayrı onay/tasarım gerektiren:**
4. Manuel Tara/bulk-import kararını ver (Seçenek A/B, #2.5)
5. Hesap-sahipliği sorgu tekrarını konsolide et (#3.1)
6. Uygulama hata izleme ekle (#2.2)
7. Kişisel veri saklama politikası için hukuki değerlendirme başlat (#6.1)

**P3 — düşük öncelik, istenirse yapılır:**
8. `FRONTEND.md` güncelle (#3.3)
9. `@vitejs/plugin-react` kaldır (doğrulama sonrası) (#3.4)
10. Widget `photoUrls` şema doğrulaması ekle (#1.4)
11. Ürün listesi sunucu-taraflı sayfalama (#4, ölçek eşiğine yaklaşınca)
12. Next/Image geçişi (#4)

**Dokunulmaması gereken (bu turda ve genel olarak, açık onay olmadan):**
- Multi-tenant `accountId` izolasyon mantığı (sağlam, test kapsamında)
- Widget XSS koruması (`escapeHtml`, doğru uygulanmış)
- CSRF koruması (`sameSite=strict`, yeterli)
- Analytics sayfası, ürün bazlı istatistikler (önceki oturumdan kalıcı kısıt)
- Scraper worker mimarisi (Windows makinesi + Task Scheduler)
- GitHub Actions scraper cron'u (kasıtlı kapalı, belgelenmiş sebep)

---

Bu belge bir rapordur — hiçbir kalemi bu belgeyi yazarken uygulamadım. Hangi
kalemlerle devam edilmesini istediğini belirt.
