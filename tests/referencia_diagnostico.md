# Referência do diagnóstico

Out 14, 2026 · programador-gameplay · bloco A, passo 0 (atualizada nos passos 2 e 6 e na separação entre inimigos)

## Comando

```sh
.godot-bin/godot --headless --path . res://tests/diagnostico.tscn -- --segundos=120
```

Godot 4.3.stable.official.77dcf97d8, Linux x86_64, números de `data/` do commit b3fa693, sem mudança de balanceamento em classes e inimigos (o passo 7 acrescentou `offline_salvamento_intervalo` em `data/regras.json`, que o diagnóstico não usa; a separação acrescentou `inimigo_separacao_distancia` e `inimigo_separacao_velocidade`, que mudam o resultado, ver o histórico). Não há semente: nenhuma regra sorteia nada. Os únicos sorteios do jogo são cosméticos (posição do texto flutuante em `Fx` e escolha da fala do ajudante) e não mexem no combate.

## Números de referência

Valem a partir da separação entre inimigos (`scripts/rules/separation.gd`, distância 1,7 m, velocidade 3 m/s):

| Classe | Nível | Abates | Mortes | Dano causado | Dano recebido | TTK médio | Andando | Atacando | Morto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guerreiro | 4 | 28 | 0 | 2196 | 764 | 3,0 s | 27% | 72% | 0% |
| Caçador | 5 | 31 | 0 | 2490 | 440 | 2,9 s | 26% | 73% | 0% |

As referências anteriores (passos 2 a 5 e passo 6) estão no histórico.

Determinismo conferido. A versão do passo 0 deu a mesma saída em 3 rodadas simultâneas, disputando CPU, e em rodadas com `--max-fps 20` e `--max-fps 45`. A versão do passo 2 deu a sua saída em 4 rodadas: uma sozinha, duas simultâneas e uma com `--max-fps 20`. A versão do passo 6 deu a saída acima em 4 rodadas: duas sozinhas, e duas simultâneas, uma delas com `--max-fps 20`; a do fim do passo 7 também. A versão com separação deu a saída acima em 3 rodadas: uma sozinha e duas simultâneas, uma delas com `--max-fps 20`. O FPS impresso (cerca de 144 sem tela) não faz parte da referência.

## Tolerância

- **Refatoração que não muda a ordem das operações dentro do tick:** igualdade exata em todas as colunas acima. O diagnóstico é determinístico, então qualquer diferença é mudança de comportamento e precisa de explicação.
- **Refatoração que muda em que ponto do tick algo acontece** (por exemplo, quem processa primeiro, jogador ou inimigo): nível, abates e mortes exatos; dano causado e dano recebido até 12 pontos de diferença, o valor de um golpe do Carniçal, o maior dano de inimigo em `data/enemies.json`; TTK até 0,2 s; porcentagens até 2 pontos. Passou disso, trate como mudança de balanceamento e leve ao `game-designer`.
- **Mudança de balanceamento** (`data/*.json`) ou de física (RD-002): gera uma referência nova, com o antes e o depois.

## Histórico

### Antes do passo 0 (não determinístico)

Três rodadas em sequência, com o mesmo comando:

| Rodada | Guerreiro (nível, abates, mortes, causado, recebido) | Caçador (nível, abates, mortes, causado, recebido, TTK) |
| --- | --- | --- |
| 1 | 5, 35, 0, 2910, 699 | 4, 27, 1, 2302, 492, 4,1 s |
| 2 | 5, 35, 0, 2910, 699 | 5, 31, 0, 2490, 468, 3,1 s |
| 3 | 5, 35, 0, 2910, 704 | 4, 26, 2, 2268, 492, 6,2 s |

Numa rodada avulsa, de origem não confirmada e com FPS medido de 10, o resultado foi Guerreiro 19 abates e 2 mortes, e Caçador 46 abates.

**Causa.** A simulação anda em ticks de física (60 por segundo), mas o renascimento dos inimigos (12 s e 15 s) e o do jogador (3 s) usavam `create_timer` comum, que conta o tempo dos quadros de tela. Sem tela, o Godot roda a uns 144 quadros por segundo, com uma pausa entre eles. O tick em que o temporizador acaba dependia de como os quadros caíam em relação aos ticks de física. Um inimigo que renasce um tick antes ou depois muda o caminho do bot, e a diferença cresce. Com FPS baixo (física atrasada em relação ao relógio), os inimigos renasciam bem mais cedo em ticks, o que explica a rodada com 46 abates. O Caçador variava mais porque morre às vezes (temporizador de 3 s do jogador) e mata de longe, então pega mais inimigos que acabaram de renascer. As esperas iniciais do diagnóstico (`process_frame`) também deixavam a quantidade de ticks antes do início variar com o FPS.

**Correção (passo 0).**
- `scripts/enemy.gd` e `scripts/main.gd`: os temporizadores de renascimento passaram a contar em tempo de física (`create_timer(t, true, true)`). Com 60 FPS ou mais, para quem joga, a duração não muda. É o primeiro passo para os "timers em ticks" do passo 5.
- `tests/diagnostico.gd`: as esperas antes de começar contam ticks de física, não quadros.

Depois da correção, a referência do passo 0 ficou em Guerreiro 5, 35, 0, 2910, 704, 3,1 s, 33%, 66%, 0%, e o Caçador igual à tabela de referência acima. É a mesma saída da rodada 2 de antes da correção, só que agora sempre.

### Passo 1 (regras puras)

Igual ao passo 0, campo por campo.

### Passo 2 (`InputFrame`)

Guerreiro, dano recebido: 704 para 699 (um golpe de lobo a menos). Todo o resto ficou igual. Motivo: o bot antigo chamava `use_ability()` no começo do tick, antes de os inimigos se moverem. Agora ele só entrega o quadro, e o ataque é resolvido no `_physics_process` do jogador, depois dos inimigos, como acontece quando uma pessoa joga. A diferença fica dentro da segunda faixa de tolerância. A tabela de referência acima já é a do passo 2.

### Passos 3, 4 e 5 (view separada, `EnemyBrain`, `WorldSim`)

Igual à referência, campo por campo, ao fim de cada passo:

| Passo | Guerreiro (nível, abates, mortes, causado, recebido, TTK, andando, atacando, morto) | Caçador (mesmas colunas) |
| --- | --- | --- |
| 3 | 5, 35, 0, 2910, 699, 3,1 s, 33%, 66%, 0% | 5, 31, 0, 2490, 468, 3,1 s, 27%, 72%, 0% |
| 4 | 5, 35, 0, 2910, 699, 3,1 s, 33%, 66%, 0% | 5, 31, 0, 2490, 468, 3,1 s, 27%, 72%, 0% |
| 5 | 5, 35, 0, 2910, 699, 3,1 s, 33%, 66%, 0% | 5, 31, 0, 2490, 468, 3,1 s, 27%, 72%, 0% |

A ordem dentro do tick foi mantida de propósito: a `WorldSim` avança os inimigos na ordem da zona, depois os jogadores (entrada, movimento e habilidades) e por último os renascimentos, que é a mesma ordem de antes (nós de inimigo antes do nó do jogador na árvore, temporizadores de física no fim do tick). A XP do abate continua sendo dada dentro do golpe que mata, antes do próximo alvo.

Renascimento em ticks: o inimigo renasce `round(respawn × 60)` ticks depois da morte, contando o tick da morte (720 e 900 ticks, os mesmos que o `create_timer` de física dava). O jogador renasce em `round(3 × 60) = 180` ticks; o `create_timer` dava 181, porque 3,0 menos 180 × (1/60) em ponto flutuante sobra um resto positivo. A diferença é de um tick (17 ms) e não aparece no diagnóstico, em que ninguém morre.

Uma rodada curta com tela virtual (`xvfb-run`, `--segundos=40`, cerca de 5 FPS) deu os mesmos números no commit anterior e depois do passo 5: Guerreiro 3, 10, 0, 780, 203, 3,2 s; Caçador 2, 9, 0, 709, 176, 3,0 s.

### Passo 6 (RD-002: camadas de colisão)

**Mudança.** Camadas 1 = mundo, 2 = jogadores, 3 = inimigos (`scripts/sim/physics_layers.gd`, nomes em `project.godot`). Jogador e inimigo continuam `CharacterBody3D`, mas a máscara de todos é só a camada 1: jogador atravessa inimigo e outro jogador, e inimigos não se empurram. Chão e obstáculos continuam sólidos. Decisão aprovada pelo dono do projeto (RD-002, `docs/arquitetura-fase-1.md`); é mudança de física, por isso gera referência nova.

| | Guerreiro (nível, abates, mortes, causado, recebido, TTK, andando, atacando, morto) | Caçador (mesmas colunas) |
| --- | --- | --- |
| Antes (passo 5) | 5, 35, 0, 2910, 699, 3,1 s, 33%, 66%, 0% | 5, 31, 0, 2490, 468, 3,1 s, 27%, 72%, 0% |
| Depois (passo 6) | 5, 35, 0, 2910, 769, 2,9 s, 34%, 65%, 0% | 5, 32, 0, 2654, 463, 2,8 s, 28%, 71%, 0% |
| Diferença | dano recebido +70 (+10%), TTK −0,2 s | abates +1, dano causado +164 (+7%), TTK −0,3 s |

**Leitura.** Antes, os inimigos que perseguiam o mesmo alvo se esbarravam entre si e no jogador e chegavam aos poucos. Agora todos vão direto até o alcance de ataque e podem se empilhar quase no mesmo ponto (visto nas capturas com tela virtual: dois Lobos Sombrios no mesmo lugar, com os rótulos sobrepostos). Para separar as causas, contei os alvos atingidos por uso de habilidade numa cópia do projeto (contador temporário, fora do repositório), com as camadas antigas e com as novas:

| Habilidade | Usos antes / depois | Alvos por uso antes / depois |
| --- | --- | --- |
| Guerreiro, ataque | 124 / 124 | 1,56 / 1,56 |
| Guerreiro, Golpe Giratório | 18 / 18 | 1,39 / 1,39 |
| Caçador, ataque | 169 / 168 | 1,00 / 1,00 |
| Caçador, Rajada | 23 / 24 | 1,17 / 1,38 |

- **Caçador:** a Rajada pega 18% mais alvos por uso, porque os inimigos chegam juntos e empilhados. Isso explica o dano causado +164 e o abate a mais.
- **Guerreiro:** os golpes acertam o mesmo de antes, e o dano causado é idêntico. O que muda é que mais inimigos chegam ao alcance de ataque ao mesmo tempo, sem ficar presos atrás uns dos outros, e por isso o dano recebido sobe 10%. A queda do TTK médio (3,1 s para 2,9 s) não vem de mais dano: o diagnóstico mede o TTK a partir de quando o bot entra no alcance de cada alvo, e com o bando chegando junto esse começo muda. A causa exata não foi isolada.
- Os inimigos param no alcance de ataque (1,8 m o lobo, 2,1 m o Carniçal), mais longe que a soma dos raios das cápsulas. Só ficam dentro do jogador se ele andar para dentro deles.

**Meta de balanceamento** (25 a 35 abates por classe, 0 ou 1 morte, menos de 50% do tempo andando): as duas classes continuam dentro. O Guerreiro segue no limite de cima (35 abates), como antes. Nenhum número de `data/` foi mudado.

### Passo 7 (save offline)

Igual ao passo 6, campo por campo. O diagnóstico roda `main.tscn` dentro da própria cena de teste, e nesse caso o save offline fica desligado: não lê nem grava personagem, então não muda o resultado nem toca nos saves do jogador.

### Separação entre inimigos (depois do passo 7)

**Problema.** Desde o passo 6, inimigos que perseguem o mesmo alvo podem ocupar quase o mesmo ponto: as cápsulas viram uma só e os rótulos ficam ilegíveis.

**Mudança.** Força de afastamento decidida na simulação, sem voltar a colisão entre corpos. A regra pura `Separation.offsets()` (`scripts/rules/separation.gd`) recebe as posições de todos os inimigos no começo do tick e quem participa, e devolve um deslocamento por inimigo: cada par mais perto que `inimigo_separacao_distancia` divide a sobreposição meio a meio, em sentidos opostos, limitada a `inimigo_separacao_velocidade` por segundo. Pares no mesmo ponto exato usam uma direção fixa pelos índices (sem sorteio). Só participam inimigos vivos perseguindo ou atacando: parados em casa e voltando para casa não empurram nem são empurrados. A `WorldSim` calcula tudo antes de mover qualquer inimigo, e o `EnemyBody` soma o deslocamento à velocidade do `move_and_slide`, então a parede continua segurando. O resultado não depende da ordem em que os corpos se movem.

Foi escolhida no lugar de posições de ataque em volta do alvo porque é uma função só, sem reserva de vagas nem estado entre ticks, e já resolve a sobreposição visual.

| | Guerreiro (nível, abates, mortes, causado, recebido, TTK, andando, atacando, morto) | Caçador (mesmas colunas) |
| --- | --- | --- |
| Antes (passo 6/7) | 5, 35, 0, 2910, 769, 2,9 s, 34%, 65%, 0% | 5, 32, 0, 2654, 463, 2,8 s, 28%, 71%, 0% |
| Distância 1,4 m (testada) | 5, 32, 1, 2760, 812, 3,3 s, 33%, 64%, 2% | 5, 31, 0, 2504, 420, 2,8 s, 27%, 72%, 0% |
| Depois, 1,7 m (adotada) | 4, 28, 0, 2196, 764, 3,0 s, 27%, 72%, 0% | 5, 31, 0, 2490, 440, 2,9 s, 26%, 73%, 0% |

**Leitura.** Com os inimigos espalhados em volta do jogador, cada golpe em arco pega menos alvos ao mesmo tempo. O Guerreiro, que vive de acertar vários de uma vez, perde 25% do dano causado e 7 abates, e fica no nível 4. O Caçador perde pouco (a Rajada pega menos alvos, o disparo simples não muda). Com 1,4 m os nomes dos rótulos ainda se encostavam nas capturas, e o Guerreiro morreu uma vez; com 1,7 m os rótulos ficam lado a lado e ninguém morre. A meta (25 a 35 abates, 0 ou 1 morte, menos de 50% andando) segue cumprida pelas duas classes. Nenhum número de classe ou inimigo foi mudado. A queda do Guerreiro é para o `game-designer` avaliar.

**Capturas** (tela virtual, `--segundos=45`): antes, dois Lobos Sombrios no mesmo ponto, com os rótulos sobrepostos ("Lobo Sombrio" escrito duas vezes por cima). Depois, com 1,7 m, os dois lobos e o Carniçal ficam lado a lado em volta do Guerreiro, cada um com o rótulo inteiro. Ainda pode haver sobreposição quando um inimigo está atrás do outro na linha da câmera; isso é perspectiva e não se resolve afastando no chão.
