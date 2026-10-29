import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCollision, shortcut, type AppState, type Obstacle } from './state';
import content from './content.json';
export class Controls {
  orbit: OrbitControls; camera: T.PerspectiveCamera; state: AppState;
  keys = new Set<string>(); position = new T.Vector3(0, 0, 9); yaw = 0; pitch = .04; speed = 0;
  targetPosition = new T.Vector3(); targetLook = new T.Vector3(); transition = 0; dragging = false;
  collision = createCollision([]); ray = new T.Raycaster(); solids: T.Object3D[] = [];
  constructor(camera: T.PerspectiveCamera, canvas: HTMLCanvasElement, state: AppState, action: (name: string) => void) {
    this.camera = camera; this.state = state; this.orbit = new OrbitControls(camera, canvas); this.orbit.enableDamping = true; this.orbit.dampingFactor = .09; this.orbit.maxPolarAngle = Math.PI * .48; this.orbit.minDistance = 1; this.orbit.maxDistance = 85;
    this.orbit.addEventListener('start', () => this.transition = 0);
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement)?.matches('input,select,textarea') && !['Escape'].includes(e.key)) return;
      const k = e.key.toLowerCase(), command = shortcut(k, state); this.keys.add(k);
      if (command === 'move') { e.preventDefault(); return; }
      if (!e.repeat && command) action(command);
      if (!state.walkMode && /^[1-8]$/.test(k)) this.focus(Object.keys(content.views)[Number(k) - 1]);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.dragging = false; });
    canvas.addEventListener('pointerdown', e => { if (state.walkMode) { this.dragging = true; canvas.setPointerCapture(e.pointerId); } });
    window.addEventListener('pointerup', () => this.dragging = false);
    window.addEventListener('pointermove', e => { if (state.walkMode && (this.dragging || document.pointerLockElement === canvas)) { this.yaw -= e.movementX * .003; this.pitch = T.MathUtils.clamp(this.pitch - e.movementY * .003, -1.15, 1.05); } });
    canvas.addEventListener('dblclick', () => { if (state.walkMode) canvas.requestPointerLock()?.catch(() => {}); });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) { this.keys.clear(); this.dragging = false; } });
    this.focus('overview', true);
  }
  configure(boxes: Obstacle[], solids: T.Object3D[]) { this.collision = createCollision(boxes); this.solids = solids; if (!this.collision.isFree(this.position.x, this.position.z)) { for (let z = 12; z > -12; z -= .5) if (this.collision.isFree(0, z)) { this.position.set(0, 0, z); break; } } }
  focus(view: string, immediate = false) {
    const v = (content.views as Record<string, { eye: number[]; target: number[] }>)[view]; if (!v) return;
    this.setWalk(false); this.state.view = view; this.targetPosition.fromArray(v.eye); this.targetLook.fromArray(v.target); this.transition = 1;
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) { this.camera.position.copy(this.targetPosition); this.orbit.target.copy(this.targetLook); this.transition = 0; }
    this.orbit.update();
  }
  setWalk(value: boolean) { this.state.walkMode = value; this.orbit.enabled = !value; this.keys.clear(); this.transition = 0; if (!value) { document.exitPointerLock?.(); this.orbit.target.set(this.position.x, 1.2, this.position.z); } }
  setPerson(person: 'first' | 'third') { this.state.person = person; }
  update(dt: number) {
    if (!this.state.walkMode) {
      if (this.transition) { const a = 1 - Math.exp(-dt * 5); this.camera.position.lerp(this.targetPosition, a); this.orbit.target.lerp(this.targetLook, a); if (this.camera.position.distanceToSquared(this.targetPosition) < .002) this.transition = 0; }
      this.orbit.autoRotate = this.state.cinematic; this.orbit.autoRotateSpeed = .35; this.orbit.update(dt); this.speed = 0; return;
    }
    let f = Number(this.keys.has('w') || this.keys.has('arrowup')) - Number(this.keys.has('s') || this.keys.has('arrowdown'));
    let side = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    const length = Math.hypot(f, side); if (length) { f /= length; side /= length; }
    const step = (this.keys.has('shift') ? 4.5 : 2.0) * dt;
    const dx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * side) * step;
    const dz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * side) * step;
    const p = this.collision.resolve(this.position.x, this.position.z, dx, dz); this.speed = Math.hypot(p[0] - this.position.x, p[1] - this.position.z) / Math.max(dt, .001); this.position.set(p[0], 0, p[1]);
    const eye = this.position.clone().add(new T.Vector3(0, 1.63, 0)); const forward = new T.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    if (this.state.person === 'first') { this.camera.position.copy(eye); if (this.speed > .05 && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.camera.position.y += Math.sin(performance.now() * .012) * .012; this.camera.lookAt(eye.clone().add(forward)); }
    else {
      const desired = eye.clone().addScaledVector(forward, -4.4).add(new T.Vector3(0, .75, 0));
      const direction = desired.clone().sub(eye); const distance = direction.length(); this.ray.set(eye, direction.normalize()); this.ray.far = distance;
      const hits = this.ray.intersectObjects(this.solids, false); if (hits.length) desired.copy(eye).addScaledVector(direction, Math.max(.45, hits[0].distance - .3));
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 9)); this.camera.lookAt(eye);
    }
  }
}
