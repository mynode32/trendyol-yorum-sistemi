// Public v1 uçları (yorum listesi + özet) gömülebilir widget tarafından üçüncü taraf
// sitelerden çapraz-origin fetch ile tüketilir. Bu uçlar salt-okunur, kimlik doğrulaması
// gerektirmeyen ve hassas olmayan veri döndürdüğü için açık CORS politikası doğrudur.
// (Admin API'si bu politikaya dahil DEĞİLDİR.)
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
