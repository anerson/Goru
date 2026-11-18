// Cartoon look: light falls in three flat bands (MeshToonMaterial with a 3-step gradient) and
// characters, villagers and guardians get a dark outline (inverted hull: a slightly larger copy
// of each part, drawn from the inside, in near-black).
// Materials are converted in place: the toon copy SHARES the original's colour objects and
// mirrors its emissive intensity and opacity, so code that recolours or flashes the original
// material (outfits, hit flashes, glowing seams) keeps working without knowing about this.
// Materials with their own shader code (wind on leaves and bark) are left alone.
import * as THREE from 'three';

let gradient = null;
function gradientMap() {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 170, 255]);           // shadow, mid, lit
  gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const converted = new WeakMap();
const baseOnBeforeCompile = THREE.Material.prototype.onBeforeCompile;
function toToon(m) {
  if (!m || converted.has(m)) return converted.get(m) ?? m;
  if (!(m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial)) return m;
  if (m.onBeforeCompile !== baseOnBeforeCompile) return m;      // custom shader (wind): keep
  const t = new THREE.MeshToonMaterial({
    map: m.map, normalMap: m.normalMap, alphaMap: m.alphaMap, transparent: m.transparent, side: m.side,
    vertexColors: m.vertexColors, depthWrite: m.depthWrite,
    polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits,
    gradientMap: gradientMap(), name: m.name,
  });
  if (m.normalMap) t.normalScale.copy(m.normalScale);
  t.color = m.color;                                           // same Color objects: recolouring the
  t.emissive = m.emissive;                                     // original recolours this one too
  Object.defineProperty(t, 'emissiveIntensity', { get: () => m.emissiveIntensity, set: (v) => { m.emissiveIntensity = v; } });
  Object.defineProperty(t, 'opacity', { get: () => m.opacity, set: (v) => { m.opacity = v; } });
  converted.set(m, t);
  converted.set(t, t);
  return t;
}

const outlineMat = new THREE.MeshBasicMaterial({ color: '#160f08', side: THREE.BackSide });
// toonify a whole subtree; with `outline`, every solid part also gets its dark hull
export function toonify(root, { outline = false, thickness = 0.06 } = {}) {
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.outline) meshes.push(o); });
  for (const o of meshes) {
    if (Array.isArray(o.material)) o.material = o.material.map(toToon);
    else o.material = toToon(o.material);
    if (outline && !o.isInstancedMesh && !o.isSkinnedMesh && !o.material.transparent && o.material.isMeshToonMaterial && !o.userData.hasOutline) {
      const hull = new THREE.Mesh(o.geometry, outlineMat);
      hull.scale.setScalar(1 + thickness);
      hull.userData.outline = true;
      hull.castShadow = false;
      hull.receiveShadow = false;
      hull.raycast = () => {};                                 // never a floor or a target
      o.add(hull);
      o.userData.hasOutline = true;
    }
  }
  return root;
}
