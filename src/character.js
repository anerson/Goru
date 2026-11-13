// The explorer you play in third person: a simple figure built from primitives (1.8 m tall,
// facing -z), with a backpack and a lantern, and a procedural walk / run / fly animation.
import * as THREE from 'three';

export function createCharacter() {
  const root = new THREE.Group();
  root.name = 'player';
  const skin = new THREE.MeshStandardMaterial({ color: '#c99674', roughness: 0.75 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#2f7f86', roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: '#3a3226', roughness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: '#7a4b2a', roughness: 0.7 });
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
  add(body, new THREE.BoxGeometry(0.32, 0.38, 0.16), leather, 0, 0.36, 0.22);            // backpack (behind: +z)
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

  // A soft light carried by the explorer, so dark corners stay readable.
  const glow = new THREE.PointLight('#ffd9a0', 6, 9, 2);
  glow.position.set(0, 1.3, 0.4);
  root.add(glow);

  let phase = 0, heading = 0, amount = 0;

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
    lantern.material.color.setScalar(1.6 + Math.sin(phase * 0.7) * 0.15).multiply(new THREE.Color('#ffd28a'));
  }

  return { root, update };
}
