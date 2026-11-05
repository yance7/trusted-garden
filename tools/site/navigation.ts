import type {Plugin} from 'vite';
const items=[['farm','index','3D farm'],['story','story','Project story'],['design','design','Design basis'],['architecture','architecture','Architecture'],['notes','notes','Field notes']];
export function siteHeader(current:string){
  const cta=current==='farm'?['story','Read the project story']:['farm','Open the 3D farm'];
  return `<a class="skip-link" href="#${current==='farm'?'gl':'main'}">Skip to content</a>
<header class="topbar site-header" id="siteHeader">
 <div class="header-bar">
  <a class="wordmark" href="./index.html" data-page-link="farm"><span class="mark" aria-hidden="true">✳</span><strong>Trusted Garden</strong><span class="tagline">Reference Farm 001 · V0.8 HD</span></a>
  <div class="header-actions">
   <a class="cta" data-page-link="${cta[0]}" href="./${cta[0]}.html">${cta[1]}<span aria-hidden="true">→</span></a>
   <button class="nav-toggle" id="siteMenu" type="button" aria-expanded="false" aria-controls="siteNav">Sections <span aria-hidden="true">＋</span></button>
  </div>
 </div>
 <nav class="section-nav" id="siteNav" aria-label="Site sections"><span class="section-label">Trusted Garden resources</span><div class="section-tabs">${items.map(([key,file,label])=>`<a class="topbtn${key===current?' current':''}" ${key===current?'aria-current="page"':''} data-page-link="${key}" href="./${file}.html">${label}</a>`).join('')}</div></nav>
</header>`;
}
export function sharedNavigation():Plugin{return {name:'trusted-garden-navigation',transformIndexHtml(html){return html.replace(/<!-- site-header:(\w+) -->/g,(_,page:string)=>siteHeader(page));}};}
