import * as T from 'three';
import content from './content.json';
export function updateFlow(mode:string,camera:T.Camera){
 const svg=document.getElementById('dataflow')!,panel=document.getElementById('flowPanel')!;
 svg.style.display=mode==='flow'?'block':'none';panel.style.display=mode==='flow'?'block':'none';if(mode!=='flow')return;
 svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
 const project=(a:number[])=>{const v=new T.Vector3().fromArray(a).project(camera);return v.z>-1&&v.z<1?[(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight]:null};
 let out='';for(const link of content.flowLinks){const a=project(link.a),b=project(link.b);if(a&&b)out+=`<line class="flow-line ${link.type==='act'?'act':''}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}
 for(const [label,position]of[['FIELD GATEWAY',[-1.85,1.7,4.25]],['EDGE CONTROL',[3,1.7,-10.9]],['PLOT ACTUATION',[-3.55,.95,0]],['AQUATIC SENSING',[7.45,2.45,8.25]],['AQUAPONICS PLC',[10.4,2.95,-9.4]]]as[string,number[]][]){const p=project(position);if(p)out+=`<circle class="flow-node compute" cx="${p[0]}" cy="${p[1]}" r="4"/><text class="flow-label" x="${p[0]+8}" y="${p[1]-7}">${label}</text>`;}
 svg.innerHTML=out;
}
