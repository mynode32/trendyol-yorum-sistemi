# Trendyol Yorum Endpoint Notları

Bu dosya, gerçek bir Trendyol ürün sayfası (`https://www.trendyol.com/sedefira/petek-onu-kaplama-dresuar-petek-onu-kapatma-petek-kaplama-dresuar-100luk-naturel-seperator-p-1071760667?boutiqueId=61&merchantId=1161564`) üzerinde tarayıcı DevTools/Network izleme ile keşfedilen, yorumları getiren gerçek iç API'yi belgeler. Bu endpoint dokümante/resmi değildir; Trendyol tarafından habersiz değiştirilebilir.

## URL şablonu (asıl kullanılacak endpoint)

```
GET https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed
```

Gözlemlenen tam örnek istekler:

```
https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed?contentId=1071760667&page=0&pageSize=20&order=DESC&orderBy=Score&channelId=1

https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed?contentId=1071760667&page=1&pageSize=20&order=DESC&orderBy=Score&channelId=1
```

Not: Sayfa ilk yüklendiğinde tarayıcı bu isteği hem `order`/`orderBy` parametreli hem de parametresiz (varsayılan sıralama) olarak iki kez tetikledi; her ikisi de aynı şemayla 200 döndü. `order=DESC&orderBy=Score` (en yüksek puanlılar önce) kullanmak yeterli ve stabil.

İlgili yardımcı endpoint'ler (bu görev için zorunlu değil, ama scraper ileride faydalanabilir):

- Yorum fotoğrafları listesi: `GET https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/images?channelId=1&listingId={listingId}&contentId={contentId}&page=0&order=DESC&orderBy=Score`
- Yayın kriterleri (statik metin): `GET https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/publish-criteria?channelId=1`

## Method

`GET`

## Gerekli header'lar / oturum gereksinimleri

- Özel bir custom header (API key, auth token vb.) **gerekmiyor** — istek sade bir `GET` ve `accept` header'ı bile şart değil.
- **Ancak çerezsiz (cookie'siz) bir istek başarısız oluyor.** Sayfa açıkken tarayıcı konsolundan `fetch(url)` (credentials olmadan, varsayılan `same-origin` ama bu durumda ilgili cookie'ler taşınmadan) çağrıldığında API şu hatayı döndürdü:
  ```json
  "Required country information is wrong or missing"
  ```
  Aynı istek `credentials: 'include'` ile (yani tarayıcının o an sayfada tuttuğu çerezlerle) yapıldığında `200 isSuccess:true` ile başarılı sonuç döndü. Yani API, ülke/storefront bilgisini bir **çerezden** okuyor (muhtemelen `www.trendyol.com` alan adı üzerinden set edilen bir dil/ülke/storefront çerezi). Header olarak açıkça bir `countryCode`/`storefrontId` göndermeye gerek yok — tarayıcı sayfayı bir kez normal şekilde ziyaret ettiğinde bu çerez otomatik set ediliyor.
  - **Task 5 (HTTP client) için pratik sonuç:** sunucu taraflı bir scraper bu isteği direkt "çıplak" bir HTTP client ile (cookie'siz) atarsa muhtemelen aynı "Required country information is wrong or missing" hatasını alacaktır. Ya (a) önce `https://www.trendyol.com` ana sayfasına/ürün sayfasına bir istek atıp dönen `Set-Cookie` başlıklarını bir cookie jar'da tutup sonraki isteklerde tekrar göndermek, ya da (b) standart bir tarayıcı User-Agent + `Accept-Language: tr-TR,tr;q=0.9` header'ı ile aynı davranışı tetiklemeyi denemek gerekebilir. Bu görev kapsamında hangi spesifik çerez adının kritik olduğu tek tek izole edilmedi (zaman/nezaket kısıtı); Task 5 bu noktayı doğrulamalı ve gerekirse bir "warm-up" GET isteği (ürün sayfasını çekip cookie jar'ı doldurma) uygulamalıdır.
- `User-Agent`: normal bir tarayıcı UA ile test edildi (Chrome). Farklı/boş bir UA ile davranış test edilmedi.
- CORS/Referer zorunluluğu gözlenmedi (istek tarayıcı sekmesinde `fetch()` ile page-context'ten atıldı, yani `Origin`/`Referer` doğal olarak `https://www.trendyol.com` idi). Sunucu taraflı bir client'ın `Referer: https://www.trendyol.com/...` göndermesi güvenli bir varsayım olur ama test edilmedi.
- Auth/login **gerekmiyor** — istek giriş yapılmamış (misafir) bir tarayıcı oturumunda test edildi.

## Query parametreleri

| Parametre | Örnek | Açıklama |
|---|---|---|
| `contentId` | `1071760667` | Ürünün Trendyol content/ürün ID'si (ürün URL'sindeki `-p-1071760667` kısmı) |
| `page` | `0`, `1` | **0-indeksli** sayfa numarası |
| `pageSize` | `20` | Sayfa başına yorum sayısı (tarayıcı varsayılanı 20; başka değerler test edilmedi) |
| `order` | `DESC` | Sıralama yönü |
| `orderBy` | `Score` | Sıralama kriteri (puan bazlı) |
| `channelId` | `1` | Sabit görünüyor (web kanalı) |

Body/POST parametresi yok — tamamen query-string tabanlı `GET`.

Sayfalama mantığı: `result.summary.totalPages` alanı toplam sayfa sayısını verir (bu üründe `totalPages: 2`, `totalCommentCount: 30`, `pageSize=20` → sayfa 0'da 20, sayfa 1'de 10 yorum geldi — doğrulandı, bkz. "Test edilenler").

## Yanıt şeması

Üst seviye zarf:

```json
{
  "isSuccess": true,
  "statusCode": 200,
  "result": {
    "aiSummary": "string (Trendyol'un yapay zeka özet metni, madde madde)",
    "summary": {
      "averageRating": 4.9,
      "averageRatingFixed": "4.9",
      "countries": [{ "country": "TR", "reviewsExist": true }],
      "totalRatingCount": 55,
      "totalCommentCount": 30,
      "totalPages": 2,
      "hasMediaFiles": true,
      "totalImageReviewCount": 17,
      "productSizes": [],
      "imageUrl": "string (kamera emoji ikonu URL'i)",
      "heightTags": [],
      "weightTags": [],
      "ratingCounts": [
        { "rate": 5, "count": 53, "commentCount": 30 },
        { "rate": 4, "count": 1, "commentCount": 0 }
      ],
      "tags": [
        { "name": "tümü", "count": 30 },
        { "name": "fotoğraflı", "count": 17, "imageUrl": "..." },
        { "name": "Kurulum/Kullanım", "count": 9, "sentiment": { "positive": 8, "negative": 1, "ratio": 89 } }
      ]
    },
    "reviews": [
      {
        "id": 642423344,
        "contentId": 1071760667,
        "userFullName": "G** G**",
        "showUserFullName": false,
        "isElite": false,
        "isInfluencer": false,
        "seller": { "id": 1161564, "name": "Sedefira" },
        "rate": 5,
        "comment": "Harika salonuma da alacağım bayıldım",
        "likesCount": 1,
        "language": "tr",
        "createdAt": 1781112455693,
        "lastModifiedAt": 1781112477997,
        "mediaFiles": [
          {
            "id": 139103679,
            "url": "https://cdn.dsmcdn.com/mnresize/-/820/...jpeg",
            "thumbnailUrl": "https://cdn.dsmcdn.com/mnresize/300/300/...jpeg",
            "mediaType": "IMAGE",
            "height": 4284,
            "weight": 5712
          }
        ],
        "trusted": true,
        "culture": "tr-TR",
        "sourceChannelId": 1
      }
    ]
  }
}
```

### Alan adı notları (Task 4/5 için kritik)

- Puan alanı `rate` (**`rating` değil**).
- Yorum metni alanı `comment` (**`comment` doğru, `commentText` değil**).
- Kullanıcı adı alanı `userFullName` (**`userFullName`**, çoğu zaman Trendyol tarafından zaten maskelenmiş — örn. `"G** G**"`; `showUserFullName:false` olduğunda maskeli, `true` olduğunda tam ad görünür oluyor — örn. `"Reyhan U."`, `"gözde k."`).
- Tarih alanları `createdAt` / `lastModifiedAt` — **ISO string değil, epoch milisaniye (number)** olarak geliyor (örn. `1781112455693`). Görev brief'inde varsayılan olarak belirtilen `commentDateISOtype` alan adı **yanlış/mevcut değil** — gerçek alan `createdAt` (epoch ms).
- Fotoğraf/medya alanı `mediaFiles` (bir dizi obje; her biri `url`, `thumbnailUrl`, `mediaType: "IMAGE"`, `height`, `weight` — dikkat: `weight` görsel **genişliği** için kullanılan alan adı, muhtemelen "width" yerine bir yazım/isimlendirme tercihi — birebir böyle geliyor). Foto yoksa `mediaFiles: []` boş dizi.
- "Beğeni" sayısı `likesCount` (**`helpfulCount` değil**).
- Ürün/mağaza kimliği `contentId` (ürün) ve `seller.id` / `seller.name` (satıcı).
- `id` = yorumun kendi kimliği (review ID).
- Ek alanlar: `isElite`, `isInfluencer`, `trusted`, `culture` (`"tr-TR"`), `sourceChannelId`, `language` (`"tr"`).
- `hasPhoto` diye ayrı bir boolean **yok**; foto varlığı `mediaFiles.length > 0` ile anlaşılıyor. Ürün genelinde foto sayısı `summary.totalImageReviewCount` alanında.

## Rate limit gözlemi

Bu görev kapsamında toplam **3 istek** atıldı (`page=0` iki kez — biri credentials'sız hata testi, biri başarılı; `page=1` bir kez), aralarında birkaç saniyelik doğal gecikme (tool round-trip süresi) vardı. Bu az sayıda istekte **429/403 gözlenmedi**, tüm başarılı istekler `200` döndü. Sistematik bir rate-limit testi (art arda hızlı çok sayıda istek) bilinçli olarak **yapılmadı** — nezaket kuralları gereği (plan md'deki 1-3s gecikme, paralel istek yok ilkesi) ve gerçek satıcı ürününe gereksiz yük bindirmemek için. Task 5, üretim scraper'ında konservatif bir gecikme (1-3 saniye, sıralı istekler) uygulamalı ve 429/403 durumlarını ele alacak retry/backoff mantığı eklemelidir; bu görevde bu limitler ampirik olarak doğrulanmadı.

## Test edilen / doğrulanan noktalar

- `page=0&pageSize=20&order=DESC&orderBy=Score` → 200, 20 yorum döndü (`fixtures/sample-review-response.json` bu yanıtın maskelenmiş hâlidir).
- `page=1&pageSize=20&order=DESC&orderBy=Score` → 200, kalan 10 yorum döndü (toplam 30, `totalCommentCount:30` ile tutarlı) — sayfalamanın çalıştığı doğrulandı.
- Cookie/credentials olmadan yapılan istek → `"Required country information is wrong or missing"` hatası döndü (200 değil ama `isSuccess` alanı yoktu, düz metin hata mesajıydı) — çerezin zorunlu olduğu doğrulandı.

## Kaynak fixture

Gerçek (maskelenmiş) örnek yanıt: `fixtures/sample-review-response.json` (20 yorum, `page=0` yanıtının tamamı; reviewer adları `Kullanıcı A`, `Kullanıcı B`, ... şeklinde maskelendi, bir yorumdaki Instagram kullanıcı adı da `[gizlendi]` ile maskelendi — gerisi API'den gelen ham/gerçek veri).
