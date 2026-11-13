// Act II in the world: the camps, objects and boss mechanics of the manual's regions 4-6.
// Everything sits on or beside each level's trails (reachable by construction, level-design).
//   Fornalha: Kaela's camp, 3 trapped miners, 3 barrier ruptures, an ancient instrument and
//     3 chimneys to regulate in order (east, north, west), 3 forges that power the Ferreiro's
//     armour (switch off I, II, III in sequence; out of order = overpressure), Ignar's core.
//   Nivéria: Sora's camp, the abandoned station (thermal clothes; without them the cold hurts),
//     3 air towers, 3 ice plates on the spring (while they stand the Matriarca calls wolves),
//     the Winter King's regulator.
//   Selva: Yara's camp, 3 herd tracks, predation remains, the Devorador de Troncos with 3 feeding
//     roots (while they stand it regenerates), 3 blockages on the migration route, the Beast King
//     (once the route is open and the Devorador contained, he yields almost at once).
import * as THREE from 'three';
import { createCharacter } from '../character.js';
import { stageIndex } from './data.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildAct2(kit) {
  const { scene, along, villager, add, tent, fire, flames, glowMat, rand, hud, npcs } = kit;
  const S = () => kit.state;
  const count = (k) => S().count?.[k] ?? 0;
  const bump = (k) => { const s = S(); s.count = s.count ?? {}; s.count[k] = (s.count[k] ?? 0) + 1; };
  const at = (id) => S().stage === id;
  const from = (id) => stageIndex(S().stage) >= stageIndex(id);
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const put = (mesh, p, dy = 0) => { mesh.position.copy(p).setY(p.y + dy); mesh.castShadow = true; scene.add(mesh); return mesh; };
  const loopPoint = (id, angle, side) => {
    // the loop-trail sample whose bearing from the axis is closest to `angle`
    let best = 0, bd = Infinity;
    for (let k = 0; k <= 60; k++) { const p = along(id, 4, k / 60, 0); const d = Math.abs(Math.atan2(Math.sin(Math.atan2(p.z, p.x) - angle), Math.cos(Math.atan2(p.z, p.x) - angle))); if (d < bd) { bd = d; best = k / 60; } }
    return along(id, 4, best, side);
  };
  const label = (text, pos, color = '#ffd76a') => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(20,18,12,0.75)'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = color; g.font = '700 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 66);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    s.scale.set(2.4, 1.2, 1); s.position.copy(pos);
    scene.add(s);
    return s;
  };
  const bosses = [];
  const marker = (id, pos) => add({ id, kind: 'marker', pos: pos.clone().setY(pos.y + 1), radius: 0, label: () => '', enabled: () => false, use: () => {} });
  const updaters = [];

  // =================== Fornalha de Ignar ===================
  {
    const L = 'fornalha';
    const camp = along(L, 4, 0.1, 7);
    tent(camp, 0.4); tent(along(L, 4, 0.07, 10), 1.3);
    flames.push(fire(along(L, 4, 0.1, 3)));
    villager('kaela', along(L, 4, 0.105, -3), { shirt: '#8a4a2a', pants: '#3a2a20', hat: '#e0b040', skin: '#a8724a' });

    // trapped miners under rubble
    const rubbleMat = mat('#3a3330', { flatShading: true });
    [[1, 0.7], [2, 0.62], [3, 0.66]].forEach(([li, f], i) => {
      const p = along(L, li, f, 4);
      const miner = createCharacter({ name: `mineiro_${i}`, light: false, pack: false, shirt: '#6a5a3a', hat: '#e0b040' });
      miner.root.position.copy(p); scene.add(miner.root);
      const rubble = new THREE.Group();
      for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + rand() * 0.5, 0), rubbleMat); r.position.set((rand() - 0.5) * 2, 0.3 + rand() * 0.8, (rand() - 0.5) * 2); rubble.add(r); }
      put(rubble, p);
      const flag = `mineiro_${i}`;
      const show = () => {
        const freed = !!S().flags[flag];
        rubble.visible = !freed;
        if (freed) miner.root.position.copy(along(L, 4, 0.12 + i * 0.012, 6));
        else miner.root.position.copy(p);
      };
      updaters.push(show);
      add({ id: flag, group: 'mineiro', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 3.5, label: () => 'Remover os escombros', enabled: () => from('ig_mineiros') && !S().flags[flag], use: () => { S().flags[flag] = true; bump('resgate'); hud.message(kit.INSPECT.mineiro); show(); kit.gainXp(25); } });
    });

    // ruptures in the thermal barriers
    [0.3, 0.55, 0.85].forEach((f, i) => {
      const p = along(L, 4, f, -6);
      const crack = put(new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 4), glowMat('#ff4a1a', 1.8)), p, 1.2);
      crack.rotation.y = rand() * 3;
      const flag = `ruptura_${i}`;
      add({ id: flag, group: 'ruptura', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 4, label: () => 'Mapear a ruptura', enabled: () => from('ig_rupturas') && !S().flags[flag], use: () => { S().flags[flag] = true; bump('ruptura'); hud.message(kit.INSPECT.ruptura); } });
    });

    // the ancient instrument and the three chimneys
    const instPos = along(L, 5, 0.3, 3);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.2, 8), mat('#6a5a4a', { flatShading: true })), instPos, 0.6);
    put(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 20), glowMat('#ffcf4a', 1.4)), instPos, 1.4).rotation.x = Math.PI / 2;
    add({ id: 'instrumento', group: 'chamine', kind: 'inspect', pos: instPos.clone().setY(instPos.y + 1), radius: 3.5, label: () => 'Ler o instrumento antigo', enabled: () => at('ig_chamines') && !S().flags.instrumento, use: () => { S().flags.instrumento = true; hud.message(kit.INSPECT.instrumento); } });
    const ORDER = ['leste', 'norte', 'oeste'];
    const chim = { leste: 0, norte: -Math.PI / 2, oeste: Math.PI };
    let progress = 0;
    const smoke = {};
    for (const [name, ang] of Object.entries(chim)) {
      const p = loopPoint(L, ang, 6);
      put(new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 9, 10), mat('#2a2522', { flatShading: true })), p, 4.5);
      smoke[name] = put(new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 8), glowMat('#ff8a3a', 1.2)), p, 10);
      label(name.toUpperCase(), p.clone().setY(p.y + 12));
      add({ id: `chamine_${name}`, group: 'chamine', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 4, label: () => `Regular a chaminé ${name}`, enabled: () => at('ig_chamines') && !!S().flags.instrumento && !S().count?.chamines,
        use: () => {
          if (ORDER[progress] === name) {
            progress++;
            smoke[name].material.color.set('#9a9a9a');
            if (progress === 3) { bump('chamines'); hud.message(kit.INSPECT.chamines_ok); kit.gainXp(60); } else hud.message(kit.INSPECT.chamine_certa);
          } else {
            progress = 0;
            Object.values(smoke).forEach((m) => m.material.color.set(new THREE.Color('#ff8a3a').multiplyScalar(1.2)));
            kit.hurt(6);
            hud.message(kit.INSPECT.chamine_errada);
          }
        } });
    }

    // the Ferreiro's three forges, and his lair between them
    const ferreiroLair = along(L, 4, 0.45, 0);
    bosses.push({ id: 'ferreiro', type: 'ferreiro', biome: L, lair: ferreiroLair, wakeFrom: 'ig_ferreiro', act: 2 });
    marker('ferreiro', ferreiroLair);
    let forgeStep = 0;
    const forgeFires = [];
    [0.4, 0.45, 0.5].forEach((f, i) => {
      const p = along(L, 4, f, 9);
      put(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), mat('#3a3330', { flatShading: true })), p, 0.8);
      forgeFires.push(put(new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 8), glowMat('#ff7a1a', 1.8)), p, 2.4));
      label(['I', 'II', 'III'][i], p.clone().setY(p.y + 4.2));
      add({ id: `forja_${i}`, group: 'forja', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 3.6, label: () => `Desligar a fornalha ${['I', 'II', 'III'][i]}`, enabled: () => at('ig_ferreiro') && !forgeFires[i].userData.off,
        use: () => {
          if (i === forgeStep) { forgeStep++; forgeFires[i].userData.off = true; forgeFires[i].visible = false; hud.toast(kit.INSPECT.forja_certa); }
          else { forgeStep = 0; forgeFires.forEach((ff) => { ff.userData.off = false; ff.visible = true; }); kit.hurt(12); hud.message(kit.INSPECT.forja_errada); }
        } });
    });

    const ignarLair = along(L, 5, 0.5, 0);
    bosses.push({ id: 'ignar', type: 'ignar', biome: L, lair: ignarLair, wakeFrom: 'ig_ignar', act: 2 });
    marker('ignar', ignarLair);
    kit.rules.ferreiro = () => ({ armorMul: [1, 0.75, 0.5, 0.3][forgeStep] });
    kit.rules.ignar = () => ({ armorMul: S().count?.chamines ? 0.7 : 1 });
  }

  // =================== Nivéria ===================
  {
    const L = 'niveria';
    const camp = along(L, 4, 0.1, 7);
    tent(camp, 0.7);
    flames.push(fire(along(L, 4, 0.1, 3)));
    villager('sora', along(L, 4, 0.105, -3), { shirt: '#2a4a7a', pants: '#2a2a3a', hat: '#e8eef5', skin: '#d0a07c' });

    const st = along(L, 1, 0.5, 7);
    put(new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), mat('#7a8a9a', { flatShading: true })), st, 1.5);
    put(new THREE.Mesh(new THREE.ConeGeometry(4, 2, 4), mat('#e8f4ff', { flatShading: true })), st, 4).rotation.y = Math.PI / 4;
    add({ id: 'estacao', kind: 'inspect', pos: st.clone().setY(st.y + 1), radius: 5, label: () => 'Vasculhar a estação abandonada', enabled: () => from('nv_estacao') && !S().inv.roupa_termica, use: () => { kit.give('roupa_termica', 1); hud.message(kit.INSPECT.estacao); } });

    [0.3, 0.6, 0.9].forEach((f, i) => {
      const p = along(L, 4, f, 7);
      put(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 12, 8), mat('#9aa8b8', { flatShading: true })), p, 6);
      const ice = put(new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), mat('#cfeaff', { transparent: true, opacity: 0.85 })), p, 1.5);
      const flag = `torre_${i}`;
      updaters.push(() => { ice.visible = !S().flags[flag]; });
      add({ id: flag, group: 'torre', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 4, label: () => 'Desobstruir a torre de ar', enabled: () => from('nv_torres') && !S().flags[flag], use: () => { S().flags[flag] = true; bump('torre'); hud.message(kit.INSPECT.torre); ice.visible = false; kit.gainXp(20); } });
    });

    const matriarcaLair = along(L, 4, 0.55, 0);
    bosses.push({ id: 'matriarca', type: 'matriarca', biome: L, lair: matriarcaLair, wakeFrom: 'nv_matriarca', act: 2 });
    marker('matriarca', matriarcaLair);
    [0.5, 0.555, 0.61].forEach((f, i) => {
      const p = along(L, 4, f, -5);
      const plate = put(new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 3), mat('#d8f0ff', { transparent: true, opacity: 0.85, roughness: 0.1 })), p, 0.3);
      const flag = `placa_${i}`;
      updaters.push(() => { plate.visible = !S().flags[flag]; });
      add({ id: flag, group: 'placa', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 3.5, label: () => 'Derreter a placa de gelo', enabled: () => from('nv_matriarca') && !S().flags[flag], use: () => { S().flags[flag] = true; bump('placa'); plate.visible = false; hud.toast(kit.INSPECT.placa); } });
    });
    const reiLair = along(L, 5, 0.5, 0);
    bosses.push({ id: 'reiInverno', type: 'reiInverno', biome: L, lair: reiLair, wakeFrom: 'nv_rei', act: 2 });
    marker('reiInverno', reiLair);
    // while the ice plates stand, the Matriarca calls her pack
    kit.rules.matriarca = () => ({ summon: count('placa') < 3 ? { type: 'loboGeada', every: 12, max: 3 } : null });
  }

  // =================== Selva dos Gigantes ===================
  {
    const L = 'selva';
    const camp = along(L, 4, 0.1, 7);
    tent(camp, 0.2);
    flames.push(fire(along(L, 4, 0.1, 3)));
    villager('yara', along(L, 4, 0.105, -3), { shirt: '#4a6a2a', pants: '#3a3a2a', hat: '#7a5a2a', skin: '#8a5a3a' });

    const printMat = mat('#2a2018', { polygonOffset: true, polygonOffsetFactor: -4 });
    [[1, 0.4], [2, 0.42], [3, 0.4]].forEach(([li, f], i) => {
      const p = along(L, li, f, 3);
      for (let k = 0; k < 5; k++) { const fp = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10), printMat); fp.rotation.x = -Math.PI / 2; fp.scale.set(1, 1.4, 1); fp.position.set(p.x + k * 0.9, p.y + 0.06, p.z + (k % 2) * 0.6); scene.add(fp); }
      const flag = `pegada_${i}`;
      add({ id: flag, group: 'pegada', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 4, label: () => 'Examinar as pegadas', enabled: () => from('sv_pegadas') && !S().flags[flag], use: () => { S().flags[flag] = true; bump('pegada'); hud.message(kit.INSPECT.pegada); } });
    });

    const rp = along(L, 4, 0.35, 5);
    for (let k = 0; k < 7; k++) { const b = put(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 6), mat('#e8e2d0')), rp.clone().add(V((rand() - 0.5) * 3, 0, (rand() - 0.5) * 3)), 0.15); b.rotation.set(Math.PI / 2, rand() * 3, 0); }
    add({ id: 'restos', kind: 'inspect', pos: rp.clone().setY(rp.y + 1), radius: 4, label: () => 'Examinar os restos', enabled: () => at('sv_restos'), use: () => { hud.message(kit.INSPECT.restos); kit.advance(); } });

    const dtLair = along(L, 4, 0.6, -9);
    bosses.push({ id: 'devoradorTroncos', type: 'devoradorTroncos', biome: L, lair: dtLair, wakeFrom: 'sv_devorador', act: 2 });
    marker('devoradorTroncos', dtLair);
    [0, 2.1, 4.2].forEach((a, i) => {
      const p = dtLair.clone().add(V(Math.cos(a) * 7, 0, Math.sin(a) * 7));
      p.y = kit.h(L, p.x, p.z);
      const rootMesh = put(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 8), mat('#4a3a1a')), p, 0.5);
      rootMesh.rotation.set(Math.PI / 2, 0, -a);
      rootMesh.position.lerp(dtLair, 0.4);
      const flag = `raiz_${i}`;
      updaters.push(() => { rootMesh.visible = !S().flags[flag]; });
      add({ id: flag, group: 'raiz', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 3.5, label: () => 'Cortar a raiz de alimentação', enabled: () => from('sv_devorador') && !S().flags[flag], use: () => { S().flags[flag] = true; bump('raiz'); rootMesh.visible = false; hud.toast(kit.INSPECT.raiz_cortada); } });
    });
    // regenerates while any feeding root stands; never walks
    kit.rules.devoradorTroncos = () => ({ stationary: true, regen: count('raiz') < 3 ? 0.04 : 0 });

    const logMat = mat('#5a4228');
    [[2, 0.55], [2, 0.75], [3, 0.55]].forEach(([li, f], i) => {
      const p = along(L, li, f, 0);
      const pile = new THREE.Group();
      for (let k = 0; k < 4; k++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 4, 7), logMat); lg.rotation.set(Math.PI / 2, rand() * 3, (rand() - 0.5) * 0.5); lg.position.y = 0.35 + k * 0.5; pile.add(lg); }
      put(pile, p);
      const flag = `bloqueio_${i}`;
      updaters.push(() => { pile.visible = !S().flags[flag]; });
      add({ id: flag, group: 'bloqueio', kind: 'inspect', pos: p.clone().setY(p.y + 1), radius: 4, label: () => 'Desfazer o bloqueio', enabled: () => from('sv_rota') && !S().flags[flag], use: () => { S().flags[flag] = true; bump('bloqueio'); pile.visible = false; hud.message(kit.INSPECT.bloqueio); kit.gainXp(20); } });
    });
    const rfLair = along(L, 5, 0.5, 0);
    bosses.push({ id: 'reiFeras', type: 'reiFeras', biome: L, lair: rfLair, wakeFrom: 'sv_rei', act: 2 });
    marker('reiFeras', rfLair);
    // with the route open and the Devorador handled, the Beast King barely needs to be fought
    kit.rules.reiFeras = () => ({ yieldAt: count('bloqueio') >= 3 && S().flags.boss_devoradorTroncos ? 0.9 : 0.25 });
  }

  // the cold of Nivéria hurts without thermal clothes
  let coldToast = 0;
  function update(dt, here) {
    coldToast -= dt;
    if (here === 'niveria' && !S().inv.roupa_termica && !kit.cheats.invulnerable) {
      kit.drain(0.6 * dt);
      if (coldToast <= 0) { hud.toast(kit.INSPECT.frio); coldToast = 12; }
    }
  }

  return {
    bosses,
    applyWorld() { updaters.forEach((f) => f()); },
    update,
    safeZones: () => [['fornalha', npcs.kaela.pos], ['niveria', npcs.sora.pos], ['selva', npcs.yara.pos]],
  };
}
