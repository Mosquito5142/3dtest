// Static batching: merges every non-animated mesh that shares a material into one mesh per
// chunk, turning thousands of draw calls into a few dozen. Chunks keep frustum culling useful.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Track } from "./zones/types";

const KEEP = ["position", "normal", "uv"];

function isDynamic(o: THREE.Object3D, root: THREE.Object3D) {
  for (let a: THREE.Object3D | null = o; a && a !== root; a = a.parent) if (a.userData.dynamic) return true;
  return false;
}

/**
 * @param chunkOf maps a root-local position to a chunk id (meshes are only merged within a chunk)
 */
export function bakeStatic(root: THREE.Object3D, track: Track, chunkOf: (p: THREE.Vector3) => number) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  type Bucket = { material: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean };
  const buckets = new Map<string, Bucket>();
  const victims: THREE.Mesh[] = [];
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || Array.isArray(o.material)) return;
    if (isDynamic(o, root)) return;
    const src = o.geometry as THREE.BufferGeometry;
    if (!src.attributes.position || !src.attributes.normal) return;
    m.multiplyMatrices(toRoot, o.matrixWorld);
    let g = src.index ? src.toNonIndexed() : src.clone();
    for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) {
      g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    g.applyMatrix4(m);
    g.morphAttributes = {};
    g.clearGroups();
    p.setFromMatrixPosition(m);
    const key = `${o.material.uuid}:${chunkOf(p)}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { material: o.material, geos: [], cast: false, receive: false }));
    b.geos.push(g);
    b.cast ||= o.castShadow;
    b.receive ||= o.receiveShadow;
    victims.push(o);
  });

  for (const v of victims) v.removeFromParent();
  let meshes = 0;
  for (const b of buckets.values()) {
    const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (b.geos.length > 1) b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    track(merged);
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    meshes++;
  }
  return { merged: victims.length, meshes };
}
