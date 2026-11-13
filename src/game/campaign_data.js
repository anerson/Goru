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
      { group: 'marca', count: 3, look: 'tracks', text: 'Siga as marcas de escavação até a galeria dos Besouros-Rachadores', done: 'Galerias escavadas junto às raízes primárias.' },
      { group: 'coletor', count: 1, look: 'rescue', text: 'Resgate o coletor preso numa câmara de raízes', done: 'O coletor sai tossindo: "Um tatu de âmbar fechou a câmara!"' },
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
      { group: 'jarro', count: 3, look: 'barrel', text: 'Escolte a caravana: leve 3 jarros de água entre os oásis', done: 'Jarro entregue sem derramar.' },
      { group: 'ferroada', count: 3, look: 'tracksRed', text: 'Investigue o sumiço dos coletores: ache 3 marcas de ferrão', done: 'Marcas de ferrão grande, quentes ao toque.' },
      { group: 'reservatorio', count: 3, look: 'sand', text: 'Desobstrua 3 reservatórios bloqueados por sedimento', done: 'O sedimento cede e o reservatório respira.' },
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
      { group: 'amostra', count: 3, look: 'sample', text: 'Colete amostras de água em 3 profundidades com os pescadores', done: 'Transparência baixa, odor podre, pouco oxigênio.' },
      { group: 'estacao_filtro', count: 1, look: 'station', text: 'Localize a estação natural de filtragem', done: 'A estação está entupida de matéria orgânica.' },
      { group: 'filtro', count: 3, look: 'algae', text: 'Desobstrua a entrada sem destruir os organismos filtradores', done: 'A água volta a passar pelos filtros vivos.' },
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
      { group: 'mineiro', count: 3, look: 'rescue', text: 'Resgate os 3 mineiros presos', done: 'O mineiro sai dos escombros e corre para o acampamento.' },
      { group: 'ruptura', count: 3, look: 'crack', text: 'Mapeie as 3 rupturas nas barreiras térmicas', done: 'Ruptura marcada no mapa.' },
      { group: 'chamine', count: 3, look: 'chimney', text: 'Regule as 3 chaminés na ordem gravada no instrumento (I, II, III)', done: 'A pressão cai.', ordered: true },
    ],
    sub: { type: 'ferreiro', mechanic: { group: 'forja', count: 3, look: 'forge', label: 'Desligar a fornalha', text: 'Desligue as 3 fornalhas em sequência (I, II, III) e enfrente o Ferreiro Vulcânico', effect: 'armor', ordered: true },
      reveal: 'Os registros da forja mostram: o Ferreiro acendeu tudo porque o calor crescente parecia um ataque.' },
    boss: { type: 'ignar', fragment: ['nucleo_incandescente', 'Núcleo Incandescente', 'Controle de calor geotérmico'],
      reveal: 'Com as chaminés reguladas, Ignar perde força. Ele é o regulador do calor, preso num ciclo de compensação.',
      options: [['destruir', 'Apagar o núcleo de vez', 'A Fornalha esfria rápido demais e ar quente sobe desordenado até Nivéria.'], ['restaurar', 'Estabilizar o núcleo sem apagar a fonte', 'O núcleo pulsa calmo. As barreiras param de rachar.']] },
  },
  {
    id: 'niveria', act: 2, mission: 'O Inverno que Não Termina', hazard: 'frio',
    npc: { id: 'sora', name: 'Sora da expedição', look: { shirt: '#2a4a7a', pants: '#2a2a3a', hat: '#e8eef5', skin: '#d0a07c' },
      lines: ['A expedição se espalhou quando os canais congelaram. Sem casaco você não dura.', 'Gelo cristalino e líquen estão por toda a câmara; os lobos de geada dão a pele. Costure um casaco e forje uma lâmina na bancada.'] },
    mats: { nodes: [['gelo', 'Gelo cristalino', 'ice'], ['liquen', 'Líquen', 'lichen']], drop: ['pele', 'Pele de lobo'] },
    weapon: { id: 'lamina_geada', name: 'Lâmina de Geada', tier: 5, recipe: { gelo: 3, liquen: 2, pele: 1 }, look: { color: '#9fd2ff', tip: '#ffffff' } },
    outfit: { id: 'casaco_geada', name: 'Casaco de Geada', guard: 0.22, resist: 'frio', recipe: { pele: 2, liquen: 2 }, look: { shirt: '#e8eef5', pants: '#5a6a7a', hat: '#ffffff', cape: '#c9dceb' } },
    steps: [
      { group: 'estacao', count: 1, look: 'station', text: 'Recupere as ferramentas térmicas na estação abandonada', done: 'Termômetros e roupas velhas: alguém mediu o frio antes de sumir.' },
      { group: 'torre', count: 3, look: 'tower', text: 'Desobstrua as 3 torres de circulação de ar e meça a temperatura', done: 'O ar volta a circular; o termômetro sobe dois graus.' },
    ],
    sub: { type: 'matriarca', mechanic: { group: 'placa', count: 3, look: 'icePlate', label: 'Derreter a placa de gelo', text: 'Derreta as placas que bloqueiam a nascente: enquanto existem, a Matriarca chama a matilha', effect: 'summon' },
      reveal: 'Filhotes. A toca fica junto à nascente: ela convocava a matilha para proteger a cria.' },
    boss: { type: 'reiInverno', fragment: ['cristal_glacial', 'Cristal Glacial', 'Conservação térmica'],
      reveal: 'O núcleo no peito do dragão é o regulador térmico de Nivéria. Mantinha a câmara congelada para conservar água.',
      options: [['destruir', 'Destruir o núcleo', 'A reserva inteira derrete de uma vez e inunda as galerias de baixo.'], ['restaurar', 'Recalibrar o núcleo e manter parte da reserva', 'A água volta a circular devagar, sem perder a reserva.']] },
  },
  {
    id: 'selva', act: 2, mission: 'O Silêncio da Selva',
    npc: { id: 'yara', name: 'Yara, a rastreadora', look: { shirt: '#4a6a2a', pants: '#3a3a2a', hat: '#7a5a2a', skin: '#8a5a3a' },
      lines: ['Silêncio. Faz dias que a manada não passa, e as panteras caçam perto das aldeias.', 'Fibra de cipó e folhas gigantes você acha em todo lado; as panteras deixam presas. Faça uma glaive e um manto de camuflagem antes de entrar fundo.'] },
    mats: { nodes: [['cipo', 'Fibra de cipó', 'vine'], ['folha', 'Folha gigante', 'leaf']], drop: ['presa', 'Presa de pantera'] },
    weapon: { id: 'glaive_presa', name: 'Glaive de Presa', tier: 6, recipe: { cipo: 3, folha: 2, presa: 1 }, look: { color: '#5a7a2a', tip: '#efe6d0' } },
    outfit: { id: 'manto_camuflagem', name: 'Manto de Camuflagem', guard: 0.26, recipe: { folha: 3, cipo: 1 }, look: { shirt: '#3f6a2a', pants: '#2a3a1a', hat: '#4f7a2a', cape: '#3a5a22' } },
    steps: [
      { group: 'pegada', count: 3, look: 'tracks', text: 'Mapeie 3 trilhas de pegadas de herbívoros', done: 'Pegadas antigas que param de repente.' },
      { group: 'restos', count: 1, look: 'bones', text: 'Examine os restos de predação', done: 'Marcas de mandíbulas vegetais: algo enraizado bloqueia a rota da manada.' },
    ],
    sub: { type: 'devoradorTroncos', mechanic: { group: 'raiz', count: 3, look: 'root', label: 'Cortar a raiz de alimentação', text: 'Corte as 3 raízes de alimentação e contenha o Devorador de Troncos', effect: 'regen' },
      reveal: 'Sem as raízes, o Devorador murcha. Podado, volta ao tamanho que os predadores controlavam.' },
    boss: { type: 'reiFeras', fragment: ['semente_ancestral', 'Semente Ancestral', 'Vitalidade e crescimento'],
      mechanic: { group: 'bloqueio', count: 3, look: 'logs', label: 'Desfazer o bloqueio', text: 'Reabra a rota migratória (3 bloqueios): com ela aberta, o Rei das Feras não precisa morrer', effect: 'yield' },
      reveal: 'Ele não caçava você. Defendia a rota migratória e os filhotes da manada.',
      options: [['destruir', 'Derrubar o Rei das Feras', 'Sem ele ninguém abre clareiras: a vegetação vai fechar a selva.'], ['restaurar', 'Abrir caminho e deixar a manada passar', 'A manada volta a atravessar a selva.']] },
  },
  {
    id: 'pantano', act: 3, mission: 'A Morte que Alimenta a Vida', hazard: 'esporos',
    npc: { id: 'doran', name: 'Doran, o curandeiro', look: { shirt: '#5a6a3a', pants: '#3a3a2a', hat: '#8a8a5a', skin: '#b08a6a' },
      lines: ['A vila respira gás. Sem filtro, os esporos queimam os pulmões.', 'Turfa e esporos sobram aqui; os carniçais carregam quitina fúngica. Um traje de filtragem primeiro, depois uma foice.'] },
    mats: { nodes: [['turfa', 'Turfa', 'peat'], ['esporo', 'Esporo', 'spore']], drop: ['quitina', 'Quitina fúngica'] },
    weapon: { id: 'foice_esporos', name: 'Foice dos Esporos', tier: 7, recipe: { turfa: 3, esporo: 2, quitina: 1 }, look: { color: '#3a4a2a', tip: '#a8ff5a' } },
    outfit: { id: 'traje_filtragem', name: 'Traje de Filtragem', guard: 0.3, resist: 'esporos', recipe: { esporo: 2, turfa: 2 }, look: { shirt: '#6a7a4a', pants: '#3a4a2a', hat: '#c9d08a', glow: '#a8ff5a' } },
    steps: [
      { group: 'agua_parada', count: 3, look: 'sample', text: 'Meça 3 pontos de água parada e a direção do vento', done: 'Água parada, vento fraco: o gás se acumula.' },
      { group: 'dreno', count: 3, look: 'logs', text: 'Desobstrua 3 canais de drenagem bloqueados por madeira morta', done: 'A água escura começa a escorrer.' },
    ],
    sub: { type: 'pastorFungos', mechanic: { group: 'foco', count: 3, look: 'sporeFocus', label: 'Drenar o foco fúngico', text: 'Drene os 3 focos fúngicos (sem queimar) para cortar a cura do Pastor dos Fungos', effect: 'regen' },
      reveal: 'Sem os focos, o Pastor dos Fungos para de se curar. Ele só ocupava a matéria que ninguém reciclava.' },
    boss: { type: 'maeDecomposicao', fragment: ['esporo_primordial', 'Esporo Primordial', 'Decomposição e reciclagem'],
      mechanic: { group: 'ventilacao', count: 3, look: 'vent', label: 'Abrir a ventilação', text: 'Abra 3 pontos de ventilação para expor o núcleo da Mãe da Decomposição', effect: 'armor' },
      reveal: 'A Mãe da Decomposição acumulou matéria sem distribuí-la. Matar todos os fungos interrompe a reciclagem.',
      options: [['destruir', 'Eliminar a colônia', 'A colônia morre e o solo empobrece: nada mais recicla.'], ['restaurar', 'Restaurar a drenagem e distribuir a matéria', 'O pântano volta a reciclar nutrientes.']] },
  },
  {
    id: 'cristais', act: 3, mission: 'A Frequência Perdida',
    npc: { id: 'lira', name: 'Lira, a artífice', look: { shirt: '#5a4a7a', pants: '#2a2a3a', hat: '#c59bff', skin: '#c99a7a' },
      lines: ['As comunidades recebem mensagens que se contradizem. Os cristais estão saturados.', 'Quartzo e ametista crescem nas galerias; as aranhas de quartzo soltam pó prismático. Forje uma espada e uma armadura que aguentem o eco.'] },
    mats: { nodes: [['quartzo', 'Quartzo', 'quartz'], ['ametista', 'Ametista', 'amethyst']], drop: ['po_prisma', 'Pó prismático'] },
    weapon: { id: 'espada_prismatica', name: 'Espada Prismática', tier: 8, recipe: { quartzo: 3, ametista: 2, po_prisma: 1 }, look: { color: '#d9d3ea', tip: '#c59bff' } },
    outfit: { id: 'armadura_prismatica', name: 'Armadura Prismática', guard: 0.34, recipe: { ametista: 2, quartzo: 2 }, look: { shirt: '#8a6ab0', pants: '#3a2a5a', hat: '#e6d6ff', glow: '#c59bff' } },
    steps: [
      { group: 'cristal_freq', count: 3, look: 'crystal', text: 'Recupere 3 cristais de frequência em galerias diferentes', done: 'O cristal vibra num tom puro.' },
      { group: 'cristal_falso', count: 3, look: 'crystalDark', text: 'Desative 3 cristais falsos sem quebrar os condutores', done: 'O sinal falso se cala.' },
    ],
    sub: { type: 'cavaleiroAmetista', mechanic: { group: 'refletor', count: 3, look: 'mirror', label: 'Ativar o refletor', text: 'Ative os 3 refletores laterais em sequência (I, II, III) e exponha o núcleo do Cavaleiro', effect: 'armor', ordered: true },
      reveal: 'O Cavaleiro obedecia a uma ordem antiga: guardar as galerias de qualquer mudança.' },
    boss: { type: 'arquiteto', fragment: ['prisma_antigo', 'Prisma Antigo', 'Comunicação e condução mágica'],
      mechanic: { group: 'tom', count: 3, look: 'crystal', label: 'Tocar o cristal', text: 'Toque os 3 cristais na ordem sonora correta (I, II, III) para devolver a frequência original', effect: 'armor', ordered: true },
      reveal: 'Saturado, o Arquiteto emitia sinais falsos. A frequência original do carvalho o acalma.',
      options: [['destruir', 'Quebrar o Arquiteto', 'Os condutores se partem: a comunicação entre regiões cai.'], ['restaurar', 'Recalibrar e transmitir o sinal restaurado', 'Mensagens e reguladores voltam a funcionar.']] },
  },
  {
    id: 'suspensa', act: 3, mission: 'O Céu Está Caindo',
    npc: { id: 'ravi', name: 'Ravi, o vigia', look: { shirt: '#4a7a6a', pants: '#2a3a3a', hat: '#e8f0d0', skin: '#a87a5a' },
      lines: ['As plataformas racham. Um galho inteiro pode cair com as famílias em cima.', 'Penas e seiva você acha nos ninhos e na casca; as serpentes planadoras soltam escamas. Uma lança dos ventos e uma plumagem vão te manter de pé.'] },
    mats: { nodes: [['pena', 'Pena', 'feather'], ['seiva', 'Seiva', 'sap']], drop: ['escama', 'Escama planadora'] },
    weapon: { id: 'lanca_ventos', name: 'Lança dos Ventos', tier: 9, recipe: { seiva: 3, pena: 2, escama: 1 }, look: { color: '#e8f0d0', tip: '#7fe08a' } },
    outfit: { id: 'plumagem', name: 'Plumagem dos Ventos', guard: 0.38, recipe: { pena: 3, seiva: 1 }, look: { shirt: '#f0f4ea', pants: '#7a8a6a', hat: '#ffffff', cape: '#d0e8c0' } },
    steps: [
      { group: 'rachadura', count: 3, look: 'crack', text: 'Investigue 3 rachaduras e evacue o galho instável', done: 'Moradores levados para um galho firme.' },
      { group: 'escora', count: 3, look: 'brace', text: 'Instale 3 escoras provisórias com cipós', done: 'A plataforma para de ranger.' },
    ],
    sub: { type: 'guardiaVentos', mechanic: { group: 'vela', count: 3, look: 'sail', label: 'Armar a vela', text: 'Arme 3 velas para obrigar a Guardiã dos Ventos a pousar', effect: 'armor' },
      reveal: 'Pousada, a Guardiã baixa as asas. Ela protegia ninhos ancestrais.' },
    boss: { type: 'dragaoSeteGalhos', fragment: ['pena_sete_galhos', 'Pena dos Sete Galhos', 'Correntes de ar e mobilidade'],
      mechanic: { group: 'juncao', count: 3, look: 'brace', label: 'Reparar a junção', text: 'Repare a junção dos sete galhos (3 pontos) para revelar a conexão defeituosa do dragão', effect: 'armor' },
      reveal: 'Uma simbiose defeituosa prende o dragão ao ponto de junção. A conexão causa dor e instabilidade.',
      options: [['destruir', 'Cortar a conexão à força', 'O dragão se solta e plataformas inteiras caem.'], ['restaurar', 'Reparar a conexão e libertar o dragão da dor', 'As plataformas se estabilizam; o dragão vira aliado.']] },
  },
  {
    id: 'copa', act: 3, mission: 'O Último Coração', final: true,
    npc: { id: 'elowen', name: 'Elowen, guardiã das flores', look: { shirt: '#e8c04a', pants: '#7a6a2a', hat: '#ff9ad0', skin: '#d8a888' },
      lines: ['Os polinizadores sumiram e as folhas perdem força. A árvore inteira recebe menos energia.', 'Pólen e pétalas sobram nos campos; os guardiões florais guardam fragmentos de luz. Um cetro de pólen e uma veste da copa: é com eles que se chega ao coração.'] },
    mats: { nodes: [['polen', 'Pólen', 'pollen'], ['petala', 'Pétala', 'petal']], drop: ['luz', 'Fragmento de luz'] },
    weapon: { id: 'cetro_polen', name: 'Cetro de Pólen Dourado', tier: 10, recipe: { petala: 3, polen: 2, luz: 1 }, look: { color: '#ffd76a', tip: '#fff6b0' } },
    outfit: { id: 'veste_copa', name: 'Veste da Copa', guard: 0.42, recipe: { petala: 2, polen: 2 }, look: { shirt: '#ffd76a', pants: '#a87a2a', hat: '#ff9ad0', cape: '#ffe8a0', glow: '#fff6b0' } },
    steps: [
      { group: 'area_reproducao', count: 3, look: 'flower', text: 'Restaure 3 áreas de reprodução das flores', done: 'As flores voltam a abrir.' },
    ],
    sub: { type: 'sacerdotisa', fragment: ['polen_dourado', 'Pólen Dourado', 'Reprodução e energia da copa'],
      mechanic: { group: 'enxame', count: 3, look: 'flower', label: 'Proteger o enxame', text: 'Proteja os 3 enxames e prove à Sacerdotisa das Flores que as flores não serão destruídas', effect: 'yield' },
      reveal: 'A Sacerdotisa teme a contaminação. Com os enxames protegidos, ela abaixa os espinhos.',
      options: [['destruir', 'Derrubar a Sacerdotisa', 'Sem ela, a copa perde quem coordena a reprodução.'], ['restaurar', 'Convencê-la e seguir juntos até o coração', 'A Sacerdotisa abre o caminho até o coração mágico e te entrega o Pólen Dourado.']] },
    boss: { type: 'devoradorSeiva',
      reveal: 'No coração, o Devorador de Seiva absorve tudo, acreditando que assim impede a morte do carvalho. Os dez fragmentos que você carrega pulsam juntos.',
      options: [
        ['destruir', 'Final A — Destruir o Devorador', 'A energia acumulada é liberada de forma violenta. A árvore sobrevive, mas perde parte da regulação; regiões inteiras precisarão ser reconstruídas.'],
        ['restaurar', 'Final B — Sincronizar os dez fragmentos e reprogramar', 'Os dez fragmentos entram em ressonância e o Devorador é reconfigurado. O coração segue funcionando, com um guardião mortal acompanhando os ciclos.', { fragments: 10 }],
        ['simbiose', 'Final C — Nova simbiose: dividir a carga com o Devorador', 'Você se conecta ao coração e divide a carga. A árvore recupera estabilidade; você assume uma responsabilidade que não termina.'],
      ] },
  },
];

export const REGION_NAMES = { raizes: 'a Floresta das Raízes', deserto: 'o Deserto da Casca', oceano: 'o Oceano Interior', fornalha: 'a Fornalha de Ignar', niveria: 'Nivéria', selva: 'a Selva dos Gigantes', pantano: 'o Pântano da Decomposição', cristais: 'o Reino dos Cristais', suspensa: 'a Floresta Suspensa', copa: 'o Jardim da Copa' };

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
  fruta: { name: 'Fruta da selva', use: { hunger: 35 }, verb: 'Comer' },
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
  ...REGIONS_PLAN.flatMap((r) => r.mats.nodes.map(([item]) => ({ biome: r.id, item, count: 7, respawn: 90 }))),
  ...REGIONS_PLAN.map((r) => ({ biome: r.id, item: r.mats.drop[0], count: 3, respawn: 120 })),
  ...REGIONS_PLAN.map((r) => ({ biome: r.id, item: 'cogumelo', count: r.id === 'raizes' ? 8 : 4, respawn: 120 })),
  ...REGIONS_PLAN.map((r) => ({ biome: r.id, item: 'erva', count: 4, respawn: 150 })),
  { biome: 'selva', item: 'fruta', count: 6, respawn: 120 },
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

for (const [ri, r] of REGIONS_PLAN.entries()) {
  const P = r.id;
  SPEAKERS[r.npc.id] = r.npc.name;
  const L = (k, text) => { const id = `${P.toUpperCase()}_${k}`; STRINGS[id] = text; return id; };
  // 1. meet the community
  STAGES.push({ id: `${P}_chegada`, act: r.act, region: P, text: ri === 0 ? `Fale com ${r.npc.name} na vila` : `Suba até ${REGION_NAMES[P]} e fale com ${r.npc.name}`, target: r.npc.id, kind: 'talk' });
  DIALOGUES[`${r.npc.id}_chegada`] = { start: 'a', nodes: {
    a: { speaker: r.npc.id, line: L('NPC1', r.npc.lines[0]), next: 'b' },
    b: { speaker: r.npc.id, line: L('NPC2', r.npc.lines[1]), choices: [{ text: 'OPT_SEGUIR', to: 'c' }] },
    c: { speaker: r.npc.id, line: L('NPC3', `Missão: ${r.mission}.`), next: 'fim', do: { advance: true } },
    fim: { end: true } } };
  DIALOGUES[`${r.npc.id}_geral`] = { start: 'a', nodes: { a: { speaker: r.npc.id, line: L('NPCG', r.npc.lines[1]), next: 'fim' }, fim: { end: true } } };
  // 2. craft the region's weapon and outfit
  STAGES.push({ id: `${P}_bancada`, act: r.act, region: P, text: `Colete materiais e crie na bancada: ${r.weapon.name} e ${r.outfit.name}`, target: `bancada_${P}`, kind: 'craft', need: { [r.weapon.id]: 1, [r.outfit.id]: 1 } });
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
}
STAGES.push({ id: 'campanha_fim', act: 3, region: 'copa', text: 'A campanha terminou', target: null, kind: 'end' });
export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

export function dialogueFor(npc, stage) {
  const r = REGIONS_PLAN.find((x) => x.npc.id === npc);
  if (!r) return null;
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
    if (!g || !Object.values(g.nodes).some((n) => n.do?.advance)) problems.push(`stage ${st.id}: never advanced`);
  }
  for (const b of BOSSES) if (!DIALOGUES[`${b.id}_rendido`]) problems.push(`boss ${b.id}: no yield dialogue`);
  if (FRAGMENTS.length !== 10) problems.push(`expected 10 fragments, found ${FRAGMENTS.length}`);
  return problems;
}
// recipes: every input can be gathered (a resource node in or below the recipe's region, or a
// mob drop) and every craft stage's outputs have a recipe
export function validateRecipes() {
  const problems = [];
  const order = REGIONS_PLAN.map((r) => r.id);
  const gatherable = (item, region) => RESOURCES.some((n) => n.item === item && order.indexOf(n.biome) <= order.indexOf(region ?? 'copa'));
  for (const rc of RECIPES) for (const [item, n] of Object.entries(rc.inputs)) {
    if (!ITEMS[item]) problems.push(`${rc.id}: unknown input ${item}`);
    else if (!gatherable(item, rc.region)) problems.push(`${rc.id}: ${item} cannot be gathered by ${rc.region}`);
    if (!(n > 0)) problems.push(`${rc.id}: bad amount for ${item}`);
  }
  for (const st of STAGES) if (st.kind === 'craft') for (const item of Object.keys(st.need)) if (!RECIPES.some((r) => r.output === item)) problems.push(`stage ${st.id}: no recipe for ${item}`);
  return problems;
}
