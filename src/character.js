// The explorer you play in third person: a rounded cartoon figure (about 1.9 m with the hat,
// facing -z) with a big friendly head, a tunic that flares at the hem, bending elbows and knees,
// mitten hands and chunky boots, a backpack and a lantern, and a procedural walk / run / fly
// animation.
import * as THREE from 'three';

// Options let the same figure dress the villagers: colours, no lantern light, no backpack.
export function createCharacter({ name = 'player', skin: skinC = '#c99674', shirt: shirtC = '#2f7f86', pants: pantsC = '#3a3226', hat = '#7a4b2a', light = true, pack = true, scale = 1 } = {}) {
  const root = new THREE.Group();
  root.name = name;
  root.userData.character = true;   // the cartoon pass gives characters an outline
  root.scale.setScalar(scale);
  const skin = new THREE.MeshStandardMaterial({ color: skinC, roughness: 0.75 });
  const shirt = new THREE.MeshStandardMaterial({ color: shirtC, roughness: 0.8, side: THREE.DoubleSide });
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
  // a tapered limb: rounded at both ends, radius r0 at the joint (y = 0) and r1 at the far end
  const pill = (len, r0, r1, seg = 18) => {
    const pts = [];
    for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + (k / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r1, -len + r1 + Math.sin(a) * r1)); }
    for (let k = 0; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r0 + 1e-4, -r0 + Math.sin(a) * r0)); }
    return new THREE.LatheGeometry(pts, seg);
  };
  // torso: a soft tunic, narrow at the waist, full in the chest, flaring into a hem over the hips
  const torsoProfile = [[0.255, -0.2], [0.24, -0.12], [0.212, -0.02], [0.193, 0.07], [0.2, 0.18], [0.218, 0.3], [0.222, 0.4], [0.205, 0.5], [0.16, 0.575], [0.09, 0.62], [0.001, 0.635]];
  add(body, new THREE.LatheGeometry(torsoProfile.map(([r, y]) => new THREE.Vector2(r, y)), 28), shirt, 0, 0, 0).scale.set(1, 1, 0.8);
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.6 });
  const hairMat = dark;   // hair shares the dark material so it can be recoloured
  const metal = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.8, roughness: 0.35 });
  const belt = add(body, new THREE.TorusGeometry(0.2, 0.03, 8, 32), dark, 0, 0.07, 0);
  belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.8, 1);
  add(body, new THREE.TorusGeometry(0.03, 0.012, 6, 16), metal, 0, 0.07, -0.168);   // round buckle
  add(body, new THREE.TorusGeometry(0.12, 0.045, 8, 24), leather, 0, 0.62, 0).rotation.x = Math.PI / 2;   // scarf
  add(body, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16), skin, 0, 0.64, 0);                         // neck
  // head: face, eyes, nose, ears, hair under the hat
  const head = new THREE.Group();
  head.position.set(0, 0.79, 0);
  head.scale.setScalar(1.2);          // a big friendly cartoon head
  body.add(head);
  add(head, new THREE.SphereGeometry(0.14, 32, 24), skin, 0, 0, 0).scale.set(0.92, 1.08, 1);
  const eye = new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 0.2 });
  const white = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.4 });
  const blush = new THREE.MeshStandardMaterial({ color: '#f08a7a', roughness: 0.8, transparent: true, opacity: 0.55 });
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.042, 16, 12), white, sx * 0.052, 0.02, -0.112).scale.set(1, 1.1, 0.55);   // big cartoon eyes
    add(head, new THREE.SphereGeometry(0.026, 12, 10), eye, sx * 0.052, 0.012, -0.13);
    add(head, new THREE.SphereGeometry(0.008, 8, 6), white, sx * 0.052 + 0.008, 0.024, -0.152);           // eye sparkle
    add(head, new THREE.SphereGeometry(0.026, 12, 8), blush, sx * 0.085, -0.04, -0.105).scale.set(1, 0.6, 0.4); // rosy cheeks
    add(head, new THREE.SphereGeometry(0.035, 12, 10), skin, sx * 0.132, 0.0, 0).scale.set(0.5, 1, 0.8); // ears
    add(head, new THREE.BoxGeometry(0.045, 0.01, 0.01), dark, sx * 0.05, 0.058, -0.125).rotation.z = sx * -0.15; // brows
  }
  add(head, new THREE.SphereGeometry(0.022, 12, 10), skin, 0, -0.02, -0.14).scale.set(0.9, 1.2, 1);       // nose
  add(head, new THREE.TorusGeometry(0.026, 0.006, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#7a3a2e' }), 0, -0.055, -0.13).rotation.z = Math.PI; // smile
  add(head, new THREE.SphereGeometry(0.145, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), dark, 0, 0.02, 0.012).scale.set(0.96, 0.9, 1.02); // hair
  // a wide-brimmed explorer's hat with a band (one of the head styles)
  const hatParts = [
    add(head, new THREE.CylinderGeometry(0.2, 0.21, 0.018, 40), leather, 0, 0.075, 0),
    add(head, new THREE.CylinderGeometry(0.105, 0.13, 0.13, 32), leather, 0, 0.14, 0),
    add(head, new THREE.CylinderGeometry(0.132, 0.132, 0.03, 32), dark, 0, 0.1, 0),
  ];
  if (pack) {   // backpack (behind: +z): a rounded pack, a rolled blanket on top, two straps
    add(body, new THREE.CapsuleGeometry(0.13, 0.16, 8, 16), leather, 0, 0.36, 0.22).scale.set(1.25, 1, 0.7);
    add(body, new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16), new THREE.MeshStandardMaterial({ color: '#7a3a2a', roughness: 0.9 }), 0, 0.58, 0.22).rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) add(body, new THREE.BoxGeometry(0.035, 0.4, 0.3), dark, sx * 0.11, 0.38, 0.05);
  }
  const lantern = add(body, new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(2) }), 0.16, 0.1, 0.32);

  // two-part limbs: upper pivot at the shoulder / hip, lower pivot at the elbow / knee
  const limb = (parent, x, y, len1, len2, r0, r1, r2, mat, end) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    parent.add(pivot);
    add(pivot, pill(len1 + r1, r0, r1), mat, 0, 0, 0);
    const lower = new THREE.Group();
    lower.position.y = -len1;
    pivot.add(lower);
    add(lower, pill(len2, r1 * 0.98, r2), mat, 0, 0, 0);
    end?.(lower, len2);
    pivot.userData.lower = lower;
    return pivot;
  };
  const sole = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.8 });
  const boot = (p, len) => {   // chunky boots: a round toe, a thick sole and a folded cuff
    add(p, new THREE.CylinderGeometry(0.088, 0.095, 0.2, 20), dark, 0, -len + 0.1, 0);
    add(p, new THREE.TorusGeometry(0.093, 0.026, 8, 24), leather, 0, -len + 0.2, 0).rotation.x = Math.PI / 2;
    add(p, new THREE.CapsuleGeometry(0.082, 0.13, 8, 16), dark, 0, -len + 0.025, -0.07).rotation.x = Math.PI / 2;
    const so = add(p, new THREE.CapsuleGeometry(0.088, 0.15, 6, 16), sole, 0, -len - 0.015, -0.07);
    so.rotation.x = Math.PI / 2; so.scale.set(1.05, 1, 0.3);
  };
  const hand = (p, len) => {   // a mitten with a thumb
    add(p, new THREE.SphereGeometry(0.058, 16, 12), skin, 0, -len - 0.01, -0.005).scale.set(0.85, 1.15, 0.75);
    add(p, new THREE.SphereGeometry(0.024, 10, 8), skin, 0, -len + 0.005, -0.045).scale.set(1, 1.4, 1);
  };
  const legL = limb(root, -0.1, 0.95, 0.43, 0.45, 0.105, 0.078, 0.064, pants, boot);
  const legR = limb(root, 0.1, 0.95, 0.43, 0.45, 0.105, 0.078, 0.064, pants, boot);
  const armL = limb(body, -0.255, 0.54, 0.27, 0.27, 0.07, 0.058, 0.05, shirt, hand);
  const armR = limb(body, 0.255, 0.54, 0.27, 0.27, 0.07, 0.058, 0.05, shirt, hand);
  for (const a of [armL, armR]) add(a, new THREE.SphereGeometry(0.088, 18, 14), shirt, 0, -0.01, 0).scale.set(1, 0.95, 0.95);   // puffed shoulders
  for (const a of [armL, armR]) add(a.userData.lower, new THREE.TorusGeometry(0.056, 0.016, 6, 18), leather, 0, -0.2, 0).rotation.x = Math.PI / 2;   // cuffs
  const shinL = legL.userData.lower, shinR = legR.userData.lower, foreL = armL.userData.lower, foreR = armR.userData.lower;
  let staffMesh = null, sceptre = null;
  if (pack) {
    // the explorer's staff: upright in the right fist, a little forward and out from the hip (the arm hangs outward,
    // so the shaft never passes through the body)
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.5, 6), leather);
    staff.geometry.translate(0, 0.2, 0);   // grip a third of the way up the shaft
    staff.position.set(0.02, -0.29, -0.02);
    staff.rotation.set(-0.3, 0, -0.12);
    staff.castShadow = true;
    staff.userData.gear = true;
    foreR.add(staff);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dffcf').multiplyScalar(1.5) }));
    tip.position.set(0, 0.95, 0);
    staff.add(tip);
    staffMesh = staff;
    // the Cajado do GM: gold shaft, a crown of leaves and a living sap crystal
    sceptre = new THREE.Group();
    sceptre.position.copy(staff.position);
    sceptre.rotation.copy(staff.rotation);
    const gold = new THREE.MeshStandardMaterial({ color: '#d9a531', metalness: 0.9, roughness: 0.25, emissive: '#5a3a08', emissiveIntensity: 0.4 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.7, 8), gold);
    shaft.position.y = 0.2;
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 14), gold);
    crown.position.y = 1.05; crown.rotation.x = Math.PI / 2;
    const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dffcf').multiplyScalar(2.4) }));
    heart.position.y = 1.22;
    const aura = new THREE.PointLight('#9dffcf', 12, 8, 2);
    aura.position.y = 1.25;
    for (const m of [shaft, crown, heart]) m.userData.gear = true;
    sceptre.add(shaft, crown, heart, aura);
    sceptre.visible = false;
    sceptre.userData.heart = heart;
    foreR.add(sceptre);
  }

  // A soft light carried by the explorer, so dark corners stay readable.
  if (light) {
    const glow = new THREE.PointLight('#ffd9a0', 6, 9, 2);
    glow.position.set(0, 1.3, 0.4);
    root.add(glow);
  }
  lantern.visible = pack;

  let phase = 0, heading = 0, amount = 0, swingT = 0, rollT = 0;
  // arms hang a little away from the body, so hands and held gear clear the tunic's hem
  const ARM_OUT = 0.13;

  // speed in m/s on the ground, flying flag, the direction of travel (yaw) and dt
  function update(dt, { x, y, z, speed, flying, moveYaw, back = false }) {
    root.position.set(x, y, z);
    if (speed > 0.3 && moveYaw !== null) {
      // turn toward the direction of travel, frame-rate independent, through the short way round
      const d = Math.atan2(Math.sin(moveYaw - heading), Math.cos(moveYaw - heading));
      heading += d * (1 - Math.exp(-12 * dt));
    }
    root.rotation.y = heading;
    const target = flying ? 0 : Math.min(speed / 6, 1.6);
    amount += (target - amount) * (1 - Math.exp(-10 * dt));
    phase += dt * (4 + speed * 0.9) * (back ? -1 : 1);   // backpedal: the legs cycle in reverse
    const swing = Math.sin(phase) * 0.7 * Math.min(amount, 1.2);
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
    armL.rotation.z = -ARM_OUT; armR.rotation.z = ARM_OUT;
    // knees fold as each foot comes through, elbows stay soft and pump when running
    const a1 = Math.min(amount, 1.2);
    shinL.rotation.x = -Math.max(0, Math.sin(phase + 1.1)) * 1.0 * a1 - 0.05;
    shinR.rotation.x = -Math.max(0, Math.sin(phase + 1.1 + Math.PI)) * 1.0 * a1 - 0.05;
    foreL.rotation.x = foreR.rotation.x = 0.25 + 0.55 * Math.min(amount, 1.4);
    body.position.y = 0.95 + Math.abs(Math.cos(phase)) * 0.05 * amount;
    body.rotation.x = -0.12 * Math.max(0, amount - 0.8);
    if (flying) {
      // arms out like a glider, legs trailing
      armL.rotation.z = -1.2; armR.rotation.z = 1.2; armL.rotation.x = armR.rotation.x = 0;
      legL.rotation.x = legR.rotation.x = 0.35 + Math.sin(phase * 0.5) * 0.08;
      shinL.rotation.x = shinR.rotation.x = -0.5;
      foreL.rotation.x = foreR.rotation.x = 0.15;
      body.rotation.x = -0.25;
    }
    if (swingT > 0) {
      // weapon swing (0.3 s): the right arm rises up in front, the shoulder winds back, then it
      // chops down and forward; the arm stays out to the side so the weapon passes in front of
      // the body, never through it
      swingT = Math.max(0, swingT - dt);
      const k = 1 - swingT / 0.3;
      const up = k < 0.4 ? Math.sin((k / 0.4) * Math.PI / 2) : 1 - (k - 0.4) / 0.6;
      armR.rotation.x = 2.5 * up + 0.35 * (1 - up);
      armR.rotation.z = ARM_OUT + 0.3 * up;
      foreR.rotation.x = 0.2 + 0.2 * (1 - up);
      body.rotation.y = k < 0.4 ? -0.3 * up : -0.3 + 0.65 * (k - 0.4) / 0.6;
    } else body.rotation.y = 0;
    if (rollT > 0) {
      // dodge roll: tuck and spin forward once
      rollT = Math.max(0, rollT - dt);
      const k = 1 - rollT / 0.32;
      body.rotation.x = -Math.PI * 2 * k;
      body.position.y = 0.6 + Math.sin(Math.PI * k) * 0.15;
      legL.rotation.x = legR.rotation.x = 1.4 * Math.sin(Math.PI * k);
      shinL.rotation.x = shinR.rotation.x = -2.2 * Math.sin(Math.PI * k);
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
    armL.rotation.z = -ARM_OUT - 0.02; armR.rotation.z = ARM_OUT + 0.02;
    foreL.rotation.x = foreR.rotation.x = 0.3 + Math.sin(t * 1.3) * 0.04;
    shinL.rotation.x = shinR.rotation.x = -0.04;
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
      blade.position.y = 1.15;
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

  // ---- classes (the five of the manual) and the player's own look ----
  // Each class holds its own weapon: the Guerreiro a sword and a round shield, the Mago a
  // glowing staff, the Sábio a field book, the Ladino two daggers, the Arqueiro a bow and quiver.
  const gearMat = (c, e) => new THREE.MeshStandardMaterial({ color: c, emissive: e ?? '#000000', emissiveIntensity: e ? 0.6 : 0, roughness: 0.5, metalness: 0.2 });
  let gearParts = [];   // { parent, mesh } of the current class's gear, removed on a class change
  let gearKind = null;
  function buildGear(kind) {
    for (const { parent, mesh } of gearParts) parent.remove(mesh);
    gearParts = [];
    // a holder at the hand (or on the back) that the gear's meshes hang from
    const grip = (parent, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.set(rx, ry, rz);
      parent.add(g); gearParts.push({ parent, mesh: g });
      return g;
    };
    const put = (parent, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true;
      o.userData.gear = true;
      parent.add(o);
      return o;
    };
    // Every piece sits in the fist or on the outer side of the forearm, and the arms hang out
    // from the body: nothing crosses the torso in idle, walk, run or the swing.
    if (kind === 'guerreiro') {
      // sword in the right fist, pointing forward and a little out, away from the body
      const sw = grip(foreR, 0.02, -0.29, -0.01, 0, -0.18, 0);
      const steel = gearMat('#c9ced6', '#3a4a5a'), hilt = gearMat('#7a5a2a'), gold = gearMat('#c9a24a', '#5a3a08');
      put(sw, new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), hilt, 0, 0, 0, Math.PI / 2);              // grip
      put(sw, new THREE.SphereGeometry(0.032, 10, 8), gold, 0, 0, 0.09);                                    // pommel
      put(sw, new THREE.BoxGeometry(0.2, 0.035, 0.04), gold, 0, 0, -0.09);                                  // cross-guard
      put(sw, new THREE.BoxGeometry(0.075, 0.018, 0.68), steel, 0, 0, -0.44);                               // blade
      put(sw, new THREE.ConeGeometry(0.053, 0.1, 4), steel, 0, 0, -0.83, -Math.PI / 2, Math.PI / 4).scale.set(1, 1, 0.34); // point
      // round shield strapped to the outer side of the left forearm, face out and a bit forward
      const sh = grip(foreL, -0.1, -0.15, -0.02, 0, -0.25, 0);
      put(sh, new THREE.CylinderGeometry(0.27, 0.27, 0.05, 24), gearMat('#7a4a2a'), 0, 0, 0, 0, 0, Math.PI / 2);
      put(sh, new THREE.TorusGeometry(0.255, 0.03, 6, 24), gold, -0.012, 0, 0, 0, Math.PI / 2, 0);        // rim
      put(sh, new THREE.SphereGeometry(0.07, 12, 8), gold, -0.03, 0, 0).scale.set(0.6, 1, 1);               // boss
    } else if (kind === 'sabio') {
      // a field book held upright in the left fist, against the outer thigh
      const bk = grip(foreL, -0.06, -0.3, -0.02, 0, 0, 0.12);
      put(bk, new THREE.BoxGeometry(0.05, 0.3, 0.23), gearMat('#7a4a2a'), 0, -0.04, 0);
      put(bk, new THREE.BoxGeometry(0.04, 0.27, 0.215), gearMat('#f0e6c8'), 0, -0.04, 0.012);
    } else if (kind === 'ladino') {
      // two daggers, blades forward out of each fist and angled out from the body
      for (const [fore, sx] of [[foreR, 1], [foreL, -1]]) {
        const dg = grip(fore, sx * 0.02, -0.29, -0.01, 0, -sx * 0.25, 0);
        put(dg, new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6), gearMat('#4a3018'), 0, 0, 0, Math.PI / 2);
        put(dg, new THREE.BoxGeometry(0.11, 0.025, 0.03), gearMat('#c9a24a'), 0, 0, -0.07);
        put(dg, new THREE.BoxGeometry(0.045, 0.012, 0.3), gearMat('#c0c4cc'), 0, 0, -0.22);
      }
    } else if (kind === 'arqueiro') {
      // longbow upright in the left fist, belly forward, string behind the hand, out from the hip
      const bw = grip(foreL, -0.05, -0.29, -0.02, -0.3, 0, 0.12);
      const bend = Math.PI * 0.8, R = 0.45, half = bend / 2;
      const limbs = new THREE.TorusGeometry(R, 0.022, 6, 24, bend).rotateZ(-half).rotateY(Math.PI / 2);   // arc in the y-z plane, belly toward -z
      put(bw, limbs, gearMat('#8a5a2a'), 0, 0, R);
      put(bw, new THREE.CylinderGeometry(0.004, 0.004, 2 * R * Math.sin(half), 4), gearMat('#e8e2d0'), 0, 0, R - R * Math.cos(half));   // string
      // quiver slung diagonally on the back, beside the pack
      const qv = grip(body, 0.2, 0.42, 0.3, 0.2, 0, -0.35);
      put(qv, new THREE.CylinderGeometry(0.075, 0.06, 0.5, 10), gearMat('#4a3018'), 0, 0, 0);
      for (let k = 0; k < 3; k++) put(qv, new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), gearMat('#e8e2d0'), (k - 1) * 0.03, 0.3, 0);
    }
    gearKind = kind;
  }
  function setClass(id) {
    // the staff stays with the Mago (glowing) and the Sábio (carved), other classes hold their own
    if (staffMesh) { staffMesh.visible = id === 'mago'; if (id === 'mago') { staffMat.color.set('#5a3a8a'); staffMesh.children[0].material.color.set(new THREE.Color('#c59bff').multiplyScalar(2)); } }
    if (id !== gearKind) buildGear(id);
  }
  // the player's own look: skin, hair, shirt and trousers chosen at creation
  function setAppearance(a = {}) {
    if (a.skin) skin.color.set(a.skin);
    if (a.hair) hairMat.color.set(a.hair);
    if (a.shirt) { base.shirt = a.shirt; shirt.color.set(a.shirt); }
    if (a.pants) { base.pants = a.pants; pants.color.set(a.pants); }
    if (a.hat) { base.hat = a.hat; leather.color.set(a.hat); }
  }
  // ---- clothing styles chosen at creation: top (túnica, colete, manto, armadura), head (chapéu,
  // capuz, bandana, nada) and hair (curto, longo, rabo). Built from the same coloured materials, so
  // outfits and colours still apply.
  let styleParts = [];
  function setStyle(st = {}) {
    for (const { parent, mesh } of styleParts) parent.remove(mesh);
    styleParts = [];
    const put = (parent, geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.castShadow = true;
      parent.add(o); styleParts.push({ parent, mesh: o });
      return o;
    };
    const top = st.top ?? 'tunica', hd = st.head ?? 'chapeu', hair = st.hair ?? 'curto';
    if (top === 'colete') {
      put(body, new THREE.CapsuleGeometry(0.215, 0.3, 6, 20, 1), leather, 0, 0.38, 0, 0, 0, 0, 1.08, 1, 0.82);
      put(body, new THREE.BoxGeometry(0.06, 0.42, 0.04), shirt, 0, 0.38, -0.19);          // the open front shows the shirt
    } else if (top === 'manto') {
      put(body, new THREE.ConeGeometry(0.34, 0.95, 24, 1, true), shirt, 0, -0.32, 0, 0, 0, 0, 1, 1, 0.85);   // robe skirt to the knees
      put(body, new THREE.TorusGeometry(0.2, 0.04, 6, 24), leather, 0, 0.16, 0, Math.PI / 2);                // sash
    } else if (top === 'armadura') {
      const plate = new THREE.MeshStandardMaterial({ color: '#9aa2ac', metalness: 0.7, roughness: 0.35 });
      put(body, new THREE.CapsuleGeometry(0.215, 0.26, 6, 20), plate, 0, 0.4, 0, 0, 0, 0, 1.1, 1, 0.84);
      for (const sx of [-1, 1]) put(body, new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), plate, sx * 0.27, 0.6, 0, 0, 0, sx * -0.4);
    }
    for (const p of hatParts) p.visible = hd === 'chapeu';
    if (hd === 'capuz') put(head, new THREE.SphereGeometry(0.17, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), shirt, 0, 0.0, 0.03, -0.35, 0, 0, 1, 1.1, 1.05);
    if (hd === 'bandana') { put(head, new THREE.TorusGeometry(0.14, 0.025, 6, 28), leather, 0, 0.06, 0, Math.PI / 2 - 0.15); put(head, new THREE.ConeGeometry(0.035, 0.14, 6), leather, 0, 0.04, 0.16, 1.3); }
    if (hair === 'longo') put(head, new THREE.CapsuleGeometry(0.11, 0.18, 6, 16), hairMat, 0, -0.1, 0.07, 0.15, 0, 0, 1.25, 1, 0.6);
    if (hair === 'rabo') put(head, new THREE.CapsuleGeometry(0.04, 0.2, 6, 12), hairMat, 0, -0.06, 0.17, 0.5);
  }
  return { root, update, idle, setWeapon, setWeaponLook, setOutfit, setClass, setAppearance, setStyle, roll: () => { rollT = 0.32; }, swing: () => { swingT = 0.3; if (sceptre?.visible) sceptre.userData.heart.rotation.y += 1; }, setHeading: (h) => { heading = h; root.rotation.y = h; } };
}
