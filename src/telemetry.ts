import * as T from 'three';
import type { AppState } from './state';
import content from './content.json';
export function createTelemetry(root: T.Group, inventory: { sourceObjects: { name: string; region: string; layer: string; bounds: { center: number[]; size: number[]; lo:number[];hi: number[] } }[] }) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d')!, texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 8;
  const material = new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide, toneMapped: false });
  const displays: T.Mesh[] = [];
  for (const object of inventory.sourceObjects.filter(o => /(?:screen|walldisplay_\d+$)/i.test(o.name) && !/frame|sensor.*camera/i.test(o.name))) {
    const b = object.bounds;
    if (b.size[0] < .15 || b.size[1] < .10 || b.size[2] > .2) continue;
    for(const side of [-1,1]){
      const display = new T.Mesh(new T.PlaneGeometry(b.size[0] * .90, b.size[1] * .86), material);
      display.position.set(b.center[0], b.center[1], side>0?b.hi[2]+.006:b.lo[2]-.006);if(side<0)display.rotation.y=Math.PI;display.userData.layer = object.layer;root.add(display);displays.push(display);
    }
  }
  let signature = '';
  return { update(state: AppState) {
    displays.forEach(d => d.visible = state.layers[d.userData.layer] !== false);
    const key = `${state.weather}-${state.day}-${state.scenario}-${Math.floor(state.time * 60)}`; if (key === signature) return; signature = key;
    const weather = (content.weather as Record<string, { temp: number; rh: number; wind: number; rain: number }>)[state.weather];
    ctx.fillStyle = '#101f22'; ctx.fillRect(0, 0, 2048, 1024);
    ctx.fillStyle = '#83c4b6'; ctx.font = '24px sans-serif'; ctx.fillText('TRUSTED GARDEN  /  EDGE CONTROL', 70, 76);
    ctx.fillStyle = '#ecf0e1'; ctx.font = '50px sans-serif'; ctx.fillText('Reference Farm 001', 70, 150);
    ctx.fillStyle = '#719b94'; ctx.font = '22px sans-serif'; ctx.fillText('SIMULATED TELEMETRY · HUMAN-SUPERVISED SYSTEM', 70, 198);
    const metrics = [['AIR TEMPERATURE', `${weather.temp} °C`], ['RELATIVE HUMIDITY', `${weather.rh} %`], ['WIND SPEED', `${weather.wind} m/s`], ['CROP SEASON', `Day ${state.day}`]];
    metrics.forEach(([label, value], i) => { const x = 70 + i * 480; ctx.fillStyle = '#213739'; ctx.fillRect(x, 250, 445, 180); ctx.fillStyle = '#88aaa2'; ctx.font = '20px sans-serif'; ctx.fillText(label, x + 22, 298); ctx.fillStyle = '#dcecdf'; ctx.font = '48px sans-serif'; ctx.fillText(value, x + 22, 381); });
    ctx.strokeStyle = '#30534f'; ctx.lineWidth = 2; for (let x = 70; x < 1250; x += 60) { ctx.beginPath(); ctx.moveTo(x, 490); ctx.lineTo(x, 900); ctx.stroke(); }
    for (let y = 490; y < 900; y += 55) { ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(1250, y); ctx.stroke(); }
    ctx.fillStyle = '#436b54'; for (let i = 0; i < 3; i++) ctx.fillRect(140 + i * 280, 550, 210, 250);
    ctx.strokeStyle = '#81b4a6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(110, 847); ctx.lineTo(1190, 847); ctx.lineTo(1190, 580); ctx.stroke();
    ctx.fillStyle = '#87c9ba'; ctx.font = '26px sans-serif'; ctx.fillText('CONTROL POLICY', 1340, 534); ctx.fillStyle = '#dbe9dc'; ctx.font = '38px sans-serif'; ctx.fillText(state.scenario.toUpperCase(), 1340, 606);
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#91aca3'; ctx.fillText(`Weather / ${state.weather}`, 1340, 690); ctx.fillText(`Rain / ${weather.rain} mm/h`, 1340, 744); ctx.fillText('LOCAL MODEL · NO LIVE ACTUATION', 1340, 858);
    ctx.fillStyle = '#5b837a'; ctx.font = '20px sans-serif'; ctx.fillText('OBSERVE   →   INTERPRET   →   REVIEW   →   BOUNDED ACTION', 70, 966); texture.needsUpdate = true;
  }, dispose() { displays.forEach(d => d.geometry.dispose()); material.dispose(); texture.dispose(); } };
}
