"use strict";(()=>{var R="ty-widget-styles";function g(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function I(t){if(t.querySelector(`#${R}`))return;let e=document.createElement("style");e.id=R,e.textContent=`
    .ty-widget { font-family: system-ui, sans-serif; max-width: 640px; color: #1a1a1a; }
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
    .ty-widget__item { border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; }
    .ty-widget__item-rating { color: #ff9500; font-weight: 700; margin-right: 6px; }
    .ty-widget__item-author { font-weight: 600; }
    .ty-widget__empty, .ty-widget__error { padding: 12px; color: #666; font-style: italic; }
    .ty-widget__pagination { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 13px; }
    .ty-widget__pagination button { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px;
      background: #fff; cursor: pointer; }
    .ty-widget__pagination button:disabled { opacity: 0.4; cursor: default; }
  `,t.appendChild(e)}function k(t){let e=new URLSearchParams;return t.stars.size>0&&e.set("stars",[...t.stars].sort().join(",")),t.dateFrom&&e.set("dateFrom",t.dateFrom),t.dateTo&&e.set("dateTo",t.dateTo),t.hasPhoto&&e.set("hasPhoto","true"),t.q&&e.set("q",t.q),e.set("sort",t.sort),e.set("page",String(t.page)),e.toString()}function q(t){let e=t.ratingCounts;if(!e)return"";let s=Math.max(1,...[1,2,3,4,5].map(n=>{var l;return(l=e[String(n)])!=null?l:0}));return`<div class="ty-widget__rating-distribution">${[5,4,3,2,1].map(n=>{var c;let l=(c=e[String(n)])!=null?c:0,y=Math.round(l/s*100);return`
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${n}">
          <span class="ty-widget__rating-row-label">${n}\u2605</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${y}%"></span></span>
          <span class="ty-widget__rating-row-count">${l}</span>
        </div>`}).join("")}</div>`}function F(t,e){let s=[5,4,3,2,1].map(l=>`<label><input type="checkbox" data-star="${l}"> ${l}\u2605</label>`).join(""),d=e.hideFilters?"":`
      <div class="ty-widget__filters">
        <fieldset class="ty-widget__stars">${s}</fieldset>
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
      </div>`,n=e.storeUrl?`<a class="ty-widget__store-link" href="${g(e.storeUrl)}" target="_blank" rel="noreferrer">Trendyol ma\u011Fazam\u0131z\u0131 g\xF6r\xFCnt\xFCleyin \u2197</a>`:"";return`
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumlar\u0131</div>
      <div class="ty-widget__summary">Ortalama Puan: ${t.averageRating.toFixed(1)} (${t.totalReviews} yorum)</div>
      ${q(t)}
      ${n}
      ${d}
      <ul class="ty-widget__list" data-role="list"></ul>
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">\u2039 \xD6nceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki \u203A</button>
      </div>
    </div>
  `}function H(t){return t.length===0?'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>':t.map(e=>{var d;let s=((d=e.photoUrls)!=null?d:[]).map(n=>`<img src="${g(n)}" alt="" loading="lazy" class="ty-widget__item-photo">`).join("");return`
        <li class="ty-widget__item">
          <span class="ty-widget__item-rating">${g(String(e.rating))}\u2605</span>
          <span class="ty-widget__item-author">${g(e.authorName)}:</span>
          ${g(e.comment)}
          ${s?`<div class="ty-widget__item-photos">${s}</div>`:""}
        </li>`}).join("")}async function M(t,e){var v,b,S,E,L,$;let{apiBaseUrl:s,productId:d,accentColor:n,hideFilters:l,storeUrl:y}=e,c=encodeURIComponent(d);n&&t.style.setProperty("--ty-accent",n);let r=(v=t.shadowRoot)!=null?v:t.attachShadow({mode:"open"}),i={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1};r.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let f,m;try{let[a,o]=await Promise.all([fetch(`${s}/api/v1/products/${c}/summary`),fetch(`${s}/api/v1/products/${c}/reviews?${k(i)}`)]);if(!a.ok||!o.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");f=await a.json(),m=await o.json()}catch(a){r.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}r.innerHTML=F(f,{hideFilters:l,storeUrl:y}),I(r);let u=r.querySelector('[data-role="list"]'),T=r.querySelector('[data-role="page-info"]'),_=r.querySelector('[data-action="prev"]'),h=r.querySelector('[data-action="next"]');function x(a){let o=Math.max(1,Math.ceil(a.total/a.pageSize));T.textContent=`Sayfa ${i.page} / ${o}`,_.disabled=i.page<=1,h.disabled=i.page>=o}async function p(){u.innerHTML="<li>Y\xFCkleniyor...</li>";try{let a=await fetch(`${s}/api/v1/products/${c}/reviews?${k(i)}`);if(!a.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");let o=await a.json();u.innerHTML=H(o.data),x(o.pagination)}catch(a){u.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}r.querySelectorAll("[data-star]").forEach(a=>{a.addEventListener("change",()=>{let o=Number(a.dataset.star);a.checked?i.stars.add(o):i.stars.delete(o),i.page=1,p()})}),(b=r.querySelector('[data-field="dateFrom"]'))==null||b.addEventListener("change",a=>{i.dateFrom=a.target.value,i.page=1,p()}),(S=r.querySelector('[data-field="dateTo"]'))==null||S.addEventListener("change",a=>{i.dateTo=a.target.value,i.page=1,p()}),(E=r.querySelector('[data-field="hasPhoto"]'))==null||E.addEventListener("change",a=>{i.hasPhoto=a.target.checked,i.page=1,p()});let w;(L=r.querySelector('[data-field="q"]'))==null||L.addEventListener("input",a=>{let o=a.target.value;w&&clearTimeout(w),w=setTimeout(()=>{i.q=o,i.page=1,p()},400)}),($=r.querySelector('[data-field="sort"]'))==null||$.addEventListener("change",a=>{i.sort=a.target.value,i.page=1,p()}),_.addEventListener("click",()=>{i.page<=1||(i.page-=1,p())}),h.addEventListener("click",()=>{i.page+=1,p()}),u.innerHTML=H(m.data),x(m.pagination)}function P(){var n;let t=document.currentScript,e=t==null?void 0:t.dataset.productId,s=(n=t==null?void 0:t.dataset.apiBaseUrl)!=null?n:t!=null&&t.src?new URL(t.src,window.location.href).origin:window.location.origin;if(!e){console.error("[ty-widget] data-product-id \xF6zniteli\u011Fi eksik");return}let d=document.createElement("div");d.id=`ty-widget-${e}`,t==null||t.insertAdjacentElement("afterend",d),M(d,{apiBaseUrl:s,productId:e,accentColor:t==null?void 0:t.dataset.accentColor,hideFilters:(t==null?void 0:t.dataset.hideFilters)==="true",storeUrl:t==null?void 0:t.dataset.storeUrl})}P();})();
