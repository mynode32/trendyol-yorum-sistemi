"use strict";(()=>{function o(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}async function d(e,i){let{apiBaseUrl:n,productId:t}=i;e.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';try{let[r,l]=await Promise.all([fetch(`${n}/api/v1/products/${t}/summary`),fetch(`${n}/api/v1/products/${t}/reviews`)]),s=await r.json(),m=await l.json();e.innerHTML=`
      <div class="ty-widget">
        <div class="ty-widget__summary">Ortalama Puan: ${s.averageRating.toFixed(1)} (${s.totalReviews} yorum)</div>
        <ul class="ty-widget__list">
          ${m.data.map(a=>`
            <li class="ty-widget__item">
              <strong>${o(String(a.rating))}\u2605</strong> ${o(a.authorName)}: ${o(a.comment)}
            </li>`).join("")}
        </ul>
      </div>
    `}catch(r){e.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>'}}function c(){var r;let e=document.currentScript,i=e==null?void 0:e.dataset.productId,n=(r=e==null?void 0:e.dataset.apiBaseUrl)!=null?r:e!=null&&e.src?new URL(e.src,window.location.href).origin:window.location.origin;if(!i){console.error("[ty-widget] data-product-id \xF6zniteli\u011Fi eksik");return}let t=document.createElement("div");t.id=`ty-widget-${i}`,e==null||e.insertAdjacentElement("afterend",t),d(t,{apiBaseUrl:n,productId:i})}c();})();
