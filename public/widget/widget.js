"use strict";(()=>{var x="ty-widget-styles";function g(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function L(t){if(t.querySelector(`#${x}`))return;let e=document.createElement("style");e.id=x,e.textContent=`
    .ty-widget { font-family: system-ui, sans-serif; max-width: 640px; color: #1a1a1a; }
    .ty-widget__title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--ty-accent, #ff9500); margin: 0 0 10px; }
    .ty-widget__summary { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
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
  `,t.appendChild(e)}function v(t){let e=new URLSearchParams;return t.stars.size>0&&e.set("stars",[...t.stars].sort().join(",")),t.dateFrom&&e.set("dateFrom",t.dateFrom),t.dateTo&&e.set("dateTo",t.dateTo),t.hasPhoto&&e.set("hasPhoto","true"),t.q&&e.set("q",t.q),e.set("sort",t.sort),e.set("page",String(t.page)),e.toString()}function R(t){let e=t.ratingCounts;if(!e)return"";let r=Math.max(1,...[1,2,3,4,5].map(o=>{var l;return(l=e[String(o)])!=null?l:0}));return`<div class="ty-widget__rating-distribution">${[5,4,3,2,1].map(o=>{var a;let l=(a=e[String(o)])!=null?a:0,n=Math.round(l/r*100);return`
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${o}">
          <span class="ty-widget__rating-row-label">${o}\u2605</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${n}%"></span></span>
          <span class="ty-widget__rating-row-count">${l}</span>
        </div>`}).join("")}</div>`}function T(t){let e=[5,4,3,2,1].map(r=>`<label><input type="checkbox" data-star="${r}"> ${r}\u2605</label>`).join("");return`
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumlar\u0131</div>
      <div class="ty-widget__summary">Ortalama Puan: ${t.averageRating.toFixed(1)} (${t.totalReviews} yorum)</div>
      ${R(t)}
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
  `}function b(t){return t.length===0?'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>':t.map(e=>{var d;let r=((d=e.photoUrls)!=null?d:[]).map(o=>`<img src="${g(o)}" alt="" loading="lazy" class="ty-widget__item-photo">`).join("");return`
        <li class="ty-widget__item">
          <span class="ty-widget__item-rating">${g(String(e.rating))}\u2605</span>
          <span class="ty-widget__item-author">${g(e.authorName)}:</span>
          ${g(e.comment)}
          ${r?`<div class="ty-widget__item-photos">${r}</div>`:""}
        </li>`}).join("")}async function S(t,e){var h;let{apiBaseUrl:r,productId:d,accentColor:o}=e,l=encodeURIComponent(d);o&&t.style.setProperty("--ty-accent",o);let n=(h=t.shadowRoot)!=null?h:t.attachShadow({mode:"open"}),a={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1};n.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let y,u;try{let[i,s]=await Promise.all([fetch(`${r}/api/v1/products/${l}/summary`),fetch(`${r}/api/v1/products/${l}/reviews?${v(a)}`)]);if(!i.ok||!s.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");y=await i.json(),u=await s.json()}catch(i){n.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}n.innerHTML=T(y),L(n);let c=n.querySelector('[data-role="list"]'),E=n.querySelector('[data-role="page-info"]'),w=n.querySelector('[data-action="prev"]'),f=n.querySelector('[data-action="next"]');function _(i){let s=Math.max(1,Math.ceil(i.total/i.pageSize));E.textContent=`Sayfa ${a.page} / ${s}`,w.disabled=a.page<=1,f.disabled=a.page>=s}async function p(){c.innerHTML="<li>Y\xFCkleniyor...</li>";try{let i=await fetch(`${r}/api/v1/products/${l}/reviews?${v(a)}`);if(!i.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");let s=await i.json();c.innerHTML=b(s.data),_(s.pagination)}catch(i){c.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}n.querySelectorAll("[data-star]").forEach(i=>{i.addEventListener("change",()=>{let s=Number(i.dataset.star);i.checked?a.stars.add(s):a.stars.delete(s),a.page=1,p()})}),n.querySelector('[data-field="dateFrom"]').addEventListener("change",i=>{a.dateFrom=i.target.value,a.page=1,p()}),n.querySelector('[data-field="dateTo"]').addEventListener("change",i=>{a.dateTo=i.target.value,a.page=1,p()}),n.querySelector('[data-field="hasPhoto"]').addEventListener("change",i=>{a.hasPhoto=i.target.checked,a.page=1,p()});let m;n.querySelector('[data-field="q"]').addEventListener("input",i=>{let s=i.target.value;m&&clearTimeout(m),m=setTimeout(()=>{a.q=s,a.page=1,p()},400)}),n.querySelector('[data-field="sort"]').addEventListener("change",i=>{a.sort=i.target.value,a.page=1,p()}),w.addEventListener("click",()=>{a.page<=1||(a.page-=1,p())}),f.addEventListener("click",()=>{a.page+=1,p()}),c.innerHTML=b(u.data),_(u.pagination)}function $(){var o;let t=document.currentScript,e=t==null?void 0:t.dataset.productId,r=(o=t==null?void 0:t.dataset.apiBaseUrl)!=null?o:t!=null&&t.src?new URL(t.src,window.location.href).origin:window.location.origin;if(!e){console.error("[ty-widget] data-product-id \xF6zniteli\u011Fi eksik");return}let d=document.createElement("div");d.id=`ty-widget-${e}`,t==null||t.insertAdjacentElement("afterend",d),S(d,{apiBaseUrl:r,productId:e,accentColor:t==null?void 0:t.dataset.accentColor})}$();})();
