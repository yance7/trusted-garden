import './document';
import content from '../content.json';
import {notesSelection,viewForRegion,documentHref,updatePageLinks} from '../navigation';
interface Note {type:string;title:string;desc:string;metrics:string[][];decision:string;trace:string[][]}
const data=content.scenarios as Record<string,Record<string,Note>>;
const region=document.querySelector<HTMLSelectElement>('#notesRegion')!,scenario=document.querySelector<HTMLSelectElement>('#notesScenario')!;
const selected=notesSelection(new URLSearchParams(location.search));region.value=selected.region;scenario.value=selected.scenario;
region.disabled=scenario.disabled=false;
function render(){
 const selection=notesSelection(new URLSearchParams({region:region.value,scenario:scenario.value}));
 const note=data[selection.scenario][selection.region]||data.normal[selection.region];
 for(const [id,text]of Object.entries({notesType:note.type,notesTitle:note.title,notesDesc:note.desc}))document.getElementById(id)!.textContent=text;
 document.getElementById('notesMetrics')!.innerHTML=note.metrics.map(m=>`<div class="note-metric"><span>${m[0]}</span><b>${m[1]}</b><small>${m[2]}</small></div>`).join('');
 document.getElementById('notesDecision')!.innerHTML=note.decision;
 document.getElementById('notesTrace')!.innerHTML=note.trace.map(t=>`<li><time>${t[0]}</time><div><b>${t[1]}</b> · ${t[2]}</div></li>`).join('');
 const view=viewForRegion(selection.region);updatePageLinks(view,selection.scenario);
 document.querySelector<HTMLAnchorElement>('#notesFarmLink')!.href=documentHref('farm',view,selection.scenario);
 const url=new URL(location.href);url.search=new URLSearchParams(selection).toString();history.replaceState(history.state,'',url);
 document.querySelector<HTMLAnchorElement>('#siteNav [aria-current="page"]')!.href=url.href;
}
region.onchange=scenario.onchange=render;render();
