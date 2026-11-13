// Modo Mestre: the Game Master's tools. Opened with Shift+G (or the "Mestre" button that
// appears when the page is opened with #mestre). Players never see it otherwise.
//
// The GM carries the Cajado do GM (999.999.999 damage, a sap beam up to 40 m at the crosshair) and can:
//   R  Onda de Seiva   every creature within 18 m falls
//   T  Acalmar         creatures within 25 m stop hunting for 30 s (the base of negotiating)
//   V  Invocar         the chosen creature or boss appears 6 m ahead, on the current level
//   H  Curar           health, thirst and hunger back to full
// plus invulnerability, frozen needs, reviving the bosses and jumping to any story stage.
import { STAGES } from './campaign_data.js';

export function createGM({ root, game, combat, hud, isJourney }) {
  let on = false;
  root.innerHTML = `
    <h3>Mestre do Jogo</h3>
    <p class="gm-weapon">Arma: <b>Cajado do GM</b> · dano <b>999.999.999</b> · mire e ataque até 40 m</p>
    <div class="gm-row">
      <button type="button" data-t="invulnerable" aria-pressed="false">Invencível</button>
      <button type="button" data-t="frozenNeeds" aria-pressed="false">Sem fome e sede</button>
    </div>
    <div class="gm-row">
      <button type="button" data-a="wave">Onda de Seiva <kbd>R</kbd></button>
      <button type="button" data-a="calm">Acalmar <kbd>T</kbd></button>
      <button type="button" data-a="heal">Curar <kbd>H</kbd></button>
    </div>
    <label for="gmCreature">Invocar à frente <kbd>V</kbd></label>
    <div class="gm-row">
      <select id="gmCreature">${combat.gm.creatures.map((c) => `<option value="${c.id}">${c.boss ? '★ ' : ''}${c.name}</option>`).join('')}</select>
      <button type="button" data-a="summon">Invocar</button>
    </div>
    <div class="gm-row">
      <button type="button" data-a="clear">Remover invocados</button>
      <button type="button" data-a="revive">Reviver chefões</button>
    </div>
    <label for="gmStage">Pular para a etapa</label>
    <div class="gm-row">
      <select id="gmStage">${STAGES.map((s, i) => `<option value="${s.id}">${i + 1}. ${s.region} · ${s.text.slice(0, 60)}</option>`).join('')}</select>
      <button type="button" data-a="stage">Ir</button>
    </div>
    <p class="gm-note">Shift+G fecha o modo mestre e devolve o cajado.</p>
  `;
  const $ = (sel) => root.querySelector(sel);

  const actions = {
    wave: () => hud.toast(`Onda de Seiva: ${combat.gm.wave()} criaturas caíram`),
    calm: () => hud.toast(`${combat.gm.calm()} criaturas se acalmaram por 30 s`),
    heal: () => { game.heal(); hud.toast('Vida, sede e fome restauradas'); },
    summon: () => { const m = combat.gm.summon($('#gmCreature').value); hud.toast(m ? `Invocado: ${m.def.name}` : 'Entre no tronco para invocar'); },
    clear: () => { combat.gm.clearSummons(); hud.toast('Criaturas invocadas removidas'); },
    revive: () => { combat.gm.reviveBosses(); game.reviveBosses(); hud.toast('Chefões de volta aos covis'); },
    stage: () => { game.jumpTo($('#gmStage').value); hud.toast('Etapa alterada'); },
  };
  root.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => actions[b.dataset.a](); });
  root.querySelectorAll('[data-t]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.t;
      game.cheats[k] = !game.cheats[k];
      b.setAttribute('aria-pressed', String(game.cheats[k]));
    };
  });

  function set(v) {
    on = v;
    root.hidden = !on;
    document.body.classList.toggle('gm', on);
    combat.gm.setWeapon(on ? 'gm' : 'cajado');
    if (!on) {
      game.cheats.invulnerable = game.cheats.frozenNeeds = false;
      root.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    }
    hud.toast(on ? 'Modo Mestre: Cajado do GM na mão' : 'Modo Mestre desligado');
  }

  addEventListener('keydown', (e) => {
    if (!isJourney()) return;
    if (e.code === 'KeyG' && e.shiftKey && !e.repeat) { set(!on); e.preventDefault(); return; }
    if (!on || e.repeat || e.target.closest?.('select')) return;
    const key = { KeyR: 'wave', KeyT: 'calm', KeyV: 'summon', KeyH: 'heal' }[e.code];
    if (key) { actions[key](); e.preventDefault(); }
  });

  return { toggle: () => set(!on), get on() { return on; }, actions };
}
