import * as T from 'three';
import './styles/scene.css';
import './style.css';
import {initNavigation} from './pages/navigation';
import { createState, shadowSignature } from './state';
import { Controls } from './controls';
import { Environment } from './environment';
import { loadWorld, type World } from './world';
import { Character } from './character';
import { UI, byId } from './ui';
import {showTextureStatus} from './textures';

interface GardenAPI { ready: boolean; getState(): unknown; stats(): Record<string, unknown>; focus(view: string): void; setTime(time: number): void }
declare global { interface Window { __garden?: GardenAPI } }
const canvas = byId<HTMLCanvasElement>('gl'), state = createState();
initNavigation();
if (new URLSearchParams(location.search).get('quality') === 'performance') state.quality = 'performance';
let renderer: T.WebGLRenderer, world: World | undefined, character: Character, ui: UI;
const loading = byId('loading'), enter = byId<HTMLButtonElement>('enterBtn'); enter.disabled = true;
loading.innerHTML = '<div><strong>Trusted Garden / V0.8 HD</strong><small id="hdLoadMessage">Preparing detailed farm</small><progress id="hdProgress" max="1" value="0"></progress></div>';
async function boot() {
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; renderer.info.autoReset = false;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, innerWidth / innerHeight, .08, 400);
    const controls = new Controls(camera, canvas, state, action => ui?.action(action));
    const environment = new Environment(renderer, scene, camera);
    let completedWorld: World | undefined;
    try {
      completedWorld = await loadWorld((value, message) => { byId<HTMLProgressElement>('hdProgress').value = value; byId('hdLoadMessage').textContent = message; },renderer);
      character = await Character.load();
    } catch (error) { completedWorld?.dispose(); environment.composer.dispose(); environment.pmrem.dispose(); environment.env.dispose(); renderer.dispose(); throw error; }
    world = completedWorld; scene.add(world.root, character.root); controls.configure(world.obstacles, world.solids,world.ground);
    function snapshot() { environment.render(); canvas.toBlob(blob => { if (!blob) return; const link = document.createElement('a'), url = URL.createObjectURL(blob); link.href = url; link.download = `trusted-garden-v0.8-hd-${state.view}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }, 'image/png'); }
    ui = new UI(state, controls, snapshot); enter.disabled = false;showTextureStatus(world.delivery);
    let lastShadowSignature='',shadowRevision=0;
    const stats = () => {
      const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { triangles: world!.manifest.stats.triangles, meshes: world!.meshes.length, calls: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, modelBytes: world!.manifest.stats.modelBytes, headVisible: !character.first, camera: camera.position.toArray(), position: controls.position.toArray(), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), canvas: [canvas.width, canvas.height], quality: state.quality, visibleLayers: state.layers, shadowRevision,textureDelivery:{...world!.delivery.state} };
    };
    window.__garden = { ready: true, getState: () => ({ ...state, position: controls.position.toArray() }), stats, focus: view => ui.focus(view), setTime: time => { state.time = T.MathUtils.clamp(time, 0, 1); } };
    loading.style.display = 'none';
    let previous = performance.now();
    renderer.setAnimationLoop(now => {
      const dt = Math.min(.05, Math.max(.001, (now - previous) / 1000)); previous = now;
      if (state.sundial) state.time = (state.time + dt / 80) % 1;
      controls.update(dt); character.root.visible = state.layers.base; character.update(controls.position, controls.yaw, controls.speed, dt, state.walkMode && state.person === 'first', now / 1000);
      if (state.walkMode) renderer.shadowMap.needsUpdate = true;
      world!.update(state, now / 1000); environment.update(state, dt); ui.update(dt, camera);
      const shadowKey=shadowSignature(state);if(shadowKey!==lastShadowSignature){renderer.shadowMap.needsUpdate=true;lastShadowSignature=shadowKey;shadowRevision++;}
      renderer.info.reset(); environment.render();
    });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); world!.delivery.dispose();renderer.setAnimationLoop(null); loading.style.display = 'grid'; loading.innerHTML = '<div>Graphics context interrupted.<br><button id="hdRetry">Reload scene</button></div>'; byId('hdRetry').onclick = () => location.reload(); });
    requestAnimationFrame(()=>{void world!.delivery.start();});
  } catch (error) {
    console.error(error); loading.style.display = 'grid'; loading.innerHTML = '<div><strong>The farm could not be loaded</strong><small id="hdLoadError"></small><button id="hdRetry">Retry</button></div>'; byId('hdLoadError').textContent = error instanceof Error ? error.message : String(error); byId('hdRetry').onclick = () => location.reload();
  }
}
void boot();
