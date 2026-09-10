"use strict";(()=>{var H="ty-widget-styles";function m(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function F(t){if(t.querySelector(`#${H}`))return;let e=document.createElement("style");e.id=H,e.textContent=`
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
    .ty-widget__list--carousel { overflow: hidden; padding-bottom: 4px; }
    .ty-widget__carousel-track { display: flex; gap: 12px; width: max-content;
      animation: ty-widget-scroll 32s linear infinite; }
    .ty-widget__list--carousel:hover .ty-widget__carousel-track,
    .ty-widget__list--carousel:focus-within .ty-widget__carousel-track { animation-play-state: paused; }
    @keyframes ty-widget-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .ty-widget__list--carousel .ty-widget__item { flex: 0 0 260px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .ty-widget__item { border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; }
    .ty-widget__item-rating { color: #ff9500; font-weight: 700; margin-right: 6px; }
    .ty-widget__item-author { font-weight: 600; }
    .ty-widget__empty, .ty-widget__error { padding: 12px; color: #666; font-style: italic; }
    .ty-widget__pagination { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 13px; }
    .ty-widget__pagination button { padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px;
      background: #fff; cursor: pointer; }
    .ty-widget__pagination button:disabled { opacity: 0.4; cursor: default; }
  `,t.appendChild(e)}function M(t){let e=new URLSearchParams;return t.stars.size>0&&e.set("stars",[...t.stars].sort().join(",")),t.dateFrom&&e.set("dateFrom",t.dateFrom),t.dateTo&&e.set("dateTo",t.dateTo),t.hasPhoto&&e.set("hasPhoto","true"),t.q&&e.set("q",t.q),e.set("sort",t.sort),e.set("page",String(t.page)),e.toString()}function P(t){let e=t.ratingCounts;if(!e)return"";let r=Math.max(1,...[1,2,3,4,5].map(n=>{var l;return(l=e[String(n)])!=null?l:0}));return`<div class="ty-widget__rating-distribution">${[5,4,3,2,1].map(n=>{var c;let l=(c=e[String(n)])!=null?c:0,g=Math.round(l/r*100);return`
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${n}">
          <span class="ty-widget__rating-row-label">${n}\u2605</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${g}%"></span></span>
          <span class="ty-widget__rating-row-count">${l}</span>
        </div>`}).join("")}</div>`}function U(t,e){let r=[5,4,3,2,1].map(c=>`<label><input type="checkbox" data-star="${c}"> ${c}\u2605</label>`).join(""),d=e.hideFilters?"":`
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
      </div>`,n=e.storeUrl?`<a class="ty-widget__store-link" href="${m(e.storeUrl)}" target="_blank" rel="noreferrer">Trendyol ma\u011Fazam\u0131z\u0131 g\xF6r\xFCnt\xFCleyin \u2197</a>`:"",l=e.carousel?"ty-widget__list ty-widget__list--carousel":"ty-widget__list",g=e.carousel?"":`
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">\u2039 \xD6nceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki \u203A</button>
      </div>`;return`
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumlar\u0131</div>
      <div class="ty-widget__summary">Ortalama Puan: ${t.averageRating.toFixed(1)} (${t.totalReviews} yorum)</div>
      ${P(t)}
      ${n}
      ${d}
      <ul class="${l}" data-role="list"></ul>
      ${g}
    </div>
  `}function I(t){return t.map(e=>{var d;let r=((d=e.photoUrls)!=null?d:[]).map(n=>`<img src="${m(n)}" alt="" loading="lazy" class="ty-widget__item-photo">`).join("");return`
        <li class="ty-widget__item">
          <span class="ty-widget__item-rating">${m(String(e.rating))}\u2605</span>
          <span class="ty-widget__item-author">${m(e.authorName)}:</span>
          ${m(e.comment)}
          ${r?`<div class="ty-widget__item-photos">${r}</div>`:""}
        </li>`}).join("")}function T(t,e){if(t.length===0)return'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>';let r=I(t);return e?`<div class="ty-widget__carousel-track">${r}${I(t)}</div>`:r}async function q(t,e){var S,E,L,$,k,R;let{apiBaseUrl:r,productId:d,accentColor:n,hideFilters:l,storeUrl:g,carousel:c}=e,f=encodeURIComponent(d);n&&t.style.setProperty("--ty-accent",n);let o=(S=t.shadowRoot)!=null?S:t.attachShadow({mode:"open"}),i={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1};o.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let x,_;try{let[a,s]=await Promise.all([fetch(`${r}/api/v1/products/${f}/summary`),fetch(`${r}/api/v1/products/${f}/reviews?${M(i)}`)]);if(!a.ok||!s.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");x=await a.json(),_=await s.json()}catch(a){o.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}o.innerHTML=U(x,{hideFilters:l,storeUrl:g,carousel:c}),F(o);let w=o.querySelector('[data-role="list"]'),v=o.querySelector('[data-role="page-info"]'),u=o.querySelector('[data-action="prev"]'),y=o.querySelector('[data-action="next"]');function b(a){if(!v||!u||!y)return;let s=Math.max(1,Math.ceil(a.total/a.pageSize));v.textContent=`Sayfa ${i.page} / ${s}`,u.disabled=i.page<=1,y.disabled=i.page>=s}async function p(){w.innerHTML="<li>Y\xFCkleniyor...</li>";try{let a=await fetch(`${r}/api/v1/products/${f}/reviews?${M(i)}`);if(!a.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");let s=await a.json();w.innerHTML=T(s.data,c),b(s.pagination)}catch(a){w.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}o.querySelectorAll("[data-star]").forEach(a=>{a.addEventListener("change",()=>{let s=Number(a.dataset.star);a.checked?i.stars.add(s):i.stars.delete(s),i.page=1,p()})}),(E=o.querySelector('[data-field="dateFrom"]'))==null||E.addEventListener("change",a=>{i.dateFrom=a.target.value,i.page=1,p()}),(L=o.querySelector('[data-field="dateTo"]'))==null||L.addEventListener("change",a=>{i.dateTo=a.target.value,i.page=1,p()}),($=o.querySelector('[data-field="hasPhoto"]'))==null||$.addEventListener("change",a=>{i.hasPhoto=a.target.checked,i.page=1,p()});let h;(k=o.querySelector('[data-field="q"]'))==null||k.addEventListener("input",a=>{let s=a.target.value;h&&clearTimeout(h),h=setTimeout(()=>{i.q=s,i.page=1,p()},400)}),(R=o.querySelector('[data-field="sort"]'))==null||R.addEventListener("change",a=>{i.sort=a.target.value,i.page=1,p()}),u==null||u.addEventListener("click",()=>{i.page<=1||(i.page-=1,p())}),y==null||y.addEventListener("click",()=>{i.page+=1,p()}),w.innerHTML=T(_.data,c),b(_.pagination)}function z(){var n;let t=document.currentScript,e=t==null?void 0:t.dataset.productId,r=(n=t==null?void 0:t.dataset.apiBaseUrl)!=null?n:t!=null&&t.src?new URL(t.src,window.location.href).origin:window.location.origin;if(!e){console.error("[ty-widget] data-product-id \xF6zniteli\u011Fi eksik");return}let d=document.createElement("div");d.id=`ty-widget-${e}`,t==null||t.insertAdjacentElement("afterend",d),q(d,{apiBaseUrl:r,productId:e,accentColor:t==null?void 0:t.dataset.accentColor,hideFilters:(t==null?void 0:t.dataset.hideFilters)==="true",storeUrl:t==null?void 0:t.dataset.storeUrl,carousel:(t==null?void 0:t.dataset.carousel)==="true"})}z();})();
