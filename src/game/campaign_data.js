// The whole Aetherion campaign as data, from the campaign manual: ten regions, bottom to top.
// Each region: a community (NPC and camp), the manual's investigation steps, local materials,
// a weapon and an outfit crafted at the camp's workbench, a sub-boss with its mechanic and a
// boss with its choice. The weapon of a region is what lets the explorer hurt that region's
// guardians; the outfit protects from its hazard (heat, cold, spores) and changes the look.
// Pure data (no three.js): tests load it to validate dialogues, recipes and stages.

// ---------------------------------------------------------------- regions
// steps: { group, text, count, look, done } — `done` is the line shown when one is completed
// mechanic: { group, count, look, label, text, ordered?, effect: 'armor' | 'regen' | 'summon' | 'yield' }
export const REGIONS_PLAN = [
  {
    id: 'raizes', act: 1, mission: 'O Sangue que Não Chega',
    npc: { id: 'maela', name: 'Anciã Maela', look: { shirt: '#6b4a7a', pants: '#3a2a3a', hat: '#d8d0c0', skin: '#b98a68' },
      lines: ['Viajante, a água das raízes está sumindo. Os rios baixaram e os lobos já rondam a vila.', 'Antes de investigar, faça um cajado de verdade e uma roupa que aguente a floresta. A bancada fica ali; madeira morta e fibra de raiz não faltam por aqui, e os besouros guardam âmbar.'] },
    mats: { nodes: [['madeira', 'Madeira morta', 'log'], ['fibra', 'Fibra de raiz', 'fiber']], drop: ['ambar', 'Âmbar bruto'] },
    weapon: { id: 'cajado_raiz', name: 'Cajado de Raiz Viva', tier: 1, recipe: { madeira: 3, fibra: 2, ambar: 1 }, look: { color: '#6a4a2a', tip: '#ffb347' } },
    outfit: { id: 'gibao_musgo', name: 'Gibão de Musgo', guard: 0.05, recipe: { fibra: 3, ambar: 1 }, look: { shirt: '#4f7a35', pants: '#3a3a22', hat: '#5a7a3a' } },
    steps: [
      { group: 'nascente', count: 3, look: 'spring', text: 'Investigue 3 nascentes: nível, cor e cheiro da água', done: 'Nível baixo, água turva e cheiro de fungo.' },
      { ambush: 2, group: 'marca', count: 3, look: 'tracks', text: 'Examine 3 marcas de escavação. Besouros-Rachadores vigiam cada marca: derrote-os antes (E)', done: 'Galerias escavadas junto às raízes primárias.' },
      { cost: { fibra: 2 }, group: 'coletor', count: 1, look: 'rescue', text: 'Resgate o coletor preso numa câmara de raízes (leve 2 fibras de raiz para amarrar a maca)', done: 'O coletor sai tossindo: "Um tatu de âmbar fechou a câmara!"' },
    ],
    sub: { type: 'escavadorAmbar', mechanic: { group: 'trama', count: 3, look: 'web', label: 'Tecer a trama de raízes', text: 'Teça a trama de raízes e atraia o Escavador de Âmbar', effect: 'armor' },
      reveal: 'Preso na trama, o Escavador expõe o ventre. Ele só escavava para alcançar a água que sumiu.' },
    boss: { type: 'rainhaRaizes', fragment: ['ambar_vivo', 'Âmbar Vivo', 'Regeneração e estabilidade radicular'],
      mechanic: { group: 'canal', count: 3, look: 'canal', label: 'Limpar o canal contaminado', text: 'Limpe o canal contaminado para expor o núcleo de âmbar da Rainha', effect: 'armor' },
      reveal: 'A Rainha das Raízes não roubava a água: bloqueou os canais para isolar a contaminação fúngica.',
      options: [['destruir', 'Destruir a colônia', 'A colônia morre. A água volta, mas sem guardiã a contaminação pode voltar.'], ['restaurar', 'Limpar a fonte e negociar a reabertura gradual', 'Com o canal limpo, a Rainha reabre o fluxo aos poucos. A água volta às raízes.']] },
  },
  {
    id: 'deserto', act: 1, mission: 'A Sede da Superfície',
    npc: { id: 'tarek', name: 'Tarek da caravana', look: { shirt: '#c96a2a', pants: '#5a4a3a', hat: '#e0c080', skin: '#a87a58' },
      lines: ['Forasteiro! Os oásis secaram e minha caravana está presa entre eles.', 'Ninguém atravessa a casca sem lança e manto. Placas de casca e resina estão por toda parte, e os escorpiões carregam ferrões que servem de ponta.'] },
    mats: { nodes: [['casca', 'Placa de casca', 'plate'], ['resina', 'Resina', 'resin']], drop: ['ferrao', 'Ferrão seco'] },
    weapon: { id: 'lanca_solar', name: 'Lança de Casca Solar', tier: 2, recipe: { casca: 3, resina: 2, ferrao: 1 }, look: { color: '#a8642a', tip: '#ffd76a' } },
    outfit: { id: 'manto_casca', name: 'Manto de Casca', guard: 0.1, recipe: { casca: 2, resina: 2 }, look: { shirt: '#b8834a', pants: '#6a4a2a', hat: '#e0c080', cape: '#8a5a2a' } },
    steps: [
      { group: 'jarro', count: 3, look: 'spring', text: 'Sondeie 3 poços secos e meça o lençol de água (E)', done: 'Ainda há água lá embaixo, mas pouca.' },
      { ambush: 2, group: 'ferroada', count: 3, look: 'tracksRed', text: 'Investigue o sumiço dos coletores: ache 3 marcas de ferrão (escorpiões rondam as marcas)', done: 'Marcas de ferrão grande, quentes ao toque.' },
      { cost: { resina: 1 }, group: 'reservatorio', count: 3, look: 'sand', text: 'Desobstrua 3 reservatórios bloqueados por sedimento (cada um pede 1 resina para vedar)', done: 'O sedimento cede e o reservatório respira.' },
    ],
    sub: { type: 'escorpiaoReiSol', mechanic: { group: 'resfriar', count: 3, look: 'barrel', label: 'Despejar água nas placas', text: 'Resfrie as placas do Escorpião-Rei do Sol com pulsos de água', effect: 'armor' },
      reveal: 'Com as placas frias, o Escorpião-Rei perde o calor. Ele guardava o reservatório antigo dos saqueadores.' },
    boss: { type: 'colossoCasca', fragment: ['cristal_solar', 'Cristal Solar', 'Resistência térmica e armazenamento de luz'],
      mechanic: { group: 'canal_frio', count: 3, look: 'valve', label: 'Abrir o canal de água fria', text: 'Abra os canais de água fria com controle para esfriar o Colosso', effect: 'armor' },
      reveal: 'O Colosso selava as fissuras para impedir a entrada de fungos. Ele fechou também os canais limpos.',
      options: [['destruir', 'Destruir o Colosso', 'O Colosso desmorona. As fissuras ficam sem guardião.'], ['restaurar', 'Mostrar quais canais estão limpos e reabrir só eles', 'O Colosso reabre apenas os canais limpos. Os oásis voltam a encher.']] },
  },
  {
    id: 'oceano', act: 1, mission: 'O Mar que Está Morrendo',
    npc: { id: 'ilian', name: 'Ilian, a pescadora', look: { shirt: '#2a6a8a', pants: '#2a3a4a', hat: '#c9b88a', skin: '#c08a64' },
      lines: ['Os peixes sobem procurando ar. O Oceano está morrendo devagar.', 'Faça um tridente de coral e um traje que aguente a água. Coral e conchas brotam nas margens, e as algas seguram tudo junto.'] },
    mats: { nodes: [['coral', 'Coral', 'coral'], ['concha', 'Concha', 'shell']], drop: ['alga', 'Alga medicinal'] },
    weapon: { id: 'tridente', name: 'Tridente Coralino', tier: 3, recipe: { coral: 3, concha: 2, alga: 1 }, look: { color: '#ff8a7a', tip: '#7fe3ff' } },
    outfit: { id: 'traje_coral', name: 'Traje Coralino', guard: 0.14, recipe: { concha: 2, alga: 2 }, look: { shirt: '#2a8a9a', pants: '#1f4a5a', hat: '#ff9a8a' } },
    steps: [
      { cost: { concha: 1 }, group: 'amostra', count: 3, look: 'sample', text: 'Colete amostras de água em 3 profundidades (cada amostra vai numa concha)', done: 'Transparência baixa, odor podre, pouco oxigênio.' },
      { group: 'estacao_filtro', count: 1, look: 'station', text: 'Localize a estação natural de filtragem', done: 'A estação está entupida de matéria orgânica.' },
      { ambush: 1, group: 'filtro', count: 3, look: 'algae', text: 'Desobstrua as 3 entradas dos filtros vivos: criaturas defendem cada uma, derrote-as antes (E)', done: 'A água volta a passar pelos filtros vivos.' },
    ],
    sub: { type: 'guardiaoMares', mechanic: { group: 'comporta', count: 3, look: 'valve', label: 'Fechar o canal', text: 'Feche os 3 canais que alimentam a barreira do Guardião, na ordem certa (I, II, III)', effect: 'armor', ordered: true },
      reveal: 'Sem a barreira, a tartaruga colossal para. Ela só protegia as zonas de filtragem.' },
    boss: { type: 'leviata', fragment: ['perola_abissal', 'Pérola Abissal', 'Purificação e condução de água'],
      mechanic: { group: 'garganta', count: 3, look: 'algae', label: 'Reativar a filtragem', text: 'Reative a filtragem enquanto o Leviatã sobe para respirar', effect: 'armor' },
      reveal: 'Na garganta do Leviatã brilha um núcleo contaminado. A agressividade é intoxicação.',
      options: [['destruir', 'Matar o Leviatã', 'O Leviatã afunda. A filtragem continua fraca e a zona morta não some.'], ['restaurar', 'Remover o núcleo da garganta e libertá-lo', 'Você arranca o núcleo contaminado. O Leviatã mergulha calmo e os peixes voltam aos poucos.']] },
  },
  {
    id: 'fornalha', act: 2, mission: 'O Calor que Consome', hazard: 'calor',
    npc: { id: 'kaela', name: 'Kaela, a mineradora', look: { shirt: '#8a4a2a', pants: '#3a2a20', hat: '#e0b040', skin: '#a8724a' },
      lines: ['Três barreiras térmicas racharam e o calor já toca a madeira viva. Sem proteção você cozinha aqui.', 'Obsidiana e minerais resistentes estão nas câmaras; as salamandras soltam cinza. Faça um martelo e uma capa na bancada antes de qualquer coisa.'] },
    mats: { nodes: [['obsidiana', 'Obsidiana', 'obsidian'], ['mineral', 'Mineral resistente ao calor', 'ore']], drop: ['cinza', 'Cinza vulcânica'] },
    weapon: { id: 'martelo_obsidiana', name: 'Martelo de Obsidiana', tier: 4, recipe: { obsidiana: 3, mineral: 2, cinza: 1 }, look: { color: '#2a2238', tip: '#ff5a1a' } },
    outfit: { id: 'capa_cinzas', name: 'Capa de Cinzas', guard: 0.18, resist: 'calor', recipe: { cinza: 2, mineral: 2 }, look: { shirt: '#3a3330', pants: '#2a2220', hat: '#8a2a1a', cape: '#5a2a1a', glow: '#ff6a1a' } },
    steps: [
      { ambush: 2, group: 'mineiro', count: 3, look: 'rescue', text: 'Resgate os 3 mineiros presos (as criaturas da fornalha cercam os escombros)', done: 'O mineiro sai dos escombros e corre para o acampamento.' },
      { cost: { obsidiana: 1 }, group: 'ruptura', count: 3, look: 'crack', text: 'Sele as 3 rupturas nas barreiras térmicas com obsidiana (1 por ruptura)', done: 'Ruptura marcada no mapa.' },
      { group: 'chamine', count: 3, look: 'chimney', text: 'Regule as 3 chaminés na ordem I, II, III (os números aparecem sobre elas)', done: 'A pressão cai.', ordered: true },
    ],
    sub: { type: 'ferreiro', mechanic: { group: 'forja', count: 3, look: 'forge', label: 'Desligar a fornalha', text: 'Desligue as 3 fornalhas em sequência (I, II, III) e enfrente o Ferreiro Vulcânico', effect: 'armor', ordered: true },
      reveal: 'Os registros da forja mostram: o Ferreiro acendeu tudo porque o calor crescente parecia um ataque.' },
    boss: { type: 'ignar', fragment: ['nucleo_incandescente', 'Núcleo Incandescente', 'Controle de calor geotérmico'],
      reveal: 'Com as chaminés reguladas, Ignar perde força. Ele é o regulador do calor, preso num ciclo de compensação.',
      options: [['destruir', 'Apagar o núcleo de vez', 'A Fornalha esfria rápido demais e ar quente sobe desordenado até Nivéria.'], ['restaurar', 'Estabilizar o núcleo sem apagar a fonte', 'O núcleo pulsa calmo. As barreiras param de rachar.']] },
  },
  {
    id: 'niveria', act: 2, mission: 'O Inverno que Não Termina', hazard: 'frio', final: true,
    npc: { id: 'sora', name: 'Sora da expedição', look: { shirt: '#2a4a7a', pants: '#2a2a3a', hat: '#e8eef5', skin: '#d0a07c' },
      lines: ['A expedição se espalhou quando os canais congelaram. Sem casaco você não dura.', 'Gelo cristalino e líquen estão por toda a câmara; os lobos de geada dão a pele. Costure um casaco e forje uma lâmina na bancada.'] },
    mats: { nodes: [['gelo', 'Gelo cristalino', 'ice'], ['liquen', 'Líquen', 'lichen']], drop: ['pele', 'Pele de lobo'] },
    weapon: { id: 'lamina_geada', name: 'Lâmina de Geada', tier: 5, recipe: { gelo: 3, liquen: 2, pele: 1 }, look: { color: '#9fd2ff', tip: '#ffffff' } },
    outfit: { id: 'casaco_geada', name: 'Casaco de Geada', guard: 0.22, resist: 'frio', recipe: { pele: 2, liquen: 2 }, look: { shirt: '#e8eef5', pants: '#5a6a7a', hat: '#ffffff', cape: '#c9dceb' } },
    steps: [
      { group: 'estacao', count: 1, look: 'station', text: 'Recupere as ferramentas térmicas na estação abandonada', done: 'Termômetros e roupas velhas: alguém mediu o frio antes de sumir.' },
      { ambush: 2, group: 'torre', count: 3, look: 'tower', text: 'Desobstrua as 3 torres de circulação de ar (lobos de geada se abrigam nelas)', done: 'O ar volta a circular; o termômetro sobe dois graus.' },
    ],
    sub: { type: 'matriarca', mechanic: { group: 'placa', count: 3, look: 'icePlate', label: 'Derreter a placa de gelo', text: 'Derreta as placas que bloqueiam a nascente: enquanto existem, a Matriarca chama a matilha', effect: 'summon' },
      reveal: 'Filhotes. A toca fica junto à nascente: ela convocava a matilha para proteger a cria.' },
    boss: { type: 'reiInverno', fragment: ['cristal_glacial', 'Cristal Glacial', 'Conservação térmica'],
      reveal: 'O núcleo no peito do dragão é o regulador do coração de Aetherion: guardava a energia de toda a árvore congelada para que nada se perdesse. Os cinco fragmentos que você carrega pulsam juntos.',
      options: [
        ['destruir', 'Final A — Destruir o núcleo', 'A energia guardada se solta de uma vez. A árvore sobrevive, mas perde parte da regulação: andares inteiros precisarão ser reconstruídos.'],
        ['restaurar', 'Final B — Sincronizar os cinco fragmentos e recalibrar o núcleo', 'Os cinco fragmentos entram em ressonância e o núcleo volta a regular o coração. A água corre, o calor volta ao equilíbrio e um guardião mortal passa a acompanhar os ciclos.', { fragments: 5 }],
        ['simbiose', 'Final C — Dividir a carga do coração com o Rei do Inverno', 'Você se conecta ao núcleo e divide a carga. A árvore recupera a estabilidade; você assume uma responsabilidade que não termina.'],
      ] },
  },
];

export const REGION_NAMES = { fora: 'a Clareira de Aetherion', raizes: 'a Floresta das Raízes', deserto: 'o Deserto da Casca', oceano: 'o Oceano Interior', fornalha: 'a Fornalha de Ignar', niveria: 'Nivéria', selva: 'a Selva dos Gigantes', pantano: 'o Pântano da Decomposição', cristais: 'o Reino dos Cristais', suspensa: 'a Floresta Suspensa', copa: 'o Jardim da Copa' };

// ---------------------------------------------------------------- needs
// survival-crafting: attrition, warnings at 30%, no instant death. Thirst empties in 10 min,
// hunger in 18; at 0 health drains slowly; fainting sends you back to the last camp.
export const NEEDS = {
  thirstPerSec: 100 / 600, hungerPerSec: 100 / 1080, runFactor: 1.8, flyFactor: 1.3,
  warnAt: 30, starvePerSec: 0.25, regenPerSec: 0.5,
  hazardPerSec: 0.35,      // heat, cold or spores without the region's outfit
};
export const FLASK = { capacity: 3, sip: 35 };
export const HAZARD_NAMES = { calor: 'O calor da Fornalha queima. Uma Capa de Cinzas protege.', frio: 'O frio de Nivéria corta. Um Casaco de Geada protege.', esporos: 'Os esporos do Pântano ardem nos pulmões. Um Traje de Filtragem protege.' };

// weapons: the starting branch is tier 0; each tier hits 28% harder. Against a guardian, a weapon
// below the region's tier barely scratches (x0.1): that floor's weapon has to be crafted first.
export const BASE_WEAPON = { id: 'galho', name: 'Galho do explorador', tier: 0, look: { color: '#7a4b2a', tip: '#9dffcf' } };
export const weaponStats = (w) => ({ name: w.name, tier: w.tier, damage: [18 * (1 + 0.28 * w.tier), 26 * (1 + 0.28 * w.tier)], range: 2.6 + Math.min(1, w.tier * 0.1), cone: Math.cos((60 * Math.PI) / 180), cooldown: 0.45, color: w.look?.tip ?? '#fff2c8' });
export const UNDER_TIER = 0.1;

// ---------------------------------------------------------------- items
export const ITEMS = {
  cogumelo: { name: 'Cogumelo comestível', use: { hunger: 25 }, verb: 'Comer' },
  erva: { name: 'Erva medicinal', use: { health: 30 }, verb: 'Usar' },
  pocao: { name: 'Poção de Seiva', use: { health: 70 }, verb: 'Beber' },
  fruta: { name: 'Fruta do oásis', use: { hunger: 35 }, verb: 'Comer' },
};
export const RECIPES = [
  { id: 'pocao', name: 'Poção de Seiva', inputs: { erva: 1, cogumelo: 1 }, output: 'pocao', kind: 'consumivel' },
];
for (const r of REGIONS_PLAN) {
  for (const [id, name] of [...r.mats.nodes, r.mats.drop]) ITEMS[id] = ITEMS[id] ?? { name, use: id === 'alga' ? { hunger: 12, health: 10 } : null, verb: 'Comer', material: r.id };
  ITEMS[r.weapon.id] = { name: r.weapon.name, weapon: r.weapon, note: `arma nível ${r.weapon.tier}` };
  ITEMS[r.outfit.id] = { name: r.outfit.name, outfit: r.outfit, note: `−${Math.round(r.outfit.guard * 100)}% dano recebido${r.outfit.resist ? ` · protege do ${r.outfit.resist}` : ''}` };
  RECIPES.push({ id: r.weapon.id, name: r.weapon.name, inputs: r.weapon.recipe, output: r.weapon.id, kind: 'arma', region: r.id });
  RECIPES.push({ id: r.outfit.id, name: r.outfit.name, inputs: r.outfit.recipe, output: r.outfit.id, kind: 'roupa', region: r.id });
  for (const g of [r.boss, r.sub]) if (g.fragment) ITEMS[g.fragment[0]] = { name: g.fragment[1], fragment: g.fragment[2] };
}
export const FRAGMENTS = REGIONS_PLAN.flatMap((r) => [r.sub.fragment, r.boss.fragment].filter(Boolean).map((f) => f[0]));

// food and herbs in every region, so the needs never stall the climb
export const RESOURCES = [
  { biome: 'fora', item: 'erva', count: 6, respawn: 90 },
  { biome: 'fora', item: 'cogumelo', count: 6, respawn: 90 },
  { biome: 'fora', item: 'madeira', count: 4, respawn: 120 },
  ...REGIONS_PLAN.flatMap((r) => r.mats.nodes.map(([item]) => ({ biome: r.id, item, count: 9, respawn: 90 }))),
  ...REGIONS_PLAN.map((r) => ({ biome: r.id, item: r.mats.drop[0], count: 3, respawn: 120 })),
  ...REGIONS_PLAN.map((r) => ({ biome: r.id, item: 'cogumelo', count: r.id === 'raizes' ? 8 : 4, respawn: 120 })),
  ...REGIONS_PLAN.map((r) => ({ biome: r.id, item: 'erva', count: 4, respawn: 150 })),
  { biome: 'oceano', item: 'fruta', count: 6, respawn: 120 },
];

// ---------------------------------------------------------------- stages, dialogues and strings
export const STAGES = [];
export const DIALOGUES = {};
export const STRINGS = {
  OPT_SEGUIR: 'Vou cuidar disso.',
  ESCOLHAS: 'Suas escolhas:',
};
export const SPEAKERS = { narrador: '' };
export const BOSSES = [];        // { id, type, biome, act, kind, wakeFrom, mechanic }

// ---- choosing a side: on every floor two groups of the community disagree on how to face the
// crisis. You hear both, pick one, do that side's task and earn its blessing (A: more damage,
// B: more health, both permanent). The ending remembers who you sided with.
export const SIDES = {
  raizes: { q: 'A vila está dividida. Os coletores querem quebrar as barragens de raiz agora; as guardiãs da nascente querem filtrar a água antes de abrir.',
    a: { who: 'Coletores de Brin', say: 'A vila tem sede hoje. Quebre as barragens e a água volta.', task: 'Quebre 3 barragens de raiz para os coletores', look: 'logs', label: 'Quebrar a barragem', bless: 'Força dos Coletores', after: 'A água voltou rápido às casas, ainda turva.' },
    b: { who: 'Guardiãs da Nascente', say: 'Água suja mata devagar. Plante filtros de musgo antes de abrir.', task: 'Plante 3 filtros de musgo nas nascentes', look: 'flower', label: 'Plantar o filtro de musgo', bless: 'Bênção da Nascente', after: 'A água voltou devagar, mas limpa.' } },
  deserto: { q: 'Tarek quer a água para a caravana atravessar a casca; os eremitas querem guardá-la nos reservatórios antigos para a próxima seca.',
    a: { who: 'Caravana de Tarek', say: 'Sem água a caravana morre no meio do caminho. Leve os jarros.', task: 'Leve 3 jarros de água até a caravana', look: 'barrel', label: 'Entregar o jarro', bless: 'Força da Caravana', after: 'A caravana atravessou e o comércio voltou.' },
    b: { who: 'Eremitas da Casca', say: 'Gastar tudo agora é morrer na próxima seca. Sele os reservatórios.', task: 'Cubra 3 reservatórios antigos com lona de casca', look: 'valve', label: 'Cobrir o reservatório', bless: 'Paciência dos Eremitas', after: 'Os reservatórios guardaram água para o próximo ano.' } },
  oceano: { q: 'Os pescadores querem limpar a zona morta com redes; os mergulhadores querem alimentar os filtros vivos do fundo.',
    a: { who: 'Pescadores de Ilian', say: 'Tire o lixo da água e os peixes respiram.', task: 'Recolha 3 redes cheias de lodo', look: 'algae', label: 'Puxar a rede de lodo', bless: 'Braço dos Pescadores', after: 'A superfície clareou e os barcos voltaram.' },
    b: { who: 'Mergulhadores do Fundo', say: 'Os filtros vivos limpam tudo, se tiverem alimento.', task: 'Leve alimento a 3 colônias de filtro', look: 'sample', label: 'Alimentar a colônia', bless: 'Fôlego do Fundo', after: 'O fundo voltou a filtrar sozinho.' } },
  fornalha: { q: 'Os mineiros querem reforçar as barreiras com obsidiana; os forjadores querem abrir respiros para o calor sair.',
    a: { who: 'Mineiros de Kaela', say: 'Barreira forte segura qualquer calor. Reforce com obsidiana.', task: 'Reforce 3 juntas de contenção', look: 'valve', label: 'Reforçar a junta', bless: 'Fúria da Forja', after: 'As barreiras aguentam, mas a pressão continua lá dentro.' },
    b: { who: 'Forjadores', say: 'Calor preso explode. Abra respiros e deixe a fornalha respirar.', task: 'Abra 3 respiros de calor', look: 'vent', label: 'Abrir o respiro', bless: 'Pele de Brasa', after: 'O calor sai devagar e as câmaras esfriaram.' } },
  niveria: { q: 'A expedição quer derreter o gelo para a água correr; os guardiões do gelo querem preservar a reserva intacta.',
    a: { who: 'Expedição de Sora', say: 'Água parada não mata a sede de ninguém. Acenda as pedras de calor.', task: 'Acenda 3 pedras de calor', look: 'crystal', label: 'Acender a pedra de calor', bless: 'Chama da Expedição', after: 'A água corre de novo pelos canais.' },
    b: { who: 'Guardiões do Gelo', say: 'Essa reserva é a água de mil anos. Sele as fendas.', task: 'Sele 3 fendas da reserva', look: 'brace', label: 'Selar a fenda', bless: 'Couraça de Geada', after: 'A reserva ficou intacta para as próximas secas.' } },
};
export const SIDE_BONUS = { a: { dmg: 0.04 }, b: { hp: 15 } };

// ---- the prologue, outside the tree (levels 1-5): a guided start ----
SPEAKERS.thalor = 'Thalor, o guia';
STRINGS.FORA_1 = 'Você chegou, viajante. Aquele é Aetherion: um único carvalho, doze mil anos, um mundo inteiro dentro dele.';
STRINGS.FORA_2 = 'Antes de entrar, aprenda a sobreviver aqui fora. Colete ervas, enfrente as criaturas da clareira e volte mais forte. Nível 5, e as raízes deixam você passar.';
STRINGS.FORA_3 = 'Siga a trilha de luz no chão: ela sempre leva ao próximo objetivo.';
STRINGS.FORA_G = 'A trilha de luz no chão mostra o caminho. Ervas curam, cogumelos matam a fome, e o barril enche o cantil.';
DIALOGUES.thalor_chegada = { start: 'a', nodes: {
  a: { speaker: 'thalor', line: 'FORA_1', next: 'b' },
  b: { speaker: 'thalor', line: 'FORA_2', next: 'c' },
  c: { speaker: 'thalor', line: 'FORA_3', choices: [{ text: 'OPT_SEGUIR', to: 'fim', do: { advance: true } }] },
  fim: { end: true } } };
DIALOGUES.thalor_geral = { start: 'a', nodes: { a: { speaker: 'thalor', line: 'FORA_G', next: 'fim' }, fim: { end: true } } };
// each mission a little closer to the tree, along the one trail: the camp far out (940 m), the
// herbs (900-800 m), the tipped caravan (690 m), the wolves around it, the lanterns of the last
// stretch (470-350 m) and the Portal das Raízes at the trunk, open from level 5
STAGES.push(
  { id: 'fora_chegada', act: 0, region: 'fora', text: 'Fale com Thalor, o guia, no acampamento (siga a trilha de luz)', target: 'thalor', kind: 'talk' },
  { id: 'fora_ervas', act: 0, region: 'fora', text: 'Siga a trilha rumo à árvore e colete 3 ervas medicinais pelo caminho', target: 'node:erva', kind: 'collect', need: { erva: 3 } },
  { id: 'fora_caravana', act: 0, region: 'fora', text: 'Uma caravana tombou mais adiante na trilha: recupere 3 caixotes de mantimentos', target: 'caixote', kind: 'group', need: { caixote: 3 } },
  { id: 'fora_caca', act: 0, region: 'fora', text: 'Criaturas rondam a caravana: derrote 7 delas perto da trilha (clique ou Espaço)', target: 'mob:fora', kind: 'kill', need: { abate_fora: 7 } },
  { id: 'fora_lanternas', act: 0, region: 'fora', text: 'Acenda as 3 lanternas do último trecho, até o anel da árvore', target: 'lanterna', kind: 'group', need: { lanterna: 3 } },
  { id: 'fora_portal', act: 0, region: 'fora', text: 'Chegue ao nível 5 (cace criaturas e abra o baú da trilha) e atravesse o Portal das Raízes', target: 'portal', kind: 'level', need: { nivel: 5 } },
);

for (const [ri, r] of REGIONS_PLAN.entries()) {
  const P = r.id;
  SPEAKERS[r.npc.id] = r.npc.name;
  const L = (k, text) => { const id = `${P.toUpperCase()}_${k}`; STRINGS[id] = text; return id; };
  // 1. meet the community
  STAGES.push({ id: `${P}_chegada`, act: r.act, region: P, text: ri === 0 ? `Entre na árvore por uma abertura entre as raízes e fale com ${r.npc.name}` : `Suba até ${REGION_NAMES[P]} e fale com ${r.npc.name}`, target: r.npc.id, kind: 'talk' });
  DIALOGUES[`${r.npc.id}_chegada`] = { start: 'a', nodes: {
    a: { speaker: r.npc.id, line: L('NPC1', r.npc.lines[0]), next: 'b' },
    b: { speaker: r.npc.id, line: L('NPC2', r.npc.lines[1]), choices: [{ text: 'OPT_SEGUIR', to: 'c' }] },
    c: { speaker: r.npc.id, line: L('NPC3', `Missão: ${r.mission}.`), next: 'fim', do: { advance: true } },
    fim: { end: true } } };
  DIALOGUES[`${r.npc.id}_geral`] = { start: 'a', nodes: { a: { speaker: r.npc.id, line: L('NPCG', r.npc.lines[1]), next: 'fim' }, fim: { end: true } } };
  // the floor's dilemma: hear both sides, pick one, do its task
  const sd = SIDES[P];
  if (sd) {
    STAGES.push({ id: `${P}_lado`, act: r.act, region: P, text: `Ouça ${r.npc.name}: a comunidade está dividida. Escolha um lado`, target: r.npc.id, kind: 'talk' });
    DIALOGUES[`${r.npc.id}_lado`] = { start: 'a', nodes: {
      a: { speaker: r.npc.id, line: L('LADO_Q', sd.q), next: 'b' },
      b: { speaker: r.npc.id, line: L('LADO_AB', `${sd.a.who}: "${sd.a.say}" ${sd.b.who}: "${sd.b.say}"`), choices: [
        { text: L('LADO_A', `Ficar com ${sd.a.who}`), to: 'ca', do: { side: [P, 'a'] } },
        { text: L('LADO_B', `Ficar com ${sd.b.who}`), to: 'cb', do: { side: [P, 'b'] } }] },
      ca: { speaker: r.npc.id, line: L('LADO_CA', `Então vá: ${sd.a.task.toLowerCase()}.`), next: 'fim', do: { advance: true } },
      cb: { speaker: r.npc.id, line: L('LADO_CB', `Então vá: ${sd.b.task.toLowerCase()}.`), next: 'fim', do: { advance: true } },
      fim: { end: true } } };
    STAGES.push({ id: `${P}_tarefa`, act: r.act, region: P, text: '', textBySide: { a: sd.a.task, b: sd.b.task }, target: null, kind: 'side', groups: { a: `${P}_lado_a`, b: `${P}_lado_b` } });
  }
  // 2. craft the region's weapon and outfit
  STAGES.push({ id: `${P}_bancada`, act: r.act, region: P, text: `Crie ${r.weapon.name} e ${r.outfit.name} na bancada do acampamento (a seta mostra o próximo material que falta)`, target: `bancada_${P}`, kind: 'craft', need: { [r.weapon.id]: 1, [r.outfit.id]: 1 } });
  // 3. the manual's investigation steps
  for (const s of r.steps) STAGES.push({ id: `${P}_${s.group}`, act: r.act, region: P, text: s.text, target: s.group, kind: 'group', need: { [s.group]: s.count } });
  // 4. sub-boss, 5. boss
  for (const [kind, g] of [['sub', r.sub], ['boss', r.boss]]) {
    const id = g.type;
    // a mechanic that changes the fight itself (regeneration, summons) is done during it;
    // the others (armour, yielding) prepare the fight and come first
    const during = g.mechanic && ['regen', 'summon'].includes(g.mechanic.effect);
    if (g.mechanic && !during) STAGES.push({ id: `${P}_${g.mechanic.group}`, act: r.act, region: P, text: g.mechanic.text, target: g.mechanic.group, kind: 'group', need: { [g.mechanic.group]: g.mechanic.count }, mechanicOf: id });
    const fight = `${kind === 'sub' ? 'Enfrente o subchefe' : 'Enfrente o guardião'}: ${guardianName(id)}`;
    STAGES.push({ id: `${P}_${kind}`, act: r.act, region: P, text: during ? `${g.mechanic.text}. ${fight}` : fight, target: during ? g.mechanic.group : id, kind: 'boss', need: { [`boss_${id}`]: 1 }, ...(during ? { mechanicOf: id, group: g.mechanic.group } : {}) });
    BOSSES.push({ id, type: id, biome: P, act: r.act, kind, wakeFrom: `${P}_${kind}`, mechanic: g.mechanic ?? null, region: ri + 1, fragment: g.fragment ?? null });
    const options = g.options ?? [['destruir', `Destruir ${guardianName(id)}`, `${guardianName(id)} cai.`], ['poupar', 'Poupar e seguir em frente', `${guardianName(id)} recua e deixa o caminho livre.`]];
    DIALOGUES[`${id}_rendido`] = { start: 'a', nodes: {
      a: { speaker: 'narrador', line: L(`${kind}_R1`, `${guardianName(id)} para de lutar.`), next: 'b' },
      b: { speaker: 'narrador', line: L(`${kind}_R2`, g.reveal), choices: options.map(([how, text, , cond], k) => ({ text: L(`${kind}_O${k}`, text), to: `o${k}`, ...(cond ? { if: { fragments: cond.fragments } } : {}), do: { resolve: [id, how] } })) },
      ...Object.fromEntries(options.map(([, , out], k) => [`o${k}`, { speaker: 'narrador', line: L(`${kind}_X${k}`, out), next: 'fim' }])),
      fim: { end: true } } };
  }
  // 6. the seal to the next floor opens at level 10 x floor
  if (ri < REGIONS_PLAN.length - 1) STAGES.push({ id: `${P}_nivel`, act: r.act, region: P, text: `Alcance o nível ${(ri + 1) * 10} para abrir o selo do próximo andar: cace criaturas do andar (a seta mostra a mais próxima)`, target: `mob:${P}`, kind: 'level', need: { nivel: (ri + 1) * 10 } });
}
STAGES.push({ id: 'campanha_fim', act: 2, region: REGIONS_PLAN[REGIONS_PLAN.length - 1].id, text: 'A campanha terminou', target: null, kind: 'end' });
export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

export function dialogueFor(npc, stage) {
  if (npc === 'thalor') return stage === 'fora_chegada' ? 'thalor_chegada' : 'thalor_geral';
  const r = REGIONS_PLAN.find((x) => x.npc.id === npc);
  if (!r) return null;
  if (stage === `${r.id}_lado`) return `${npc}_lado`;
  return stage === `${r.id}_chegada` ? `${npc}_chegada` : `${npc}_geral`;
}

export function guardianName(id) {
  return { escavadorAmbar: 'o Escavador de Âmbar', rainhaRaizes: 'a Rainha das Raízes', escorpiaoReiSol: 'o Escorpião-Rei do Sol', colossoCasca: 'o Colosso da Casca', guardiaoMares: 'o Guardião das Marés', leviata: 'o Leviatã do Lago Profundo', ferreiro: 'o Ferreiro Vulcânico', ignar: 'Ignar, o Coração Incandescente', matriarca: 'a Matriarca Branca', reiInverno: 'o Rei do Inverno Eterno', devoradorTroncos: 'o Devorador de Troncos', reiFeras: 'o Rei das Feras Antigas', pastorFungos: 'o Pastor dos Fungos', maeDecomposicao: 'a Mãe da Decomposição', cavaleiroAmetista: 'o Cavaleiro de Ametista', arquiteto: 'o Arquiteto Prismático', guardiaVentos: 'a Guardiã dos Ventos', dragaoSeteGalhos: 'o Dragão dos Sete Galhos', sacerdotisa: 'a Sacerdotisa das Flores', devoradorSeiva: 'o Devorador de Seiva' }[id] ?? id;
}
export const ENDINGS = {
  destruir: 'Final A — Destruição',
  restaurar: 'Final B — Reprogramação',
  simbiose: 'Final C — Nova Simbiose',
};

// ---------------------------------------------------------------- checks (used by the tests)
// dialogue graphs: targets exist, every node exits, strings exist, conditions are known, no node
// offers only gated choices, every node is reachable, every talk stage is advanced by its NPC
export function validateCampaign() {
  const problems = [];
  for (const [id, g] of Object.entries(DIALOGUES)) {
    if (!g.nodes[g.start]) problems.push(`${id}: missing start ${g.start}`);
    const seen = new Set([g.start]), queue = [g.start];
    while (queue.length) { const n = g.nodes[queue.shift()]; if (!n) continue; for (const o of [n.next, ...(n.choices ?? []).map((c) => c.to)].filter(Boolean)) if (!seen.has(o)) { seen.add(o); queue.push(o); } }
    for (const [nid, n] of Object.entries(g.nodes)) {
      if (!n.end && !n.next && !n.choices?.length) problems.push(`${id}.${nid}: no exit`);
      for (const o of [n.next, ...(n.choices ?? []).map((c) => c.to)].filter(Boolean)) if (!g.nodes[o]) problems.push(`${id}.${nid}: missing target ${o}`);
      if (n.line && !STRINGS[n.line]) problems.push(`${id}.${nid}: missing string ${n.line}`);
      for (const c of n.choices ?? []) {
        if (!STRINGS[c.text]) problems.push(`${id}.${nid}: missing string ${c.text}`);
        if (c.if && Object.keys(c.if).some((k) => k !== 'fragments' && k !== 'has')) problems.push(`${id}.${nid}: unknown condition`);
      }
      if (n.choices?.length && n.choices.every((c) => c.if)) problems.push(`${id}.${nid}: every choice is conditional`);
      if (n.speaker && !(n.speaker in SPEAKERS)) problems.push(`${id}.${nid}: unknown speaker ${n.speaker}`);
      if (!seen.has(nid)) problems.push(`${id}.${nid}: unreachable`);
    }
  }
  for (const st of STAGES) if (st.kind === 'talk') {
    const g = DIALOGUES[dialogueFor(st.target, st.id)];
    if (!g || !Object.values(g.nodes).some((n) => n.do?.advance || n.choices?.some((c) => c.do?.advance))) problems.push(`stage ${st.id}: never advanced`);
  }
  for (const b of BOSSES) if (!DIALOGUES[`${b.id}_rendido`]) problems.push(`boss ${b.id}: no yield dialogue`);
  if (FRAGMENTS.length !== REGIONS_PLAN.length) problems.push(`expected one fragment per floor, found ${FRAGMENTS.length}`);
  return problems;
}
// recipes: every input can be gathered (a resource node in or below the recipe's region, or a
// mob drop) and every craft stage's outputs have a recipe
export function validateRecipes() {
  const problems = [];
  const order = REGIONS_PLAN.map((r) => r.id);
  const gatherable = (item, region) => RESOURCES.some((n) => n.item === item && order.indexOf(n.biome) <= order.indexOf(region ?? order[order.length - 1]));
  for (const rc of RECIPES) for (const [item, n] of Object.entries(rc.inputs)) {
    if (!ITEMS[item]) problems.push(`${rc.id}: unknown input ${item}`);
    else if (!gatherable(item, rc.region)) problems.push(`${rc.id}: ${item} cannot be gathered by ${rc.region}`);
    if (!(n > 0)) problems.push(`${rc.id}: bad amount for ${item}`);
  }
  for (const st of STAGES) if (st.kind === 'craft') for (const item of Object.keys(st.need)) if (!RECIPES.some((r) => r.output === item)) problems.push(`stage ${st.id}: no recipe for ${item}`);
  return problems;
}

// ---------------------------------------------------------------- levels 1-100
// Each place has a level band (classic MMO zoning): the clearing outside goes to 5, floor N to
// 10 x N. XP stops at the band's top until you climb (the seal opens with that level and the
// floor's guardian). Thresholds grow in linear steps (Game Developer, "Quantitative design: how
// to define XP thresholds"): need(L) = 40 + 12 L, so level 99 -> 100 is 1228, never a wall.
export const FLOOR_IDS = ['fora', ...REGIONS_PLAN.map((r) => r.id)];
export const MAX_LEVEL = 50;
export const levelCap = (region) => (region === 'fora' ? 5 : (FLOOR_IDS.indexOf(region)) * 10);
export const xpNeed = (L) => 40 + 12 * L;
// the XP a whole band takes; rewards are fractions of it, so every floor paces the same
export function bandXp(region) {
  const i = FLOOR_IDS.indexOf(region);
  const from = i === 0 ? 1 : i === 1 ? 5 : (i - 1) * 10, to = levelCap(region);
  let sum = 0;
  for (let L = from; L < to; L++) sum += xpNeed(L);
  return sum;
}
// what each action is worth, as a share of the floor's band: quests, crafting and chests give
// about two thirds; the rest comes from hunting (about 12-15 kills a floor), so fights matter
export const XP_SHARE = { stage: 0.12, object: 0.012, craft: 0.04, chest: 0.035, sub: 0.1, boss: 0.16, mob: 0.03, party: 0.25 };

// the player's own look, chosen when the character is made (skin, hair, shirt, trousers)
export const APPEARANCE = {
  skin: ['#f0c8a0', '#c99674', '#a87a58', '#8a5a3a', '#5a3a28'],
  hair: ['#2a2018', '#6a4a2a', '#c9a24a', '#d8d0c0', '#7a2a1a', '#3a5a8a'],
  shirt: ['#2f7f86', '#7a3a2a', '#3a3a8a', '#2a6a5a', '#4a6a2a', '#8a5a9a', '#e8e0c8', '#2a2a2a'],
  pants: ['#3a3226', '#2a2a3a', '#5a4a3a', '#2a3a2a', '#3a3a3a'],
};
export const DEFAULT_APPEARANCE = { skin: '#c99674', hair: '#2a2018', shirt: '#2f7f86', pants: '#3a3226', top: 'tunica', head: 'chapeu', hairStyle: 'curto' };
// clothing styles (the shape; the colours come from the choices above)
export const STYLES = {
  top: [['tunica', 'Túnica'], ['colete', 'Colete'], ['manto', 'Manto'], ['armadura', 'Armadura leve']],
  head: [['chapeu', 'Chapéu'], ['capuz', 'Capuz'], ['bandana', 'Bandana'], ['nada', 'Sem nada']],
  hairStyle: [['curto', 'Curto'], ['longo', 'Longo'], ['rabo', 'Rabo de cavalo']],
};

// ---------------------------------------------------------------- the five classes (manual, ch. 3)
// Stats multiply the base explorer. Each class has its passives (always on) and its four active
// abilities (keys 1-4) plus the supreme one (R, once per long rest in the manual, here a long
// cooldown). Abilities are data: an `fx` list of effect verbs the combat engine plays:
//   hit {mult, radius, at: 'aim'|'self', stun?, mark?, knock?}   damage to creatures in a radius
//   heal {pct}                                                    recover a share of max health
//   shield {time, reduce}                                         take less damage for a while
//   buff {time, dmg?, crit?, plan?}                               stronger hits for a while
//   calm {radius, time}                                           creatures there lose interest
//   taunt {radius, time}                                          creatures there come to you
//   trap {radius, time, dps, slow}                                a zone that hurts and slows
//   knock {radius, dist}                                          push creatures away
//   dash {dist, ready}                                            short dash; `ready` the next hit crits
//   reveal {}                                                     show the aimed creature's health
export const CLASSES = {
  guerreiro: { name: 'Guerreiro', title: 'Vanguarda do Tronco', role: 'Tanque e dano corpo a corpo', color: '#ff8a5a',
    hp: 1.4, dmg: 1.0, guard: 0.15, range: 3.0, cooldown: 0.5, crit: 0, dodgeCd: 0.9, weapon: 'espada',
    passive: 'Postura Firme: −15% de dano físico recebido. Treino de Armas: +1 em armas de lâmina.',
    abilities: [
      { id: 'escudo', name: 'Golpe de Escudo', cd: 6, text: 'Golpe que causa dano e interrompe conjurações.', fx: [{ v: 'hit', mult: 1.2, radius: 3, stun: 1 }] },
      { id: 'provocar', name: 'Provocar', cd: 10, text: 'Criaturas próximas vêm até você por 6 s.', fx: [{ v: 'taunt', radius: 12, time: 6 }] },
      { id: 'investida', name: 'Investida', cd: 9, text: 'Avança e atinge o que está à frente.', fx: [{ v: 'dash', dist: 6, ready: true }, { v: 'hit', mult: 1.6, radius: 3, knock: 4 }] },
      { id: 'ultima_linha', name: 'Última Linha', cd: 18, text: 'Por 6 s você recebe 50% menos dano e empurra criaturas próximas.', fx: [{ v: 'shield', time: 6, reduce: 0.5 }, { v: 'knock', radius: 4, dist: 3 }] },
    ],
    ultimate: { id: 'bastiao', name: 'Bastião Vivo', cd: 90, text: 'Zona defensiva de 12 s: 60% menos dano para você e as criaturas próximas são empurradas.', fx: [{ v: 'shield', time: 12, reduce: 0.6 }, { v: 'knock', radius: 7, dist: 6 }] },
    look: { shirt: '#7a3a2a', pants: '#3a3a3a', hat: '#8a8a8a' } },
  mago: { name: 'Mago', title: 'Tecelão da Seiva Arcana', role: 'Dano mágico à distância e controle', color: '#9a8aff',
    hp: 0.8, dmg: 1.0, guard: 0, range: 2.6, reach: 24, cooldown: 0.6, crit: 0.03, dodgeCd: 0.7, weapon: 'cajado',
    passive: 'Conservação Arcana: as habilidades têm 10% menos recarga. Afinidade: dano mágico acerta crítico mais.',
    abilities: [
      { id: 'projetil', name: 'Projétil Elemental', cd: 8, text: 'Explosão no alvo da mira: 2,5× o dano a 4 m.', fx: [{ v: 'hit', mult: 2.5, radius: 4, at: 'aim' }] },
      { id: 'barreira', name: 'Barreira de Seiva', cd: 12, text: 'Você recebe 40% menos dano por 6 s.', fx: [{ v: 'shield', time: 6, reduce: 0.4 }] },
      { id: 'raiz', name: 'Raiz Aprisionadora', cd: 10, text: 'Raízes prendem as criaturas a 8 m por 4 s.', fx: [{ v: 'hit', mult: 0.6, radius: 8, at: 'aim', stun: 4 }] },
      { id: 'dissipacao', name: 'Pulso de Dissipação', cd: 14, text: 'Pulso de 2× o dano a 8 m: empurra e deixa as criaturas recebendo 50% mais dano por 6 s.', fx: [{ v: 'hit', mult: 2, radius: 8, mark: 6, markMore: 1.5 }, { v: 'knock', radius: 8, dist: 4 }] },
    ],
    ultimate: { id: 'ressonancia', name: 'Ressonância do Carvalho', cd: 90, text: 'Por 8 s seus golpes causam 60% mais dano e todas as criaturas num raio de 14 m recebem um pulso.', fx: [{ v: 'buff', time: 8, dmg: 1.6 }, { v: 'hit', mult: 1.5, radius: 14, at: 'self' }] },
    look: { shirt: '#3a3a8a', pants: '#2a2a4a', hat: '#5a3a9a' } },
  sabio: { name: 'Sábio', title: 'Cartógrafo dos Ciclos', role: 'Suporte, cura e estratégia', color: '#7fe0b0',
    hp: 1.0, dmg: 0.85, guard: 0.05, range: 2.8, cooldown: 0.5, crit: 0, dodgeCd: 0.7, bossBonus: 0.2, regen: 2, weapon: 'livro',
    passive: 'Análise de Fraqueza: +20% de dano contra guardiões. Conhecimento Natural: sua vida regenera mais depressa.',
    abilities: [
      { id: 'diagnostico', name: 'Diagnóstico', cd: 6, text: 'Mostra a vida exata da criatura da mira e a marca: ela recebe 15% mais dano por 8 s.', fx: [{ v: 'reveal' }, { v: 'hit', mult: 0, radius: 1.5, at: 'aim', mark: 8 }] },
      { id: 'plano', name: 'Plano Tático', cd: 14, text: 'Por 10 s seu grupo e você causam 20% mais dano.', fx: [{ v: 'buff', time: 10, dmg: 1.2, plan: true }] },
      { id: 'remedio', name: 'Remédio de Campo', cd: 18, text: 'Cura 40% da sua vida e acalma as criaturas próximas.', fx: [{ v: 'heal', pct: 0.4 }, { v: 'calm', radius: 10, time: 5 }] },
      { id: 'terreno', name: 'Leitura do Terreno', cd: 20, text: 'Armadilha no chão a 6 m por 8 s: dano e lentidão a quem entra.', fx: [{ v: 'trap', radius: 6, time: 8, dps: 14, slow: 0.4 }] },
    ],
    ultimate: { id: 'dez_ciclos', name: 'Teoria dos Dez Ciclos', cd: 90, text: 'Por 4 s todas as criaturas a 12 m ficam paralisadas e o chefe mostra a fraqueza.', fx: [{ v: 'hit', mult: 0, radius: 12, at: 'self', stun: 4 }, { v: 'reveal' }] },
    look: { shirt: '#2a6a5a', pants: '#3a3a2a', hat: '#c9b07a' } },
  ladino: { name: 'Ladino', title: 'Sombra das Fendas', role: 'Dano de precisão e mobilidade', color: '#c0c0d0',
    hp: 0.9, dmg: 0.9, guard: 0, range: 2.4, cooldown: 0.38, crit: 0.13, dodgeCd: 0.9, weapon: 'adagas',
    passive: 'Passo Silencioso: criaturas demoram a perceber você. Ataque Oportunista: +30% de crítico contra alvo marcado.',
    abilities: [
      { id: 'preciso', name: 'Golpe Preciso', cd: 8, text: 'O próximo golpe é crítico e causa 3× o dano.', fx: [{ v: 'dash', dist: 0, ready: true, mult: 3 / 1.8 }] },
      { id: 'desengajar', name: 'Desengajar', cd: 8, text: 'Recua 5 m e fica invulnerável por 0,5 s.', fx: [{ v: 'dash', dist: -5, ready: false }] },
      { id: 'armadilha', name: 'Armadilha de Fio', cd: 14, text: 'Fio no chão a 6 m por 6 s: prende e fere quem passa.', fx: [{ v: 'trap', radius: 3, time: 6, dps: 10, slow: 0.9 }] },
      { id: 'fumaca', name: 'Fumaça', cd: 16, text: 'Cortina de fumaça: criaturas perdem você por 6 s.', fx: [{ v: 'calm', radius: 8, time: 6 }] },
    ],
    ultimate: { id: 'execucao', name: 'Execução nas Sombras', cd: 90, text: 'Ataque que causa 5× o dano. Se a criatura tiver menos de 30% de vida, cai de uma vez (não vale contra guardiões).', fx: [{ v: 'hit', mult: 5, radius: 2.5, at: 'aim', execute: 0.3 }] },
    look: { shirt: '#2a2a2a', pants: '#1a1a1a', hat: '#3a2a3a' } },
  arqueiro: { name: 'Arqueiro', title: 'Vigia dos Galhos', role: 'Dano à distância e reconhecimento', color: '#b0e07a',
    hp: 0.9, dmg: 0.95, guard: 0, range: 2.6, reach: 28, cooldown: 0.5, crit: 0.06, dodgeCd: 0.6, weapon: 'arco',
    passive: 'Mira Estável: se você não se mexe antes do disparo, o golpe acerta crítico. Olho de Batedor: vê criaturas à distância.',
    abilities: [
      { id: 'disparo', name: 'Disparo Preciso', cd: 4, text: 'Flecha de dano confiável na mira.', fx: [{ v: 'hit', mult: 1.3, radius: 1, at: 'aim' }] },
      { id: 'contencao', name: 'Flecha de Contenção', cd: 10, text: 'Prende a criatura da mira por 4 s.', fx: [{ v: 'hit', mult: 0.8, radius: 1, at: 'aim', stun: 4 }] },
      { id: 'elemental', name: 'Flecha Elemental', cd: 9, text: 'Flecha de fogo e gelo: 2× dano e marca o alvo.', fx: [{ v: 'hit', mult: 2, radius: 1.5, at: 'aim', mark: 6 }] },
      { id: 'marca', name: 'Marca do Caçador', cd: 12, text: 'Marca a criatura da mira: por 10 s ela recebe 30% mais dano de todos.', fx: [{ v: 'hit', mult: 0, radius: 1, at: 'aim', mark: 10, markMore: 1.3 }] },
    ],
    ultimate: { id: 'chuva', name: 'Chuva dos Galhos', cd: 90, text: 'Chuva de flechas em área de 8 m: 2,5× o dano em cada criatura.', fx: [{ v: 'hit', mult: 2.5, radius: 8, at: 'aim' }] },
    look: { shirt: '#4a6a2a', pants: '#3a3020', hat: '#5a7a3a' } },
};

for (const [k, c] of Object.entries(CLASSES)) c.id = k;   // each class knows its own key (passives check it)

// ---------------------------------------------------------------- stories before each place
// Shown once, before you set foot in a place (manual: premise, the ten guardians, each mission)
export const STORIES = {
  fora: { title: 'Aetherion, o Carvalho Colossal', lines: [
    'Há um mundo que é uma árvore. Doze mil anos de idade, doze quilômetros de altura: raízes, casca, câmaras de lava e gelo, lagos, selvas e uma copa que toca as nuvens. Chamam esse carvalho de Aetherion.',
    'Para se proteger, a árvore criou dez guardiões, um para cada função vital: a água, a casca, a filtragem, o calor, o frio, a cadeia alimentar, a reciclagem, os sinais, as junções e o coração. Por milênios eles mantiveram o equilíbrio.',
    'Agora algo deu errado. Os rios das raízes secam, o calor sobe pelas câmaras, sinais falsos ecoam nos cristais. Os guardiões não enlouqueceram: cada um levou sua função ao extremo. Alguém precisa subir andar por andar e entender o que quebrou.',
    'Você chegou à clareira aos pés do carvalho. Ainda não é forte o bastante para entrar. Aprenda aqui fora.'] },
  raizes: { title: 'Floresta das Raízes', lines: [
    'Sob o tronco, raízes do tamanho de montanhas formam vales, cavernas e rios subterrâneos. É aqui que a água entra na árvore, e é aqui que ela está sumindo.',
    'A Vila das Raízes vive da água das nascentes. Os rios baixaram, a água ficou turva e os Lobos de Raiz rondam as casas. Os coletores que desceram às galerias não voltaram.',
    'A Anciã Maela desconfia de algo nas galerias profundas, onde a Rainha das Raízes guarda os canais. A Rainha nasceu para isolar contaminações. O que ela está isolando agora?'] },
  deserto: { title: 'Deserto da Casca', lines: [
    'Acima das raízes, a casca do carvalho se abre em fissuras e plataformas queimadas de sol. Um deserto de madeira, onde a água vale mais que ouro.',
    'Os oásis secaram e a caravana de Tarek está presa entre eles. Coletores somem perto das fendas, e o Escorpião-Rei do Sol caça nas horas mais quentes.',
    'O Colosso da Casca existe para selar fissuras e proteger a árvore de fungos. Mas, se ele selou tudo, quem decide quais canais devem respirar?'] },
  oceano: { title: 'Oceano Interior', lines: [
    'Dentro do tronco há um mar. Uma cavidade gigante, impermeável, cheia de água que a árvore filtra há milênios para alimentar os andares de cima.',
    'Os peixes sobem à superfície procurando ar. A água escurece, os filtros vivos estão entupidos e os pescadores de Ilian não reconhecem mais o lago.',
    'No fundo, o Leviatã do Lago Profundo ataca qualquer barco. Ele protegia os filtros. Agora parece ferido por dentro.'] },
  fornalha: { title: 'Fornalha de Ignar', lines: [
    'Câmaras minerais guardam o calor geotérmico que mantém a árvore viva no inverno. Barreiras de obsidiana separam a lava da madeira.',
    'Três barreiras racharam. Mineiros ficaram presos, as chaminés perderam o controle e o calor já toca a madeira viva. Sem proteção, você não aguenta muito aqui dentro.',
    'Ignar, o Coração Incandescente, regula esse calor. Preso num ciclo de compensação, ele aquece cada vez mais, e cada câmara paga o preço.'] },
  niveria: { title: 'Nivéria, o Reino Congelado', lines: [
    'Acima do calor, o frio. Nivéria conserva a água da árvore em forma de gelo, para os anos de seca.',
    'Os canais congelaram, a expedição de Sora se espalhou e as torres de ar estão bloqueadas. A Matriarca Branca protege a nascente com toda a matilha.',
    'O Rei do Inverno Eterno nunca deixou de cumprir seu papel: conservar água. Ele só esqueceu de deixá-la correr.'] },
};
