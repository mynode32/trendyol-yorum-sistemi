"use strict";(()=>{var N="ty-widget-styles";function g(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function tt(t){if(t.querySelector(`#${N}`))return;let e=document.createElement("style");e.id=N,e.textContent=`
    .ty-widget { font-family: system-ui, sans-serif; width: 100%; box-sizing: border-box; color: #1a1a1a; }
    .ty-widget *, .ty-widget *::before, .ty-widget *::after { box-sizing: border-box; }
    .ty-widget__title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--ty-accent, #ff9500); margin: 0 0 10px; }
    .ty-widget__summary { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .ty-widget__store-link { display: inline-block; font-size: 13px; color: var(--ty-accent, #ff9500);
      text-decoration: none; margin-bottom: 12px; }
    .ty-widget__store-link:hover { text-decoration: underline; }
    .ty-widget__rating-distribution { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .ty-widget__rating-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #444; }
    .ty-widget__rating-row-label { width: 24px; }
    .ty-widget__rating-row-track { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
    .ty-widget__rating-row-fill { display: block; height: 100%; background: var(--ty-accent, #ff9500); }
    .ty-widget__rating-row-count { width: 24px; text-align: right; }
    .ty-widget__item-photos { display: flex; gap: 6px; margin-top: 6px; }
    .ty-widget__item-photo { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; cursor: zoom-in; }
    .ty-widget__item { cursor: pointer; }
    .ty-widget__overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex;
      align-items: center; justify-content: center; z-index: 2147483000; padding: 20px; }
    .ty-widget__overlay[hidden] { display: none; }
    .ty-widget__modal { background: #fff; border-radius: 10px; padding: 20px; max-width: 480px; width: 100%;
      max-height: 80vh; overflow-y: auto; }
    .ty-widget__modal-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .ty-widget__modal-comment { color: #333; line-height: 1.6; white-space: pre-wrap; }
    .ty-widget__modal-photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .ty-widget__modal-photo { width: 130px; height: 130px; object-fit: cover; border-radius: 8px; cursor: zoom-in; }
    .ty-widget__modal-close { margin-top: 16px; padding: 6px 14px; border: 1px solid #ccc; border-radius: 6px;
      background: #f6f6f6; cursor: pointer; }
    .ty-widget__lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex;
      align-items: center; justify-content: center; z-index: 2147483001; padding: 20px; cursor: zoom-out; }
    .ty-widget__lightbox[hidden] { display: none; }
    .ty-widget__lightbox-img { max-width: 100%; max-height: 100%; border-radius: 8px; }
    .ty-widget__filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
      padding: 10px 12px; background: #f6f6f6; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
    .ty-widget__stars { display: flex; gap: 6px; border: none; padding: 0; margin: 0; }
    .ty-widget__stars label { display: inline-flex; align-items: center; gap: 2px; cursor: pointer; }
    .ty-widget__filters input[type="search"] { padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__filters input[type="date"] { padding: 3px 6px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__filters select { padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; }
    .ty-widget__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; min-height: 40px; }
    .ty-widget__list--carousel { overflow: hidden; padding: 6px 0 10px;
      -webkit-mask-image: linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent);
      mask-image: linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent); }
    .ty-widget__carousel-track { display: flex; gap: 14px; width: max-content;
      animation: ty-widget-scroll 32s linear infinite; }
    .ty-widget__list--carousel:hover .ty-widget__carousel-track,
    .ty-widget__list--carousel:focus-within .ty-widget__carousel-track { animation-play-state: paused; }
    @keyframes ty-widget-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .ty-widget__list--carousel .ty-widget__item { flex: 0 0 260px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      padding: 14px 16px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
    .ty-widget__list--carousel .ty-widget__item:hover { transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.14); }
    .ty-widget__item { border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; }
    .ty-widget__item-stars { display: inline-block; margin-right: 6px; letter-spacing: 1px; }
    .ty-widget__item-stars-filled { color: #ff9500; }
    .ty-widget__item-stars-empty { color: #ddd; }
    .ty-widget__item-author { font-weight: 600; }
    .ty-widget__empty, .ty-widget__error { padding: 12px; color: #666; font-style: italic; }
    .ty-widget__pagination { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 13px; }
    .ty-widget__pagination button { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px;
      background: #fff; cursor: pointer; }
    .ty-widget__pagination button:disabled { opacity: 0.4; cursor: default; }
  `,t.appendChild(e)}function W(t){let e=new URLSearchParams;return t.stars.size>0&&e.set("stars",[...t.stars].sort().join(",")),t.dateFrom&&e.set("dateFrom",t.dateFrom),t.dateTo&&e.set("dateTo",t.dateTo),t.hasPhoto&&e.set("hasPhoto","true"),t.q&&e.set("q",t.q),e.set("sort",t.sort),e.set("page",String(t.page)),e.toString()}function et(t){let e=t.ratingCounts;if(!e)return"";let n=Math.max(1,...[1,2,3,4,5].map(d=>{var s;return(s=e[String(d)])!=null?s:0}));return`<div class="ty-widget__rating-distribution">${[5,4,3,2,1].map(d=>{var m;let s=(m=e[String(d)])!=null?m:0,c=Math.round(s/n*100);return`
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${d}">
          <span class="ty-widget__rating-row-label">${d}\u2605</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${c}%"></span></span>
          <span class="ty-widget__rating-row-count">${s}</span>
        </div>`}).join("")}</div>`}function at(t,e){let n=[5,4,3,2,1].map(u=>`<label><input type="checkbox" data-star="${u}"> ${u}\u2605</label>`).join(""),l=e.hideFilters?"":`
      <div class="ty-widget__filters">
        <fieldset class="ty-widget__stars">${n}</fieldset>
        <label>Ba\u015Flang\u0131\xE7 <input type="date" data-field="dateFrom"></label>
        <label>Biti\u015F <input type="date" data-field="dateTo"></label>
        <label><input type="checkbox" data-field="hasPhoto"> Sadece foto\u011Frafl\u0131</label>
        <input type="search" data-field="q" placeholder="Yorumlarda ara...">
        <select data-field="sort">
          <option value="newest">En Yeni</option>
          <option value="oldest">En Eski</option>
          <option value="mostHelpful">En Faydal\u0131</option>
          <option value="longest">En Uzun</option>
        </select>
      </div>`,d=e.storeUrl?`<a class="ty-widget__store-link" href="${g(e.storeUrl)}" target="_blank" rel="noreferrer">Trendyol ma\u011Fazam\u0131z\u0131 g\xF6r\xFCnt\xFCleyin \u2197</a>`:"",s=e.carousel?"ty-widget__list ty-widget__list--carousel":"ty-widget__list",c=e.carousel?"":`
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">\u2039 \xD6nceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki \u203A</button>
      </div>`;return`
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumlar\u0131</div>
      ${e.hideSummary?"":`
      <div class="ty-widget__summary">Ortalama Puan: ${t.averageRating.toFixed(1)} (${t.totalReviews} yorum)</div>
      ${et(t)}`}
      ${d}
      ${l}
      <ul class="${s}" data-role="list"></ul>
      ${c}
    </div>
  `}function Q(t){let e=Math.max(0,Math.min(5,Math.round(t))),n=5-e;return`<span class="ty-widget__item-stars">
    <span class="ty-widget__item-stars-filled">${"\u2605".repeat(e)}</span><span class="ty-widget__item-stars-empty">${"\u2606".repeat(n)}</span>
  </span>`}function O(t){return t.map(e=>{var l;let n=((l=e.photoUrls)!=null?l:[]).map(d=>`<img src="${g(d)}" alt="" loading="lazy" class="ty-widget__item-photo">`).join("");return`
        <li class="ty-widget__item" data-review-id="${g(e.id)}">
          ${Q(e.rating)}
          <span class="ty-widget__item-author">${g(e.authorName)}:</span>
          ${g(e.comment)}
          ${n?`<div class="ty-widget__item-photos">${n}</div>`:""}
        </li>`}).join("")}function it(){return`
    <div class="ty-widget__overlay" data-role="detail-overlay" hidden>
      <div class="ty-widget__modal">
        <div class="ty-widget__modal-header" data-role="modal-header"></div>
        <div class="ty-widget__modal-comment" data-role="modal-comment"></div>
        <div class="ty-widget__modal-photos" data-role="modal-photos"></div>
        <button type="button" class="ty-widget__modal-close" data-action="close-detail">Kapat</button>
      </div>
    </div>
    <div class="ty-widget__lightbox" data-role="lightbox-overlay" hidden>
      <img class="ty-widget__lightbox-img" data-role="lightbox-img" alt="Yorum foto\u011Fraf\u0131">
    </div>`}function V(t,e){if(t.length===0)return'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>';let n=O(t);return e?`<div class="ty-widget__carousel-track">${n}${O(t)}</div>`:n}async function X(t,e){var U,F,P,j,C,Y,B;let{apiBaseUrl:n,accentColor:l,hideFilters:d,storeUrl:s,carousel:c,hideSummary:m,externalRef:u,storeId:E}=e;l&&t.style.setProperty("--ty-accent",l);let o=(U=t.shadowRoot)!=null?U:t.attachShadow({mode:"open"});o.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let f=e.productId;if(!f&&u)try{let a=E?`&storeId=${encodeURIComponent(E)}`:"",i=await fetch(`${n}/api/v1/products/resolve?ref=${encodeURIComponent(u)}${a}`);i.ok&&(f=(await i.json()).id)}catch(a){}if(!f){o.innerHTML="";return}let v=encodeURIComponent(f),r={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1},k,h;try{let[a,i]=await Promise.all([fetch(`${n}/api/v1/products/${v}/summary`),fetch(`${n}/api/v1/products/${v}/reviews?${W(r)}`)]);if(!a.ok||!i.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");k=await a.json(),h=await i.json()}catch(a){o.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}o.innerHTML=at(k,{hideFilters:d,storeUrl:s,carousel:c,hideSummary:m})+it(),tt(o);let y=o.querySelector('[data-role="list"]'),M=o.querySelector('[data-role="page-info"]'),w=o.querySelector('[data-action="prev"]'),_=o.querySelector('[data-action="next"]'),x=o.querySelector('[data-role="detail-overlay"]'),G=o.querySelector('[data-role="modal-header"]'),K=o.querySelector('[data-role="modal-comment"]'),$=o.querySelector('[data-role="modal-photos"]'),S=o.querySelector('[data-role="lightbox-overlay"]'),H=o.querySelector('[data-role="lightbox-img"]'),R=new Map;function I(a){R=new Map(a.map(i=>[i.id,i]))}function T(a){H.src=a,S.hidden=!1}function J(){S.hidden=!0,H.src=""}function Z(a){var i;G.innerHTML=`${Q(a.rating)}<span class="ty-widget__item-author">${g(a.authorName)}</span>`,K.textContent=a.comment,$.innerHTML=((i=a.photoUrls)!=null?i:[]).map(b=>`<img src="${g(b)}" class="ty-widget__modal-photo" data-role="modal-photo" alt="">`).join(""),x.hidden=!1}function q(){x.hidden=!0}x.addEventListener("click",a=>{a.target===x&&q()}),(F=o.querySelector('[data-action="close-detail"]'))==null||F.addEventListener("click",q),S.addEventListener("click",J),$.addEventListener("click",a=>{let i=a.target.closest('[data-role="modal-photo"]');i&&T(i.src)}),y.addEventListener("click",a=>{let i=a.target,b=i.closest(".ty-widget__item-photo");if(b){T(b.src);return}let D=i.closest(".ty-widget__item[data-review-id]"),A=D?R.get(D.dataset.reviewId):void 0;A&&Z(A)});function z(a){if(!M||!w||!_)return;let i=Math.max(1,Math.ceil(a.total/a.pageSize));M.textContent=`Sayfa ${r.page} / ${i}`,w.disabled=r.page<=1,_.disabled=r.page>=i}async function p(){y.innerHTML="<li>Y\xFCkleniyor...</li>";try{let a=await fetch(`${n}/api/v1/products/${v}/reviews?${W(r)}`);if(!a.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");let i=await a.json();I(i.data),y.innerHTML=V(i.data,c),z(i.pagination)}catch(a){y.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}o.querySelectorAll("[data-star]").forEach(a=>{a.addEventListener("change",()=>{let i=Number(a.dataset.star);a.checked?r.stars.add(i):r.stars.delete(i),r.page=1,p()})}),(P=o.querySelector('[data-field="dateFrom"]'))==null||P.addEventListener("change",a=>{r.dateFrom=a.target.value,r.page=1,p()}),(j=o.querySelector('[data-field="dateTo"]'))==null||j.addEventListener("change",a=>{r.dateTo=a.target.value,r.page=1,p()}),(C=o.querySelector('[data-field="hasPhoto"]'))==null||C.addEventListener("change",a=>{r.hasPhoto=a.target.checked,r.page=1,p()});let L;(Y=o.querySelector('[data-field="q"]'))==null||Y.addEventListener("input",a=>{let i=a.target.value;L&&clearTimeout(L),L=setTimeout(()=>{r.q=i,r.page=1,p()},400)}),(B=o.querySelector('[data-field="sort"]'))==null||B.addEventListener("change",a=>{r.sort=a.target.value,r.page=1,p()}),w==null||w.addEventListener("click",()=>{r.page<=1||(r.page-=1,p())}),_==null||_.addEventListener("click",()=>{r.page+=1,p()}),I(h.data),y.innerHTML=V(h.data,c),z(h.pagination)}function ot(){var c;let t=document.currentScript,e=t==null?void 0:t.dataset.productId,n=t==null?void 0:t.dataset.externalRef,l=t==null?void 0:t.dataset.storeId,d=(c=t==null?void 0:t.dataset.apiBaseUrl)!=null?c:t!=null&&t.src?new URL(t.src,window.location.href).origin:window.location.origin;if(!e&&!n){console.error("[ty-widget] data-product-id veya data-external-ref \xF6zniteli\u011Fi eksik");return}let s=document.createElement("div");s.id=`ty-widget-${e!=null?e:n}`,t==null||t.insertAdjacentElement("afterend",s),X(s,{apiBaseUrl:d,productId:e,externalRef:n,storeId:l,accentColor:t==null?void 0:t.dataset.accentColor,hideFilters:(t==null?void 0:t.dataset.hideFilters)==="true",storeUrl:t==null?void 0:t.dataset.storeUrl,carousel:(t==null?void 0:t.dataset.carousel)==="true",hideSummary:(t==null?void 0:t.dataset.hideSummary)==="true"})}ot();})();
