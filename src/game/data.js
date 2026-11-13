// Act I of the Aetherion campaign as data: items, needs, quest stages, dialogue graphs and
// the pt-BR string table. Pure JavaScript (no three.js), so tests can load and validate it.
//
// Ato I — Descoberta e sobrevivência (regiões 1, 2 e 3)
// A drought hits the Floresta das Raízes. The explorers survive, meet the first communities,
// follow the dry stream up the trunk, find the ancient sluice (Comporta Antiga) that diverts
// the water, recover the first Núcleo de Seiva to restore the flow, and discover that the
// Oceano Interior is contaminated.

// ---- needs (survival-crafting skill: attrition model, warnings at 30%, no instant death) ----
// Full to empty at idle: thirst 10 min, hunger 18 min (thirst ~1.8x faster). Running drains
// 1.8x, flying 1.3x. At 0 the explorer loses health slowly (1 point per 4 s) and faints at 0,
// waking in the village with half bars and nothing lost.
export const NEEDS = {
  thirstPerSec: 100 / 600,
  hungerPerSec: 100 / 1080,
  runFactor: 1.8,
  flyFactor: 1.3,
  warnAt: 30,
  starvePerSec: 0.25,
  regenPerSec: 0.5,       // health regained per second while thirst and hunger are both above 50
};

export const ITEMS = {
  cogumelo: { name: 'Cogumelo comestível', use: { hunger: 25 }, verb: 'Comer' },
  erva: { name: 'Erva medicinal', use: { health: 30 }, verb: 'Usar' },
  resina: { name: 'Resina da casca', use: null },
  alga: { name: 'Alga medicinal', use: { hunger: 12, health: 10 }, verb: 'Comer' },
  chave: { name: 'Chave de âmbar', use: null },
  nucleo: { name: 'Núcleo de Seiva I', use: null },
};
export const FLASK = { capacity: 3, sip: 35 }; // cantil: 3 goles, cada um +35 de sede

// Resource nodes per region: biome id, item, how many nodes exist, respawn seconds.
export const RESOURCES = [
  { biome: 'raizes', item: 'cogumelo', count: 12, respawn: 120 },
  { biome: 'raizes', item: 'erva', count: 6, respawn: 180 },
  { biome: 'deserto', item: 'resina', count: 8, respawn: 150 },
  { biome: 'oceano', item: 'alga', count: 6, respawn: 150 },
];

// ---- quest stages, in order. `target` names an interactable (see game.js) the HUD points at.
// `need` lists counters that complete the stage on their own; otherwise a dialogue or an
// interaction advances it with { advance: true }.
export const STAGES = [
  { id: 'chegada', text: 'Fale com a Anciã Maela na Vila das Raízes', target: 'maela' },
  { id: 'sobreviver', text: 'Colete 3 cogumelos e encha o cantil na nascente', target: 'nascente', need: { cogumelo: 3, cantil: 1 } },
  { id: 'relato', text: 'Leve os cogumelos para Maela', target: 'maela' },
  { id: 'leito', text: 'Investigue o leito seco do riacho', target: 'leito' },
  { id: 'devorador', text: 'Derrote o Devorador de Raízes, a criatura que rói as raízes primárias', target: 'devorador', need: { boss_devorador: 1 } },
  { id: 'caravana', text: 'Suba ao Deserto da Casca e encontre a caravana de Tarek', target: 'tarek' },
  { id: 'resina', text: 'Colete 3 resinas da casca para Tarek', target: 'tarek', need: { resina: 3 } },
  { id: 'troca', text: 'Entregue as resinas a Tarek', target: 'tarek' },
  { id: 'comporta', text: 'Examine a Comporta Antiga', target: 'comporta' },
  { id: 'nucleo', text: 'Derrote o Escorpião-Rei e abra o Santuário da Resina', target: 'santuario' },
  { id: 'restaurar', text: 'Encaixe o Núcleo de Seiva I na Comporta Antiga', target: 'comporta' },
  { id: 'amarga', text: 'Volte a Maela: a água voltou, mas algo está errado', target: 'maela' },
  { id: 'oceano', text: 'Suba ao Oceano Interior e fale com a pescadora Ilian', target: 'ilian' },
  { id: 'sinais', text: 'Investigue 3 sinais de contaminação no Oceano Interior', target: 'sinal', need: { sinal: 3 } },
  { id: 'fim', text: 'Fale com Ilian sobre o que você encontrou', target: 'ilian' },
  { id: 'concluido', text: 'Ato I concluído', target: null },
];
export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

// ---- dialogue graphs (dialogue-systems skill: data graph, line IDs into a string table,
// conditions as plain data — no eval — and effects applied on the transition) ----
// node: { speaker, line, next | choices: [{ text, to, do? }] | end: true, do? }
// effects (`do`): { advance: true, give: { item: n }, take: { item: n }, flag: 'name' }
export const DIALOGUES = {
  maela_chegada: {
    start: 'a',
    nodes: {
      a: { speaker: 'maela', line: 'MAELA_01', next: 'b' },
      b: { speaker: 'maela', line: 'MAELA_02', choices: [{ text: 'OPT_SECA', to: 'c' }, { text: 'OPT_AJUDAR', to: 'd' }] },
      c: { speaker: 'maela', line: 'MAELA_03', next: 'd' },
      d: { speaker: 'maela', line: 'MAELA_04', next: 'fim', do: { advance: true, flag: 'cantil' } },
      fim: { end: true },
    },
  },
  maela_espera: { start: 'a', nodes: { a: { speaker: 'maela', line: 'MAELA_ESPERA', next: 'fim' }, fim: { end: true } } },
  maela_relato: {
    start: 'a',
    nodes: {
      a: { speaker: 'maela', line: 'MAELA_05', next: 'b', do: { take: { cogumelo: 3 } } },
      b: { speaker: 'maela', line: 'MAELA_06', choices: [{ text: 'OPT_RIACHO', to: 'c' }] },
      c: { speaker: 'maela', line: 'MAELA_07', next: 'fim', do: { advance: true } },
      fim: { end: true },
    },
  },
  maela_amarga: {
    start: 'a',
    nodes: {
      a: { speaker: 'maela', line: 'MAELA_08', next: 'b' },
      b: { speaker: 'maela', line: 'MAELA_09', choices: [{ text: 'OPT_OCEANO', to: 'c' }] },
      c: { speaker: 'maela', line: 'MAELA_10', next: 'fim', do: { advance: true } },
      fim: { end: true },
    },
  },
  maela_geral: { start: 'a', nodes: { a: { speaker: 'maela', line: 'MAELA_GERAL', next: 'fim' }, fim: { end: true } } },
  brin: {
    start: 'a',
    nodes: {
      a: { speaker: 'brin', line: 'BRIN_01', choices: [{ text: 'OPT_DICA', to: 'b' }, { text: 'OPT_TCHAU', to: 'fim' }] },
      b: { speaker: 'brin', line: 'BRIN_02', next: 'fim' },
      fim: { end: true },
    },
  },
  tarek_encontro: {
    start: 'a',
    nodes: {
      a: { speaker: 'tarek', line: 'TAREK_01', next: 'b' },
      b: { speaker: 'tarek', line: 'TAREK_02', choices: [{ text: 'OPT_COMPORTA', to: 'c' }, { text: 'OPT_NUCLEO', to: 'd' }] },
      c: { speaker: 'tarek', line: 'TAREK_03', next: 'd' },
      d: { speaker: 'tarek', line: 'TAREK_04', next: 'fim', do: { advance: true } },
      fim: { end: true },
    },
  },
  tarek_espera: { start: 'a', nodes: { a: { speaker: 'tarek', line: 'TAREK_ESPERA', next: 'fim' }, fim: { end: true } } },
  tarek_troca: {
    start: 'a',
    nodes: {
      a: { speaker: 'tarek', line: 'TAREK_05', next: 'b', do: { take: { resina: 3 }, give: { chave: 1 } } },
      b: { speaker: 'tarek', line: 'TAREK_06', next: 'fim', do: { advance: true } },
      fim: { end: true },
    },
  },
  tarek_geral: { start: 'a', nodes: { a: { speaker: 'tarek', line: 'TAREK_GERAL', next: 'fim' }, fim: { end: true } } },
  ilian_encontro: {
    start: 'a',
    nodes: {
      a: { speaker: 'ilian', line: 'ILIAN_01', next: 'b' },
      b: { speaker: 'ilian', line: 'ILIAN_02', choices: [{ text: 'OPT_AGUA', to: 'c' }] },
      c: { speaker: 'ilian', line: 'ILIAN_03', next: 'fim', do: { advance: true } },
      fim: { end: true },
    },
  },
  ilian_espera: { start: 'a', nodes: { a: { speaker: 'ilian', line: 'ILIAN_ESPERA', next: 'fim' }, fim: { end: true } } },
  ilian_fim: {
    start: 'a',
    nodes: {
      a: { speaker: 'ilian', line: 'ILIAN_04', next: 'b' },
      b: { speaker: 'ilian', line: 'ILIAN_05', next: 'c' },
      c: { speaker: 'narrador', line: 'FIM_ATO', next: 'fim', do: { advance: true } },
      fim: { end: true },
    },
  },
  ilian_geral: { start: 'a', nodes: { a: { speaker: 'ilian', line: 'ILIAN_GERAL', next: 'fim' }, fim: { end: true } } },
};

// Which conversation an NPC starts, given the current stage.
export function dialogueFor(npc, stage) {
  const at = (id) => stageIndex(stage) === stageIndex(id);
  if (npc === 'maela') {
    if (at('chegada')) return 'maela_chegada';
    if (at('sobreviver')) return 'maela_espera';
    if (at('relato')) return 'maela_relato';
    if (at('amarga')) return 'maela_amarga';
    return 'maela_geral';
  }
  if (npc === 'brin') return 'brin';
  if (npc === 'tarek') {
    if (at('caravana')) return 'tarek_encontro';
    if (at('resina')) return 'tarek_espera';
    if (at('troca')) return 'tarek_troca';
    return 'tarek_geral';
  }
  if (npc === 'ilian') {
    if (at('oceano')) return 'ilian_encontro';
    if (at('sinais')) return 'ilian_espera';
    if (at('fim')) return 'ilian_fim';
    return 'ilian_geral';
  }
  return null;
}

export const SPEAKERS = { maela: 'Anciã Maela', brin: 'Brin, o coletor', tarek: 'Tarek da caravana', ilian: 'Ilian, a pescadora', narrador: '' };

export const STRINGS = {
  MAELA_01: 'Viajante… você chega num tempo ruim. Há três luas o riacho das raízes vem secando, e os cervos já desceram para fora do tronco.',
  MAELA_02: 'A Vila das Raízes sempre bebeu da água que a árvore puxa do chão. Agora a árvore bebe, mas a água não chega até nós.',
  OPT_SECA: 'Por que a água sumiu?',
  OPT_AJUDAR: 'Como posso ajudar?',
  MAELA_03: 'Os mais velhos dizem que a árvore não erra. Se a água não chega, alguém mudou o caminho dela.',
  MAELA_04: 'Antes de qualquer coisa, sobreviva. Pegue este cantil, encha na nascente perto da vila e junte três cogumelos. Depois conversamos.',
  MAELA_ESPERA: 'A nascente fica logo ali, perto das casas. Cogumelos brotam pela floresta: procure os de chapéu pálido.',
  MAELA_05: 'Bons cogumelos. Vão alimentar as crianças hoje.',
  MAELA_06: 'Agora escute: o leito do riacho corta a floresta e some na parede do tronco. A água vinha de cima.',
  OPT_RIACHO: 'Vou seguir o leito do riacho.',
  MAELA_07: 'Veja onde ele seca. E cuidado: os coletores ouviram algo grande roendo as raízes perto da parede. Se a água vem de cima, procure Tarek: a caravana dele conhece o Deserto da Casca.',
  MAELA_08: 'A água voltou! Ouvi o riacho correr de novo… mas prove: está amarga, escura. Os peixinhos do poço boiaram.',
  MAELA_09: 'Isso não é a seca. É outra coisa. A água que desce passa antes pelo Oceano Interior.',
  OPT_OCEANO: 'Vou ao Oceano Interior descobrir.',
  MAELA_10: 'Suba pela rampa até o Oceano. Ilian pesca lá desde menina, ela vai saber o que mudou.',
  MAELA_GERAL: 'A árvore cuida de quem cuida dela. Volte sempre que precisar descansar.',
  BRIN_01: 'Opa! Coletando também? Tá difícil achar coisa boa com essa seca.',
  OPT_DICA: 'Alguma dica para sobreviver aqui?',
  OPT_TCHAU: 'Até mais.',
  BRIN_02: 'Beba antes de sentir sede. Cogumelo de chapéu pálido mata a fome; erva medicinal fecha machucado. E nunca suba sem o cantil cheio.',
  TAREK_01: 'Um forasteiro da Vila das Raízes? Raro ver alguém subir até a casca com esse calor.',
  TAREK_02: 'Os oásis secaram há semanas. Minha caravana está presa aqui esperando a água voltar.',
  OPT_COMPORTA: 'Sabe para onde a água foi?',
  OPT_NUCLEO: 'Como fazemos a água voltar?',
  TAREK_03: 'Existe uma Comporta Antiga no deserto, mais velha que a vila. Ela divide a água entre os andares. Alguém a fechou.',
  TAREK_04: 'A comporta só funciona com um Núcleo de Seiva. Há um guardado no Santuário da Resina, selado com âmbar. Traga três resinas da casca e eu forjo uma chave.',
  TAREK_ESPERA: 'Resina escorre das fendas da casca: procure as gotas douradas pelo deserto. Preciso de três.',
  TAREK_05: 'Resina boa, ainda quente do sol. Pronto: uma chave de âmbar.',
  TAREK_06: 'O santuário fica do outro lado do deserto, e um escorpião-rei fez ninho na porta dele. Examine a comporta primeiro e vá preparado: leve ervas.',
  TAREK_GERAL: 'O deserto não perdoa quem anda de cantil vazio.',
  ILIAN_01: 'Você veio pela rampa? Então viu: o Oceano está mudando de cor.',
  ILIAN_02: 'Os peixes sobem para a superfície procurando ar. As algas estão morrendo nas margens.',
  OPT_AGUA: 'O que está contaminando a água?',
  ILIAN_03: 'Não sei. Procure perto das passarelas: manchas escuras, peixes mortos, lodo. Quero saber de onde vem.',
  ILIAN_ESPERA: 'Siga as passarelas. Os sinais estão perto delas, na água.',
  ILIAN_04: 'Lodo de folhas apodrecidas, escorrendo de cima. Não é o lago que está doente: algo acima de nós está jogando resíduos na água.',
  ILIAN_05: 'Se a comporta voltou a mandar água, ela agora carrega isso para toda a árvore. Precisamos descobrir a origem antes que chegue às raízes.',
  FIM_ATO: 'Fim do Ato I — Descoberta e sobrevivência. O primeiro núcleo foi recuperado e a água voltou às raízes, mas o Oceano Interior está contaminado. A origem está acima.',
  ILIAN_GERAL: 'O Oceano dá peixe e água para três andares. Se ele adoecer, a árvore inteira sente.',
};

// Inspections and interactions that are not conversations.
export const INSPECT = {
  leito: 'O leito do riacho está rachado e seco. A água descia da parede do tronco, de um canal que vem de cima. E junto à parede, as raízes primárias estão roídas: marcas de mandíbulas enormes. Algo se esconde ali.',
  devorador_morto: 'O Devorador de Raízes tomba. As raízes primárias param de sangrar seiva. Mas o riacho continua seco: a água não vem de baixo, vem de cima.',
  escorpiao_vivo: 'O Escorpião-Rei da Casca guarda o santuário. Derrote-o antes de tentar abrir a porta de âmbar.',
  escorpiao_morto: 'O Escorpião-Rei cai sobre a areia. O caminho até o santuário está livre.',
  comporta_fechada: 'Uma estrutura de pedra e madeira viva, coberta de runas apagadas. As comportas estão fechadas e a água é desviada para um canal lateral. No centro há um encaixe vazio, do tamanho de um punho.',
  comporta_sem_nucleo: 'O encaixe continua vazio. Sem um Núcleo de Seiva a comporta não abre.',
  comporta_restaurada: 'O núcleo brilha no encaixe. As runas acendem, as comportas giram e a água volta a descer pelos canais em direção às raízes.',
  santuario_trancado: 'Uma porta de âmbar endurecido sela o santuário. Sem a chave de âmbar não há como abrir.',
  santuario_aberto: 'A chave derrete no âmbar e a porta cede. Lá dentro, sobre um pedestal, pulsa o Núcleo de Seiva I.',
  nascente: 'Você enche o cantil na nascente.',
  oasis: 'O oásis voltou a encher. Você enche o cantil.',
  sinal_1: 'Uma mancha escura cobre a água. Cheira a folha podre.',
  sinal_2: 'Peixes mortos boiam junto às algas.',
  sinal_3: 'Um lodo grosso desce por um canal que vem de cima do Oceano.',
};

// Validation (dialogue-systems skill): every target exists, every node has an exit, every
// line and choice text is in the string table, every node is reachable from start.
export function validateDialogues() {
  const problems = [];
  for (const [id, g] of Object.entries(DIALOGUES)) {
    if (!g.nodes[g.start]) problems.push(`${id}: missing start node ${g.start}`);
    const seen = new Set([g.start]), queue = [g.start];
    while (queue.length) {
      const n = g.nodes[queue.shift()];
      if (!n) continue;
      const outs = [n.next, ...(n.choices ?? []).map((c) => c.to)].filter(Boolean);
      for (const o of outs) if (!seen.has(o)) { seen.add(o); queue.push(o); }
    }
    for (const [nid, n] of Object.entries(g.nodes)) {
      if (!n.end && !n.next && !n.choices?.length) problems.push(`${id}.${nid}: no exit`);
      for (const o of [n.next, ...(n.choices ?? []).map((c) => c.to)].filter(Boolean)) if (!g.nodes[o]) problems.push(`${id}.${nid}: missing target ${o}`);
      if (n.line && !STRINGS[n.line]) problems.push(`${id}.${nid}: missing string ${n.line}`);
      for (const c of n.choices ?? []) if (!STRINGS[c.text]) problems.push(`${id}.${nid}: missing string ${c.text}`);
      if (n.speaker && !(n.speaker in SPEAKERS)) problems.push(`${id}.${nid}: unknown speaker ${n.speaker}`);
      if (!seen.has(nid)) problems.push(`${id}.${nid}: unreachable`);
    }
  }
  // every stage that a conversation must advance has a conversation that does
  for (const st of STAGES) {
    if (st.need || st.id === 'concluido' || !st.target) continue;
    const npc = ['maela', 'tarek', 'ilian'].includes(st.target) ? st.target : null;
    if (npc) {
      const dlg = DIALOGUES[dialogueFor(npc, st.id)];
      const advances = Object.values(dlg.nodes).some((n) => n.do?.advance || n.choices?.some((c) => c.do?.advance));
      if (!advances) problems.push(`stage ${st.id}: ${npc}'s conversation never advances it`);
    }
  }
  return problems;
}
