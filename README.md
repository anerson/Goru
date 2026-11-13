# Goru · Aetherion — O Carvalho Colossal

Um jogo de exploração e sobrevivência em three.js, em terceira pessoa. Toda a aventura acontece
dentro de um único carvalho colossal: nove troncos torcidos formam um tronco oco, e dentro dele
há dez ecossistemas empilhados, cada um com o próprio sol pendurado no teto (o fundo do andar
de cima, coberto de raízes e musgo que brilha).

## A campanha: dez andares, do chão à copa

Segue o *Manual de Campanha* (`campaign_data.js` é a fonte única). Em **todo andar** o explorador:

1. fala com a comunidade do andar (cada uma tem acampamento, barril de água e **bancada de criação**);
2. coleta os materiais do andar (dois tipos em nós pelo chão, um que as criaturas deixam ao morrer) e
   **cria na bancada a arma e a roupa do andar**;
3. faz as investigações do manual (nascentes, marcas, resgates, amostras, torres, rachaduras...);
4. resolve a mecânica do subchefe e luta com ele; resolve a mecânica do chefe e luta com ele;
5. decide o destino do chefe quando ele se rende (destruir ou restaurar) e leva o fragmento.

**Sem a arma do andar o chefe quase não sente:** contra um guardião, uma arma de nível menor que o
andar causa só 10% do dano (o jogo avisa). Cada nível de arma bate 28% mais forte.

| Andar | Missão | Materiais | Arma | Roupa | Subchefe (mecânica) | Chefe (mecânica) |
|---|---|---|---|---|---|---|
| 1 Raízes | O Sangue que Não Chega | madeira, fibra, âmbar* | Cajado de Raiz Viva | Gibão de Musgo | Escavador de Âmbar (tecer a trama) | Rainha das Raízes (limpar o canal) |
| 2 Casca | A Sede da Superfície | casca, resina, ferrão* | Lança de Casca Solar | Manto de Casca | Escorpião-Rei do Sol (resfriar as placas) | Colosso da Casca (canais de água fria) |
| 3 Oceano | O Mar que Está Morrendo | coral, concha, alga* | Tridente Coralino | Traje Coralino | Guardião das Marés (canais I, II, III em ordem) | Leviatã (reativar a filtragem) |
| 4 Fornalha | O Calor que Consome | obsidiana, mineral, cinza* | Martelo de Obsidiana | **Capa de Cinzas** (protege do calor) | Ferreiro Vulcânico (fornalhas I, II, III em ordem) | Ignar (chaminés em ordem) |
| 5 Nivéria | O Inverno que Não Termina | gelo, líquen, pele* | Lâmina de Geada | **Casaco de Geada** (protege do frio) | Matriarca Branca (chama lobos até as placas derreterem) | Rei do Inverno |
| 6 Selva | O Silêncio da Selva | cipó, folha, presa* | Glaive de Presa | Manto de Camuflagem | Devorador de Troncos (regenera até cortar as 3 raízes) | Rei das Feras (rende-se cedo com a rota aberta) |
| 7 Pântano | A Morte que Alimenta a Vida | turfa, esporo, quitina* | Foice dos Esporos | **Traje de Filtragem** (protege dos esporos) | Pastor dos Fungos (cura-se até drenar os focos) | Mãe da Decomposição (ventilação) |
| 8 Cristais | A Frequência Perdida | quartzo, ametista, pó prismático* | Espada Prismática | Armadura Prismática | Cavaleiro de Ametista (refletores em ordem) | Arquiteto Prismático (tons em ordem) |
| 9 Suspensa | O Céu Está Caindo | pena, seiva, escama* | Lança dos Ventos | Plumagem dos Ventos | Guardiã dos Ventos (armar as velas) | Dragão dos Sete Galhos (reparar a junção) |
| 10 Copa | O Último Coração | pólen, pétala, luz* | Cetro de Pólen Dourado | Veste da Copa | Sacerdotisa das Flores (rende-se cedo com os enxames protegidos) | Devorador de Seiva |

\* deixado pelas criaturas do andar (também há poucos nós raros, para o jogo nunca travar).

As roupas reduzem o dano recebido (de 5% no Gibão a 42% na Veste da Copa) e mudam o visual do
explorador (cores, capa, brilho); a arma muda a cor do cajado e, do nível 4 em diante, ganha lâmina.
Calor, frio e esporos tiram vida fora do acampamento sem a roupa certa. Também na bancada: Poção de
Seiva (erva + cogumelo, +70 de vida). Na mochila, **Vestir** e **Empunhar** trocam o equipamento.

Mecânicas em ordem (I, II, III) resetam e machucam se feitas fora de ordem. Os chefes se rendem com
25% de vida (alguns antes, se a mecânica foi cumprida) e o jogador decide: **destruir** (o fragmento
vem rachado) ou **restaurar** (fragmento intacto).

**Final:** o Devorador de Seiva fica mais vulnerável a cada fragmento carregado. Quando ele se
rende há três finais do manual: **A — Destruição**, **B — Reprogramação** (só aparece com os dez
fragmentos intactos) e **C — Nova Simbiose**. O resumo das escolhas aparece no fim.

Sobrevivência: sede (10 min), fome (18 min), aviso a 30%; o cantil (3 goles) enche no barril de
qualquer acampamento; ao desmaiar o explorador acorda no último acampamento. Criaturas e chefes dão
experiência: cada nível dá +10 de vida máxima e +5% de dano. Os números das criaturas vêm do manual
(`src/game/bestiary.js`): vida = Vida × 0,6, subchefe = Vida ÷ 6, chefe = Vida ÷ 10, dano = Ataque × 0,6.
O progresso é salvo no navegador.

**Bestiário para a mesa:** `docs/bestiario.json` traz as 10 regiões com as 30 criaturas, os 10
subchefes e os 10 chefes do manual, com os valores originais e os do jogo lado a lado.

**Ainda fora do jogo:** criaturas voadoras e aquáticas do manual (o Oceano não tem criaturas comuns;
a alga vem de nós no chão).

## Modo Mestre (para o GM)

Abra o jogo com `#mestre` no fim do endereço para ver o botão **Mestre**, ou aperte **Shift+G**
durante a jornada. O mestre empunha o **Cajado do GM**: 999.999.999 de dano, e um feixe de seiva que
atinge a criatura na mira até 40 m de distância (de perto, varre um arco largo). Ganha também um
painel com:

| Poder | Tecla | O que faz |
|-------|-------|-----------|
| Onda de Seiva | R | derruba todas as criaturas num raio de 18 m |
| Acalmar | T | criaturas num raio de 25 m param de caçar por 30 s e voltam para casa |
| Invocar | V | a criatura ou o chefão escolhido aparece 6 m à frente, no andar atual |
| Curar | H | vida, sede e fome cheias |
| Invencível / Sem fome e sede | — | liga e desliga |
| Remover invocados / Reviver chefões | — | limpa a cena / devolve os chefões aos covis |
| Pular para a etapa | — | vai a qualquer etapa da campanha com itens, equipamento e marcas coerentes |

Chefões invocados pelo mestre não contam para a história. Shift+G desliga o modo e devolve o cajado
do explorador.

Mira: um retículo no centro da tela. O golpe vai para onde a câmera aponta; o retículo fica vermelho
e mostra nome e vida da criatura quando há um alvo ao alcance.

## Os dez ecossistemas

| Altura | Ecossistema | O que tem |
|--------|-------------|-----------|
| 0 m | Floresta das Raízes | cogumelos que brilham, samambaias, vila, nascente, riacho seco |
| 33 m | Deserto da Casca | dunas, cânions de madeira, cactos, caravana, Comporta Antiga, santuário, oásis |
| 67 m | Oceano Interior | lago com ilhas e passarelas, corais no fundo, pescadores, contaminação |
| 100 m | Fornalha de Ignar | rocha negra, canais de lava (não dá para pisar), basalto, brasas |
| 133 m | Selva dos Gigantes | palmeiras, folhas gigantes, cipós, templo de degraus |
| 167 m | Pântano da Decomposição | água parada (não dá para pisar), troncos podres, fungos, esporos |
| 200 m | Reino dos Cristais | cristais coloridos que brilham, pilares de quartzo, fungos luminosos |
| 233 m | Nivéria | neve, coníferas, cristais de gelo, lago congelado |
| 267 m | Floresta Suspensa | árvores menores, bromélias, ninhos gigantes, trepadeiras |
| 300 m | Jardim da Copa | campos de flores e flores gigantes sob o céu aberto |

Do lado de fora: savana dourada com acácias e paredões de arenito ao longe.

Caminhos: 9 entradas entre as raízes; uma rampa espiral pela parede interna que passa por todos
os andares; em cada andar uma galeria, 3 pontes curtas e trilhas de cada entrada até o marco
central; no topo, 3 pontes até mirantes fora do tronco.

## Rodar

```bash
npm start            # serve a pasta em http://localhost:5173
```

Não há etapa de build. O three.js `0.186.1` vem da jsDelivr por import map (`index.html`).

## Controles

| Ação | Computador | Celular |
|------|------------|---------|
| Andar | W A S D ou setas | controle redondo no canto |
| Atacar | clique, Espaço ou J | botão Atacar |
| Interagir / falar | E | botão Interagir |
| Beber do cantil | Q | botão Beber |
| Mochila | I | botão Mochila |
| Escolher no diálogo | 1, 2, 3 ou Enter | tocar na opção |
| Girar a câmera | arrastar o mouse (ou clicar para travar o cursor) | arrastar a tela |
| Aproximar a câmera | roda do mouse | — |
| Correr | Shift | empurrar o controle até a borda |
| Voar | F (Espaço sobe, C desce) | botão Voar e setas ▲▼ |
| Pular para um lugar | menu Lugares | igual |

## Estrutura

```
index.html            página, interface e import map
src/main.js           monta o mundo e roda o loop (Timer + setAnimationLoop)
src/environment.js    renderer, céu (Sky), luz do sol, IBL por PMREM, sombras, GTAO + OutputPass, qualidade
src/textures.js       casca, tábuas e terra pintadas em canvas; normal maps gerados da altura
src/wind.js           vento no vertex shader (galhos, folhas e azeitonas balançam juntos)
src/tree/layout.js    a planta: troncos, rampa, galerias, pontes, trilhas e o grafo de rotas
src/tree/trunk.js     troncos torcidos, galhos principais e raízes (tubos com ruído)
src/tree/canopy.js    galhos recursivos, ~70 mil raminhos de folhas e azeitonas (InstancedMesh)
src/walkways.js       rampa, galerias, pontes de cada andar, mirantes, trilhas de fora
src/biomes/index.js   raízes, deserto, oceano, nivéria, jardim da copa
src/biomes/more.js    selva dos gigantes, fornalha de ignar
src/biomes/common.js  terreno, trilhas, teto de cada andar (raízes, musgo, sol)
src/geom.js           faixas, placas e instâncias usadas em todo lugar
src/landscape.js      chão, grama, oliveiras normais e pessoas para dar escala
src/particles.js      folhas caindo da copa
src/player.js         movimento, voo e câmera em 3ª pessoa (braço de mola); colisão com troncos, raízes, pisos, água e lava
src/character.js      o explorador e os moradores: modelo e animação
src/game/campaign_data.js a campanha inteira como dados: 10 andares, materiais, receitas, armas, roupas, etapas, diálogos
src/game/game.js      regras do jogo: sobrevivência, coleta, bancada, missões, mecânicas dos chefes, finais, salvamento
src/game/looks.js     visual dos nós de material, dos objetos de missão e da bancada
src/game/hud.js       interface do jogo: barras, objetivo com seta, diálogos, mochila, barra do chefão
src/game/combat.js    combate: cajado, IA das criaturas (máquina de estados), chefões, tremor e pausa no impacto
src/game/creatures.js modelos e animação das criaturas e chefões; fauna de cada andar
src/game/gm.js        Modo Mestre: Cajado do GM e painel do GM
src/game/bestiary.js  bestiário do manual (10 regiões) e a conversão para o jogo
docs/bestiario.json   bestiário completo em JSON para a mesa
src/biomes/aetherion.js pântano, cristais, floresta suspensa, corais e flores gigantes
src/input.js          teclado, mouse, pointer lock e joystick na tela
tests/smoke.mjs       teste: grafo de rotas, render sem erro e percurso de cada tipo de caminho
```

`src/tree/layout.js` é a fonte única da geometria. Malha, caminhos e colisão leem dele, então
mudar a torção ou o raio do tronco mantém tudo alinhado.

## Testar

```bash
npm start &
node tests/smoke.mjs http://localhost:5173
# sem internet: THREE_DIR=/caminho/para/three/package node tests/smoke.mjs ...
```

O teste falha se a página registrar erro, se algum lugar do grafo de rotas virar beco sem saída,
ou se o jogador não conseguir: entrar pelo vão das raízes, subir a rampa inteira, chegar ao
centro de cada um dos dez ecossistemas seguindo a trilha da ponte, atravessar a ponte do topo
até o mirante. Também valida os diálogos e as receitas (todo material pode ser coletado no andar ou abaixo), imprime o tempo da sede e da fome, joga a campanha inteira do andar 1 ao 10 (coleta, bancada, investigações, mecânicas, chefes e o Final B), confere que a arma inicial quase não fere o subchefe, que a ordem errada reseta, confere
que cada morador e objeto da missão está em chão alcançável, que a água bloqueia, que voando não se atravessa o piso entre
andares e que a câmera em terceira pessoa não entra na madeira do tronco. Os passos são simulados direto no código, então o
resultado não depende da velocidade da máquina.

## Skills usadas

Feito com o pacote [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(instalado em `.claude/settings.json`): `threejs-scene-setup`, `threejs-materials-lighting`,
`camera-systems`, `level-design`, `survival-crafting`, `dialogue-systems`, `game-ai` e `game-feel`.
