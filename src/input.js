// Keyboard, mouse-look (drag or pointer lock) and an on-screen joystick for touch.
const LOOK_DRAG = 0.005;   // rad per CSS pixel while dragging
const LOOK_LOCKED = 0.0022; // rad per mouse count under pointer lock

export function createInput(canvas, joyEl, knobEl, { isWalking, onLook }) {
  const keys = new Set();
  const joy = { id: null, x: 0, y: 0 };
  const drag = new Map();

  addEventListener('keydown', (e) => {
    if (!isWalking()) return;
    keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    if (!isWalking()) return;
    drag.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'mouse' && !document.pointerLockElement) {
      try {
        const p = canvas.requestPointerLock?.();
        if (p && p.catch) p.catch(() => {}); // fine to fail: drag-to-look still works
      } catch { /* not available in this frame */ }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!isWalking() || !drag.has(e.pointerId) || document.pointerLockElement === canvas) return;
    const prev = drag.get(e.pointerId);
    onLook((e.clientX - prev.x) * LOOK_DRAG, (e.clientY - prev.y) * LOOK_DRAG);
    drag.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  const end = (e) => drag.delete(e.pointerId);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  document.addEventListener('mousemove', (e) => {
    if (isWalking() && document.pointerLockElement === canvas) onLook(e.movementX * LOOK_LOCKED, e.movementY * LOOK_LOCKED);
  });

  function joyMove(e) {
    const r = joyEl.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(x, y), R = r.width / 2 - 10;
    if (m > R) { x *= R / m; y *= R / m; }
    joy.x = x / R; joy.y = y / R;
    knobEl.style.transform = `translate(${x}px, ${y}px)`;
  }
  joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => {
    if (e.pointerId !== joy.id) return;
    joy.id = null; joy.x = joy.y = 0;
    knobEl.style.transform = '';
  };
  joyEl.addEventListener('pointerup', joyEnd);
  joyEl.addEventListener('pointercancel', joyEnd);

  return {
    keys,
    read() {
      let forward = 0, right = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) right += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) right -= 1;
      forward -= joy.y;
      right += joy.x;
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(joy.x, joy.y) > 0.95;
      return { forward, right, run };
    },
    releaseLock() {
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* ignore */ }
    },
  };
}
