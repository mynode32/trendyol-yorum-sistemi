import { CORS_HEADERS } from "./cors";

// Public v1 review/summary/resolve uçları hesap-bazlı değil, sadece ürün id/kod
// bazlı ve kimlik doğrulaması gerektirmiyor — aynı sorgu tüm ziyaretçilere aynı
// yanıtı verir, bu yüzden paylaşımlı (CDN/Edge) önbellekleme güvenlidir.
// s-maxage=60: yanıt en fazla 60sn "taze" sayılır, bu sürede tüm ziyaretçiler
// veritabanına gitmeden CDN'den yanıt alır. stale-while-revalidate=300: süre
// dolduğunda tek bir istek arkaplanda tazelerken diğerleri en fazla 5dk daha
// bayat veriyi anında alır (aynı anda herkesin DB'ye düşmesini önler). Bu,
// moderasyon/yeni yorum değişikliklerinin widget'a yansıma gecikmesini en
// kötü ihtimalle birkaç dakikayla sınırlar — haftalık tarama döngüsüne göre
// önemsiz. Admin API'lerine KESİNLİKLE uygulanmaz.
export const PUBLIC_REVIEW_API_HEADERS = {
  ...CORS_HEADERS,
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
};
