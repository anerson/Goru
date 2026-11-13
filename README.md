# Goru · Aetherion — O Carvalho Colossal

Um jogo de exploração e sobrevivência em three.js, em terceira pessoa. Toda a aventura acontece
dentro de um único carvalho colossal: nove troncos torcidos formam um tronco oco, e dentro dele
há dez ecossistemas empilhados, cada um com o próprio sol pendurado no teto (o fundo do andar
de cima, coberto de raízes e musgo que brilha).

## Ato I — Descoberta e sobrevivência

Uma seca atinge a Floresta das Raízes. O jogador:

1. conhece a Anciã Maela na Vila das Raízes, ganha um cantil, coleta cogumelos e enche o cantil na nascente;
2. segue o leito seco do riacho até a parede do tronco e derrota o **Devorador de Raízes**, a criatura que roía as raízes primárias;
3. sobe ao Deserto da Casca, encontra a caravana de Tarek e troca 3 resinas por uma chave de âmbar;
4. examina a Comporta Antiga, que desvia a água, derrota o **Escorpião-Rei da Casca** e abre o Santuário da Resina para recuperar o Núcleo de Seiva I;
5. encaixa o núcleo: a água volta ao oásis e ao riacho — amarga e escura;
6. sobe ao Oceano Interior, fala com a pescadora Ilian e encontra três sinais de contaminação.

Combate: o explorador ataca com um cajado (clique, Espaço ou J). Criaturas de cada andar — lobos,
aranhas e besouros nas raízes, escorpiões no deserto, salamandras na fornalha, felinos e serpentes na
selva, larvas no pântano, aranhas de cristal, lobos de Nivéria — percebem, avisam o golpe (se abaixam e
brilham), mordem e voltam para casa se você fugir. Os chefões têm investida (linha vermelha no chão) e
pancada em área (anel vermelho); o Devorador chama besouros na metade da vida.

Sobrevivência: sede (10 min de cheia a vazia parado, 1,8× mais rápido correndo), fome (18 min),
aviso a 30%. Com sede ou fome em zero a vida cai devagar; ao desmaiar o explorador acorda na vila
sem perder nada. Itens: cogumelo, erva medicinal, resina, alga, chave de âmbar, Núcleo de Seiva I.
O progresso é salvo no navegador.

## Modo Mestre (para o GM)

Abra o jogo com `#mestre` no fim do endereço para ver o botão **Mestre**, ou aperte **Shift+G**
durante a jornada. O mestre empunha o **Cajado do GM**: dano infinito, e um feixe de seiva que
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
| Pular para a etapa | — | vai a qualquer etapa do Ato I com itens e marcas coerentes |

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
src/game/data.js      Ato I como dados: itens, necessidades, etapas, diálogos e textos (pt-BR)
src/game/game.js      regras do jogo: sobrevivência, coleta, missões, comporta, santuário, salvamento
src/game/hud.js       interface do jogo: barras, objetivo com seta, diálogos, mochila, barra do chefão
src/game/combat.js    combate: cajado, IA das criaturas (máquina de estados), chefões, tremor e pausa no impacto
src/game/creatures.js modelos e animação das criaturas e chefões; fauna de cada andar
src/game/gm.js        Modo Mestre: Cajado do GM e painel do GM
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
até o mirante. Também valida os diálogos, imprime o tempo da sede e da fome, joga o Ato I do começo ao fim, confere
que cada morador e objeto da missão está em chão alcançável, que a água bloqueia, que voando não se atravessa o piso entre
andares e que a câmera em terceira pessoa não entra na madeira do tronco. Os passos são simulados direto no código, então o
resultado não depende da velocidade da máquina.

## Skills usadas

Feito com o pacote [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(instalado em `.claude/settings.json`): `threejs-scene-setup`, `threejs-materials-lighting`,
`camera-systems`, `level-design`, `survival-crafting`, `dialogue-systems`, `game-ai` e `game-feel`.
