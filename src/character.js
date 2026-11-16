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
  // torso: a rounded chest a little deeper at the top, a belt with a buckle, a scarf
  add(body, new THREE.CapsuleGeometry(0.2, 0.4, 8, 24), shirt, 0, 0.32, 0).scale.set(1.05, 1, 0.78);
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.8, roughness: 0.35 });
  add(body, new THREE.TorusGeometry(0.205, 0.035, 8, 32), dark, 0, 0.06, 0).rotation.x = Math.PI / 2;
  add(body, new THREE.BoxGeometry(0.07, 0.06, 0.03), metal, 0, 0.06, -0.165);
  add(body, new THREE.TorusGeometry(0.12, 0.045, 8, 24), leather, 0, 0.62, 0).rotation.x = Math.PI / 2;   // scarf
  add(body, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16), skin, 0, 0.64, 0);                         // neck
  // head: face, eyes, nose, ears, hair under the hat
  const head = new THREE.Group();
  head.position.set(0, 0.78, 0);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.14, 32, 24), skin, 0, 0, 0).scale.set(0.92, 1.08, 1);
  const eye = new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 0.2 });
  const white = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.4 });
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.026, 16, 12), white, sx * 0.05, 0.02, -0.118).scale.set(1, 0.8, 0.5);
    add(head, new THREE.SphereGeometry(0.014, 12, 10), eye, sx * 0.05, 0.02, -0.13);
    add(head, new THREE.SphereGeometry(0.035, 12, 10), skin, sx * 0.132, 0.0, 0).scale.set(0.5, 1, 0.8); // ears
    add(head, new THREE.BoxGeometry(0.045, 0.01, 0.01), dark, sx * 0.05, 0.058, -0.125).rotation.z = sx * -0.15; // brows
  }
  add(head, new THREE.SphereGeometry(0.022, 12, 10), skin, 0, -0.02, -0.14).scale.set(0.9, 1.2, 1);       // nose
  add(head, new THREE.BoxGeometry(0.05, 0.008, 0.01), new THREE.MeshStandardMaterial({ color: '#8a4a3a' }), 0, -0.065, -0.128); // mouth
  add(head, new THREE.SphereGeometry(0.145, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), dark, 0, 0.02, 0.012).scale.set(0.96, 0.9, 1.02); // hair
  // a wide-brimmed explorer's hat with a band
  add(head, new THREE.CylinderGeometry(0.2, 0.21, 0.018, 40), leather, 0, 0.075, 0);
  add(head, new THREE.CylinderGeometry(0.105, 0.13, 0.13, 32), leather, 0, 0.14, 0);
  add(head, new THREE.CylinderGeometry(0.132, 0.132, 0.03, 32), dark, 0, 0.1, 0);
  if (pack) {   // backpack (behind: +z): a rounded pack, a rolled blanket on top, two straps
    add(body, new THREE.CapsuleGeometry(0.13, 0.16, 8, 16), leather, 0, 0.36, 0.22).scale.set(1.25, 1, 0.7);
    add(body, new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16), new THREE.MeshStandardMaterial({ color: '#7a3a2a', roughness: 0.9 }), 0, 0.58, 0.22).rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) add(body, new THREE.BoxGeometry(0.035, 0.4, 0.3), dark, sx * 0.11, 0.38, 0.05);
  }
  const lantern = add(body, new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(2) }), 0.16, 0.1, 0.32);

  const limb = (parent, x, y, len, rad, mat, end) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    parent.add(pivot);
    add(pivot, new THREE.CapsuleGeometry(rad, len - rad * 2, 8, 16), mat, 0, -len / 2, 0);
    end?.(pivot, len);
    return pivot;
  };
  const boot = (p, len) => {   // boots: a rounded toe pointing forward and a cuff
    add(p, new THREE.CapsuleGeometry(0.075, 0.12, 8, 16), dark, 0, -len + 0.04, -0.05).rotation.x = Math.PI / 2;
    add(p, new THREE.CylinderGeometry(0.095, 0.09, 0.14, 20), dark, 0, -len + 0.15, 0);
  };
  const hand = (p, len) => add(p, new THREE.SphereGeometry(0.05, 16, 12), skin, 0, -len + 0.01, 0).scale.set(0.9, 1.1, 0.8);
  const legL = limb(root, -0.1, 0.95, 0.9, 0.085, pants, boot);
  const legR = limb(root, 0.1, 0.95, 0.9, 0.085, pants, boot);
  const armL = limb(body, -0.27, 0.56, 0.6, 0.065, shirt, hand);
  const armR = limb(body, 0.27, 0.56, 0.6, 0.065, shirt, hand);
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

  let phase = 0, heading = 0, amount = 0, swingT = 0, rollT = 0;

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
    if (rollT > 0) {
      // dodge roll: tuck and spin forward once
      rollT = Math.max(0, rollT - dt);
      const k = 1 - rollT / 0.32;
      body.rotation.x = -Math.PI * 2 * k;
      body.position.y = 0.6 + Math.sin(Math.PI * k) * 0.15;
      legL.rotation.x = legR.rotation.x = -1.4 * Math.sin(Math.PI * k);
    }
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

  // crafted gear: the weapon recolours the staff and its tip (and grows a blade from tier 4),
  // an outfit recolours shirt, trousers and hat, adds a cape and a soft glow
  const base = { shirt: shirtC, pants: pantsC, hat };
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.85, 1, 4), new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.9, side: THREE.DoubleSide }));
  cape.position.set(0, 0.2, 0.33);
  cape.rotation.x = 0.12;
  cape.visible = false;
  body.add(cape);
  const staffMat = staffMesh ? staffMesh.material.clone() : null;
  if (staffMesh) staffMesh.material = staffMat;
  let blade = null;
  function setWeaponLook(look, tier = 0) {
    if (!staffMesh) return;
    staffMat.color.set(look?.color ?? hat);
    const tip = staffMesh.children[0];
    tip.material.color.set(new THREE.Color(look?.tip ?? '#9dffcf').multiplyScalar(1.6));
    tip.scale.setScalar(1 + tier * 0.12);
    if (blade) { staffMesh.remove(blade); blade = null; }
    if (tier >= 4) {
      blade = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 4), new THREE.MeshStandardMaterial({ color: look.tip, emissive: look.tip, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.3 }));
      blade.position.y = 0.95;
      staffMesh.add(blade);
    }
  }
  function setOutfit(look) {
    const L = look ?? base;
    shirt.color.set(L.shirt ?? base.shirt);
    pants.color.set(L.pants ?? base.pants);
    leather.color.set(L.hat ?? base.hat);
    shirt.emissive.set(L.glow ?? '#000000');
    shirt.emissiveIntensity = L.glow ? 0.25 : 0;
    cape.visible = !!L.cape;
    if (L.cape) cape.material.color.set(L.cape);
  }

  return { root, update, idle, setWeapon, setWeaponLook, setOutfit, roll: () => { rollT = 0.32; }, swing: () => { swingT = 0.3; if (sceptre?.visible) sceptre.userData.heart.rotation.y += 1; }, setHeading: (h) => { heading = h; root.rotation.y = h; } };
}
