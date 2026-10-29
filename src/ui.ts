import * as T from 'three';
import content from './content.json';
import { advanceTour, type AppState, type Quality } from './state';
import { updateFlow } from './flow';
import type { Controls } from './controls';
export const byId = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
export class UI {
  state: AppState; controls: Controls; labels: { element: HTMLElement; position: T.Vector3 }[] = []; snapshot: () => void;
  tourIndex = 0; tourTime = 0; elapsed = 0;
  constructor(state: AppState, controls: Controls, snapshot: () => void) {
    this.state = state; this.controls = controls; this.snapshot = snapshot;
    document.querySelector('.wordmark span')!.textContent = 'REFERENCE FARM 001 · INTELLIGENT LANDSCAPE / V0.8 HD';
    byId('hero').querySelectorAll('p').forEach(p => { if (/self-contained|V0\.8/.test(p.textContent || '')) p.textContent = 'A high-detail reference farm. Explore the physical systems, biological loops and human-supervised intelligence. All live readings are simulated.'; });
    byId('qualityHigh').id = 'quality-high'; byId('qualityPerf').id = 'quality-performance';
    byId('quality-high').textContent = 'High detail'; byId('quality-performance').textContent = 'Performance';
    byId('quality-high').parentElement!.insertAdjacentHTML('beforeend', '<button id="quality-photo">Photo HD</button>');
    const bar = document.createElement('div'); bar.className = 'hd-toolbar'; bar.setAttribute('aria-label', 'Scene controls');
    bar.innerHTML = '<button id="v8Walk">Walk mode</button><button id="v7Sundial">Sundial</button><button id="v7Cinema">Cinematic</button><button id="v7Shot">Snapshot</button><button id="v7Full">Fullscreen</button><button id="v7Reset">Reset</button><button id="v7Photo">Photo</button><button id="v7Help">Keys</button>';
    document.body.append(bar);
    const mobile=document.createElement('div');mobile.className='hd-mobile-controls';mobile.innerHTML=`<label>View<select id="hdMobileView" aria-label="Farm viewpoint">${Object.entries(content.views).map(([key,v])=>`<option value="${key}">${v.story[0]}</option>`).join('')}</select></label><label>Display<select id="hdMobileMode" aria-label="Farm display mode"><option value="spatial">Spatial model</option><option value="systems">Systems model</option><option value="flow">Data & control flow</option></select></label>`;document.body.append(mobile);
    byId<HTMLSelectElement>('hdMobileView').onchange=e=>this.focus((e.target as HTMLSelectElement).value);byId<HTMLSelectElement>('hdMobileMode').onchange=e=>this.mode((e.target as HTMLSelectElement).value as AppState['mode']);
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>this.mode(b.dataset.mode as AppState['mode']));
    const walk = document.createElement('div'); walk.id = 'hdWalkPanel'; walk.className = 'hd-walk-panel hidden'; walk.innerHTML = '<span>FIELD RESEARCHER</span><button id="v8First">First person</button><button id="v8Third">Third person</button><button id="v8Exit">Exit walk</button><small>WASD / arrows · Shift run · drag to look · V switch · Esc exit</small>'; document.body.append(walk);
    document.body.insertAdjacentHTML('beforeend', '<div class="hd-time"><label for="v7Tod">Time of day</label><input id="v7Tod" type="range" min="0" max="100" value="44"><output id="hdClock">12:10</output></div><div id="hdCrosshair" aria-hidden="true"></div><button id="v7ExitPhoto">Exit photo · H</button><div class="hd-minimap"><span>SITE PLAN <small>LIVE CAMERA</small></span><canvas id="hdMap" width="240" height="160"></canvas></div><div id="hd-toast" role="status"></div><dialog id="hdHelp"><h2>Explore Trusted Garden</h2><p>Drag: orbit · Scroll: zoom · Right drag: pan</p><p>1–8: viewpoints · T: guided tour · W: weather</p><p>G: walk · WASD / arrows: move · Shift: run · V: first / third person</p><p>S: snapshot · H: photo · Y: sundial · C: cinematic · F: fullscreen · R: reset</p><p>Double-click while walking: mouse lock · Esc: release / exit</p><button id="v7HelpClose">Close</button></dialog>');
    byId<HTMLInputElement>('v7Tod').oninput = e => { state.time = Number((e.target as HTMLInputElement).value) / 100; state.sundial = false; };
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => this.focus(b.dataset.view!));
    document.querySelectorAll<HTMLButtonElement>('[data-w]').forEach(b => b.onclick = () => this.weather(b.dataset.w!));
    document.querySelectorAll<HTMLButtonElement>('[data-s]').forEach(b => b.onclick = () => { state.scenario = b.dataset.s!; this.drawer(); this.sync(); });
    document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b => { b.setAttribute('aria-label', `${b.parentElement!.querySelector('span')!.textContent} layer`); b.onclick = () => { state.layers[b.dataset.layer!] = !state.layers[b.dataset.layer!]; this.sync(); }; });
    for (const q of ['high', 'performance', 'photo'] as Quality[]) byId(`quality-${q}`).onclick = () => { state.quality = q; this.sync(); };
    byId<HTMLInputElement>('daySlider').oninput = e => { state.day = Number((e.target as HTMLInputElement).value); byId('dayText').textContent = `Day ${state.day} · simulated growth stage`; };
    for (const [id, action] of Object.entries({ v8Walk: 'walk', v8Exit: 'walk', v7Sundial: 'sundial', v7Cinema: 'cinematic', v7Shot: 'snapshot', v7Full: 'fullscreen', v7Reset: 'reset', resetViewBtn: 'reset', v7Photo: 'photo', v7ExitPhoto: 'photo', v7Help: 'help', dataBtn: 'drawer', tourBtn: 'tour' })) byId(id).onclick = () => this.action(action);
    byId('v8First').onclick = () => { controls.setPerson('first'); this.sync(); }; byId('v8Third').onclick = () => { controls.setPerson('third'); this.sync(); };
    byId('v7HelpClose').onclick = () => byId<HTMLDialogElement>('hdHelp').close();
    for (const [button, modal] of [['storyBtn', 'storyModal'], ['basisBtn', 'basisModal'], ['systemBtn', 'systemModal']]) byId(button).onclick = () => byId(modal).classList.add('open');
    document.querySelectorAll<HTMLElement>('.modal').forEach(modal => { modal.querySelector<HTMLElement>('.closebtn')!.onclick = () => modal.classList.remove('open'); modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); }); });
    byId('prevTour').onclick = () => this.next(-1); byId('nextTour').onclick = () => this.next(1);
    byId('labelSwitch').onclick = () => { state.labels = !state.labels; this.sync(); }; byId('dataOverlay').onclick = () => { state.overlay = !state.overlay; this.sync(); };
    byId('enterBtn').onclick = () => { byId('hero').classList.add('hidden'); document.body.classList.add('hd-entered'); this.focus('overview'); };
    for (const [text, position] of content.labels) { const el = document.createElement('button'); el.className = 'hotspot'; el.textContent = String(text).replaceAll('�', '·'); el.onclick = () => { const near = Object.entries(content.views).sort((a, b) => new T.Vector3(...a[1].target as [number,number,number]).distanceTo(new T.Vector3(...position as [number,number,number])) - new T.Vector3(...b[1].target as [number,number,number]).distanceTo(new T.Vector3(...position as [number,number,number])))[0][0]; this.focus(near); }; byId('labels').append(el); this.labels.push({ element: el, position: new T.Vector3(...position as [number, number, number]) }); }
    byId('weatherDock').append(byId('quality-high').parentElement!,document.querySelector('.hd-time')!);
    this.focus('overview'); this.weather('clear');window.addEventListener('resize',()=>this.sync());
  }
  toast(message: string) { const el = byId('hd-toast'); el.textContent = message; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 2600); }
  focus(view: string) { this.controls.focus(view); this.drawer(); this.sync(); const v = (content.views as Record<string, { story: string[] }>)[view]; if (v) for (const [i, id] of ['storyKicker', 'storyTitle', 'storyCopy'].entries()) byId(id).textContent = v.story[i]; }
  mode(mode:AppState['mode']){this.state.mode=mode;if(mode==='spatial')this.state.overlay=false;else{this.state.labels=true;this.focus('compute');if(mode==='flow'){byId('drawer').classList.add('open');byId('dataBtn').classList.add('active');}}this.sync();}
  weather(key: string) { this.state.weather = key; const w = (content.weather as Record<string, { name: string; temp: number; rh: number; wind: number; rain: number; action: string }>)[key]; byId('weatherName').textContent = w.name; for (const [id, value] of Object.entries({ wTemp: `${w.temp}°`, wRh: `${w.rh}%`, wWind: w.wind.toFixed(1), wRain: w.rain.toFixed(1) })) byId(id).textContent = value; byId('weatherAction').textContent = `${w.action} · Simulated`; this.sync(); }
  drawer() {
    const view = this.state.view, key = ({ field: 'plotB', entrance: 'overview', north: 'overview', overview: 'overview' } as Record<string, string>)[view] || view;
    const all = content.scenarios as unknown as Record<string, Record<string, { type: string; title: string; desc: string; metrics: string[][]; decision: string; trace: string[][] }>>;
    const values = all[this.state.scenario] || all.normal, d = values[key] || values.control;
    for (const [id, value] of Object.entries({ drawerType: d.type, drawerTitle: d.title, drawerDesc: d.desc })) byId(id).textContent = value;
    byId('metrics').innerHTML = d.metrics.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join(''); byId('decision').innerHTML = d.decision;
    byId('trace').innerHTML = d.trace.map(x => `<div class="trace-row"><time>${x[0]}</time><div><b>${x[1]}</b> · <span>${x[2]}</span></div></div>`).join('');
  }
  next(dir: number) { const order = ['entrance', 'control', 'compute', 'field', 'pond', 'aqua', 'north', 'overview']; this.tourIndex = (this.tourIndex + dir + order.length) % order.length; this.focus(order[this.tourIndex]); }
  action(name: string) {
    const s = this.state;
    (document.querySelector('.hd-minimap')as HTMLElement).style.top=`${byId('weatherDock').getBoundingClientRect().bottom+14}px`;
    if(name.startsWith('view:')){this.focus(name.slice(5));return;}
    if (name === 'walk') {if(!s.walkMode)s.tour=false;this.controls.setWalk(!s.walkMode);}
    else if (name === 'person' && s.walkMode) this.controls.setPerson(s.person === 'first' ? 'third' : 'first');
    else if (name === 'weather') { const keys = Object.keys(content.weather); this.weather(keys[(keys.indexOf(s.weather) + 1) % keys.length]); }
    else if (name === 'drawer') byId('drawer').classList.toggle('open');
    else if (name === 'tour') { s.tour = !s.tour; this.tourTime = 0; if (s.tour) { this.tourIndex = -1; this.next(1); } }
    else if (name === 'snapshot') this.snapshot();
    else if (name === 'fullscreen') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => this.toast('Fullscreen is unavailable in this browser')); }
    else if (name === 'reset') { s.cinematic = false; this.focus('overview'); }
    else if (name === 'photo') { s.photo = !s.photo; document.body.classList.toggle('hd-photo', s.photo); }
    else if (name === 'help') byId<HTMLDialogElement>('hdHelp').showModal();
    else if (name === 'escape') { if (s.walkMode) this.controls.setWalk(false);s.tour=false;s.photo=false;document.body.classList.remove('hd-photo');document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); }
    else if (name === 'labels') s.labels = !s.labels;
    else if (name === 'sundial') s.sundial = !s.sundial;
    else if (name === 'cinematic') s.cinematic = !s.cinematic;
    this.sync();
  }
  sync() {
    const s = this.state;
    document.querySelectorAll<HTMLElement>('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===s.mode));byId<HTMLSelectElement>('hdMobileView').value=s.view;byId<HTMLSelectElement>('hdMobileMode').value=s.mode;
    document.querySelectorAll<HTMLElement>('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === s.view));
    document.querySelectorAll<HTMLElement>('[data-w]').forEach(b => b.classList.toggle('active', b.dataset.w === s.weather));
    document.querySelectorAll<HTMLElement>('[data-s]').forEach(b => b.classList.toggle('active', b.dataset.s === s.scenario));
    document.querySelectorAll<HTMLElement>('[data-layer]').forEach(b => { b.classList.toggle('on', s.layers[b.dataset.layer!] !== false); b.setAttribute('aria-pressed', String(s.layers[b.dataset.layer!] !== false)); });
    for (const q of ['high', 'performance', 'photo']) byId(`quality-${q}`).classList.toggle('active', q === s.quality);
    byId('hdWalkPanel').classList.toggle('hidden', !s.walkMode); byId('v8Walk').classList.toggle('active', s.walkMode); byId('v8First').classList.toggle('active', s.person === 'first'); byId('v8Third').classList.toggle('active', s.person === 'third');
    byId('hdCrosshair').classList.toggle('visible', s.walkMode && s.person === 'first'); byId('tourBtn').classList.toggle('active', s.tour);
    byId('labelSwitch').classList.toggle('on', s.labels); byId('dataOverlay').classList.toggle('on', s.overlay);
  }
  update(dt: number, camera: T.Camera) {
    if(this.state.tour){const clock=advanceTour(this.tourTime,dt);this.tourTime=clock.time;for(let i=0;i<clock.steps;i++)this.next(1);}
    this.elapsed += dt; if (this.elapsed < .06) return; this.elapsed = 0;
    const s = this.state;
    updateFlow(s.mode,camera);
    byId('hdClock').textContent = `${String(Math.floor(6 + s.time * 14)).padStart(2, '0')}:${String(Math.floor((s.time * 14 % 1) * 60)).padStart(2, '0')}`;
    if (s.sundial) byId<HTMLInputElement>('v7Tod').value = String(s.time * 100);
    for (const label of this.labels) { const p = label.position.clone().project(camera); const visible = s.labels && !s.walkMode && p.z < 1 && p.z > -1 && Math.abs(p.x) < .97 && Math.abs(p.y) < .9; label.element.style.display = visible ? 'block' : 'none'; label.element.style.left = `${(p.x * .5 + .5) * innerWidth}px`; label.element.style.top = `${(-p.y * .5 + .5) * innerHeight}px`; }
    const ctx = byId<HTMLCanvasElement>('hdMap').getContext('2d')!; ctx.clearRect(0, 0, 240, 160); ctx.fillStyle = '#edece2'; ctx.fillRect(0, 0, 240, 160);
    const map = (x: number, z: number) => [120 + x * 5, 80 + z * 4.3];
    ctx.strokeStyle = '#d1d4c5'; for (let x = 0; x < 240; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 160); ctx.stroke(); }
    ctx.fillStyle = '#9cae87'; for (const z of [-7.4, 0, 7.2]) { const p = map(-15, z - 2.5); ctx.fillRect(p[0], p[1], 48, 21); }
    ctx.fillStyle = '#93b4b0'; let p = map(9.5, 5.1); ctx.beginPath(); ctx.ellipse(p[0], p[1], 19, 16, 0, 0, Math.PI * 2); ctx.fill(); p = map(6, -10.8); ctx.fillRect(p[0], p[1], 47, 35); ctx.fillStyle = '#b8aa83'; p = map(-1, -13); ctx.fillRect(p[0], p[1], 40, 17);
    const direction = new T.Vector3(); camera.getWorldDirection(direction); p = map(camera.position.x, camera.position.z); ctx.fillStyle = '#244c43'; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#244c43'; ctx.beginPath(); ctx.moveTo(...p as [number, number]); ctx.lineTo(p[0] + direction.x * 15, p[1] + direction.z * 13); ctx.stroke();
  }
}
