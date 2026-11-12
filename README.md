# Goru · Oliveira Colossal

Uma oliveira gigante (cerca de 120 m) em three.js, para explorar a pé. Sete troncos torcidos
formam uma câmara oca. Uma rampa sobe três voltas por dentro até um deck a 36 m, e de lá uma
ponte sai pela fresta do tronco até um mirante.

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
| Pular para um lugar | botões Trilha, Dentro do tronco, Rampa, Mirante | iguais |

## Estrutura

```
index.html            página, interface e import map
src/main.js           monta o mundo e roda o loop (Timer + setAnimationLoop)
src/environment.js    renderer, céu (Sky), luz do sol, IBL por PMREM, sombras, GTAO + OutputPass, qualidade
src/textures.js       casca, tábuas e terra pintadas em canvas; normal maps gerados da altura
src/wind.js           vento no vertex shader (galhos, folhas e azeitonas balançam juntos)
src/tree/layout.js    a planta da árvore: posição dos 7 troncos, rampa, ponte, mirante
src/tree/trunk.js     troncos torcidos, galhos principais e raízes (tubos com ruído)
src/tree/canopy.js    galhos recursivos, ~70 mil folhas e azeitonas (InstancedMesh)
src/walkways.js       rampa, corrimãos, lanternas, deck, ponte, mirante, trilha
src/landscape.js      chão, grama, oliveiras normais e pessoas para dar escala
src/particles.js      folhas caindo e poeira no ar
src/player.js         primeira pessoa: colisão com troncos e raízes, piso por raycast
src/input.js          teclado, mouse, pointer lock e joystick na tela
tests/smoke.mjs       teste: renderiza sem erro e percorre trilha, rampa e ponte
```

`src/tree/layout.js` é a fonte única da geometria. Malha, caminhos e colisão leem dele, então
mudar a torção ou o raio do tronco mantém tudo alinhado.

## Testar

```bash
npm start &
node tests/smoke.mjs http://localhost:5173
# sem internet: THREE_DIR=/caminho/para/three/package node tests/smoke.mjs ...
```

O teste falha se a página registrar erro, se a trilha não levar ao oco, se a rampa não chegar a
36 m ou se a ponte não levar ao mirante. Os passos são simulados direto no código, então o
resultado não depende da velocidade da máquina.

## Skills usadas

Feito com o pacote [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(instalado em `.claude/settings.json`): `threejs-scene-setup`, `threejs-materials-lighting` e
`camera-systems`.
