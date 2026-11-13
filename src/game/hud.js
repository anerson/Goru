// The game's on-screen interface (game-ui-ux): needs bars with a warning state, the flask,
// the current objective with a direction arrow and distance, the interaction prompt, the
// dialogue box with choices, a backpack, short notices and the end-of-act card.
// Pure DOM; the game calls these functions, the player's clicks and keys call back into it.
import { ITEMS, FLASK, NEEDS } from './campaign_data.js';

export function createHud(root) {
  root.innerHTML = `
    <div class="hud-needs" aria-label="Estado do explorador">
      <div class="bar" data-k="health"><span>Vida</span><i><b></b></i></div>
      <div class="bar" data-k="thirst"><span>Sede</span><i><b></b></i></div>
      <div class="bar" data-k="hunger"><span>Fome</span><i><b></b></i></div>
      <div class="flask" id="hudFlask"></div>
      <div class="lvl"><span id="hudLevel">Nível 1</span><i><b id="hudXp"></b></i></div>
    </div>
    <div class="hud-quest" aria-live="polite">
      <small id="hudAct">Andar 1 de 10 · Floresta das Raízes</small>
      <strong id="hudObjective"></strong>
      <div class="guide" id="hudGuide"><span class="arrow" id="hudArrow">▲</span><span id="hudDist"></span><em id="hudHint"></em></div>
    </div>
    <div class="hud-prompt" id="hudPrompt" hidden><kbd>E</kbd><span></span></div>
    <div class="hud-actions">
      <button type="button" id="hudUse" hidden>Interagir</button>
      <button type="button" id="hudAttack">Atacar</button>
      <button type="button" id="hudDrink">Beber (Q)</button>
      <button type="button" id="hudBag" aria-expanded="false">Mochila (I)</button>
    </div>
    <div class="hud-bag" id="hudBagPanel" hidden></div>
    <div class="hud-bench" id="hudBench" hidden></div>
    <div class="hud-dialogue" id="hudDialogue" hidden>
      <b id="hudSpeaker"></b>
      <p id="hudLine"></p>
      <div class="choices" id="hudChoices"></div>
    </div>
    <div class="hud-toasts" id="hudToasts" aria-live="polite"></div>
    <div class="hud-boss" id="hudBoss" hidden><b id="hudBossName"></b><i><span id="hudBossBar"></span></i></div>
    <div class="hud-hurt" id="hudHurt"></div>
    <div class="hud-aim" id="hudAim" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b><span id="hudAimLabel"></span></div>
    <div class="hud-end" id="hudEnd" hidden><div><h2 id="hudEndTitle">Fim do Ato I</h2><p id="hudEndText"></p><div class="row"><button type="button" id="hudEndNext" hidden></button><button type="button" id="hudEndOk">Continuar explorando</button></div></div></div>
  `;
  const $ = (id) => root.querySelector(`#${id}`);
  let handlers = { interact() {}, drink() {}, useItem() {}, attack() {}, craft() {}, equip() {} };
  let choices = [];
  let lastState = null;

  $('hudUse').onclick = () => handlers.interact();
  $('hudAttack').onclick = () => handlers.attack();
  $('hudDrink').onclick = () => handlers.drink();
  $('hudBag').onclick = () => toggleBag();
  $('hudEndOk').onclick = () => { $('hudEnd').hidden = true; };
  function toggleBag(force) {
    const open = force ?? $('hudBagPanel').hidden;
    $('hudBagPanel').hidden = !open;
    $('hudBag').setAttribute('aria-expanded', String(open));
    if (open && lastState) renderBag(lastState);
  }

  function renderBag(state) {
    const eq = state.equip ?? {};
    const rows = Object.entries(state.inv).filter(([, n]) => n > 0).map(([id, n]) => {
      const it = ITEMS[id];
      const worn = eq.weapon === id || eq.outfit === id;
      const verb = it.weapon ? 'Empunhar' : it.outfit ? 'Vestir' : it.verb;
      const btn = (it.use || it.weapon || it.outfit) && !worn ? `<button type="button" data-use="${id}">${verb}</button>` : worn ? '<em>em uso</em>' : '';
      const tag = it.fragment ? `<small>fragmento · ${it.fragment}${state.flags[`intacto_${id}`] ? '' : ' · rachado'}</small>` : it.note ? `<small>${it.note}</small>` : it.material ? '<small>material</small>' : '';
      return `<li><span>${it.name}${tag}</span><b>× ${n}</b>${btn}</li>`;
    });
    const gear = `<p class="gear">Arma: <b>${eq.weapon ? ITEMS[eq.weapon].name : 'Galho do explorador'}</b> · Roupa: <b>${eq.outfit ? ITEMS[eq.outfit].name : 'roupa de viagem'}</b></p>`;
    const flask = `<li><span>Cantil</span><b>${state.flask}/${FLASK.capacity} goles</b><button type="button" data-drink>Beber</button></li>`;
    $('hudBagPanel').innerHTML = `<h3>Mochila</h3>${gear}<ul>${flask}${rows.join('')}</ul>`;
    $('hudBagPanel').querySelectorAll('[data-use]').forEach((b) => { b.onclick = () => handlers.useItem(b.dataset.use); });
    $('hudBagPanel').querySelector('[data-drink]')?.addEventListener('click', () => handlers.drink());
  }

  // the camp's workbench: every recipe it offers, what it needs and what you carry
  function renderBench(title, rows) {
    const el = $('hudBench');
    if (!title) { el.hidden = true; return; }
    const KIND = { arma: 'Arma', roupa: 'Roupa', consumivel: 'Poção' };
    el.innerHTML = `<h3>${title}</h3><button type="button" class="x" data-close aria-label="Fechar">×</button><ul>${rows.map((r) => `
      <li class="${r.can ? 'can' : ''}">
        <div><b>${r.name}</b> <small>${KIND[r.kind] ?? ''}${r.note ? ` · ${r.note}` : ''}</small></div>
        <div class="req">${r.inputs.map((i) => `<span class="${i.have >= i.need ? 'ok' : ''}">${i.name} ${Math.min(i.have, i.need)}/${i.need}</span>`).join('')}</div>
        <div class="act">${r.owned ? (r.equipped ? '<em>em uso</em>' : `<button type="button" data-equip="${r.id}">${r.kind === 'arma' ? 'Empunhar' : 'Vestir'}</button>`) : `<button type="button" data-craft="${r.id}" ${r.can ? '' : 'disabled'}>Criar</button>`}</div>
      </li>`).join('')}</ul>`;
    el.hidden = false;
    el.querySelectorAll('[data-craft]').forEach((b) => { b.onclick = () => handlers.craft(b.dataset.craft); });
    el.querySelectorAll('[data-equip]').forEach((b) => { b.onclick = () => handlers.equip(b.dataset.equip); });
    el.querySelector('[data-close]').onclick = () => { el.hidden = true; };
  }

  function close() { $('hudDialogue').hidden = true; choices = []; }

  const hud = {
    bind(h) { handlers = h; },
    objective(text, act = 1, floor = 1, place = '') {
      $('hudObjective').textContent = text;
      $('hudAct').textContent = `Ato ${['I', 'II', 'III'][act - 1] ?? 'I'} · Andar ${floor} de 10${place ? ` · ${place[0].toUpperCase()}${place.slice(1)}` : ''}`;
    },
    workbench: renderBench,
    get benchOpen() { return !$('hudBench').hidden; },
    needs(state, { maxHealth = 100, xpFrac = 0 } = {}) {
      for (const k of ['health', 'thirst', 'hunger']) {
        const el = root.querySelector(`.bar[data-k="${k}"]`);
        const v = Math.round((state[k] / (k === 'health' ? maxHealth : 100)) * 100);
        el.querySelector('b').style.width = `${v}%`;
        el.classList.toggle('low', v <= NEEDS.warnAt);
      }
      $('hudLevel').textContent = `Nível ${state.level ?? 1} · ${Math.round(state.health)}/${maxHealth}`;
      $('hudXp').style.width = `${Math.round(Math.min(1, xpFrac) * 100)}%`;
      $('hudFlask').textContent = `Cantil ${state.flask}/${FLASK.capacity}`;
    },
    inventory(state) { lastState = state; if (!$('hudBagPanel').hidden) renderBag(state); },
    prompt(label) {
      $('hudPrompt').hidden = !label;
      $('hudUse').hidden = !label;
      if (label) $('hudPrompt').querySelector('span').textContent = label;
    },
    guide(dist, bearing, hint) {
      const g = $('hudGuide');
      if (dist === null || dist === undefined) { g.hidden = true; return; }
      g.hidden = false;
      $('hudArrow').style.transform = `rotate(${(-bearing * 180) / Math.PI}deg)`;
      $('hudDist').textContent = dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1).replace('.', ',')} km`;
      $('hudHint').textContent = hint ?? '';
    },
    toast(msg) {
      const t = document.createElement('div');
      t.textContent = msg;
      $('hudToasts').append(t);
      setTimeout(() => t.remove(), 3500);
    },
    // a description that does not block movement: shown in the dialogue box with one button
    message(text) {
      hud.dialogue('', text, [{ text: 'Continuar', pick: close }]);
    },
    dialogue(speaker, line, list) {
      $('hudDialogue').hidden = false;
      $('hudSpeaker').textContent = speaker;
      $('hudSpeaker').hidden = !speaker;
      $('hudLine').textContent = line;
      choices = list;
      const box = $('hudChoices');
      box.innerHTML = '';
      list.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = list.length > 1 ? `${i + 1}. ${c.text}` : c.text;
        b.onclick = () => c.pick();
        box.append(b);
      });
      box.querySelector('button')?.focus({ preventScroll: true });
    },
    closeDialogue: close,
    get dialogueOpen() { return !$('hudDialogue').hidden; },
    pick(i) { if (choices[i]) choices[i].pick(); },
    toggleBag,
    // crosshair: neutral, or red with the target's name and health when something is aimed
    aim(target, ranged) {
      const a = $('hudAim');
      a.classList.toggle('on', !!target);
      a.classList.toggle('ranged', ranged);
      $('hudAimLabel').textContent = target ? `${target.name} · ${Math.round(target.frac * 100)}%` : '';
    },
    boss(name, frac) {
      $('hudBoss').hidden = !name;
      if (!name) return;
      $('hudBossName').textContent = name;
      $('hudBossBar').style.width = `${Math.round(frac * 100)}%`;
    },
    hurt() {
      const h = $('hudHurt');
      h.classList.remove('on');
      void h.offsetWidth; // restart the fade
      h.classList.add('on');
    },
    // end of an act: a title, the summary and, when there is a next act, a button to begin it
    ending(title, text, next) {
      $('hudEndTitle').textContent = title;
      $('hudEndText').textContent = text;
      const b = $('hudEndNext');
      b.hidden = !next;
      if (next) { b.textContent = next.label; b.onclick = () => { $('hudEnd').hidden = true; next.run(); }; }
      $('hudEnd').hidden = false;
    },
    reset() { close(); $('hudEnd').hidden = true; $('hudBench').hidden = true; toggleBag(false); $('hudToasts').innerHTML = ''; },
  };
  return hud;
}
