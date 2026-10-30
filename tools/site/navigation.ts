import type {Plugin} from 'vite';
const items=[['farm','index','3D farm'],['story','story','Project story'],['design','design','Design basis'],['architecture','architecture','Architecture'],['notes','notes','Field notes']];
export function siteHeader(current:string){return `<a class="skip-link" href="#${current==='farm'?'gl':'main'}">Skip to content</a>
<header class="topbar site-header" id="siteHeader">
 <a class="wordmark" href="./index.html" data-page-link="farm"><strong>Trusted Garden</strong><span>Reference Farm 001 · V0.8 HD</span></a>
 <button class="nav-toggle" id="siteMenu" type="button" aria-expanded="false" aria-controls="siteNav">Menu <span aria-hidden="true">＋</span></button>
 <nav class="top-actions" id="siteNav" aria-label="Main navigation">${items.map(([key,file,label])=>`<a class="topbtn${key===current?' current':''}" ${key===current?'aria-current="page"':''} data-page-link="${key}" href="./${file}.html">${label}</a>`).join('')}</nav>
</header>`;}
export function sharedNavigation():Plugin{return {name:'trusted-garden-navigation',transformIndexHtml(html){return html.replace(/<!-- site-header:(\w+) -->/g,(_,page:string)=>siteHeader(page));}};}
