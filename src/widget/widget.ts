import { renderReviewWidget } from "./render";

function init() {
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  const productId = scriptTag?.dataset.productId;
  const apiBaseUrl = scriptTag?.dataset.apiBaseUrl ?? window.location.origin;

  if (!productId) {
    console.error("[ty-widget] data-product-id özniteliği eksik");
    return;
  }

  const container = document.createElement("div");
  container.id = `ty-widget-${productId}`;
  scriptTag?.insertAdjacentElement("afterend", container);

  renderReviewWidget(container, { apiBaseUrl, productId });
}

init();
