// The Aetherion bestiary, transcribed from the campaign manual (section 4): for each of the ten
// regions, three common creatures, a sub-boss, a boss and the regulating fragment.
// Values are the manual's reference numbers (Vida, Ataque, Defesa, Velocidade, Perigo); the game
// converts them with GAME_SCALE below, so the table can also be used at the tabletop as is.
// `model` names the in-game body (creatures.js); null means not in the game yet (flyers,
// swimmers and colonies that the current engine cannot show well).

export const GAME_SCALE = {
  mobHp: 0.6,        // creature health = Vida x 0.6
  subBossHp: 1 / 6,  // sub-boss health = Vida / 6
  bossHp: 1 / 10,    // boss health = Vida / 10
  damage: 0.6,       // damage per hit = Ataque x 0.6
  speed: (v) => 2 + v * 0.45,           // m/s from Velocidade 1..10
  armor: (d) => 20 / (20 + d * 0.5),    // damage taken multiplier from Defesa
};

const m = (id, nome, vida, ataque, defesa, velocidade, habilidade, fraqueza, model) => ({ id, nome, vida, ataque, defesa, velocidade, habilidade, fraqueza, model });

export const REGIONS = [
  {
    id: 'raizes', nome: 'Floresta das Raízes', nivel: '1–5', fragmento: 'Âmbar Vivo',
    mobs: [
      m('besouroRachador', 'Besouro-Rachador', 35, 8, 7, 3, 'Mandíbula Serrilhada: dano adicional a escudos e estruturas frágeis', 'Abdômen exposto quando tombado; fumaça os dispersa', 'besouro'),
      m('aranhaMusgo', 'Aranha-de-Musgo', 24, 6, 3, 8, 'Teia Viscosa: imobiliza um alvo por uma rodada', 'Vibração forte revela sua posição; fogo moderado destrói teias', 'aranha'),
      m('loboRaiz', 'Lobo de Raiz', 42, 9, 5, 9, 'Caçada Coordenada: +2 ataque quando outro lobo ameaça o mesmo alvo', 'Isolado perde o bônus de matilha; luz forte pode afastá-lo', 'lobo'),
    ],
    subBoss: { id: 'escavadorAmbar', nome: 'O Escavador de Âmbar', vida: 450, ataque: 18, defesa: 15, velocidade: 5, perigo: 6, mecanica: 'Atraí-lo para uma trama de raízes entrelaçadas: ao investir contra a trama fica preso por duas rodadas e expõe o ventre.', recompensas: 'Fragmento de Âmbar Vivo; mapa de galerias; acesso a rotas de água' },
    boss: { id: 'rainhaRaizes', nome: 'A Rainha das Raízes', vida: 1800, ataque: 28, defesa: 22, velocidade: 4, perigo: 8, fraqueza: 'Expor o núcleo de âmbar e limpar o canal contaminado. Matar a Rainha sem limpar o canal deixa a região vulnerável.', recompensas: 'Âmbar Vivo; Botas de Raiz; recuperação progressiva de água' },
  },
  {
    id: 'deserto', nome: 'Deserto da Casca', nivel: '5–10', fragmento: 'Cristal Solar',
    mobs: [
      m('escorpiaoCasca', 'Escorpião de Casca', 55, 14, 8, 7, 'Ferrão Secante: dano e reduz resistência por uma rodada', 'Carapaça ventral menos protegida; luz intensa o expõe', 'escorpiao'),
      m('lagartoSolar', 'Lagarto Solar', 48, 12, 9, 8, 'Rajada Térmica: libera calor acumulado em cone curto', 'Perde vigor em frio prolongado e sombra profunda', 'lagarto'),
      m('abutreCasca', 'Abutre de Casca', 65, 16, 6, 10, 'Mergulho Predatório: bônus de dano se atacar de altitude', 'Asas vulneráveis no solo; correntes de vento previsíveis', null),
    ],
    subBoss: { id: 'escorpiaoReiSol', nome: 'Escorpião-Rei do Sol', vida: 650, ataque: 24, defesa: 18, velocidade: 7, perigo: 7, mecanica: 'Atrair para uma fenda sombreada e resfriar as placas com água em pulsos curtos.', recompensas: 'Ferrão Solar; acesso a um reservatório antigo' },
    boss: { id: 'colossoCasca', nome: 'Colosso da Casca', vida: 2400, ataque: 35, defesa: 28, velocidade: 3, perigo: 9, fraqueza: 'Água aplicada com controle e correntes frias. Água demais causa erosão.', recompensas: 'Cristal Solar; Manto de Casca; oásis reativados' },
  },
  {
    id: 'oceano', nome: 'Oceano Interior', nivel: '10–15', fragmento: 'Pérola Abissal',
    mobs: [
      m('piranhaCristal', 'Piranha de Cristal', 70, 18, 7, 10, 'Mordida em Enxame: dano cresce se três ou mais cercam o alvo', 'Ruídos graves e pulsos de luz desorganizam o cardume', null),
      m('caranguejoFossil', 'Caranguejo de Madeira Fóssil', 110, 20, 18, 3, 'Pinça de Pressão: prende equipamento ou membro', 'Articulações laterais frágeis; distraído com alimento', null),
      m('serpenteAguaEscura', 'Serpente de Água Escura', 95, 23, 10, 9, 'Redemoinho: arrasta o alvo para zona funda', 'Luz intensa e corrente contrária quebram a emboscada', null),
    ],
    subBoss: { id: 'guardiaoMares', nome: 'Guardião das Marés', vida: 900, ataque: 25, defesa: 30, velocidade: 3, perigo: 8, mecanica: 'Três canais alimentam sua barreira; fechá-los na ordem certa reduz a defesa sem destruir o filtro.', recompensas: 'Escama Coralina; respiração aquática temporária' },
    boss: { id: 'leviata', nome: 'Leviatã do Lago Profundo', vida: 3000, ataque: 38, defesa: 20, velocidade: 9, perigo: 10, fraqueza: 'Remover o núcleo contaminado da garganta. Matar o Leviatã não resolve a falta de oxigênio.', recompensas: 'Pérola Abissal; Tridente das Correntes; água limpa' },
  },
  {
    id: 'fornalha', nome: 'Fornalha de Ignar', nivel: '15–20', fragmento: 'Núcleo Incandescente',
    mobs: [
      m('salamandraMagma', 'Salamandra de Magma', 100, 25, 14, 6, 'Cuspe Incandescente: projétil de fogo que deixa área quente', 'Água em quantidade controlada resfria placas externas', 'salamandra'),
      m('besouroObsidiana', 'Besouro de Obsidiana', 130, 22, 24, 4, 'Carapaça Cortante: dano ao ser atingido corpo a corpo', 'Juntas e ventre não têm placas de obsidiana', 'besouroObsidiana'),
      m('elementalCinzas', 'Elemental de Cinzas', 90, 28, 10, 7, 'Nuvem Asfixiante: reduz visão e vigor', 'Ventilação forte dispersa o corpo particulado', 'elemental'),
    ],
    subBoss: { id: 'ferreiro', nome: 'Ferreiro Vulcânico', vida: 1200, ataque: 34, defesa: 25, velocidade: 4, perigo: 8, mecanica: 'Três fornalhas alimentam a armadura. Desativá-las em sequência reduz a defesa; todas de uma vez causam sobrepressão.', recompensas: 'Núcleo Incandescente; Martelo de Obsidiana; acesso às chaminés' },
    boss: { id: 'ignar', nome: 'Ignar, o Coração Incandescente', vida: 3800, ataque: 42, defesa: 27, velocidade: 6, perigo: 10, fraqueza: 'Regular pressão e ventilação. Fechar todas as chaminés pode causar explosão; abrir demais congela câmaras vizinhas.', recompensas: 'Núcleo Incandescente estabilizado; resistência ao fogo; barreiras reparadas' },
  },
  {
    id: 'niveria', nome: 'Nivéria, o Reino Congelado', nivel: '20–25', fragmento: 'Cristal Glacial',
    mobs: [
      m('loboGeada', 'Lobo de Geada', 120, 28, 12, 10, 'Mordida Congelante: reduz a velocidade do alvo', 'Calor constante e separação da matilha', 'loboBranco'),
      m('corujaGlacial', 'Coruja Glacial', 85, 30, 8, 10, 'Visão do Inverno; Mergulho Gelado', 'Frágil se obrigada a pousar em área aberta', null),
      m('golemGelo', 'Golem de Gelo', 180, 25, 30, 3, 'Prisão Glacial: prende um alvo; Pancada de Geada', 'Calor nas juntas e vibração quebram suas articulações', 'golem'),
    ],
    subBoss: { id: 'matriarca', nome: 'Matriarca Branca', vida: 1400, ataque: 36, defesa: 22, velocidade: 9, perigo: 8, mecanica: 'Enquanto há gelo intacto ela convoca reforços. Derreter só as placas que bloqueiam a nascente reduz sua vantagem.', recompensas: 'Cristal Glacial; trilha segura para as torres de circulação' },
    boss: { id: 'reiInverno', nome: 'Rei do Inverno Eterno', vida: 4000, ataque: 45, defesa: 30, velocidade: 5, perigo: 10, fraqueza: 'Corrigir o regulador térmico, não destruir o núcleo. Destruição total derrete a reserva e inunda as regiões inferiores.', recompensas: 'Cristal Glacial; Armadura de Geada; canais descongelados' },
  },
  {
    id: 'selva', nome: 'Selva dos Gigantes', nivel: '25–30', fragmento: 'Semente Ancestral',
    mobs: [
      m('panteraCipo', 'Pantera de Cipó', 150, 36, 15, 10, 'Emboscada Vegetal: dano extra se atacar sem ser detectada', 'Áreas abertas e rastreamento revelam sua posição', 'felino'),
      m('besouroColossal', 'Besouro Colossal', 220, 30, 30, 4, 'Aríete Natural: investida que derruba obstáculos', 'Ventre e articulações têm placas mais finas', 'besouroColossal'),
      m('serpenteFolhagem', 'Serpente de Folhagem', 170, 40, 16, 8, 'Camuflagem Perfeita; Constrição', 'Vibrações no solo e calor revelam sua presença', 'serpente'),
    ],
    subBoss: { id: 'devoradorTroncos', nome: 'Devorador de Troncos', vida: 1700, ataque: 42, defesa: 28, velocidade: 3, perigo: 8, mecanica: 'Cortar suas raízes de alimentação interrompe a regeneração; destruir toda a planta libera esporos. Podar e conter em vez de exterminar.', recompensas: 'Semente Ancestral; caminho até a manada do Rei das Feras' },
    boss: { id: 'reiFeras', nome: 'Rei das Feras Antigas', vida: 4500, ataque: 48, defesa: 32, velocidade: 7, perigo: 10, fraqueza: 'Não precisa ser morto. Restaurar a rota migratória e afastar o Devorador reduz a agressividade. Combate letal desequilibra a vegetação.', recompensas: 'Presas Ancestrais; Manto de Camuflagem; aliança com a manada' },
  },
  {
    id: 'pantano', nome: 'Pântano da Decomposição', nivel: '30–35', fragmento: 'Esporo Primordial',
    mobs: [
      m('sanguessugaLodo', 'Sanguessuga de Lodo', 130, 28, 10, 5, 'Drenagem Vital: recupera vida ao causar dano', 'Sal e calor moderado a fazem soltar o alvo', 'sanguessuga'),
      m('sapoEsporos', 'Sapo de Esporos', 150, 32, 14, 5, 'Nuvem de Esporos: área de visão reduzida e irritação', 'Vento forte dispersa a nuvem; máscara protege', 'sapo'),
      m('carnical', 'Carniçal de Madeira Morta', 200, 36, 20, 4, 'Regeneração Fúngica: recupera vida se os focos não forem removidos', 'Remover os fungos expõe o corpo; fogo descontrolado prejudica o ecossistema', 'golem'),
    ],
    subBoss: { id: 'pastorFungos', nome: 'Pastor dos Fungos', vida: 1900, ataque: 38, defesa: 25, velocidade: 5, perigo: 8, mecanica: 'Localizar e drenar três focos fúngicos. Queimar todos os focos espalha esporos e destrói decompositores úteis.', recompensas: 'Esporo Primordial; Máscara de Filtragem' },
    boss: { id: 'maeDecomposicao', nome: 'Mãe da Decomposição', vida: 5000, ataque: 50, defesa: 35, velocidade: 3, perigo: 10, fraqueza: 'Drenagem, ventilação e remoção seletiva de focos. Eliminar todos os fungos interrompe a reciclagem.', recompensas: 'Esporo Primordial; Cajado dos Esporos; canais de drenagem restaurados' },
  },
  {
    id: 'cristais', nome: 'Reino dos Cristais', nivel: '35–40', fragmento: 'Prisma Antigo',
    mobs: [
      m('aranhaQuartzo', 'Aranha de Quartzo', 200, 40, 28, 8, 'Teia Cristalina: prende e pode refletir magia fraca', 'Vibrações sonoras quebram a teia; juntas frágeis', 'cristalino'),
      m('morcegoPrismatico', 'Morcego Prismático', 150, 38, 12, 10, 'Eco Prismático: desorienta; Mergulho Sônico', 'Silêncio controlado e superfícies absorventes', null),
      m('lagartoMineral', 'Lagarto Mineral', 240, 42, 32, 4, 'Armadura Mineral; Cauda de Quartzo', 'Calor moderado fragiliza placas; articulações expostas', 'lagarto'),
    ],
    subBoss: { id: 'cavaleiroAmetista', nome: 'Cavaleiro de Ametista', vida: 2300, ataque: 45, defesa: 38, velocidade: 5, perigo: 9, mecanica: 'O cristal frontal reflete magia. Ativar refletores laterais em sequência divide a energia e expõe o núcleo.', recompensas: 'Prisma Antigo; chave das galerias' },
    boss: { id: 'arquiteto', nome: 'Arquiteto Prismático', vida: 5500, ataque: 55, defesa: 42, velocidade: 6, perigo: 10, fraqueza: 'Frequência original do carvalho. Força bruta quebra cristais condutores.', recompensas: 'Prisma Antigo; Espada Prismática; comunicação mágica reativada' },
  },
  {
    id: 'suspensa', nome: 'Floresta Suspensa', nivel: '40–45', fragmento: 'Pena dos Sete Galhos',
    mobs: [
      m('aguiaGalho', 'Águia de Galho', 230, 48, 18, 10, 'Mergulho Aéreo: bônus se atacar de altura', 'Espaços fechados e redes impedem voo', null),
      m('serpentePlanadora', 'Serpente Planadora', 260, 50, 22, 9, 'Queda Silenciosa; Constrição', 'Superfícies sem vegetação reduzem camuflagem', 'serpente'),
      m('vespaSeiva', 'Vespa de Seiva', 180, 42, 15, 10, 'Ferrão Paralisante; Enxame', 'Fumaça fria e proteção de resina afastam o enxame', null),
    ],
    subBoss: { id: 'guardiaVentos', nome: 'Guardiã dos Ventos', vida: 2600, ataque: 50, defesa: 28, velocidade: 10, perigo: 9, mecanica: 'Usar velas, pontes e correntes para obrigá-la a pousar. Destruir ninhos elimina a chance de aliança.', recompensas: 'Pena dos Sete Galhos; rotas de vento mapeadas' },
    boss: { id: 'dragaoSeteGalhos', nome: 'Dragão dos Sete Galhos', vida: 6000, ataque: 60, defesa: 42, velocidade: 9, perigo: 10, fraqueza: 'Reparar a conexão e libertar o dragão da dor. Cortá-la sem escoramento derruba plataformas.', recompensas: 'Pena dos Sete Galhos; Arco dos Sete Galhos; montaria aliada' },
  },
  {
    id: 'copa', nome: 'Jardim da Copa', nivel: '45–50', fragmento: 'Pólen Dourado',
    mobs: [
      m('fenixMenor', 'Fênix Menor', 260, 52, 20, 10, 'Chama Renovadora; Pluma Ardente', 'Água e frio reduzem a regeneração (não congelar ninhos)', null),
      m('guardiaoFloral', 'Guardião Floral', 320, 48, 35, 4, 'Espinhos de Luz; Raiz Defensiva', 'Raízes expostas podem ser contidas sem destruir a planta', 'golem'),
      m('borboletaLuz', 'Borboleta de Luz', 190, 40, 10, 10, 'Ilusão Solar; Pólen Cegante', 'Escuridão total interrompe a orientação; não é necessário matá-la', null),
    ],
    subBoss: { id: 'sacerdotisa', nome: 'Sacerdotisa das Flores', vida: 3000, ataque: 52, defesa: 32, velocidade: 7, perigo: 9, mecanica: 'Proteger três áreas de reprodução e provar que as flores não serão destruídas.', recompensas: 'Pólen Dourado; acesso ao coração mágico' },
    boss: { id: 'devoradorSeiva', nome: 'Devorador de Seiva', vida: 8000, ataque: 65, defesa: 50, velocidade: 5, perigo: 10, fraqueza: 'Restaurar os dez reguladores e interromper o ciclo de absorção. Derrotá-lo sem estabilizar o coração pode matar a árvore.', recompensas: 'Coroa do Carvalho; Coração de Seiva; final escolhido pelo grupo' },
  },
];

// game numbers for a manual entry
export function gameStats(entry, kind = 'mob') {
  const hpK = kind === 'boss' ? GAME_SCALE.bossHp : kind === 'subBoss' ? GAME_SCALE.subBossHp : GAME_SCALE.mobHp;
  return {
    hp: Math.round(entry.vida * hpK),
    damage: Math.round(entry.ataque * GAME_SCALE.damage),
    speed: +GAME_SCALE.speed(entry.velocidade).toFixed(2),
    armor: +GAME_SCALE.armor(entry.defesa).toFixed(3),
    xp: Math.round(entry.vida / (kind === 'mob' ? 3 : 4)),
  };
}

// the whole bestiary as one JSON-ready object (tabletop sheets / tools)
export const BESTIARY_JSON = () => JSON.stringify({ escalaDoJogo: { vidaCriatura: GAME_SCALE.mobHp, vidaSubchefe: GAME_SCALE.subBossHp, vidaChefe: GAME_SCALE.bossHp, dano: GAME_SCALE.damage }, regioes: REGIONS }, null, 2);
