# Goru: regras do projeto

MMORPG 3D de fantasia sombria em Godot 4.3 (GDScript), para PC. Nome de trabalho: Goru. O documento mestre é `docs/documento-de-design.md`. Quando ele e o código discordarem, o documento vence até alguém atualizá-lo.

## Decisões fechadas (não reabrir sem pedido do dono do projeto)

- **Motor e plataforma:** Godot 4.3, PC, 3D completo, GDScript.
- **Offline e online são personagens separados** (modelo Diablo 2):
  - Personagem **offline**: salvo no computador do jogador (`user://offline/`), joga sozinho e nunca entra no online.
  - Personagem **online**: existe só no servidor. Upa conectado, inclusive sozinho, e é o único que entra em PvP, masmorras em grupo, comércio e ranking.
  - Nunca escreva código que importe um personagem, item ou moeda do offline para o online.
- **Servidor autoritativo:** toda regra que vale poder ou dinheiro (dano, drop, XP, inventário, loja) é decidida no servidor. O cliente só pede e mostra.
- **Escala em degraus:** fase 1 = 2 a 10 jogadores numa masmorra ou arena; fase 2 = 100 por zona; 10.000 simultâneos é meta de longo prazo e só depois de provar as fases anteriores.
- **Originalidade (seção 1 do documento):** a estrutura de sistemas pode se inspirar no Forsaken World; nomes, textos, números, código, arte e sons nunca. Material extraído de outros jogos não entra no repositório.
- **Loja justa (seção 7):** nunca vender poder que só existe na loja.
- **Ajudante por elemento:** só conversa e aconselha, nunca age no jogo nem decide regra. Funciona sem nada instalado (falas prontas) e ganha conversa livre se o jogador tiver o OpenJarvis rodando no próprio computador. O Sobrenatural zomba só das jogadas, nunca da pessoa (aparência, origem, religião, gênero, corpo, família), e sem palavrão pesado.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `data/` | Tabelas JSON: classes, inimigos, zona, regras gerais (`regras.json`) e ajudantes. Balanceamento se faz aqui, não no código. |
| `scripts/rules/` | Regras puras (combate, progressão, recargas, cérebro do inimigo, quadro de entrada). Sem Node, Input, Fx nem rede: rodam igual no offline e no servidor. |
| `scripts/sim/` | Simulação: `world_sim.gd` (dona das entidades, ticks e eventos), corpos de jogador e inimigo, `zone_builder.gd`. Sem malha, câmera nem HUD. |
| `scripts/view/` | Apresentação: malhas, câmera, efeitos. Só ouve sinais da simulação. |
| `scripts/offline/` | Jogo offline (`offline_game.gd`) e leitura do teclado (`local_input.gd`, único lugar que lê `Input` para jogar). |
| `scripts/hud.gd`, `scripts/companion.gd` | Interface e ajudante. Só ouvem sinais; o ajudante só fala. |
| `scenes/` | `main.tscn` (abre o jogo), corpos (`*_body.tscn`, só colisão) e views (`*_view.tscn`, `camera_rig.tscn`). |
| `tests/` | `smoke_test` (regras e camadas), `diagnostico` (bot de balanceamento, referência em `referencia_diagnostico.md`) e `ajudante_ia_test`. |
| `docs/` | Documento de design. |
| `.claude/agents/` | A equipe de agentes (ver abaixo). |

## Comandos

```sh
tools/baixar_godot.sh                                   # baixa o Godot 4.3 para .godot-bin/ (uma vez)
.godot-bin/godot --headless --path . --import            # importa o projeto
.godot-bin/godot --headless --path . res://tests/smoke_test.tscn   # teste obrigatório antes de commit
.godot-bin/godot --headless --path . res://tests/diagnostico.tscn -- --segundos=120   # balanceamento
```

Com tela virtual, para capturas: `xvfb-run -a .godot-bin/godot --path . --rendering-driver opengl3 res://tests/diagnostico.tscn -- --saida=/pasta`.

## Regras de trabalho

- Todo commit que muda código passa no `smoke_test`. Mudança de balanceamento vem com o antes e o depois do `diagnostico`.
- Escreva em português nos textos do jogo, nos documentos e nos comentários.
- Siga o estilo do código vizinho: tipagem estática, nomes em inglês no código, sinais para comunicação entre nós.
- Escopo pequeno: termine e teste uma coisa antes de começar outra.

## Equipe de agentes

Os 42 cargos da equipe de referência estão consolidados em 12 agentes. Eles escrevem texto e código. Não modelam, não animam e não compõem: nessas áreas, entregam especificações e listas para pessoas ou fornecedores.

| Agente | Cobre os cargos |
| --- | --- |
| `diretor-do-jogo` | Diretor do jogo |
| `produtor` | Produtor executivo, produtor de desenvolvimento |
| `arquiteto-tecnico` | Diretor técnico / arquiteto de software |
| `programador-gameplay` | Programador sênior de gameplay, 4 programadores de gameplay, programador de ferramentas |
| `engenheiro-rede-backend` | 3 engenheiros de backend, 2 de rede e servidores, engenheiro de dados |
| `devops-seguranca` | Engenheiro de infraestrutura/DevOps, engenheiro de segurança/SRE |
| `game-designer` | Game designer principal, 2 designers de sistemas e combate |
| `narrativa-missoes` | 2 designers de missões e narrativa |
| `arte-e-audio` | Diretor de arte, 2 artistas de personagens, 3 de ambientes, 1 de props, artista técnico, animador, artista de VFX, técnico de rigging, designer de áudio |
| `ui-ux` | Designer de UI/UX, programador de interface |
| `qa` | Líder de QA, 2 testadores, engenheiro de automação e carga |
| `comunidade` | Gerente de comunidade e suporte |

Para decisões que cruzam áreas, consulte os agentes envolvidos e leve o resultado ao `diretor-do-jogo` para consolidar.
