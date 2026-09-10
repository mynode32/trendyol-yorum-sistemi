"use strict";(()=>{var q="ty-widget-styles";function _(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function P(t){if(t.querySelector(`#${q}`))return;let e=document.createElement("style");e.id=q,e.textContent=`
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
    .ty-widget__item-photo { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; }
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
  `,t.appendChild(e)}function T(t){let e=new URLSearchParams;return t.stars.size>0&&e.set("stars",[...t.stars].sort().join(",")),t.dateFrom&&e.set("dateFrom",t.dateFrom),t.dateTo&&e.set("dateTo",t.dateTo),t.hasPhoto&&e.set("hasPhoto","true"),t.q&&e.set("q",t.q),e.set("sort",t.sort),e.set("page",String(t.page)),e.toString()}function C(t){let e=t.ratingCounts;if(!e)return"";let r=Math.max(1,...[1,2,3,4,5].map(s=>{var d;return(d=e[String(s)])!=null?d:0}));return`<div class="ty-widget__rating-distribution">${[5,4,3,2,1].map(s=>{var g;let d=(g=e[String(s)])!=null?g:0,c=Math.round(d/r*100);return`
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${s}">
          <span class="ty-widget__rating-row-label">${s}\u2605</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${c}%"></span></span>
          <span class="ty-widget__rating-row-count">${d}</span>
        </div>`}).join("")}</div>`}function j(t,e){let r=[5,4,3,2,1].map(u=>`<label><input type="checkbox" data-star="${u}"> ${u}\u2605</label>`).join(""),l=e.hideFilters?"":`
      <div class="ty-widget__filters">
        <fieldset class="ty-widget__stars">${r}</fieldset>
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
      </div>`,s=e.storeUrl?`<a class="ty-widget__store-link" href="${_(e.storeUrl)}" target="_blank" rel="noreferrer">Trendyol ma\u011Fazam\u0131z\u0131 g\xF6r\xFCnt\xFCleyin \u2197</a>`:"",d=e.carousel?"ty-widget__list ty-widget__list--carousel":"ty-widget__list",c=e.carousel?"":`
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">\u2039 \xD6nceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki \u203A</button>
      </div>`;return`
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumlar\u0131</div>
      ${e.hideSummary?"":`
      <div class="ty-widget__summary">Ortalama Puan: ${t.averageRating.toFixed(1)} (${t.totalReviews} yorum)</div>
      ${C(t)}`}
      ${s}
      ${l}
      <ul class="${d}" data-role="list"></ul>
      ${c}
    </div>
  `}function Y(t){let e=Math.max(0,Math.min(5,Math.round(t))),r=5-e;return`<span class="ty-widget__item-stars">
    <span class="ty-widget__item-stars-filled">${"\u2605".repeat(e)}</span><span class="ty-widget__item-stars-empty">${"\u2606".repeat(r)}</span>
  </span>`}function U(t){return t.map(e=>{var l;let r=((l=e.photoUrls)!=null?l:[]).map(s=>`<img src="${_(s)}" alt="" loading="lazy" class="ty-widget__item-photo">`).join("");return`
        <li class="ty-widget__item">
          ${Y(e.rating)}
          <span class="ty-widget__item-author">${_(e.authorName)}:</span>
          ${_(e.comment)}
          ${r?`<div class="ty-widget__item-photos">${r}</div>`:""}
        </li>`}).join("")}function F(t,e){if(t.length===0)return'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>';let r=U(t);return e?`<div class="ty-widget__carousel-track">${r}${U(t)}</div>`:r}async function z(t,e){var E,R,L,I,M,H;let{apiBaseUrl:r,accentColor:l,hideFilters:s,storeUrl:d,carousel:c,hideSummary:g,externalRef:u,storeId:v}=e;l&&t.style.setProperty("--ty-accent",l);let o=(E=t.shadowRoot)!=null?E:t.attachShadow({mode:"open"});o.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let w=e.productId;if(!w&&u)try{let a=v?`&storeId=${encodeURIComponent(v)}`:"",n=await fetch(`${r}/api/v1/products/resolve?ref=${encodeURIComponent(u)}${a}`);n.ok&&(w=(await n.json()).id)}catch(a){}if(!w){o.innerHTML="";return}let x=encodeURIComponent(w),i={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1},S,h;try{let[a,n]=await Promise.all([fetch(`${r}/api/v1/products/${x}/summary`),fetch(`${r}/api/v1/products/${x}/reviews?${T(i)}`)]);if(!a.ok||!n.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");S=await a.json(),h=await n.json()}catch(a){o.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}o.innerHTML=j(S,{hideFilters:s,storeUrl:d,carousel:c,hideSummary:g}),P(o);let f=o.querySelector('[data-role="list"]'),k=o.querySelector('[data-role="page-info"]'),m=o.querySelector('[data-action="prev"]'),y=o.querySelector('[data-action="next"]');function $(a){if(!k||!m||!y)return;let n=Math.max(1,Math.ceil(a.total/a.pageSize));k.textContent=`Sayfa ${i.page} / ${n}`,m.disabled=i.page<=1,y.disabled=i.page>=n}async function p(){f.innerHTML="<li>Y\xFCkleniyor...</li>";try{let a=await fetch(`${r}/api/v1/products/${x}/reviews?${T(i)}`);if(!a.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");let n=await a.json();f.innerHTML=F(n.data,c),$(n.pagination)}catch(a){f.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}o.querySelectorAll("[data-star]").forEach(a=>{a.addEventListener("change",()=>{let n=Number(a.dataset.star);a.checked?i.stars.add(n):i.stars.delete(n),i.page=1,p()})}),(R=o.querySelector('[data-field="dateFrom"]'))==null||R.addEventListener("change",a=>{i.dateFrom=a.target.value,i.page=1,p()}),(L=o.querySelector('[data-field="dateTo"]'))==null||L.addEventListener("change",a=>{i.dateTo=a.target.value,i.page=1,p()}),(I=o.querySelector('[data-field="hasPhoto"]'))==null||I.addEventListener("change",a=>{i.hasPhoto=a.target.checked,i.page=1,p()});let b;(M=o.querySelector('[data-field="q"]'))==null||M.addEventListener("input",a=>{let n=a.target.value;b&&clearTimeout(b),b=setTimeout(()=>{i.q=n,i.page=1,p()},400)}),(H=o.querySelector('[data-field="sort"]'))==null||H.addEventListener("change",a=>{i.sort=a.target.value,i.page=1,p()}),m==null||m.addEventListener("click",()=>{i.page<=1||(i.page-=1,p())}),y==null||y.addEventListener("click",()=>{i.page+=1,p()}),f.innerHTML=F(h.data,c),$(h.pagination)}function B(){var c;let t=document.currentScript,e=t==null?void 0:t.dataset.productId,r=t==null?void 0:t.dataset.externalRef,l=t==null?void 0:t.dataset.storeId,s=(c=t==null?void 0:t.dataset.apiBaseUrl)!=null?c:t!=null&&t.src?new URL(t.src,window.location.href).origin:window.location.origin;if(!e&&!r){console.error("[ty-widget] data-product-id veya data-external-ref \xF6zniteli\u011Fi eksik");return}let d=document.createElement("div");d.id=`ty-widget-${e!=null?e:r}`,t==null||t.insertAdjacentElement("afterend",d),z(d,{apiBaseUrl:s,productId:e,externalRef:r,storeId:l,accentColor:t==null?void 0:t.dataset.accentColor,hideFilters:(t==null?void 0:t.dataset.hideFilters)==="true",storeUrl:t==null?void 0:t.dataset.storeUrl,carousel:(t==null?void 0:t.dataset.carousel)==="true",hideSummary:(t==null?void 0:t.dataset.hideSummary)==="true"})}B();})();
