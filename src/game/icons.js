// Ability icons: small line drawings (24×24, stroked in the class colour) so the skill bar shows
// a picture instead of a name. The name, cost and description live in a tooltip.
const P = {
  // Guerreiro
  investida: '<path d="M3 15l11-11 3 3-11 11z"/><path d="M14 4l3-1-1 3"/><path d="M2 20h5M4 17H1M6 22H3"/>',
  sismico: '<path d="M4 20l4-6 3 3 3-5 3 4 3-2"/><path d="M9 9l2-5 4 1 1 4-3 2z"/><path d="M2 22h20"/>',
  avanco_escudo: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M1 9h3M1 13h3M1 17h3"/>',
  muralha: '<path d="M3 20a9 9 0 0 1 18 0"/><path d="M7 20a5 5 0 0 1 10 0"/><path d="M12 3v3M5 6l2 2M19 6l-2 2"/>',
  bastiao: '<rect x="7" y="4" width="10" height="8" rx="3"/><path d="M10 8h.01M14 8h.01"/><path d="M5 21l2-9h10l2 9z"/><path d="M3 14l4-2M21 14l-4-2"/>',
  // Mago
  projetil: '<circle cx="16" cy="8" r="4"/><path d="M13 11L3 21M11 9l-6 2M15 13l-2 6"/>',
  barreira: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M8 10l4-3 4 3"/>',
  raiz: '<path d="M12 3v8M12 11c-3 2-6 3-8 8M12 11c3 2 6 3 8 8M12 11v10M8 15l-2 6M16 15l2 6"/>',
  dissipacao: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10"/>',
  ressonancia: '<path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/>',
  // Sábio
  diagnostico: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21M7 10h6M10 7v6"/>',
  plano: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  remedio: '<path d="M5 19c0-8 6-14 15-15-1 9-7 15-15 15z"/><path d="M5 19l8-8"/><path d="M15 15h5M17.5 12.5v5"/>',
  terreno: '<ellipse cx="12" cy="16" rx="9" ry="4"/><path d="M12 12V3M9 6l3-3 3 3M7 16h10"/>',
  dez_ciclos: '<path d="M6 3h12M6 21h12M7 3c0 5 10 7 10 9s-10 4-10 9M17 3c0 5-10 7-10 9s10 4 10 9"/>',
  // Ladino
  preciso: '<circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5"/>',
  desengajar: '<path d="M10 5L3 12l7 7"/><path d="M3 12h11"/><path d="M17 6v12M21 8v8"/>',
  armadilha: '<path d="M2 16l4-6 4 6 4-6 4 6 4-6"/><path d="M2 20h20"/>',
  fumaca: '<path d="M6 18a4 4 0 0 1 0-8 5 5 0 0 1 9-2 4 4 0 0 1 3 8z"/><path d="M8 21h8"/>',
  execucao: '<path d="M14 3a9 9 0 1 0 7 13A7 7 0 0 1 14 3z"/><path d="M8 14l3-3"/>',
  // Arqueiro
  disparo: '<path d="M4 20L18 6"/><path d="M14 5h5v5"/><path d="M4 20l-1-4M4 20l4 1"/>',
  contencao: '<path d="M4 20L16 8"/><path d="M12 7h5v5"/><circle cx="17" cy="7" r="5"/>',
  elemental: '<path d="M4 20L15 9"/><path d="M11 8h5v5"/><path d="M18 2c0 3 3 3 3 6a3 3 0 0 1-6 0c0-2 2-3 3-6z"/>',
  marca: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4M12 19v4"/>',
  chuva: '<path d="M6 2v10M12 2v14M18 2v10"/><path d="M4 10l2 3 2-3M10 14l2 3 2-3M16 10l2 3 2-3"/><path d="M3 21h18"/>',
};
const FALLBACK = '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>';
export function abilityIcon(id) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[id] ?? FALLBACK}</svg>`;
}
