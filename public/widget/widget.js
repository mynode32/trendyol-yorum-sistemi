"use strict";(()=>{var f="ty-widget-styles";function u(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function h(){if(document.getElementById(f))return;let e=document.createElement("style");e.id=f,e.textContent=`
    .ty-widget { font-family: system-ui, sans-serif; max-width: 640px; color: #1a1a1a; }
    .ty-widget__summary { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
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
  `,document.head.appendChild(e)}function w(e){let i=new URLSearchParams;return e.stars.size>0&&i.set("stars",[...e.stars].sort().join(",")),e.dateFrom&&i.set("dateFrom",e.dateFrom),e.dateTo&&i.set("dateTo",e.dateTo),e.hasPhoto&&i.set("hasPhoto","true"),e.q&&i.set("q",e.q),i.set("sort",e.sort),i.set("page",String(e.page)),i.toString()}function b(e){let i=[5,4,3,2,1].map(r=>`<label><input type="checkbox" data-star="${r}"> ${r}\u2605</label>`).join("");return`
    <div class="ty-widget">
      <div class="ty-widget__summary">Ortalama Puan: ${e.averageRating.toFixed(1)} (${e.totalReviews} yorum)</div>
      <div class="ty-widget__filters">
        <fieldset class="ty-widget__stars">${i}</fieldset>
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
  `}function v(e){return e.length===0?'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>':e.map(i=>`
        <li class="ty-widget__item">
          <span class="ty-widget__item-rating">${u(String(i.rating))}\u2605</span>
          <span class="ty-widget__item-author">${u(i.authorName)}:</span>
          ${u(i.comment)}
        </li>`).join("")}async function _(e,i){let{apiBaseUrl:r,productId:d}=i,t={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1};e.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let g,l;try{let[a,n]=await Promise.all([fetch(`${r}/api/v1/products/${d}/summary`),fetch(`${r}/api/v1/products/${d}/reviews?${w(t)}`)]);g=await a.json(),l=await n.json()}catch(a){e.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}h(),e.innerHTML=b(g);let s=e.querySelector('[data-role="list"]'),x=e.querySelector('[data-role="page-info"]'),c=e.querySelector('[data-action="prev"]'),m=e.querySelector('[data-action="next"]');function y(a){let n=Math.max(1,Math.ceil(a.total/a.pageSize));x.textContent=`Sayfa ${t.page} / ${n}`,c.disabled=t.page<=1,m.disabled=t.page>=n}async function o(){s.innerHTML="<li>Y\xFCkleniyor...</li>";try{let n=await(await fetch(`${r}/api/v1/products/${d}/reviews?${w(t)}`)).json();s.innerHTML=v(n.data),y(n.pagination)}catch(a){s.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}e.querySelectorAll("[data-star]").forEach(a=>{a.addEventListener("change",()=>{let n=Number(a.dataset.star);a.checked?t.stars.add(n):t.stars.delete(n),t.page=1,o()})}),e.querySelector('[data-field="dateFrom"]').addEventListener("change",a=>{t.dateFrom=a.target.value,t.page=1,o()}),e.querySelector('[data-field="dateTo"]').addEventListener("change",a=>{t.dateTo=a.target.value,t.page=1,o()}),e.querySelector('[data-field="hasPhoto"]').addEventListener("change",a=>{t.hasPhoto=a.target.checked,t.page=1,o()});let p;e.querySelector('[data-field="q"]').addEventListener("input",a=>{let n=a.target.value;p&&clearTimeout(p),p=setTimeout(()=>{t.q=n,t.page=1,o()},400)}),e.querySelector('[data-field="sort"]').addEventListener("change",a=>{t.sort=a.target.value,t.page=1,o()}),c.addEventListener("click",()=>{t.page<=1||(t.page-=1,o())}),m.addEventListener("click",()=>{t.page+=1,o()}),s.innerHTML=v(l.data),y(l.pagination)}function E(){var t;let e=document.currentScript,i=e==null?void 0:e.dataset.productId,r=(t=e==null?void 0:e.dataset.apiBaseUrl)!=null?t:e!=null&&e.src?new URL(e.src,window.location.href).origin:window.location.origin;if(!i){console.error("[ty-widget] data-product-id \xF6zniteli\u011Fi eksik");return}let d=document.createElement("div");d.id=`ty-widget-${i}`,e==null||e.insertAdjacentElement("afterend",d),_(d,{apiBaseUrl:r,productId:i})}E();})();
