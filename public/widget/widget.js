"use strict";(()=>{var W="ty-widget-styles";function p(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function E(t){try{let e=new URL(t);return e.protocol==="https:"||e.protocol==="http:"?e.href:null}catch(e){return null}}function et(t){if(t.querySelector(`#${W}`))return;let e=document.createElement("style");e.id=W,e.textContent=`
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
    .ty-widget__carousel-track { display: flex; gap: 0; width: max-content;
      animation: ty-widget-scroll 32s linear infinite; }
    .ty-widget__carousel-group { display: flex; flex: 0 0 auto; gap: 14px; padding-right: 14px; }
    .ty-widget__list--carousel:hover .ty-widget__carousel-track,
    .ty-widget__list--carousel:focus-within .ty-widget__carousel-track { animation-play-state: paused; }
    @keyframes ty-widget-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .ty-widget__list--carousel .ty-widget__item { flex: 0 0 260px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      padding: 14px 16px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
    .ty-widget__list--carousel .ty-widget__item:hover { transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.14); }
    @media (max-width: 600px), (prefers-reduced-motion: reduce) {
      .ty-widget__list--carousel { overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain; scroll-snap-type: x mandatory; -webkit-mask-image: none; mask-image: none; }
      .ty-widget__carousel-track { animation: none; }
      .ty-widget__carousel-group--clone { display: none; }
      .ty-widget__list--carousel .ty-widget__item { scroll-snap-align: start; }
    }
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
  `,t.appendChild(e)}function O(t){let e=new URLSearchParams;return t.stars.size>0&&e.set("stars",[...t.stars].sort().join(",")),t.dateFrom&&e.set("dateFrom",t.dateFrom),t.dateTo&&e.set("dateTo",t.dateTo),t.hasPhoto&&e.set("hasPhoto","true"),t.q&&e.set("q",t.q),e.set("sort",t.sort),e.set("page",String(t.page)),e.toString()}function at(t){let e=t.ratingCounts;if(!e)return"";let n=Math.max(1,...[1,2,3,4,5].map(d=>{var s;return(s=e[String(d)])!=null?s:0}));return`<div class="ty-widget__rating-distribution">${[5,4,3,2,1].map(d=>{var m;let s=(m=e[String(d)])!=null?m:0,c=Math.round(s/n*100);return`
        <div class="ty-widget__rating-row" data-role="rating-bar" data-star="${d}">
          <span class="ty-widget__rating-row-label">${d}\u2605</span>
          <span class="ty-widget__rating-row-track"><span class="ty-widget__rating-row-fill" style="width:${c}%"></span></span>
          <span class="ty-widget__rating-row-count">${s}</span>
        </div>`}).join("")}</div>`}function it(t,e){let n=[5,4,3,2,1].map(y=>`<label><input type="checkbox" data-star="${y}"> ${y}\u2605</label>`).join(""),l=e.hideFilters?"":`
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
      </div>`,d=e.storeUrl?E(e.storeUrl):null,s=d?`<a class="ty-widget__store-link" href="${p(d)}" target="_blank" rel="noopener noreferrer">Trendyol ma\u011Fazam\u0131z\u0131 g\xF6r\xFCnt\xFCleyin \u2197</a>`:"",c=e.carousel?"ty-widget__list ty-widget__list--carousel":"ty-widget__list",m=e.carousel?"":`
      <div class="ty-widget__pagination">
        <button type="button" data-action="prev">\u2039 \xD6nceki</button>
        <span data-role="page-info"></span>
        <button type="button" data-action="next">Sonraki \u203A</button>
      </div>`;return`
    <div class="ty-widget">
      <div class="ty-widget__title">Trendyol Yorumlar\u0131</div>
      ${e.hideSummary?"":`
      <div class="ty-widget__summary">Ortalama Puan: ${t.averageRating.toFixed(1)} (${t.totalReviews} yorum)</div>
      ${at(t)}`}
      ${s}
      ${l}
      <ul class="${c}" data-role="list"></ul>
      ${m}
    </div>
  `}function X(t){let e=Math.max(0,Math.min(5,Math.round(t))),n=5-e;return`<span class="ty-widget__item-stars">
    <span class="ty-widget__item-stars-filled">${"\u2605".repeat(e)}</span><span class="ty-widget__item-stars-empty">${"\u2606".repeat(n)}</span>
  </span>`}function V(t){return t.map(e=>{var l;let n=((l=e.photoUrls)!=null?l:[]).map(E).filter(d=>!!d).map(d=>`<img src="${p(d)}" alt="" loading="lazy" class="ty-widget__item-photo">`).join("");return`
        <li class="ty-widget__item" data-review-id="${p(e.id)}">
          ${X(e.rating)}
          <span class="ty-widget__item-author">${p(e.authorName)}:</span>
          ${p(e.comment)}
          ${n?`<div class="ty-widget__item-photos">${n}</div>`:""}
        </li>`}).join("")}function ot(){return`
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
    </div>`}function Q(t,e){if(t.length===0)return'<li class="ty-widget__empty">Bu filtrelere uyan yorum bulunamad\u0131.</li>';let n=V(t);return e?`<div class="ty-widget__carousel-track"><div class="ty-widget__carousel-group">${n}</div><div class="ty-widget__carousel-group ty-widget__carousel-group--clone" aria-hidden="true">${V(t)}</div></div>`:n}async function G(t,e){var F,P,j,C,B,Y,D;let{apiBaseUrl:n,accentColor:l,hideFilters:d,storeUrl:s,carousel:c,hideSummary:m,externalRef:b,storeId:y}=e;l&&t.style.setProperty("--ty-accent",l);let o=(F=t.shadowRoot)!=null?F:t.attachShadow({mode:"open"});o.innerHTML='<div data-testid="loading">Yorumlar y\xFCkleniyor...</div>';let h=e.productId;if(!h&&b)try{let a=y?`&storeId=${encodeURIComponent(y)}`:"",i=await fetch(`${n}/api/v1/products/resolve?ref=${encodeURIComponent(b)}${a}`);i.ok&&(h=(await i.json()).id)}catch(a){}if(!h){o.innerHTML="";return}let S=encodeURIComponent(h),r={stars:new Set,dateFrom:"",dateTo:"",hasPhoto:!1,q:"",sort:"newest",page:1},M,x;try{let[a,i]=await Promise.all([fetch(`${n}/api/v1/products/${S}/summary`),fetch(`${n}/api/v1/products/${S}/reviews?${O(r)}`)]);if(!a.ok||!i.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");M=await a.json(),x=await i.json()}catch(a){o.innerHTML='<div class="ty-widget__error">Yorumlar \u015Fu an y\xFCklenemiyor.</div>';return}o.innerHTML=it(M,{hideFilters:d,storeUrl:s,carousel:c,hideSummary:m})+ot(),et(o);let w=o.querySelector('[data-role="list"]'),$=o.querySelector('[data-role="page-info"]'),_=o.querySelector('[data-action="prev"]'),f=o.querySelector('[data-action="next"]'),v=o.querySelector('[data-role="detail-overlay"]'),K=o.querySelector('[data-role="modal-header"]'),J=o.querySelector('[data-role="modal-comment"]'),H=o.querySelector('[data-role="modal-photos"]'),L=o.querySelector('[data-role="lightbox-overlay"]'),R=o.querySelector('[data-role="lightbox-img"]'),I=new Map;function T(a){I=new Map(a.map(i=>[i.id,i]))}function q(a){R.src=a,L.hidden=!1}function Z(){L.hidden=!0,R.src=""}function tt(a){var i;K.innerHTML=`${X(a.rating)}<span class="ty-widget__item-author">${p(a.authorName)}</span>`,J.textContent=a.comment,H.innerHTML=((i=a.photoUrls)!=null?i:[]).map(E).filter(u=>!!u).map(u=>`<img src="${p(u)}" class="ty-widget__modal-photo" data-role="modal-photo" alt="">`).join(""),v.hidden=!1}function U(){v.hidden=!0}v.addEventListener("click",a=>{a.target===v&&U()}),(P=o.querySelector('[data-action="close-detail"]'))==null||P.addEventListener("click",U),L.addEventListener("click",Z),H.addEventListener("click",a=>{let i=a.target.closest('[data-role="modal-photo"]');i&&q(i.src)}),w.addEventListener("click",a=>{let i=a.target,u=i.closest(".ty-widget__item-photo");if(u){q(u.src);return}let A=i.closest(".ty-widget__item[data-review-id]"),N=A?I.get(A.dataset.reviewId):void 0;N&&tt(N)});function z(a){if(!$||!_||!f)return;let i=Math.max(1,Math.ceil(a.total/a.pageSize));$.textContent=`Sayfa ${r.page} / ${i}`,_.disabled=r.page<=1,f.disabled=r.page>=i}async function g(){w.innerHTML="<li>Y\xFCkleniyor...</li>";try{let a=await fetch(`${n}/api/v1/products/${S}/reviews?${O(r)}`);if(!a.ok)throw new Error("API'den ba\u015Far\u0131s\u0131z yan\u0131t");let i=await a.json();T(i.data),w.innerHTML=Q(i.data,c),z(i.pagination)}catch(a){w.innerHTML='<li class="ty-widget__error">Yorumlar y\xFCklenemedi.</li>'}}o.querySelectorAll("[data-star]").forEach(a=>{a.addEventListener("change",()=>{let i=Number(a.dataset.star);a.checked?r.stars.add(i):r.stars.delete(i),r.page=1,g()})}),(j=o.querySelector('[data-field="dateFrom"]'))==null||j.addEventListener("change",a=>{r.dateFrom=a.target.value,r.page=1,g()}),(C=o.querySelector('[data-field="dateTo"]'))==null||C.addEventListener("change",a=>{r.dateTo=a.target.value,r.page=1,g()}),(B=o.querySelector('[data-field="hasPhoto"]'))==null||B.addEventListener("change",a=>{r.hasPhoto=a.target.checked,r.page=1,g()});let k;(Y=o.querySelector('[data-field="q"]'))==null||Y.addEventListener("input",a=>{let i=a.target.value;k&&clearTimeout(k),k=setTimeout(()=>{r.q=i,r.page=1,g()},400)}),(D=o.querySelector('[data-field="sort"]'))==null||D.addEventListener("change",a=>{r.sort=a.target.value,r.page=1,g()}),_==null||_.addEventListener("click",()=>{r.page<=1||(r.page-=1,g())}),f==null||f.addEventListener("click",()=>{r.page+=1,g()}),T(x.data),w.innerHTML=Q(x.data,c),z(x.pagination)}function rt(){var c;let t=document.currentScript,e=t==null?void 0:t.dataset.productId,n=t==null?void 0:t.dataset.externalRef,l=t==null?void 0:t.dataset.storeId,d=(c=t==null?void 0:t.dataset.apiBaseUrl)!=null?c:t!=null&&t.src?new URL(t.src,window.location.href).origin:window.location.origin;if(!e&&!n){console.error("[ty-widget] data-product-id veya data-external-ref \xF6zniteli\u011Fi eksik");return}let s=document.createElement("div");s.id=`ty-widget-${e!=null?e:n}`,t==null||t.insertAdjacentElement("afterend",s),G(s,{apiBaseUrl:d,productId:e,externalRef:n,storeId:l,accentColor:t==null?void 0:t.dataset.accentColor,hideFilters:(t==null?void 0:t.dataset.hideFilters)==="true",storeUrl:t==null?void 0:t.dataset.storeUrl,carousel:(t==null?void 0:t.dataset.carousel)==="true",hideSummary:(t==null?void 0:t.dataset.hideSummary)==="true"})}rt();})();
