// The explorer you play in third person: a simple figure built from primitives (1.8 m tall,
// facing -z), with a backpack and a lantern, and a procedural walk / run / fly animation.
import * as THREE from 'three';

// Options let the same figure dress the villagers: colours, no lantern light, no backpack.
export function createCharacter({ name = 'player', skin: skinC = '#c99674', shirt: shirtC = '#2f7f86', pants: pantsC = '#3a3226', hat = '#7a4b2a', light = true, pack = true, scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = name;
  root.scale.setScalar(scale);
  const skin = new THREE.MeshStandardMaterial({ color: skinC, roughness: 0.75 });
  const shirt = new THREE.MeshStandardMaterial({ color: shirtC, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: pantsC, roughness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: hat, roughness: 0.7 });
  const add = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const body = new THREE.Group();          // everything above the hips, leans when running
  body.position.y = 0.95;
  root.add(body);
  add(body, new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), shirt, 0, 0.32, 0);
  add(body, new THREE.SphereGeometry(0.15, 16, 12), skin, 0, 0.76, 0);
  add(body, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 16), leather, 0, 0.84, 0);       // hat brim
  add(body, new THREE.CylinderGeometry(0.11, 0.13, 0.12, 16), leather, 0, 0.9, 0);        // hat crown
  if (pack) add(body, new THREE.BoxGeometry(0.32, 0.38, 0.16), leather, 0, 0.36, 0.22);  // backpack (behind: +z)
  const lantern = add(body, new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(2) }), 0.16, 0.1, 0.32);

  const limb = (parent, x, y, len, rad, mat) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    parent.add(pivot);
    add(pivot, new THREE.CapsuleGeometry(rad, len - rad * 2, 4, 8), mat, 0, -len / 2, 0);
    return pivot;
  };
  const legL = limb(root, -0.1, 0.95, 0.9, 0.085, pants);
  const legR = limb(root, 0.1, 0.95, 0.9, 0.085, pants);
  const armL = limb(body, -0.27, 0.56, 0.62, 0.065, shirt);
  const armR = limb(body, 0.27, 0.56, 0.62, 0.065, shirt);
  let staffMesh = null, sceptre = null;
  if (pack) {
    // the explorer's staff, held in the right hand
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.5, 6), leather);
    staff.position.set(0, -0.6, -0.15);
    staff.rotation.x = 1.2;
    staff.castShadow = true;
    armR.add(staff);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dffcf').multiplyScalar(1.5) }));
    tip.position.set(0, 0.75, 0);
    staff.add(tip);
    staffMesh = staff;
    // the Cajado do GM: gold shaft, a crown of leaves and a living sap crystal
    sceptre = new THREE.Group();
    sceptre.position.copy(staff.position);
    sceptre.rotation.copy(staff.rotation);
    const gold = new THREE.MeshStandardMaterial({ color: '#d9a531', metalness: 0.9, roughness: 0.25, emissive: '#5a3a08', emissiveIntensity: 0.4 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.7, 8), gold);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 14), gold);
    crown.position.y = 0.85; crown.rotation.x = Math.PI / 2;
    const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dffcf').multiplyScalar(2.4) }));
    heart.position.y = 1.02;
    const aura = new THREE.PointLight('#9dffcf', 12, 8, 2);
    aura.position.y = 1.05;
    sceptre.add(shaft, crown, heart, aura);
    sceptre.visible = false;
    sceptre.userData.heart = heart;
    armR.add(sceptre);
  }

  // A soft light carried by the explorer, so dark corners stay readable.
  if (light) {
    const glow = new THREE.PointLight('#ffd9a0', 6, 9, 2);
    glow.position.set(0, 1.3, 0.4);
    root.add(glow);
  }
  lantern.visible = pack;

  let phase = 0, heading = 0, amount = 0, swingT = 0;

  // speed in m/s on the ground, flying flag, the direction of travel (yaw) and dt
  function update(dt, { x, y, z, speed, flying, moveYaw }) {
    root.position.set(x, y, z);
    if (speed > 0.3 && moveYaw !== null) {
      // turn toward the direction of travel, frame-rate independent, through the short way round
      const d = Math.atan2(Math.sin(moveYaw - heading), Math.cos(moveYaw - heading));
      heading += d * (1 - Math.exp(-12 * dt));
    }
    root.rotation.y = heading;
    const target = flying ? 0 : Math.min(speed / 6, 1.6);
    amount += (target - amount) * (1 - Math.exp(-10 * dt));
    phase += dt * (4 + speed * 0.9);
    const swing = Math.sin(phase) * 0.7 * Math.min(amount, 1.2);
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
    armL.rotation.z = armR.rotation.z = 0;
    body.position.y = 0.95 + Math.abs(Math.cos(phase)) * 0.05 * amount;
    body.rotation.x = -0.12 * Math.max(0, amount - 0.8);
    if (flying) {
      // arms out like a glider, legs trailing
      armL.rotation.z = 1.2; armR.rotation.z = -1.2; armL.rotation.x = armR.rotation.x = 0;
      legL.rotation.x = legR.rotation.x = 0.35 + Math.sin(phase * 0.5) * 0.08;
      body.rotation.x = -0.25;
    }
    if (swingT > 0) {
      // staff swing: raise, then sweep across (0.3 s)
      swingT = Math.max(0, swingT - dt);
      const k = 1 - swingT / 0.3;
      armR.rotation.x = -2.4 * Math.sin(Math.PI * Math.min(k * 1.4, 1));
      armR.rotation.z = -0.8 + k * 1.6;
      body.rotation.y = 0.5 - k;
    } else body.rotation.y = 0;
    lantern.material.color.setScalar(1.6 + Math.sin(phase * 0.7) * 0.15).multiply(new THREE.Color('#ffd28a'));
  }

  // villagers: stand, breathe, turn to face someone
  function idle(dt, t, faceYaw) {
    if (faceYaw !== null && faceYaw !== undefined) {
      const d = Math.atan2(Math.sin(faceYaw - heading), Math.cos(faceYaw - heading));
      heading += d * (1 - Math.exp(-5 * dt));
      root.rotation.y = heading;
    }
    body.position.y = 0.95 + Math.sin(t * 1.6) * 0.012;
    armL.rotation.x = Math.sin(t * 1.1) * 0.05; armR.rotation.x = -armL.rotation.x;
  }

  function setWeapon(id) {
    if (!staffMesh) return;
    staffMesh.visible = id !== 'gm';
    sceptre.visible = id === 'gm';
  }

  return { root, update, idle, setWeapon, swing: () => { swingT = 0.3; if (sceptre?.visible) sceptre.userData.heart.rotation.y += 1; }, setHeading: (h) => { heading = h; root.rotation.y = h; } };
}
