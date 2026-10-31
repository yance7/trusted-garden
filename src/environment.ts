import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import content from './content.json';
import type { AppState } from './state';
export class Environment {
  renderer: T.WebGLRenderer; scene: T.Scene; camera: T.PerspectiveCamera;
  sun = new T.DirectionalLight(0xfff3db, 3.5); hemi = new T.HemisphereLight(0xc6dcf6, 0x696d4b, 1.6); sky = new Sky();
  composer: EffectComposer; ao: GTAOPass; pmrem: T.PMREMGenerator; env: T.WebGLRenderTarget; rain: T.Points; rainPositions: Float32Array;
  quality = ''; signature = ''; frameScale = 1; width = 0; height = 0;
  sunDir = new T.Vector3(.4, .8, .3); shadowFocus: T.Vector3 | null = null;
  constructor(renderer: T.WebGLRenderer, scene: T.Scene, camera: T.PerspectiveCamera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    scene.add(this.sun, this.sun.target, this.hemi); this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: .5, far: 130 });
    this.sun.shadow.bias = -.00008; this.sun.shadow.normalBias = .045; this.sun.shadow.mapSize.set(4096, 4096);
    this.sky.scale.setScalar(450); scene.add(this.sky);
    Object.assign(this.sky.material.uniforms, { turbidity: { value: 3 }, rayleigh: { value: 2.1 }, mieCoefficient: { value: .003 }, mieDirectionalG: { value: .84 } });
    this.pmrem = new T.PMREMGenerator(renderer); const room = new RoomEnvironment(); this.env = this.pmrem.fromScene(room, .05); scene.environment = this.env.texture; scene.environmentIntensity=.4; room.dispose();
    const ground = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: 0x8f9a83, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.51; ground.receiveShadow = true; scene.add(ground);
    scene.fog = new T.FogExp2(0xc8d5d5, .003);
    const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType }); target.samples = Math.min(4, renderer.capabilities.maxSamples);
    this.composer = new EffectComposer(renderer, target); this.composer.addPass(new RenderPass(scene, camera));
    // GTAO reuses the beauty buffer, so ambient occlusion costs one extra geometry pass instead of two.
    this.ao = new GTAOPass(scene, camera, 1, 1); this.ao.output = GTAOPass.OUTPUT.Default;
    this.ao.updateGtaoMaterial({ radius: .3, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 6, distanceFallOff: 1, screenSpaceRadius: false });
    this.ao.blendIntensity = .55; this.composer.addPass(this.ao);
    this.composer.addPass(new OutputPass());
    this.rainPositions = new Float32Array(1300 * 3);
    for (let i = 0; i < this.rainPositions.length; i += 3) { this.rainPositions[i] = Math.sin(i * 19.7) * 25; this.rainPositions[i + 1] = (i * .371) % 18; this.rainPositions[i + 2] = Math.cos(i * 8.3) * 20; }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(this.rainPositions, 3)); this.rain = new T.Points(geometry, new T.PointsMaterial({ color: 0xccdeeb, size: .026, transparent: true, opacity: .5, depthWrite: false })); scene.add(this.rain);
  }
  setQuality(state: AppState) {
    if (this.quality === state.quality) return;
    this.quality = state.quality; const perf = state.quality === 'performance'; this.ao.enabled = !perf;
    const size = perf ? 2048 : 3072; if (this.sun.shadow.mapSize.x !== size) { this.sun.shadow.mapSize.set(size, size); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.needsUpdate = true; this.width = 0;
  }
  /** Walking re-renders shadows into a tight frustum around the researcher instead of the whole farm. */
  setShadowFocus(position: T.Vector3 | null) {
    const cam = this.sun.shadow.camera as T.OrthographicCamera;
    if (!position) {
      if (!this.shadowFocus) return;
      this.shadowFocus = null; cam.left = -30; cam.right = 30; cam.top = 30; cam.bottom = -30; cam.updateProjectionMatrix();
      this.sun.target.position.set(0, 0, 0); this.sun.position.copy(this.sunDir).multiplyScalar(65);
      this.renderer.shadowMap.needsUpdate = true; return;
    }
    if (!this.shadowFocus) { this.shadowFocus = new T.Vector3(); cam.left = -9; cam.right = 9; cam.top = 9; cam.bottom = -9; cam.updateProjectionMatrix(); }
    this.shadowFocus.copy(position);
    this.sun.target.position.copy(position); this.sun.position.copy(position).addScaledVector(this.sunDir, 65);
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    if (w === this.width && h === this.height) return;
    this.width = w; this.height = h;
    const perf = this.quality === 'performance', cap = perf ? 1 : this.quality === 'photo' ? 3 : 2;
    const budget = perf ? 1600 * 900 : this.quality === 'photo' ? 7680 * 4320 : 3840 * 2160;
    const desired=this.quality==='photo'?Math.max(2,devicePixelRatio):devicePixelRatio;
    const hardwareLimit=Math.min(this.renderer.capabilities.maxTextureSize,this.renderer.getContext().getParameter(this.renderer.getContext().MAX_RENDERBUFFER_SIZE));
    const dpr = Math.min(desired, cap, Math.sqrt(budget / (w * h)),hardwareLimit/w,hardwareLimit/h);
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false); this.composer.setPixelRatio(dpr); this.composer.setSize(w, h);
    // Ambient occlusion only modulates the beauty buffer, so half-resolution AO is invisible at a fraction of the cost.
    this.ao.setSize(Math.max(2, Math.round(w * dpr * .4)), Math.max(2, Math.round(h * dpr * .4)));
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  update(state: AppState, dt: number) {
    this.setQuality(state); this.resize();
    const signature = `${state.weather}-${state.time.toFixed(3)}`;
    if (this.signature !== signature) {
      this.renderer.shadowMap.needsUpdate = true;
      this.signature = signature; const cloudy = ['cloud', 'rain', 'storm', 'fog'].includes(state.weather); const elevation = Math.sin(Math.PI * state.time) * .95 + .12;
      const azimuth = -1.32 + 2.62 * state.time, sun = new T.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
      this.sunDir.copy(sun);
      if (this.shadowFocus) { this.sun.target.position.copy(this.shadowFocus); this.sun.position.copy(this.shadowFocus).addScaledVector(sun, 65); }
      else { this.sun.position.copy(sun).multiplyScalar(65); this.sun.target.position.set(0, 0, 0); }
      this.sky.material.uniforms.sunPosition.value.copy(sun);
      this.sky.material.uniforms.turbidity.value = cloudy ? 9 : state.weather === 'heat' ? 5 : 2.8;
      this.sun.intensity = state.weather === 'storm' ? .35 : cloudy ? 1.2 : 2.8; this.sun.color.set(elevation < .42 ? 0xffcf91 : 0xfff3e4);
      this.hemi.intensity = state.weather === 'storm' ? .5 : cloudy ? 1.0 : .9;
      const fogColor = (content.weather as Record<string, { fogColor?: number[] }>)[state.weather]?.fogColor;
      if (fogColor) (this.scene.fog as T.FogExp2).color.setRGB(fogColor[0], fogColor[1], fogColor[2]);
      (this.scene.fog as T.FogExp2).density = state.weather === 'fog' ? .035 : state.weather === 'storm' ? .016 : state.weather === 'rain' ? .010 : .003;
      this.renderer.toneMappingExposure = elevation < .4 ? 1.05 : .95;
      this.rain.visible = ['rain', 'storm'].includes(state.weather);
    }
    if (this.rain.visible) { for (let i = 1; i < this.rainPositions.length; i += 3) { this.rainPositions[i] -= dt * (state.weather === 'storm' ? 14 : 8); if (this.rainPositions[i] < 0) this.rainPositions[i] += 18; } this.rain.geometry.attributes.position.needsUpdate = true; }
  }
  render() { this.composer.render(); }
}
