import * as T from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {readAsset} from './network';

export interface DeliveryMap {source:string;preview:string;compressed:string;width:number;height:number;previewBytes:number;bytes:number}
export interface DeliveryManifest {revision:string;textures:DeliveryMap[]}
export interface TextureStatus {status:'waiting'|'loading'|'complete'|'retry'|'compatible';completed:number;total:number;compressed:number;uploadedBytes:number}

export async function preparePreviews(manifest:DeliveryManifest,url:(path:string)=>string,onProgress:(completed:number)=>void) {
  const blobs=new Map<string,string>();let completed=0;
  const fallback=(source:string)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d')!;context.fillStyle=source.includes('-normal')?'rgb(128,128,255)':source.includes('-orm')?'rgb(255,210,255)':'white';context.fillRect(0,0,1,1);return canvas.toDataURL('image/png');};
  await Promise.all(manifest.textures.map(async map=>{
      try {const bytes=await readAsset(url(map.preview),{timeoutMs:6000,retries:0});blobs.set(url(map.source),URL.createObjectURL(new Blob([bytes],{type:'image/webp'})));}
      catch {blobs.set(url(map.source),fallback(map.source));}
      onProgress(++completed);
  }));
  return {resolve:(path:string)=>blobs.get(path)||path,dispose:()=>{for(const blob of blobs.values())if(blob.startsWith('blob:'))URL.revokeObjectURL(blob);}};
}

const slots=['map','normalMap','roughnessMap','metalnessMap','aoMap'] as const;
export class TextureDelivery {
  state:TextureStatus;private running=false;private disposed=false;
  private tasks:{map:DeliveryMap;targets:{material:T.MeshStandardMaterial;slot:typeof slots[number];previous:T.Texture}[];done:boolean}[];
  private stopDecoder:(()=>void)|undefined;private abort=new AbortController();
  private notify:((status:TextureStatus)=>void)|undefined;
  constructor(private renderer:T.WebGLRenderer,root:T.Object3D,manifest:DeliveryManifest,private url:(path:string)=>string){
    this.tasks=manifest.textures.map(map=>({map,targets:[],done:false}));
    root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const material of(Array.isArray(o.material)?o.material:[o.material])){
      if(!(material instanceof T.MeshStandardMaterial))continue;
      for(const slot of slots){const texture=material[slot];if(!texture)continue;const task=this.tasks.find(t=>texture.name===t.map.source);if(task&&!task.targets.some(t=>t.material===material&&t.slot===slot))task.targets.push({material,slot,previous:texture});}
    }});
    this.tasks=this.tasks.filter(t=>t.targets.length);
    this.state={status:'waiting',completed:0,total:this.tasks.length,compressed:0,uploadedBytes:0};
  }
  onChange(notify:(status:TextureStatus)=>void){this.notify=notify;notify({...this.state});}
  private report(){this.notify?.({...this.state});}
  async start(){
    if(this.running||this.disposed)return;
    const supported=['WEBGL_compressed_texture_astc','EXT_texture_compression_bptc','WEBGL_compressed_texture_s3tc','WEBGL_compressed_texture_etc'].some(name=>this.renderer.extensions.has(name));
    if(!supported){this.state.status='compatible';this.report();return;}
    this.running=true;this.state.status='loading';this.report();
    const manager=new T.LoadingManager();
    const loader=new KTX2Loader(manager).setTranscoderPath(this.url('basis/')).setWorkerLimit(1).detectSupport(this.renderer);
    let released=false;
    const release=()=>{if(released)return;released=true;manager.abort();loader.dispose();this.stopDecoder=undefined;};
    this.stopDecoder=release;
    const bounded=<V>(promise:Promise<V>,ms:number)=>{
      let timer:ReturnType<typeof setTimeout>;
      return Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{release();reject(new Error('Detail preparation timed out'));},ms);})]).finally(()=>clearTimeout(timer!));
    };
    // Give foliage and water fine detail first. Keep only one decoded upload in flight.
    const order=['leaf','metal','water','soil','wood','concrete','bark'];
    const queue=[...this.tasks].sort((a,b)=>order.indexOf(a.map.source.split('/').pop()!.split('-')[0])-order.indexOf(b.map.source.split('/').pop()!.split('-')[0]));
    let failed=false;
    try{await bounded(loader.init(),15000);}catch{release();this.running=false;if(!this.disposed){this.state.status='retry';this.report();}return;}
    for(const task of queue){
      if(task.done||this.disposed)continue;
      let decoding=false;
      try{
        const bytes=await readAsset(this.url(task.map.compressed),{timeoutMs:15000,retries:1,signal:this.abort.signal});
        if(this.disposed)break;
        decoding=true;
        const texture=await bounded(new Promise<T.CompressedTexture>((resolve,reject)=>loader.parse(bytes,resolve,reject)),30000);
        if(this.disposed){texture.dispose();break;}
        // No uncompressed 4K fallback on devices without a GPU texture format.
        if((texture.format as number)===T.RGBAFormat){texture.dispose();this.state.status='compatible';break;}
        const original=task.targets[0].previous;
        texture.name=task.map.source;texture.colorSpace=original.colorSpace;texture.flipY=false;
        texture.wrapS=original.wrapS;texture.wrapT=original.wrapT;texture.repeat.copy(original.repeat);texture.offset.copy(original.offset);texture.center.copy(original.center);texture.rotation=original.rotation;
        texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
        this.renderer.initTexture(texture);
        for(const target of task.targets)target.material[target.slot]=texture;
        task.done=true;this.state.completed++;this.state.compressed++;this.state.uploadedBytes+=texture.mipmaps.reduce((sum,mip)=>sum+mip.data.byteLength,0);this.report();
        for(const old of new Set(task.targets.map(t=>t.previous))){try{old.dispose();if(typeof ImageBitmap!=='undefined'&&old.image instanceof ImageBitmap)old.image.close();}catch{/* Cleanup must not undo a successful upgrade. */}}
      }catch{failed=true;if(decoding){release();break;}}
    }
    release();this.running=false;
    if(!this.disposed){if(this.state.status!=='compatible')this.state.status=failed?'retry':'complete';this.report();}
  }
  dispose(){this.disposed=true;this.abort.abort();this.stopDecoder?.();}
}

export function showTextureStatus(delivery:TextureDelivery){
  const container=document.createElement('div');container.id='hdTextureStatus';container.setAttribute('role','status');container.setAttribute('aria-live','polite');
  document.querySelector('.quality-strip')!.after(container);
  delivery.onChange(state=>{
    container.replaceChildren();
    const text=document.createElement('span');
    text.textContent=state.status==='complete'?'4K detail ready':state.status==='compatible'?'Compatibility textures':state.status==='retry'?'Farm ready · detail download paused':`Enhancing 4K detail · ${state.completed} / ${state.total}`;
    container.append(text);
    if(state.status==='retry'){const button=document.createElement('button');button.id='hdTextureRetry';button.textContent='Retry detail';button.onclick=()=>void delivery.start();container.append(button);}
  });
}
