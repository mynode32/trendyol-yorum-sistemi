"use strict";(()=>{var h="ty-widget-styles";function c(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function E(t){if(t.querySelector(`#${h}`))return;let e=document.createElement("style");e.id=h,e.textContent=`
    .ty-widget { font-family: system-ui, sans-serif; max-width: 640px; color: #1a1a1a; }
    .ty-widget__summary { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .ty-widget__rating-distribution { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .ty-widget__rating-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #444; }
    .ty-widget__rating-row-label { width: 24px; }
    .ty-widget__rating-row-track { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
    .ty-widget__rating-row-fill { display: block; height: 100%; background: #ff9500; }
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
  `,t.appendChild(e)}function x(t){let e=new URLSearchParams;return t.stars.size>0&&e.set("stars",[...t.stars].sort().join(",")),t.dateFrom&&e.set("dateFrom",t.dateFrom),t.dateTo&&e.set("dateTo",t.dateTo),t.hasPhoto&&e.set("hasPhoto","true"),t.q&&e.set("q",t.q),e.set("sort",t.sort),e.set("page",String(t.page)),e.toString()}function L(t){let e=t.ratingCounts;if(!e)return"";let o=Math.max(1,...[1,2,3,4,5].map(r=>{var n;return(n=e[String(r)])!=null?n:0}));return`<div class="ty-widget__rating-distribution">${[5,4,3,2,1].map(r=>{var p;let n=(p=e[String(r)])!=null?p:0,i=Math.round(n/o*100);return`
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${r}">
          <span class="ty-widget__rating-row-label">${r}\u2605</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${i}%"></span></span>
          <span class="ty-widget__rating-row-count">${n}</span>
        </div>`}).join("")}</div>`}function T(t){let e=[5,4,3,2,1].map(o=>`<label><input type="checkbox" data-star="${o}"> ${o}\u2605</label>`).join("");return`
    <div class="ty-widget">
      <div class="ty-widget__summary">Ortalama Puan: ${t.averageRating.toFixed(1)} (${t.totalReviews} yorum)</div>
      ${L(t)}
      <div class="ty-widget__filters">
        <fieldset class="ty-widget__stars">${e}</fieldset>
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
      </div>
      <ul class="ty-widget__list" data-role="list"></ul>
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">\u2039 \xD6nceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki \u203A</button>
      </div>
    </div>
  `}function v(t){return t.length===0?'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>':t.map(e=>{var s;let o=((s=e.photoUrls)!=null?s:[]).map(r=>`<img src="${c(r)}" alt="" loading="lazy" class="ty-widget__item-photo">`).join("");return`
        <li class="ty-widget__item">
          <span class="ty-widget__item-rating">${c(String(e.rating))}\u2605</span>
          <span class="ty-widget__item-author">${c(e.authorName)}:</span>
          ${c(e.comment)}
          ${o?`<div class="ty-widget__item-photos">${o}</div>`:""}
        </li>`}).join("")}async function b(t,e){var _;let{apiBaseUrl:o,productId:s}=e,r=encodeURIComponent(s),n=(_=t.shadowRoot)!=null?_:t.attachShadow({mode:"open"}),i={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1};n.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let p,u;try{let[a,d]=await Promise.all([fetch(`${o}/api/v1/products/${r}/summary`),fetch(`${o}/api/v1/products/${r}/reviews?${x(i)}`)]);if(!a.ok||!d.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");p=await a.json(),u=await d.json()}catch(a){n.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}n.innerHTML=T(p),E(n);let g=n.querySelector('[data-role="list"]'),S=n.querySelector('[data-role="page-info"]'),y=n.querySelector('[data-action="prev"]'),w=n.querySelector('[data-action="next"]');function f(a){let d=Math.max(1,Math.ceil(a.total/a.pageSize));S.textContent=`Sayfa ${i.page} / ${d}`,y.disabled=i.page<=1,w.disabled=i.page>=d}async function l(){g.innerHTML="<li>Y\xFCkleniyor...</li>";try{let a=await fetch(`${o}/api/v1/products/${r}/reviews?${x(i)}`);if(!a.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");let d=await a.json();g.innerHTML=v(d.data),f(d.pagination)}catch(a){g.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}n.querySelectorAll("[data-star]").forEach(a=>{a.addEventListener("change",()=>{let d=Number(a.dataset.star);a.checked?i.stars.add(d):i.stars.delete(d),i.page=1,l()})}),n.querySelector('[data-field="dateFrom"]').addEventListener("change",a=>{i.dateFrom=a.target.value,i.page=1,l()}),n.querySelector('[data-field="dateTo"]').addEventListener("change",a=>{i.dateTo=a.target.value,i.page=1,l()}),n.querySelector('[data-field="hasPhoto"]').addEventListener("change",a=>{i.hasPhoto=a.target.checked,i.page=1,l()});let m;n.querySelector('[data-field="q"]').addEventListener("input",a=>{let d=a.target.value;m&&clearTimeout(m),m=setTimeout(()=>{i.q=d,i.page=1,l()},400)}),n.querySelector('[data-field="sort"]').addEventListener("change",a=>{i.sort=a.target.value,i.page=1,l()}),y.addEventListener("click",()=>{i.page<=1||(i.page-=1,l())}),w.addEventListener("click",()=>{i.page+=1,l()}),g.innerHTML=v(u.data),f(u.pagination)}function R(){var r;let t=document.currentScript,e=t==null?void 0:t.dataset.productId,o=(r=t==null?void 0:t.dataset.apiBaseUrl)!=null?r:t!=null&&t.src?new URL(t.src,window.location.href).origin:window.location.origin;if(!e){console.error("[ty-widget] data-product-id \xF6zniteli\u011Fi eksik");return}let s=document.createElement("div");s.id=`ty-widget-${e}`,t==null||t.insertAdjacentElement("afterend",s),b(s,{apiBaseUrl:o,productId:e})}R();})();
