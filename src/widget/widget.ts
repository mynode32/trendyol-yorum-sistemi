import { renderReviewWidget } from "./render";

function init() {
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  const productId = scriptTag?.dataset.productId;
  // externalRef: host sitenin kendi ürün kodu (örn. İdeaSoft {productStockcode}
  // gibi bir şablon değişkeni ile doldurulur). Tek bir site-geneli script her
  // ürün sayfasında doğru ürünü bulabilsin diye productId'ye alternatif olarak kullanılır.
  const externalRef = scriptTag?.dataset.externalRef;
  // storeId: müşteriye özel sabit bir etiket (örn. "enwood") — script yanlışlıkla
  // başka bir müşterinin sitesine yapıştırılırsa /resolve eşleşmeyi reddeder.
  const storeId = scriptTag?.dataset.storeId;
  // Varsayılan API kökü, script'in kendi src'sinden türetilir — widget üçüncü taraf
  // bir sitede çalıştığında host sayfanın origin'i API'nin origin'i değildir.
  // data-api-base-url verilirse o kazanır.
  const apiBaseUrl =
    scriptTag?.dataset.apiBaseUrl ??
    (scriptTag?.src
      ? new URL(scriptTag.src, window.location.href).origin
      : window.location.origin);

  if (!productId && !externalRef) {
    console.error("[ty-widget] data-product-id veya data-external-ref özniteliği eksik");
    return;
  }

  const container = document.createElement("div");
  container.id = `ty-widget-${productId ?? externalRef}`;
  scriptTag?.insertAdjacentElement("afterend", container);

  renderReviewWidget(container, {
    apiBaseUrl,
    productId,
    externalRef,
    storeId,
    accentColor: scriptTag?.dataset.accentColor,
    hideFilters: scriptTag?.dataset.hideFilters === "true",
    storeUrl: scriptTag?.dataset.storeUrl,
    carousel: scriptTag?.dataset.carousel === "true",
    hideSummary: scriptTag?.dataset.hideSummary === "true",
  });
}

init();
