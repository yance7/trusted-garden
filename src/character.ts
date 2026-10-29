import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { assetURL } from './world';
export class Character {
  root: T.Group; bones: Record<string, T.Bone> = {}; meshes: T.SkinnedMesh[] = []; phase = 0; first = false;
  constructor(root: T.Group) {
    this.root = root; root.traverse(o => { if (o instanceof T.Bone) this.bones[o.name] = o; if (o instanceof T.SkinnedMesh) { this.meshes.push(o); o.castShadow = true; o.receiveShadow = true; } });
  }
  static async load() { const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(assetURL('researcher-v0.8-hd.glb')); return new Character(gltf.scene); }
  update(position: T.Vector3, yaw: number, speed: number, dt: number, first: boolean, time: number) {
    this.root.position.copy(position);this.root.position.y-=.0475; this.root.rotation.y = yaw + Math.PI;
    this.phase += dt * speed * 3.5; const stride = Math.min(1, speed / 2.0), swing = Math.sin(this.phase) * .52 * stride;
    this.bones.hipL.rotation.x = swing; this.bones.hipR.rotation.x = -swing;
    this.bones.kneeL.rotation.x = Math.max(0, -swing) * 1.4; this.bones.kneeR.rotation.x = Math.max(0, swing) * 1.4;
    this.bones.shoulderL.rotation.x = -swing * .65 + .06; this.bones.shoulderR.rotation.x = swing * .35 + .04;
    this.bones.elbowL.rotation.x = -.18; this.bones.elbowR.rotation.x = -.42;
    this.bones.chest.rotation.x = -.025 * stride; this.bones.chest.scale.y = 1 + Math.sin(time * 1.9) * .004;
    if (this.first !== first) {
      this.first = first;
      // Exporter may merge groups, so head geometry is masked via its neck bone scale instead.
      // The neck only carries head/hat; leave shoulder/body bones unchanged.
      this.bones.neck.scale.setScalar(first ? .001 : 1);
    }
  }
}
