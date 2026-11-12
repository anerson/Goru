# Goru · Oliveira Colossal

Uma oliveira de ~900 m em three.js, para explorar a pé ou voando. Nove troncos torcidos formam
um salão oco de 180 m de largura com um pequeno planeta flutuando no meio. São ~10 km de caminhos:

- 9 entradas entre as raízes, ligadas por trilhas a um anel em volta da árvore e a uma trilha de chegada;
- uma rampa espiral de 4 voltas pela parede interna, do chão aos 300 m;
- galerias circulares a 75, 150, 225 e 300 m, cada uma com uma cor de lanterna;
- 4 pontes suspensas da galeria de 150 m até o anel que circunda o planeta;
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
| Olhar | arrastar o mouse (ou clicar para travar o cursor) | arrastar a tela |
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
src/walkways.js       rampa, galerias, pontes, anel do planeta, mirantes, trilhas, placas
src/landscape.js      chão, grama, oliveiras normais e pessoas para dar escala
src/planet.js         o planeta: mares, continentes, nuvens, atmosfera e a luz do salão
src/particles.js      folhas caindo e poeira no ar
src/player.js         primeira pessoa e voo: colisão com troncos, raízes e planeta; piso por raycast
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
ou se o jogador não conseguir: entrar pelo vão das raízes, subir a rampa inteira, atravessar a
ponte até o planeta, atravessar a ponte do topo até o mirante. Também confere que voando não
se atravessa o planeta. Os passos são simulados direto no código, então o
resultado não depende da velocidade da máquina.

## Skills usadas

Feito com o pacote [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(instalado em `.claude/settings.json`): `threejs-scene-setup`, `threejs-materials-lighting`,
`camera-systems` e `level-design`.
