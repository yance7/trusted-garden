import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { growth, growthTransform, type AppState, type Obstacle } from './state';
import { createTelemetry } from './telemetry';
import { readAsset, readJSON } from './network';
import { preparePreviews, TextureDelivery, type DeliveryManifest } from './textures';
export const assetURL = (path: string) => new URL(`assets/${path}`, document.baseURI).href;
export interface World { root: T.Group; meshes: T.Mesh[]; solids: T.Object3D[]; obstacles: Obstacle[]; ground:Obstacle[]; manifest: { stats: Record<string, number> }; delivery:TextureDelivery; update(state: AppState, time: number): void; dispose(): void }
export async function loadWorld(onProgress: (value: number, message: string) => void, renderer:T.WebGLRenderer): Promise<World> {
  const json = (file: string) => readJSON<any>(assetURL(file));
  const [manifest, inventory, deliveryManifest] = await Promise.all([json('manifest.json'), json('inventory.json'),readJSON<DeliveryManifest>(assetURL('delivery.json'))]);
  let modelProgress=0,previewProgress=0;
  const report=()=>onProgress(.08+.60*modelProgress+.20*previewProgress,modelProgress<1?'Loading detailed farm geometry':`Preparing materials · ${Math.round(previewProgress*deliveryManifest.textures.length)} / ${deliveryManifest.textures.length}`);
  const previewPromise=preparePreviews(deliveryManifest,assetURL,completed=>{previewProgress=completed/deliveryManifest.textures.length;report();});
  let model:ArrayBuffer,previews:Awaited<typeof previewPromise>;
  try{[model,previews]=await Promise.all([
    readAsset(assetURL(manifest.model),{expectedBytes:manifest.stats.modelBytes,onProgress:(loaded,total)=>{modelProgress=Math.min(1,loaded/total);report();}}),
    previewPromise
  ]);}catch(error){void previewPromise.then(p=>p.dispose(),()=>{});throw error;}
  const resourceErrors:string[]=[];const manager=new T.LoadingManager();manager.onError=url=>resourceErrors.push(url);
  manager.setURLModifier(previews.resolve);
  const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.parseAsync(model,assetURL('')).finally(previews.dispose);
  if(resourceErrors.length){gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of(Array.isArray(o.material)?o.material:[o.material])){for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();}}});throw new Error(`Required texture/resource could not be loaded: ${resourceErrors.map(u=>u.split('/').pop()).join(', ')}`);}
  const root = gltf.scene, meshes: T.Mesh[] = [], solids: T.Object3D[] = [], materialCache = new Map<string, T.Material>(), timeUniform = { value: 0 }, windUniform={value:.35};
  root.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const meta = object.userData, original = object.material as T.MeshStandardMaterial;
    meta.baseScale=object.scale.toArray(); meta.basePosition=object.position.toArray();
    const materialKey=`${original.uuid}-${meta.region}`;
    let material = materialCache.get(materialKey) as T.MeshStandardMaterial | undefined;
    if (!material) {
      const desc = original.userData;
      if (desc.kind === 'glass') {
        material = new T.MeshPhysicalMaterial({ color: 0xe6f4ee, roughness: .12, metalness: 0, transmission: .72, thickness: .012, ior: 1.46, transparent: true, opacity: .24, envMapIntensity: .85, side: T.DoubleSide, depthWrite: false });
      } else if (desc.kind === 'bubble') {
        material = new T.MeshPhysicalMaterial({ color: 0xe8f4f6, roughness: .05, metalness: 0, transparent: true, opacity: .30, transmission: .55, thickness: .02, ior: 1.1, envMapIntensity: 1.4, depthWrite: false });
      } else if (desc.kind === 'water') {
        material = new T.MeshPhysicalMaterial({ color: 0x0f363c, metalness: .04, roughness: .22, normalMap:original.normalMap,normalScale:new T.Vector2(.7,.7),transparent: true, opacity: .93, transmission: .10, thickness: .6, ior: 1.333, envMapIntensity: .6, clearcoat: .4, clearcoatRoughness: .22, depthWrite: false, side: T.DoubleSide });
        if (material.normalMap) material.normalMap.anisotropy = 8;
      } else {
        material = original.clone(); material.envMapIntensity = .65;
        if (desc.family === 'metal') { material.normalScale.setScalar(.12); material.roughness = Math.max(.22, material.roughness); }
        if (desc.cutout) { material.side = T.DoubleSide; material.alphaTest = .42; material.transparent = false; material.roughness = .82; }
        for (const tex of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]) if (tex) tex.anisotropy = desc.family === 'metal' ? 4 : 8;
        if (desc.emissive) { material.emissive.copy(material.color); material.emissiveIntensity = 4.5; }
      }
      material.userData.originalColor = material.color.clone(); materialCache.set(materialKey, material);
      material.onBeforeCompile = shader => {
        shader.uniforms.uGardenTime = timeUniform;
        shader.uniforms.uGardenWind=windUniform;
        shader.vertexShader = 'uniform float uGardenTime;\nuniform float uGardenWind;\n' + shader.vertexShader;
        if (desc.family === 'leaf' || desc.family === 'grass') shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 gardenWorld=(modelMatrix*vec4(transformed,1.)).xyz; float breeze=sin(gardenWorld.x*1.4+gardenWorld.z*.8+uGardenTime*1.4)*.028*uGardenWind*clamp(gardenWorld.y-.15,0.,2.);transformed.x+=breeze/max(length(modelMatrix[0].xyz),.0001);transformed.z+=breeze*.45/max(length(modelMatrix[2].xyz),.0001);');
        if (desc.kind === 'water') shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(position.x*4.+uGardenTime)*cos(position.z*3.2+uGardenTime*.7)*.012;');
      };
      material.customProgramCacheKey = () => `garden-${desc.family}-${desc.kind}`;
    }
    object.material = material; object.castShadow = meta.kind === 'solid' && !meta.grass; object.receiveShadow = true;
    meshes.push(object);
    if (meta.kind === 'solid' && !['plant', 'tree', 'shrub', 'ground', 'water'].includes(meta.category)) solids.push(object);
  });
  const telemetry=createTelemetry(root,inventory);
  const delivery=new TextureDelivery(renderer,root,deliveryManifest,assetURL);
  onProgress(.9, 'Preparing field technician');
  const ground=inventory.sourceObjects.filter((o:{name:string,bounds:{size:number[],hi:number[]}})=>/soil|row_|meadow|grass|spine|court|crosswalk|boardwalk|deck|platform|paving|link/i.test(o.name)&&o.bounds.hi[1]<=.65&&o.bounds.size[0]>.4&&o.bounds.size[2]>.4).map((o:{bounds:{lo:number[],hi:number[]}})=>({min:o.bounds.lo,max:o.bounds.hi}));
  return { root, meshes, solids, obstacles: inventory.collisions, ground, manifest, delivery,
    update(state, time) {
      telemetry.update(state);
      timeUniform.value = time;
      windUniform.value=state.weather==='storm'?2.8:state.weather==='wind'?1.8:state.weather==='rain'?.9:.35;
      for(const material of materialCache.values()){const m=material as T.MeshStandardMaterial;if(m instanceof T.MeshPhysicalMaterial&&m.ior===1.333&&m.normalMap)m.normalMap.offset.set(time*.003,time*.002);}
      for (const mesh of meshes) {
        const m = mesh.userData;
        mesh.visible = state.layers[m.layer] !== false;
        if (m.category === 'plant' && /^plot/.test(m.region)) { const scale = growth(state.day) * (m.region === 'plotB' ? 1.045 : m.region === 'plotC' ? .93 : 1); const transform=growthTransform(m.basePosition,m.baseScale,scale); mesh.position.fromArray(transform.position);mesh.scale.fromArray(transform.scale); }
        const mat = mesh.material as T.MeshStandardMaterial;
        const base = mat.userData.originalColor as T.Color;
        if (base) {
          const risk = state.scenario === 'drought' && ['plotB', 'plotC'].includes(m.region) || state.scenario === 'oxygen' && m.region === 'pond' || state.scenario === 'nutrient' && ['aqua', 'plotA'].includes(m.region);
          // Shared material instances must not receive per-object overlay colors.
          if (state.overlay) mat.color.copy(base).lerp(new T.Color(risk ? 0xd3843e : 0x477c69), .22); else mat.color.copy(base);
        }
      }
    },
    dispose() { delivery.dispose();telemetry.dispose(); const textures = new Set<T.Texture>(); root.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); const m = o.material as T.MeshStandardMaterial; for (const v of Object.values(m)) if (v instanceof T.Texture) textures.add(v); } }); textures.forEach(t => t.dispose()); new Set(meshes.map(m => m.material as T.Material)).forEach(m => m.dispose()); }
  };
}
