import { renderReviewWidget } from "./render";

function init() {
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  const productId = scriptTag?.dataset.productId;
  // Varsayılan API kökü, script'in kendi src'sinden türetilir — widget üçüncü taraf
  // bir sitede çalıştığında host sayfanın origin'i API'nin origin'i değildir.
  // data-api-base-url verilirse o kazanır.
  const apiBaseUrl =
    scriptTag?.dataset.apiBaseUrl ??
    (scriptTag?.src
      ? new URL(scriptTag.src, window.location.href).origin
      : window.location.origin);

  if (!productId) {
    console.error("[ty-widget] data-product-id özniteliği eksik");
    return;
  }

  const container = document.createElement("div");
  container.id = `ty-widget-${productId}`;
  scriptTag?.insertAdjacentElement("afterend", container);

  renderReviewWidget(container, {
    apiBaseUrl,
    productId,
    accentColor: scriptTag?.dataset.accentColor,
    hideFilters: scriptTag?.dataset.hideFilters === "true",
    storeUrl: scriptTag?.dataset.storeUrl,
    carousel: scriptTag?.dataset.carousel === "true",
    hideSummary: scriptTag?.dataset.hideSummary === "true",
  });
}

init();
