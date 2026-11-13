// Act II of Aetherion as data, from the campaign manual's regions 4-6:
//   Fornalha de Ignar — "O Calor que Consome"
//   Nivéria, o Reino Congelado — "O Inverno que Não Termina"
//   Selva dos Gigantes — "O Silêncio da Selva"
// Merged into data.js (stages, items, dialogues, strings, inspections).

export const ITEMS2 = {
  mineral: { name: 'Mineral resistente ao calor', use: null },
  roupa_termica: { name: 'Roupas térmicas', use: null, gear: { cold: true }, note: 'protege do frio de Nivéria' },
  martelo_obsidiana: { name: 'Martelo de Obsidiana', use: null, gear: { power: 0.3 }, note: '+30% de dano' },
  armadura_geada: { name: 'Armadura de Geada', use: null, gear: { guard: 0.25 }, note: '−25% de dano recebido' },
  presas_ancestrais: { name: 'Presas Ancestrais', use: null, gear: { power: 0.2 }, note: '+20% de dano' },
  // regulating fragments (manual, section 5)
  nucleo_incandescente: { name: 'Núcleo Incandescente', use: null, fragment: 'Controle de calor geotérmico' },
  cristal_glacial: { name: 'Cristal Glacial', use: null, fragment: 'Conservação térmica' },
  semente_ancestral: { name: 'Semente Ancestral', use: null, fragment: 'Vitalidade e crescimento' },
};

export const RESOURCES2 = [
  { biome: 'fornalha', item: 'mineral', count: 6, respawn: 150 },
  { biome: 'niveria', item: 'erva', count: 4, respawn: 180 },
  { biome: 'selva', item: 'erva', count: 6, respawn: 150 },
];

export const STAGES2 = [
  // ---- Fornalha de Ignar ----
  { id: 'ig_chegada', act: 2, text: 'Suba à Fornalha de Ignar (100 m) e encontre a mineradora Kaela', target: 'kaela' },
  { id: 'ig_mineiros', act: 2, text: 'Resgate os 3 mineiros presos na Fornalha', target: 'mineiro', need: { resgate: 3 } },
  { id: 'ig_rupturas', act: 2, text: 'Mapeie as 3 rupturas nas barreiras térmicas', target: 'ruptura', need: { ruptura: 3 } },
  { id: 'ig_minerais', act: 2, text: 'Colete 3 minerais resistentes ao calor', target: 'node:mineral', need: { mineral: 3 } },
  { id: 'ig_chamines', act: 2, text: 'Leia o instrumento antigo e regule as chaminés na ordem certa', target: 'chamine', need: { chamines: 1 } },
  { id: 'ig_ferreiro', act: 2, text: 'Desative as fornalhas em sequência e enfrente o Ferreiro Vulcânico', target: 'ferreiro', need: { boss_ferreiro: 1 } },
  { id: 'ig_ignar', act: 2, text: 'Confronte Ignar e estabilize o núcleo sem apagar a fonte', target: 'ignar', need: { boss_ignar: 1 } },
  // ---- Nivéria ----
  { id: 'nv_chegada', act: 2, text: 'Suba a Nivéria (133 m) e procure a expedição desaparecida', target: 'sora' },
  { id: 'nv_estacao', act: 2, text: 'Recupere as roupas térmicas na estação abandonada', target: 'estacao', need: { roupa_termica: 1 } },
  { id: 'nv_torres', act: 2, text: 'Desobstrua as 3 torres de circulação de ar', target: 'torre', need: { torre: 3 } },
  { id: 'nv_matriarca', act: 2, text: 'Derreta as placas de gelo da nascente e afaste a Matriarca Branca', target: 'matriarca', need: { boss_matriarca: 1 } },
  { id: 'nv_rei', act: 2, text: 'Recalibre o núcleo do Rei do Inverno Eterno e mantenha a reserva', target: 'reiInverno', need: { boss_reiInverno: 1 } },
  // ---- Selva dos Gigantes ----
  { id: 'sv_chegada', act: 2, text: 'Suba à Selva dos Gigantes (167 m) e fale com a rastreadora Yara', target: 'yara' },
  { id: 'sv_pegadas', act: 2, text: 'Mapeie 3 trilhas de pegadas de herbívoros', target: 'pegada', need: { pegada: 3 } },
  { id: 'sv_restos', act: 2, text: 'Examine os restos de predação', target: 'restos' },
  { id: 'sv_devorador', act: 2, text: 'Corte as raízes de alimentação e contenha o Devorador de Troncos', target: 'devoradorTroncos', need: { boss_devoradorTroncos: 1 } },
  { id: 'sv_rota', act: 2, text: 'Reabra a rota migratória: desfaça 3 bloqueios', target: 'bloqueio', need: { bloqueio: 3 } },
  { id: 'sv_rei', act: 2, text: 'Encontre o Rei das Feras Antigas e restabeleça o equilíbrio', target: 'reiFeras', need: { boss_reiFeras: 1 } },
  { id: 'ato2_fim', act: 2, text: 'Volte a Yara e conte o que aconteceu na selva', target: 'yara' },
  { id: 'ato2_concluido', act: 2, text: 'Ato II concluído', target: null },
];

const yieldGraph = (intro, reveal, options) => ({
  start: 'a',
  nodes: {
    a: { speaker: 'narrador', line: intro, next: 'b' },
    b: { speaker: 'narrador', line: reveal, choices: options.map(([text, to, how, extra = {}]) => ({ text, to, ...extra, do: { ...(extra.do ?? {}), resolve: [extra.boss, how] } })) },
    ...Object.fromEntries(options.map(([, to, , extra = {}]) => [to, { speaker: 'narrador', line: extra.line, next: 'fim' }])),
    fim: { end: true },
  },
});
const opt = (boss, text, to, how, line, more = {}) => [text, to, how, { boss, line, ...more }];

export const DIALOGUES2 = {
  kaela_chegada: { start: 'a', nodes: {
    a: { speaker: 'kaela', line: 'KAELA_01', next: 'b' },
    b: { speaker: 'kaela', line: 'KAELA_02', choices: [{ text: 'OPT_KAELA_AJUDA', to: 'c' }] },
    c: { speaker: 'kaela', line: 'KAELA_03', next: 'fim', do: { advance: true } },
    fim: { end: true } } },
  kaela_geral: { start: 'a', nodes: { a: { speaker: 'kaela', line: 'KAELA_GERAL', next: 'fim' }, fim: { end: true } } },
  sora_chegada: { start: 'a', nodes: {
    a: { speaker: 'sora', line: 'SORA_01', next: 'b' },
    b: { speaker: 'sora', line: 'SORA_02', next: 'fim', do: { advance: true } },
    fim: { end: true } } },
  sora_geral: { start: 'a', nodes: { a: { speaker: 'sora', line: 'SORA_GERAL', next: 'fim' }, fim: { end: true } } },
  yara_chegada: { start: 'a', nodes: {
    a: { speaker: 'yara', line: 'YARA_01', next: 'b' },
    b: { speaker: 'yara', line: 'YARA_02', next: 'fim', do: { advance: true } },
    fim: { end: true } } },
  yara_fim: { start: 'a', nodes: {
    a: { speaker: 'yara', line: 'YARA_03', next: 'b' },
    b: { speaker: 'narrador', line: 'FIM_ATO2', next: 'fim', do: { advance: true } },
    fim: { end: true } } },
  yara_geral: { start: 'a', nodes: { a: { speaker: 'yara', line: 'YARA_GERAL', next: 'fim' }, fim: { end: true } } },

  ferreiro_rendido: yieldGraph('FER_REND_1', 'FER_REND_2', [
    opt('ferreiro', 'OPT_DESTRUIR', 'd', 'destruir', 'FER_DESTRUIR'),
    opt('ferreiro', 'OPT_DESLIGAR', 'r', 'restaurar', 'FER_RESTAURAR'),
  ]),
  ignar_rendido: yieldGraph('IGN_REND_1', 'IGN_REND_2', [
    opt('ignar', 'OPT_APAGAR', 'd', 'destruir', 'IGN_DESTRUIR'),
    opt('ignar', 'OPT_ESTABILIZAR', 'r', 'restaurar', 'IGN_RESTAURAR'),
  ]),
  matriarca_rendido: yieldGraph('MAT_REND_1', 'MAT_REND_2', [
    opt('matriarca', 'OPT_DESTRUIR', 'd', 'destruir', 'MAT_DESTRUIR'),
    opt('matriarca', 'OPT_AFASTAR', 'p', 'poupar', 'MAT_POUPAR'),
  ]),
  reiInverno_rendido: yieldGraph('REI_REND_1', 'REI_REND_2', [
    opt('reiInverno', 'OPT_DESTRUIR_NUCLEO', 'd', 'destruir', 'REI_DESTRUIR'),
    opt('reiInverno', 'OPT_RECALIBRAR', 'r', 'restaurar', 'REI_RESTAURAR'),
  ]),
  devoradorTroncos_rendido: yieldGraph('DT_REND_1', 'DT_REND_2', [
    opt('devoradorTroncos', 'OPT_EXTERMINAR', 'd', 'destruir', 'DT_DESTRUIR'),
    opt('devoradorTroncos', 'OPT_PODAR', 'r', 'restaurar', 'DT_RESTAURAR'),
  ]),
  reiFeras_rendido: yieldGraph('RF_REND_1', 'RF_REND_2', [
    opt('reiFeras', 'OPT_DESTRUIR', 'd', 'destruir', 'RF_DESTRUIR'),
    opt('reiFeras', 'OPT_MANADA', 'r', 'restaurar', 'RF_RESTAURAR'),
  ]),
};

export function dialogueFor2(npc, stage, at) {
  if (npc === 'kaela') return at('ig_chegada') ? 'kaela_chegada' : 'kaela_geral';
  if (npc === 'sora') return at('nv_chegada') ? 'sora_chegada' : 'sora_geral';
  if (npc === 'yara') return at('sv_chegada') ? 'yara_chegada' : at('ato2_fim') ? 'yara_fim' : 'yara_geral';
  return null;
}

export const SPEAKERS2 = { kaela: 'Kaela, a mineradora', sora: 'Sora da expedição', yara: 'Yara, a rastreadora' };

export const STRINGS2 = {
  ATO2_INICIO: 'Começar o Ato II',
  KAELA_01: 'Você subiu até aqui sem queimar as botas? Então talvez aguente o resto. A Fornalha está esquentando: três barreiras térmicas racharam e o calor já toca a madeira viva.',
  KAELA_02: 'Meus mineiros ficaram presos quando as galerias desabaram. E o Ferreiro, o golem que cuida das fornalhas, agora ataca qualquer um que se aproxima.',
  OPT_KAELA_AJUDA: 'Vou tirar seus mineiros de lá.',
  KAELA_03: 'Três deles, espalhados pela câmara. Depois mapeie as rupturas e junte minerais que aguentem calor: precisamos de reparo provisório antes de mexer nas chaminés.',
  KAELA_GERAL: 'O calor não é o inimigo. Ignar regula a fonte há doze mil anos; o problema é que ninguém regula Ignar.',
  SORA_01: 'Graças à árvore… alguém. A expedição se espalhou quando os canais congelaram. Eu fiquei com os instrumentos.',
  SORA_02: 'Você não vai durar aqui sem roupas térmicas. Há uma estação abandonada na câmara: as roupas ficaram lá. Depois, as torres de circulação: estão obstruídas e o frio não sai.',
  SORA_GERAL: 'O gelo é reserva, não inimigo. Se derreter tudo de uma vez, as galerias de baixo inundam.',
  YARA_01: 'Silêncio. Ouve? Nenhum herbívoro. Faz dias que a manada não passa, e as panteras começaram a caçar perto das aldeias.',
  YARA_02: 'Siga as pegadas antigas. Quero saber para onde a manada foi e o que comeu os que ficaram.',
  YARA_03: 'A manada voltou a passar. Dá para ouvir a selva de novo.',
  YARA_GERAL: 'Os predadores não são maus. Eles só caçam o que sobra quando o resto some.',
  FIM_ATO2: 'Fim do Ato II — Calor, gelo e cadeia alimentar. Três guardiões enfrentados, três fragmentos em jogo. Acima, o Pântano espera, e a matéria que ele não recicla já desce pelos canais.',
  FER_REND_1: 'O Ferreiro Vulcânico ajoelha, a armadura apagando placa por placa.',
  FER_REND_2: 'Os registros na forja mostram: ele acendeu as fornalhas ao máximo porque o calor crescente parecia um ataque externo. Ele só tentava defender a câmara.',
  OPT_DESLIGAR: 'Desligar as fornalhas e deixá-lo cuidar delas em paz',
  FER_DESTRUIR: 'O golem se desfaz em escória. As fornalhas ficam sem guardião.',
  FER_RESTAURAR: 'Você desliga a última fornalha. O Ferreiro se levanta devagar e volta a vigiar as forjas, agora frias o bastante.',
  IGN_REND_1: 'Ignar se contrai, a luz oscilando entre o branco e o vermelho.',
  IGN_REND_2: 'Com as chaminés reguladas, o ciclo de aquecimento perde força. Ignar não é fogo descontrolado: é o regulador do calor geotérmico, preso num ciclo de compensação.',
  OPT_APAGAR: 'Apagar o núcleo de vez',
  OPT_ESTABILIZAR: 'Estabilizar o núcleo sem apagar a fonte',
  IGN_DESTRUIR: 'O núcleo se apaga. A Fornalha esfria rápido demais, e correntes de ar quente sobem desordenadas em direção a Nivéria.',
  IGN_RESTAURAR: 'O núcleo pulsa em ritmo calmo. O calor volta a níveis estáveis e as barreiras param de rachar. Você recebe o Núcleo Incandescente.',
  MAT_REND_1: 'A Matriarca Branca recua até a nascente, protegendo algo atrás dela.',
  MAT_REND_2: 'Filhotes. A toca fica junto à nascente: ela convocava a matilha para proteger a cria, não para caçar você.',
  OPT_AFASTAR: 'Afastá-la sem ferir a toca',
  MAT_DESTRUIR: 'A Matriarca cai. A matilha se dispersa, e os filhotes ficam sozinhos no frio.',
  MAT_POUPAR: 'Você abre caminho em silêncio. A Matriarca se deita junto aos filhotes e deixa você passar. Ela te dá uma lasca de Cristal Glacial que guardava na toca.',
  REI_REND_1: 'O Rei do Inverno Eterno baixa a cabeça; o ar em volta dele para de congelar.',
  REI_REND_2: 'O núcleo no peito do dragão é o regulador térmico de Nivéria. Ele mantinha a câmara congelada para conservar água, mas o mecanismo passou do limite.',
  OPT_DESTRUIR_NUCLEO: 'Destruir o núcleo',
  OPT_RECALIBRAR: 'Recalibrar o núcleo e manter parte da reserva',
  REI_DESTRUIR: 'O núcleo estilhaça. A reserva inteira derrete de uma vez e a água desce em torrente: as galerias inferiores inundam.',
  REI_RESTAURAR: 'O regulador volta ao ponto certo. A água volta a circular devagar, sem perder a reserva. O dragão te entrega o Cristal Glacial e a Armadura de Geada.',
  DT_REND_1: 'Com as raízes de alimentação cortadas, o Devorador de Troncos murcha e para de se regenerar.',
  DT_REND_2: 'Destruir a planta inteira libera uma nuvem de esporos sobre a selva. Podada e contida, ela volta ao tamanho que os predadores naturais conseguiam controlar.',
  OPT_EXTERMINAR: 'Exterminar a planta',
  OPT_PODAR: 'Podar e conter',
  DT_DESTRUIR: 'A planta tomba e uma nuvem de esporos se espalha pelas clareiras. A selva vai demorar a se recuperar.',
  DT_RESTAURAR: 'Você poda os galhos que bloqueavam a rota. O Devorador encolhe e se fecha. Entre as folhas há uma Semente Ancestral.',
  RF_REND_1: 'O Rei das Feras Antigas para, a respiração pesada, olhando para a rota reaberta atrás de você.',
  RF_REND_2: 'Ele não caçava você. Defendia a rota migratória e os filhotes da manada, bloqueados pelo Devorador.',
  OPT_MANADA: 'Abrir caminho e deixar a manada passar',
  RF_DESTRUIR: 'O Rei das Feras cai. Sem ele, ninguém abre clareiras nem dispersa sementes: a vegetação vai fechar a selva.',
  RF_RESTAURAR: 'O Rei ergue a cabeça e chama a manada. Os herbívoros voltam a atravessar a selva. Ele deixa para você as Presas Ancestrais.',
};

export const INSPECT2 = {
  mineiro: 'Você remove os escombros. O mineiro sai tossindo e corre de volta para o acampamento de Kaela.',
  ruptura: 'Uma rachadura na barreira térmica: calor vaza direto para a madeira viva. Você marca a posição no mapa.',
  instrumento: 'Um instrumento antigo, gravado com três chaminés e uma ordem: primeiro a do LESTE, depois a do NORTE, por último a do OESTE.',
  chamine_certa: 'A chaminé range e a pressão cai um pouco.',
  chamine_errada: 'Ordem errada! Um jato de vapor escapa e as válvulas voltam ao início.',
  chamines_ok: 'As três chaminés estão reguladas. A pressão da Fornalha se estabiliza.',
  forja_certa: 'Você desliga a fornalha. A armadura do Ferreiro perde parte do brilho.',
  forja_errada: 'Sobrepressão! A fornalha explode em faíscas e as outras reacendem.',
  estacao: 'A estação está coberta de gelo, mas os baús ainda fecham. Você veste as roupas térmicas: o frio para de doer.',
  torre: 'Você remove o gelo da entrada da torre. Uma corrente de ar volta a circular e o termômetro sobe dois graus.',
  placa: 'Você derrete a placa de gelo que bloqueava a nascente.',
  frio: 'O frio de Nivéria corta a pele. Sem roupas térmicas você perde vida aos poucos.',
  pegada: 'Pegadas grandes de herbívoros, antigas. Elas seguem para o norte e param de repente.',
  restos: 'Restos de herbívoros e marcas de mandíbulas vegetais. Algo enraizado no caminho da manada está comendo quem passa: o Devorador de Troncos bloqueou a rota migratória.',
  raiz_cortada: 'Você corta uma raiz de alimentação. O Devorador estremece.',
  bloqueio: 'Você desfaz o emaranhado de troncos que fechava a rota.',
};

// what each guardian leaves, by the player's choice ('any' = whatever was chosen)
export const REWARDS2 = {
  ferreiro: { any: { martelo_obsidiana: 1 } },
  ignar: { restaurar: { nucleo_incandescente: 1 } },
  matriarca: { poupar: { cristal_glacial: 1 } },
  reiInverno: { restaurar: { cristal_glacial: 1, armadura_geada: 1 }, destruir: { armadura_geada: 1 } },
  devoradorTroncos: { restaurar: { semente_ancestral: 1 } },
  reiFeras: { restaurar: { presas_ancestrais: 1 } },
};
