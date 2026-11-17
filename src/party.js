// Playing with friends (the `room` capability). Up to four people join a group by a short code.
// Everyone sees the others' name, class, level, place and health, and their characters walk
// the world beside yours. Pings mark a spot for the group; a guardian someone defeats or
// restores is marked done for everyone. Members within 30 m share a 25% XP bonus.
//
// Without the capability (the page open on its own, or not signed in) `createParty` resolves
// { available: false } and the game is a single-player adventure, exactly as before.
// State is only ever shared, never trusted: every name and value that arrives is display data.
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { toonify } from './toon.js';
import { CLASSES } from './game/campaign_data.js';

const CODE = /^[a-z0-9]{4,12}$/;
const TOPICS = { boss: 'interact', ping: 'interact' };    // members may send these; the platform checks
const CLASS_TINT = { guerreiro: '#7a3a2a', mago: '#3a3a8a', sabio: '#2a6a5a', ladino: '#2a2a2a', arqueiro: '#4a6a2a' };
const NEAR = 30;

export async function createParty({ scene, getState, onBoss, onMembers, onPing, walker }) {
  const claude = globalThis.claude;
  let room = null;
  try { room = claude ? await claude.use('room') : null; } catch { room = null; }
  if (!room) return { available: false };

  let named = null, unsubs = [], sendTimer = 0;
  const avatars = new Map();          // peer id -> { c, x, z, feet, yaw, place }
  let members = [];
  let nearCount = 0;

  const me = () => {
    const s = getState();
    return { name: s.name, cls: s.cls, level: s.level, place: s.place, hp: s.hp, x: s.x, z: s.z, feet: s.feet, yaw: s.yaw };
  };

  function refresh() {
    if (!named) return;
    const here = me();
    members = named.peers().map((p) => ({ id: p.peer, isMe: p.isMe, ...(p.presence ?? {}) })).filter((m) => m.name);
    // avatars for everyone else in the same place
    const seen = new Set();
    for (const m of members) {
      if (m.isMe) continue;
      seen.add(m.id);
      if (!avatars.has(m.id)) {
        const c = createCharacter({ name: `amigo_${m.name}`, light: false, pack: false, shirt: CLASS_TINT[m.cls] ?? '#4a4a4a', hat: '#c9b07a', pants: '#2a2a2a' });
        const tag = labelSprite(m.name, CLASSES[m.cls]?.color ?? '#ffd76a');
        c.root.add(tag);
        toonify(c.root, { outline: true });
        scene.add(c.root);
        avatars.set(m.id, { c, tag, x: m.x ?? 0, z: m.z ?? 0, feet: m.feet ?? 0, yaw: m.yaw ?? 0, place: m.place });
      }
      const a = avatars.get(m.id);
      Object.assign(a, { tx: m.x ?? 0, tz: m.z ?? 0, tfeet: m.feet ?? 0, tyaw: m.yaw ?? 0, place: m.place });
    }
    for (const [id, a] of avatars) if (!seen.has(id)) { scene.remove(a.c.root); avatars.delete(id); }
    // people nearby on the same floor share XP
    nearCount = members.filter((m) => !m.isMe && m.place === here.place && Math.hypot((m.x ?? 0) - here.x, (m.z ?? 0) - here.z) < NEAR).length;
    onMembers?.(members.map((m) => ({ ...m, mine: m.isMe, dist: m.isMe ? 0 : Math.hypot((m.x ?? 0) - here.x, (m.z ?? 0) - here.z) })), named.name);
  }

  // the room is shared with its members only; the code is the group's name
  async function join(code) {
    const c = String(code ?? '').toLowerCase().trim();
    if (!CODE.test(c)) throw new Error('code');
    await leave();
    named = await room.join(`aeth-${c}`);
    unsubs.push(named.onPeers(() => refresh(), () => leave()));
    unsubs.push(named.on('boss', (msg) => { if (msg.data?.id && msg.data?.how) onBoss?.(String(msg.data.id), String(msg.data.how)); }));
    unsubs.push(named.on('ping', (msg) => { if (msg.data && Number.isFinite(msg.data.x)) onPing?.({ x: msg.data.x, z: msg.data.z, name: String(msg.data.name ?? 'Alguém').slice(0, 14) }); }));
    named.presence(me()).catch(() => {});
    refresh();
    return c;
  }
  async function leave() {
    for (const u of unsubs) u();
    unsubs = [];
    if (named) { try { await named.leave(); } catch { /* already gone */ } }
    named = null;
    for (const [, a] of avatars) scene.remove(a.c.root);
    avatars.clear();
    members = [];
    nearCount = 0;
    onMembers?.([], null);
  }
  function ping(p) { named?.emit('ping', { x: p.x, z: p.z, name: p.name }).catch(() => {}); }
  function bossDown(id, how) { named?.emit('boss', { id, how }).catch(() => {}); }

  // called every frame: smooth the others' characters, and send our place ~5 times a second
  function update(dt) {
    for (const [, a] of avatars) {
      if (a.tx === undefined) continue;
      const k = 1 - Math.exp(-8 * dt);
      a.x += (a.tx - a.x) * k; a.z += (a.tz - a.z) * k; a.feet += (a.tfeet - a.feet) * k;
      const d = Math.atan2(Math.sin(a.tyaw - a.yaw), Math.cos(a.tyaw - a.yaw));
      a.yaw += d * k;
      const shown = a.place === getState().place;
      a.c.root.visible = shown;
      a.c.root.position.set(a.x, a.feet, a.z);
      a.c.root.rotation.y = a.yaw;
      a.c.update(dt, { x: a.x, y: a.feet, z: a.z, speed: Math.hypot(a.tx - a.x, a.tz - a.z) / Math.max(dt, 1e-3) * 0.02, flying: false, moveYaw: null });
    }
    sendTimer -= dt;
    if (named && sendTimer <= 0) { sendTimer = 0.2; named.presence(me()).catch(() => {}); }
  }

  return {
    available: true,
    join, leave, ping, bossDown, update,
    get code() { return named?.name ?? null; },
    get nearCount() { return nearCount; },
    members: () => members,
  };
}

// a name tag: small canvas texture, always facing the camera
function labelSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,12,10,0.7)'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = color; g.font = '700 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(text).slice(0, 14), 128, 34);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(1.8, 0.45, 1); s.position.set(0, 2.2, 0);
  return s;
}
