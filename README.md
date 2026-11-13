# Goru · Oliveira Colossal

Uma oliveira de ~900 m em three.js, para explorar em terceira pessoa, a pé ou voando. Nove
troncos torcidos formam um tronco oco de 180 m de largura, e dentro dele há um mundo inteiro:
dez ecossistemas empilhados, um a cada 33 m, cada um com o próprio sol pendurado no teto (o
fundo do andar de cima, coberto de raízes e musgo que brilha).

| Altura | Ecossistema | O que tem |
|--------|-------------|-----------|
| 0 m | Floresta das Raízes | cogumelos que brilham, samambaias, árvores pequenas, vaga-lumes |
| 33 m | Lago Suspenso | lagos com passarelas de madeira, juncos, vitórias-régias, salgueiros, névoa |
| 67 m | Cânion Vermelho | dunas, mesas de rocha, cactos, marcos de pedra, um arco, poeira |
| 100 m | Selva Tropical | palmeiras, folhas gigantes, cipós pendurados, templo de degraus |
| 133 m | Savana Dourada | capim alto, acácias, cupinzeiros, um baobá |
| 167 m | Vale do Vulcão | rocha negra, rios de lava (não dá para pisar), colunas de basalto, brasas subindo |
| 200 m | Recife de Coral | corais, leques-do-mar, algas, anêmonas que brilham, uma concha gigante com pérola |
| 233 m | Caverna de Gelo | neve caindo, pinheiros nevados, cristais, lago congelado |
| 267 m | Bosque de Outono | árvores vermelhas e douradas, folhas caindo, um bordo gigante |
| 300 m | Prado do Céu | flores, oliveiras jovens, círculo de pedras, aberto para o céu |

Caminhos:

- 9 entradas entre as raízes, ligadas por trilhas a um anel em volta da árvore e a uma trilha de chegada;
- uma rampa espiral de 4 voltas pela parede interna que passa por todos os andares;
- em cada andar: uma galeria circular, 3 pontes curtas até o ecossistema, trilhas de cada
  entrada até o marco central e uma trilha em anel;
- 3 pontes do topo que saem pelas frestas do tronco até mirantes do lado de fora.

## Rodar

```bash
npm start            # serve a pasta em http://localhost:5173
```

Não há etapa de build. O three.js `0.186.1` vem da jsDelivr por import map (`index.html`).

## Controles

| Ação | Computador | Celular |
|------|------------|---------|
| Andar | W A S D ou setas | controle redondo no canto |
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
src/biomes/index.js   floresta, lago, cânion, gelo, prado
src/biomes/more.js    selva, savana, vulcão, recife, outono
src/biomes/common.js  terreno, trilhas, teto de cada andar (raízes, musgo, sol)
src/geom.js           faixas, placas e instâncias usadas em todo lugar
src/landscape.js      chão, grama, oliveiras normais e pessoas para dar escala
src/particles.js      folhas caindo da copa
src/player.js         movimento, voo e câmera em 3ª pessoa (braço de mola); colisão com troncos, raízes, pisos, água e lava
src/character.js      o explorador: modelo e animação de andar, correr e voar
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
até o mirante. Também confere que a água bloqueia, que voando não se atravessa o piso entre
andares e que a câmera em terceira pessoa não entra na madeira do tronco. Os passos são simulados direto no código, então o
resultado não depende da velocidade da máquina.

## Skills usadas

Feito com o pacote [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(instalado em `.claude/settings.json`): `threejs-scene-setup`, `threejs-materials-lighting`,
`camera-systems` e `level-design`.
