# Goru: arquitetura da fase 1

Out 14, 2026 · arquiteto-tecnico · status: proposta

Escopo: de 2 a 10 jogadores numa masmorra ou arena, com servidor autoritativo, e o modo offline como personagem separado. Base: `CLAUDE.md`, seções 8, 8.1 e 8.2 do documento de design, e o código em `scripts/`, `scenes/` e `tests/` no estado de hoje.

A fase 1 começa com PvE cooperativo na zona atual (`data/zona_1.json`). A arena PvP ficou para depois da fase 1, por decisão do dono do projeto, porque é a única parte que pode exigir compensação de atraso (ver riscos). XP em grupo: cheia para quem causou dano.

---

## 1. Decisão do servidor

### RD-001: servidor em Godot 4.3 sem tela, com ENet e a API de rede de alto nível

**Contexto.** As regras (dano, XP, recargas, IA) estão em GDScript e precisam rodar igual no offline e no servidor (seção 8.1). A equipe é pequena e a meta é de 10 jogadores por instância.

**Decisão.**
- O servidor é o próprio projeto Godot rodando com `--headless` numa cena própria (`scenes/servidor.tscn`). Mais tarde ele vira um export "Dedicated Server", que tira texturas e malhas.
- Transporte: `ENetMultiplayerPeer` (UDP, com canais confiáveis e não confiáveis). Porta padrão 24600, configurável por `--porta=`.
- Camada: `SceneMultiplayer` com RPCs num **único nó de rede de caminho fixo** (`/root/Rede`), e não espalhados pelas entidades. Assim cliente e servidor não precisam ter árvores de cena idênticas.
- Não usamos `MultiplayerSynchronizer` nem `MultiplayerSpawner` para jogadores: eles não têm previsão nem reconciliação, e prendem o protocolo aos caminhos de nós. As mensagens são nossas e têm versão (seção 3).
- Configuração obrigatória: `server_relay = false` (cliente não fala com cliente), `allow_object_decoding = false` (padrão) e `auth_callback` para o aperto de mão antes de o par entrar no jogo.
- Física a 60 Hz nos dois lados (o padrão do projeto). Um tick de simulação equivale a um quadro de física.

**Alternativas descartadas.**

| Opção | Por que não agora |
| --- | --- |
| Servidor separado em Go, Rust ou C# | Duplica as regras em outra linguagem e quebra "o mesmo código no offline e no servidor". Exige uma segunda equipe. Só se reabre se um teste de carga da fase 2 provar que o GDScript não aguenta. |
| Nakama ou outro backend pronto como servidor de jogo | O modo autoritativo dele roda em Lua, Go ou TS, o que também duplica as regras. Ele continua candidato na fase 2 para contas e persistência, ao lado do servidor Godot. |
| WebSocket ou WebRTC | Com WebSocket (TCP), um pacote perdido trava os seguintes. Não há alvo web. |
| Listen server (um jogador hospeda) | O hospedeiro decide as regras, o que contraria o servidor autoritativo. |
| Rede da Steam como transporte | Prende a plataforma cedo. Pode entrar depois como transporte alternativo sem mudar o protocolo. |
| Lockstep determinístico | A física do Godot não é determinística entre máquinas, e um único cliente lento trava todos. |

**Consequências.** Uma única base de código, em que o servidor é só outra cena. O custo é a CPU do GDScript, que para 10 jogadores e cerca de 30 inimigos está muito abaixo do limite (o portão mede isso). O limite real do GDScript aparece só na fase 2.

### RD-002: entidades móveis não colidem entre si na fase 1

Hoje jogador e inimigo são `CharacterBody3D` na camada 1 e se empurram. Com rede, a colisão com corpos de outras pessoas é a principal causa de divergência na previsão. Proposta de camadas: 1 = mundo, 2 = jogadores, 3 = inimigos. Todos colidem só com a camada 1. Isso muda a sensação do combate, então precisa do aval do `game-designer` e do antes e depois do `diagnostico`.

**Status:** aprovada pelo dono do projeto. O antes e depois do `diagnostico` continua obrigatório quando a mudança for feita.

---

## 2. Separação de código

### Camadas e regra de dependência

```
rules/   regras puras: RefCounted ou funções estáticas, sem Node, Input, Fx nem rede
  ^
sim/     simulação: nós de física sem malha, câmera ou Input; recebem InputFrame e emitem sinais
  ^
offline/ (sim + entrada local + view)   server/ (sim + net_server, sem view)
view/    apresentação: malhas, câmera, HUD, Fx; só escuta sinais da sim ou o espelho da rede
net/     protocolo, net_client (previsão e interpolação) e net_server
```

- O código em `server/` nunca referencia `offline/` nem `view/`.
- O código em `net/net_client` e `view/` nunca chama nada de `rules/` que altere vida, XP, nível ou inventário. Ler tabelas para exibir texto (nome e recarga da habilidade) é permitido.
- Um teste com grep no `smoke_test` ou na CI garante as duas regras (passo 14).

Estrutura proposta (nomes de código em inglês, como no resto do projeto):

| Arquivo novo | Conteúdo |
| --- | --- |
| `scripts/rules/progression.gd` | `xp_to_next_level(level)`, `max_health_for(stats, level)`, `apply_xp(state, amount) -> Array[int]` (níveis ganhos), regra de divisão de XP do grupo |
| `scripts/rules/combat.gd` | `damage_for(ability, level)`, `is_in_arc(origin, forward, target, alcance, angulo) -> bool`, `select_targets(...)` |
| `scripts/rules/cooldowns.gd` | `tick(delta)`, `is_ready(key)`, `start(key, seconds)`, `remaining(key)` |
| `scripts/rules/enemy_brain.gd` | Máquina de estados pura: recebe a própria posição, a origem e a lista de alvos `{id, pos, alive}`, e devolve `{state, move_dir, attack_target_id}` |
| `scripts/rules/character_state.gd` | Dados do personagem (`id`, `class_id`, `level`, `xp`, `health`), com `to_dict()` e `from_dict()` |
| `scripts/rules/input_frame.gd` | `seq`, `move: Vector2`, `yaw`, `buttons` (pular, ataque, habilidade) |
| `scripts/sim/world_sim.gd` | Dona das entidades da instância: monta a zona, cria os inimigos, faz o tick dos timers e emite eventos (`damage_dealt`, `entity_died`, `xp_gained`, `level_up`, `respawned`) |
| `scripts/sim/player_body.gd`, `enemy_body.gd`, `zone_builder.gd` | Corpos de física, com cena `player_body.tscn` sem `Model` nem câmera |
| `scripts/view/player_view.gd`, `enemy_view.gd`, `camera_rig.gd` | Malha, golpe da arma, barra e rótulo de vida, piscada, câmera |
| `scripts/offline/offline_game.gd`, `local_input.gd`, `offline_save.gd` | O `main.gd` de hoje, a leitura de `Input` para `InputFrame` e o save |
| `scripts/net/protocol.gd`, `net_server.gd`, `net_client.gd`, `prediction.gd`, `interpolation.gd` | Rede |
| `scripts/server/server_main.gd`, `character_repository.gd`, `accounts.gd` | Entrada do servidor e persistência online |

### O que muda no código atual

| Onde | Hoje | Depois |
| --- | --- | --- |
| `player.gd` `use_ability()` | **Decide o dano no cliente**: percorre o grupo `enemies`, testa alcance e ângulo e chama `enemy.take_damage()` | Vira `WorldSim.resolve_ability(attacker_id, key, yaw)`, que roda no offline e no servidor. O cliente online só manda o bit do botão e toca a animação. |
| `player.gd` `_physics_process()` | Lê `Input` direto, mistura câmera (`camera_pivot.global_basis`) e regra | `PlayerBody.apply_input(frame: InputFrame, delta)`. A direção chega já em yaw dentro do `InputFrame`, e o mesmo método serve para previsão e servidor. |
| `player.gd` `add_xp()`, `xp_to_next_level()`, `damage_multiplier()`, `_max_health_for()`, `DAMAGE_PER_LEVEL` | Regras dentro do nó de cena | `rules/progression.gd` e `rules/combat.gd`. As constantes (100 XP por nível, 10% de dano por nível) vão para uma tabela `data/regras.json`. |
| `player.gd` `cooldowns` (dicionário) e `take_damage()` | Recarga sem dono claro; `take_damage` chama `Fx.floating_text` | `rules/cooldowns.gd`, dentro da sim. `take_damage` só emite o sinal e a view desenha o número. |
| `player.gd` `_unhandled_input()`, `_play_swing()` | Câmera e animação no mesmo script da regra | `view/camera_rig.gd` e `view/player_view.gd` |
| `enemy.gd` `_physics_process()` | `get_first_node_in_group("player")`: só enxerga **um** jogador | `EnemyBrain` escolhe o alvo entre N jogadores (o mais próximo vivo no alcance de agro, mantido até a coleira). Uma tabela de ameaça fica para depois. |
| `enemy.gd` `_die()` | `await get_tree().create_timer(stats.respawn)`: timer fora do tick | Contador em ticks dentro da `WorldSim`. É testável, pausável e igual no servidor. |
| `enemy.gd` `take_damage()`, `_flash()`, `_update_label()` | Fx, piscada e rótulo junto da regra de "Evadiu" | A regra (ignorar dano em `RETURN`) fica na sim. Piscada, rótulo e texto vão para `view/enemy_view.gd`. |
| `enemy.gd` sinal `killed(xp_reward)` | Não diz quem matou nem quem participou | `entity_died(id, killer_id, participants)`. A XP é dividida por `progression.gd`. A regra de grupo é do `game-designer`; o padrão provisório é XP cheia para cada jogador que causou dano. |
| `main.gd` `_on_enemy_killed()` | Dá XP a `player`, o único jogador | Some e vira evento da `WorldSim` |
| `main.gd` `_build_obstacles()`, `_spawn_enemies()` | Presos à cena com câmera e HUD | `sim/zone_builder.gd`, usado pelo offline e pelo servidor |
| `main.gd` `_on_player_died()` | Renascimento com `await` de timer | Timer em ticks na sim; o HUD só mostra a contagem |
| `game_data.gd` `_register_inputs()` | Carrega dados e registra teclas no mesmo autoload | Registro de teclas sai para `offline/local_input.gd` e para o cliente. `GameData` ganha `data_hash` (SHA-256 dos JSON) para o aperto de mão. |
| `hud.gd` `_process()` | Lê `player.stats[key]` e `player.cooldowns[key]` direto | Lê um estado de exibição alimentado por sinais da sim (offline) ou pelo espelho da rede (online) |
| `tests/smoke_test.gd`, `tests/diagnostico.gd` | Mexem em `player.cooldowns`, `enemy.state` e `Input.action_press` | O bot passa a gerar `InputFrame` e não depende mais do `Input` global. O smoke ganha testes das regras puras. |

O `Fx` (`scripts/fx.gd`) fica como está, mas só a view pode chamá-lo. O `randf` dele é cosmético. Qualquer sorteio de regra (drop, crítico) usa um `RandomNumberGenerator` da `WorldSim`, que no online existe só no servidor.

---

## 3. Protocolo

### Princípios

- O cliente manda **intenções** (entrada e botões), nunca posição, dano, alvo ou vida.
- O servidor manda **estado** (snapshots) e **eventos** (dano, morte, XP).
- Toda mensagem leva `PROTOCOL_VERSION`. Os campos são tipados e validados em `net/protocol.gd`.
- Caminhos quentes (entradas e snapshots) vão em `PackedByteArray` montado com `StreamPeerBuffer`. Mensagens raras usam argumentos de RPC tipados.

### Cliente para servidor

| Mensagem | Canal | Frequência | Campos |
| --- | --- | --- | --- |
| aperto de mão (`auth_callback`) | confiável | 1 vez | `protocolo:int`, `data_hash:String`, `token:String` |
| `c_criar_personagem` | confiável | rara | `nome:String`, `classe:String`. O servidor valida o nome e a classe. **Sem nível, XP ou item.** |
| `c_entrar` | confiável | 1 vez | `personagem_id:String` (id gerado pelo servidor) |
| `c_entradas` | não confiável ordenado, canal 1 | 30 Hz, com 2 quadros novos e 4 repetidos por pacote | `ack_snapshot:int`; lista de quadros `seq:u32`, `mx:i8`, `mz:i8` (−127..127), `yaw:u16`, `botoes:u8` (pular, ataque, habilidade) |
| `c_sair` | confiável | 1 vez | nenhum |

Usar uma habilidade é um bit no quadro de entrada, e não uma mensagem à parte. Assim o servidor a executa na mesma ordem do movimento (pelo `seq`), e a redundância cobre a perda de pacotes.

### Servidor para cliente

| Mensagem | Canal | Frequência | Campos |
| --- | --- | --- | --- |
| `s_bem_vindo` / `s_recusado` | confiável | 1 vez | `entidade_id`, `tick`, `taxa_tick` / `motivo` |
| `s_personagem` | confiável | ao entrar e ao subir de nível | `CharacterState.to_dict()` do próprio personagem |
| `s_entidade_criada` / `s_entidade_removida` | confiável | quando muda | `id:u16`, `tipo` (jogador ou inimigo), `ref` (classe ou `enemy_id`), `nome`, `pos` |
| `s_snapshot` | não confiável ordenado, canal 2 | 20 Hz | `tick:u32`, `ultimo_seq:u32` (deste cliente), `vel` do próprio jogador; por entidade `id:u16`, `pos` (3×f32), `yaw:u16`, `vida:u16`, `flags:u8` (morto, voltando, atacando) |
| `s_eventos` | confiável, canal 0 | quando houver, agrupados por tick | `dano{origem, alvo, valor}`, `habilidade{entidade, chave}`, `recarga{chave, restante}`, `morte{id}`, `renascer{id, pos}`, `xp{valor, xp, nivel}`, `recusa{seq, motivo}` |

A vida também vai no snapshot. Mesmo que um evento se perca na ordem de exibição, o estado converge. Orçamento estimado: cerca de 20 bytes por entidade × 40 entidades × 20 Hz ≈ 16 KB/s de descida por cliente e menos de 3 KB/s de subida.

### Previsão e correção do próprio movimento

1. A cada tick de física, o cliente gera um `InputFrame` com `seq` crescente, aplica com `PlayerBody.apply_input` (o mesmo código do servidor) e guarda `{seq, frame, pos}` num anel de 64 posições.
2. Ao receber um snapshot, ele compara a posição do servidor com a posição prevista no `ultimo_seq`:
   - erro menor que 5 cm: ignora;
   - erro entre 5 cm e 2 m: coloca o corpo na posição e velocidade do servidor, reaplica os quadros com `seq` maior que `ultimo_seq` (no máximo 12, ou 200 ms) e suaviza só o `Model` visual em 100 ms;
   - erro acima de 2 m: teletransporta sem suavizar.
3. Ataques não são previstos em efeito. O cliente toca a animação do golpe na hora, por ser cosmético, e mostra a recarga prevista a partir da tabela, mas números de dano, morte e XP só aparecem com `s_eventos`. Se chegar uma `recusa`, a recarga exibida é corrigida.
4. Entidades remotas (outros jogadores e inimigos) são desenhadas 100 ms no passado, com interpolação linear entre dois snapshots. A extrapolação vai até no máximo 250 ms, e depois disso a entidade congela.

### Validações no servidor

| O que | Como |
| --- | --- |
| Identidade | `multiplayer.get_remote_sender_id()` aponta para a entidade. Qualquer id de entidade vindo do cliente é ignorado. |
| Velocidade | O servidor move o corpo com a `velocidade` da tabela. A entrada é limitada a módulo 1. A fila de entradas por jogador consome **1 quadro por tick**: acima de 4 quadros na fila, descarta os mais velhos; com a fila vazia, repete o último por até 3 ticks e depois para. Mandar mais pacotes não acelera ninguém. |
| Posição | Nunca é aceita do cliente, então não há teletransporte. O pulo só vale com `is_on_floor()` no servidor. |
| Recarga | `Cooldowns` do servidor. Botão pressionado com recarga ativa é ignorado e gera `recusa`. Personagem morto não age. |
| Alcance e ângulo | O servidor escolhe os alvos com as posições dele e `alcance`/`angulo` da tabela. O cliente manda só o yaw. |
| Sanidade | `seq` sempre crescente; yaw e valores finitos; pacote maior que 512 bytes descartado; mensagens confiáveis limitadas a 10 por segundo. 10 infrações derrubam a conexão e geram log. |
| Versão | Um `protocolo` ou `data_hash` diferente do servidor é recusado no aperto de mão, para cliente e servidor nunca rodarem tabelas diferentes. |
| Sessão | Uma conta só pode ter uma conexão ativa. O segundo login é recusado. |

---

## 4. Persistência

### Save offline

- Caminho: `user://offline/personagens/<id>.json`, com `id` no formato `off-<uuid>`.
- Gravação atômica: escreve `<id>.json.tmp`, renomeia a versão anterior para `<id>.json.bak` e depois renomeia o `.tmp`. Na leitura, se o JSON for inválido, usa o `.bak`.
- Gravação ao subir de nível, ao sair e a cada 60 s.
- Sem criptografia nem assinatura: o save offline é do jogador, e o que protege o online é a separação.
- `formato` permite migrar (`OfflineSave.migrate(dict)`). As chaves seguem o português de `data/`:

```json
{
  "formato": 1,
  "versao_jogo": "0.1.0",
  "salvo_em": "2026-10-14T12:00:00Z",
  "personagem": {
    "id": "off-7f3a…",
    "nome": "Arin",
    "classe": "guerreiro",
    "nivel": 3,
    "xp": 40,
    "zona": "zona_1",
    "posicao": [0, 1, 0],
    "tempo_jogado_s": 1234
  }
}
```

A vida não é salva: o personagem volta com vida cheia. O JSON do Godot lê todo número como `float`, então o `from_dict` converte `nivel` e `xp` com `int()`.

### Personagem online, fase 1

- O mais simples que funciona: um processo de servidor e arquivos JSON no disco do servidor, gravados com o mesmo método atômico. Caminhos: `user://servidor/personagens/<id>.json`, com `id` no formato `on-<uuid>` gerado pelo servidor, e `user://servidor/contas.json`.
- Contas: só de teste, com tokens aleatórios criados por um script de administração. Sem senha real na fase 1.
- Gravação ao subir de nível, ao desconectar e a cada 60 s. A perda máxima numa queda é de 60 s.
- Tudo passa pela interface `CharacterRepository` (`load(account_id, id)`, `save(state)`, `list(account_id)`, `create(account_id, nome, classe)`). A simulação nunca toca no arquivo.

### Banco que vem depois

PostgreSQL na fase 2, atrás de um serviço de contas e persistência, porque o Godot não fala com Postgres nativamente. O candidato principal é o Nakama (contas, armazenamento e matchmaking sobre Postgres); a alternativa é uma API HTTP pequena. Para trocar o banco, basta outra implementação de `CharacterRepository`. Esboço do esquema: `accounts(id uuid pk, login unique, password_hash argon2, created_at)` e `characters(id uuid pk, account_id fk, name unique, class_id, level, xp, zone, pos, version int (trava otimista), updated_at)`. Itens vêm depois, numa tabela com ids gerados pelo servidor.

### Como garantir que nada do offline entre no online

1. **Não existe mensagem que carregue personagem.** `c_criar_personagem` aceita só `nome` e `classe`, e o servidor cria tudo no nível 1. O validador do protocolo recusa qualquer campo a mais.
2. **Ids com prefixos e origens diferentes** (`off-` local, `on-` gerado pelo servidor). O repositório do servidor recusa qualquer id que ele não criou.
3. **Código separado:** `scripts/server/` não referencia `scripts/offline/` nem `user://offline`. Um teste com grep falha se aparecer `OfflineSave`, `offline/` ou `user://offline` em `server/` ou `net/`, e o export do servidor exclui `scripts/offline/`.
4. **O cliente online não grava estado de personagem.** Na fase 1 não existe cache local; se um dia existir, é só exibição e o servidor nunca o lê.
5. O tipo `CharacterState` é compartilhado porque as regras são as mesmas. Os pontos de entrada (`OfflineSave` e `CharacterRepository`) são distintos e não se conhecem.

---

## 5. Como testar sem tela

### Teste em um processo: `tests/rede_test.tscn` (entra na CI junto do `smoke_test`)

- Cada papel roda numa `SubViewport` com `own_world_3d = true`, para que a física do servidor e a dos clientes não se misturem. Cada `SubViewport` recebe o próprio `SceneMultiplayer` via `get_tree().set_multiplayer(mp, caminho)`: um servidor e dois clientes, todos em ENet em `127.0.0.1`.
- Os clientes são bots que geram `InputFrame`, reaproveitando o bot do `diagnostico`.
- O `net/` tem um modo de teste com atraso e perda simulados (`--latencia=100 --variacao=20 --perda=2`), aplicados numa fila antes de enviar. Assim o teste não depende de `tc netem` nem de root.
- Verificações:
  1. os dois clientes entram e cada um vê o outro;
  2. o bot A anda 5 s e a posição dele em A, em B e no servidor fica a menos de 0,5 m;
  3. A e B matam um inimigo juntos, e vida, morte, XP e nível ficam idênticos nos três;
  4. depois de cada evento estabilizado (1 s), a comparação completa do estado (`vida`, `nivel`, `xp`, `flags` de todas as entidades) não mostra diferença;
  5. testes de trapaça com um cliente adulterado: entrada com módulo 5, 120 quadros por segundo, ataque a cada tick, `seq` repetido, campo extra em `c_criar_personagem`, pacote de 4 KB. Em todos o servidor mantém a velocidade da tabela, respeita a recarga e recusa ou derruba o cliente;
  6. desconectar e reconectar o bot A mantém nível e XP (repositório JSON num diretório temporário).

### Teste em vários processos: `tools/teste_rede.sh`

Sobe `godot --headless res://scenes/servidor.tscn` e N processos `godot --headless res://tests/bot_cliente.tscn -- --servidor=127.0.0.1 --segundos=900`. Cada processo grava métricas em JSON (tempo de tick, banda, correções, divergências), e o script agrega tudo e sai com código diferente de 0 se o portão falhar. É esse teste que mede o portão com 10 bots.

---

## 6. Riscos e portão

### Riscos técnicos

| Risco | Mitigação |
| --- | --- |
| Física do Godot diverge entre cliente e servidor e gera correções constantes | Reconciliação com tolerância e reaplicação. RD-002 tira a colisão entre entidades. Medir correções por minuto. |
| Reaplicar `move_and_slide` várias vezes por quadro custa caro ou erra o `is_on_floor` | Máximo de 12 quadros e um único corpo. Medir no teste. |
| Golpe corpo a corpo erra alvos em movimento com 100 ms de atraso | No PvE, aceitar e medir a taxa de acerto do bot com e sem atraso. Na arena, avaliar recuar as posições no tempo (rewind) só se a diferença passar de 15%. |
| RPC aberto demais (relay, objetos, nós arbitrários) | Um único nó `/root/Rede`, `server_relay = false`, `allow_object_decoding = false`, todas as funções `any_peer` validando o remetente |
| Refatorar quebra o offline ou muda o balanceamento sem querer | Cada passo roda `smoke_test` e `diagnostico`, que não podem variar além do ruído |
| Timers com `await` (inimigo e renascimento) ficam fora do tick | Passam a ser contadores na `WorldSim` (passo 5) |
| Tabelas diferentes entre cliente e servidor | `data_hash` no aperto de mão |
| Hospedagem e NAT | Servidor dedicado com IP público (uma VPS pequena). Sem P2P. A operação é do `devops-seguranca`. |
| CPU do GDScript na fase 2 | Fora do escopo da fase 1, mas o portão já mede o tempo de tick para projetar |

### Portão de aprovação da fase 1 (mensurável)

Executado com `tools/teste_rede.sh`, com 10 bots, 15 min na zona 1, 100 ms ± 20 ms de atraso e 2% de perda:

1. **Zero dessincronização:** depois de 1 s de cada evento, vida, nível, XP e estado de toda entidade são idênticos no servidor e em todos os clientes, e as posições remotas ficam a menos de 0,5 m (comparadas a cada 5 s).
2. **Zero regra decidida no cliente:** os 6 testes de trapaça passam, e o teste de grep confirma que `net/` e `view/` não chamam funções de `rules/` que alterem estado nem `take_damage`, e que `server/` não referencia `offline/`.
3. **Previsão:** menos de 1 correção acima de 0,5 m por minuto por cliente, e erro médio de reconciliação abaixo de 5 cm.
4. **Servidor:** tempo de tick p99 abaixo de 8 ms (orçamento de 16,6 ms), CPU abaixo de 25% de um núcleo e memória abaixo de 300 MB.
5. **Banda:** abaixo de 32 KB/s de descida e 5 KB/s de subida por cliente.
6. **Estabilidade:** nenhuma queda de processo e nenhuma desconexão fora dos testes de trapaça.
7. **Offline intacto:** `smoke_test` passa, e o `diagnostico` antes e depois da refatoração fica dentro do ruído, mudando só o que RD-002 mudar, com aval.
8. **Sessão humana:** 30 min com pelo menos 4 pessoas em máquinas e redes diferentes, sem nenhum bug bloqueante aberto pelo `qa`.

---

## 7. Passos de implementação

Cada passo termina com `smoke_test` verde e, quando tocar regra, com o `diagnostico` igual ao de referência.

0. Rodar o `diagnostico` e guardar os números de referência.
1. Criar `rules/progression.gd`, `rules/combat.gd` e `rules/cooldowns.gd`, e fazer `player.gd` chamá-los. Mover as constantes para `data/regras.json`. Adicionar testes das funções puras ao smoke.
2. Criar `InputFrame` e `PlayerBody.apply_input`: `player.gd` deixa de ler `Input` e passa a ler de `offline/local_input.gd`. O bot do `diagnostico` passa a gerar quadros.
3. Separar a view: `player_view`, `enemy_view` e `camera_rig`. `take_damage` só emite sinais, `hud.gd` só ouve sinais. Teste: a sim roda sem nenhuma view.
4. Criar `EnemyBrain` com N alvos. Teste offline com 2 `PlayerBody` na mesma sim.
5. Criar `WorldSim` e `zone_builder`: timers em ticks, eventos e divisão de XP. `main.gd` vira `offline/offline_game.gd`.
6. RD-002 (camadas de colisão), com aval do `game-designer` e o antes e depois do `diagnostico`.
7. Criar `offline_save.gd` (formato acima, gravação atômica e `.bak`). Teste de salvar e carregar e de recuperar um arquivo corrompido.
8. Esqueleto de rede: `/root/Rede`, `scenes/servidor.tscn`, aperto de mão com versão, `data_hash` e token. Primeiro teste em processo único: 2 clientes entram e saem.
9. Movimento autoritativo sem previsão: `c_entradas`, fila de 1 quadro por tick, `s_snapshot` e interpolação dos remotos. Teste: as posições batem.
10. Previsão e reconciliação do próprio jogador, mais o simulador de atraso e perda. Teste com 100 ms e 2%.
11. Habilidades pelo bit do quadro, resolvidas na sim do servidor, mais `s_eventos` e a animação cosmética no cliente. Testes de trapaça.
12. Inimigos replicados: morte, renascimento e XP por evento. Teste de sincronização completa.
13. `CharacterRepository` em JSON, contas de teste, criação de personagem online e gravação periódica. Teste de reconexão.
14. Guardas de isolamento: teste com grep e filtro de export do servidor.
15. `tools/teste_rede.sh` com 10 bots e métricas, e a rodada do portão.
16. Sessão humana e relatório do `qa`. Arena PvP só depois, com a medição de acerto do item de risco.
