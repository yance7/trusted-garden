export type Quality = 'high' | 'performance' | 'photo';
export interface AppState { view: string; weather: string; quality: Quality; day: number; time: number; scenario: string; layers: Record<string, boolean>; walkMode: boolean; person: 'first' | 'third'; tour: boolean; cinematic: boolean; photo: boolean; labels: boolean; overlay: boolean; sundial: boolean; mode:'spatial'|'systems'|'flow' }
export function createState(): AppState { return { view: 'overview', weather: 'clear', quality: 'high', day: 46, time: .44, scenario: 'normal', layers: { base: true, crop: true, compute: true, network: true, water: true, sensors:true, robotics:true, actuators:true, irrigation:true, waterloop:true }, walkMode: false, person: 'third', tour: false, cinematic: false, photo: false, labels: true, overlay: false, sundial: false, mode:'spatial' }; }
export interface Obstacle { min: number[]; max: number[]; name?: string }
export function createCollision(boxes: Obstacle[]) {
  const obstacles = boxes.filter(b => b.min[1] < .7 && b.max[1] > .85);
  function isFree(x: number, z: number) {
    if (x < -21.5 || x > 21 || z < -16 || z > 16.5 || Math.hypot(x - 9.5, z - 5.1) < 3.7) return false;
    return !obstacles.some(b => x > b.min[0] - .23 && x < b.max[0] + .23 && z > b.min[2] - .23 && z < b.max[2] + .23);
  }
  function resolve(x: number, z: number, dx: number, dz: number) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .12));
    for (let i = 0; i < steps; i++) { if (isFree(x + dx / steps, z)) x += dx / steps; if (isFree(x, z + dz / steps)) z += dz / steps; }
    return [x, z];
  }
  return { isFree, resolve };
}
export function shortcut(key: string, state: AppState): string {
  const k = key.toLowerCase();
  if (state.walkMode && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) return 'move';
  return ({ g: 'walk', v: 'person', w: 'weather', d: 'drawer', c: 'cinematic', s: 'snapshot', h: 'photo', f: 'fullscreen', r: 'reset', y: 'sundial', t: 'tour', l: 'labels', '?': 'help', escape: 'escape' } as Record<string, string>)[k] || '';
}
export function growth(day: number) { return day < 8 ? .24 + .035 * day : day < 35 ? .5 + (day - 8) * .018 : day < 52 ? .986 + (day - 35) * .0035 : 1.045; }
export function growthTransform(position: number[], scale: number[], factor: number) { return { position:[position[0],position[1]*factor+.45*(1-factor),position[2]],scale:[scale[0],scale[1]*factor,scale[2]] }; }
export function shadowSignature(state:AppState){return [state.weather,state.time.toFixed(4),state.quality,state.day,state.walkMode,state.person,...Object.entries(state.layers).sort().map(([k,v])=>`${k}:${v}`)].join('|');}
export function advanceTour(time:number,dt:number){const total=time+dt,steps=Math.floor((total+1e-8)/9);return {time:Math.max(0,total-steps*9),steps};}
export function groundHeightAt(x:number,z:number,surfaces:Obstacle[]){let height=0;for(const b of surfaces)if(b.max[1]<=.65&&b.max[1]-b.min[1]<.6&&x>=b.min[0]&&x<=b.max[0]&&z>=b.min[2]&&z<=b.max[2])height=Math.max(height,b.max[1]);return height;}
