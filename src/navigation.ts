export const views=['overview','entrance','compute','field','pond','aqua','control','north'];
export const regions=['overview','compute','plotA','plotB','plotC','pond','aqua','control'];
export const scenarios=['normal','drought','oxygen','nutrient'];
export type Page='farm'|'story'|'design'|'architecture'|'notes';
const filenames:Record<Page,string>={farm:'index',story:'story',design:'design',architecture:'architecture',notes:'notes'};
const valid=(value:string|null,allowed:string[],fallback:string)=>value&&allowed.includes(value)?value:fallback;
export function regionForView(view:string){return view==='field'?'plotB':['entrance','north'].includes(view)?'overview':valid(view,regions,'overview');}
export function viewForRegion(region:string){return /^plot[ABC]$/.test(region)?'field':valid(region,views,'overview');}
export function sceneSelection(query:URLSearchParams){return {view:valid(query.get('view'),views,viewForRegion(query.get('region')||'overview')),scenario:valid(query.get('scenario'),scenarios,'normal')};}
export function notesSelection(query:URLSearchParams){return {region:valid(query.get('region'),regions,regionForView(query.get('view')||'overview')),scenario:valid(query.get('scenario'),scenarios,'normal')};}
export function documentHref(page:Page,view:string,scenario:string){
 const safe=sceneSelection(new URLSearchParams({view,scenario}));
 const query=new URLSearchParams(page==='notes'?{region:regionForView(safe.view),scenario:safe.scenario}:safe);
 return `./${filenames[page]}.html?${query}`;
}
export function updatePageLinks(view:string,scenario:string){
 document.querySelectorAll<HTMLAnchorElement>('a[data-page-link]').forEach(a=>a.href=documentHref(a.dataset.pageLink as Page,view,scenario));
}
