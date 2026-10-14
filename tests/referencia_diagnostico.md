# Referência do diagnóstico

Out 14, 2026 · programador-gameplay · bloco A, passo 0 (atualizada no passo 2)

## Comando

```sh
.godot-bin/godot --headless --path . res://tests/diagnostico.tscn -- --segundos=120
```

Godot 4.3.stable.official.77dcf97d8, Linux x86_64, `data/` do commit b3fa693, sem mudança de balanceamento. Não há semente: nenhuma regra sorteia nada. Os únicos sorteios do jogo são cosméticos (posição do texto flutuante em `Fx` e escolha da fala do ajudante) e não mexem no combate.

## Números de referência

Valem a partir do passo 2 (bot gera `InputFrame`):

| Classe | Nível | Abates | Mortes | Dano causado | Dano recebido | TTK médio | Andando | Atacando | Morto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guerreiro | 5 | 35 | 0 | 2910 | 699 | 3,1 s | 33% | 66% | 0% |
| Caçador | 5 | 31 | 0 | 2490 | 468 | 3,1 s | 27% | 72% | 0% |

Determinismo conferido. A versão do passo 0 deu a mesma saída em 3 rodadas simultâneas, disputando CPU, e em rodadas com `--max-fps 20` e `--max-fps 45`. A versão do passo 2 deu a saída acima em 4 rodadas: uma sozinha, duas simultâneas e uma com `--max-fps 20`. O FPS impresso (cerca de 144 sem tela) não faz parte da referência.

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
