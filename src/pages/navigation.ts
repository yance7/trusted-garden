import '../styles/navigation.css';
export function initNavigation(){
 document.documentElement.classList.add('navigation-enhanced');
 const toggle=document.querySelector<HTMLButtonElement>('#siteMenu')!;
 const close=()=>{document.body.classList.remove('site-menu-open');toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{const open=document.body.classList.toggle('site-menu-open');toggle.setAttribute('aria-expanded',String(open));};
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('site-menu-open')){event.preventDefault();event.stopImmediatePropagation();close();toggle.focus();}},true);
 document.addEventListener('click',event=>{if(!(event.target as Element).closest('#siteHeader'))close();});
 window.matchMedia('(min-width: 801px)').addEventListener('change',event=>{if(event.matches)close();});
}
