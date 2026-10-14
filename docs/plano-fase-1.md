# Goru: plano de produção da fase 1

Out 14, 2026 · produtor · status: proposta

Base: `CLAUDE.md`, seções 8.1, 8.2, 10 e 10.1 do documento de design e `docs/arquitetura-fase-1.md` (chamada aqui de "arquitetura"). Este plano não cria regra técnica: onde houver dúvida, vale a arquitetura.

---

## 1. Objetivo e portão

**Objetivo.** De 2 a 10 jogadores jogam juntos a zona 1 (PvE cooperativo) num servidor autoritativo, sem dessincronizar e sem nenhuma regra decidida no cliente. O modo offline continua jogando como hoje, com personagem separado e salvo no computador.

**Portão** (copiado da arquitetura, seção 6). Executado com `tools/teste_rede.sh`, 10 bots, 15 min na zona 1, 100 ms ± 20 ms de atraso e 2% de perda:

1. **Zero dessincronização:** depois de 1 s de cada evento, vida, nível, XP e estado de toda entidade são idênticos no servidor e em todos os clientes, e as posições remotas ficam a menos de 0,5 m (comparadas a cada 5 s).
2. **Zero regra decidida no cliente:** os 6 testes de trapaça passam, e o teste de grep confirma que `net/` e `view/` não chamam funções de `rules/` que alterem estado nem `take_damage`, e que `server/` não referencia `offline/`.
3. **Previsão:** menos de 1 correção acima de 0,5 m por minuto por cliente, e erro médio de reconciliação abaixo de 5 cm.
4. **Servidor:** tempo de tick p99 abaixo de 8 ms, CPU abaixo de 25% de um núcleo e memória abaixo de 300 MB.
5. **Banda:** abaixo de 32 KB/s de descida e 5 KB/s de subida por cliente.
6. **Estabilidade:** nenhuma queda de processo e nenhuma desconexão fora dos testes de trapaça.
7. **Offline intacto:** `smoke_test` passa, e o `diagnostico` antes e depois da refatoração fica dentro do ruído, mudando só o que RD-002 mudar, com aval.
8. **Sessão humana:** 30 min com pelo menos 4 pessoas em máquinas e redes diferentes, sem nenhum bug bloqueante aberto pelo `qa`.

**Fora da fase 1 (backlog):** arena PvP (ver corte na seção 6), itens e drops, contas com senha, banco PostgreSQL, export "Dedicated Server", arte final, novas classes, novas zonas.

---

## 2. Tarefas

Regra para todas: `smoke_test` verde ao terminar; se tocar regra, `diagnostico` igual à referência do passo 0. Estimativas incluem revisão e teste pela pessoa da premissa (seção 7).

### Pendências do protótipo (antes de qualquer refatoração)

| Id | Tarefa | Responsável | Depende de | Critério de pronto | Dias-pessoa |
| --- | --- | --- | --- | --- | --- |
| P1 | Fechar a rodada de balanceamento em andamento | `game-designer` | nada | Antes e depois do `diagnostico` registrados; números aprovados pelo `game-designer`; `data/` sem mudança pendente | 2 |
| P2 | Teste humano de 15 min do protótipo offline | dono do projeto | P1 | 15 min jogados; notas escritas (o que diverte, o que irrita, bugs); veredito "segue" ou "ajusta" | 0,5 |
| P3 | Triagem do teste humano | `game-designer` + `produtor` | P2 | Cada nota vira correção feita ou item de backlog; zero bloqueante aberto | 1,5 |

P1 tem de fechar antes do passo 0: se o balanceamento mudar depois, a referência do `diagnostico` perde o valor.

### Bloco A: refatoração offline (passos 0 a 7 da arquitetura)

| Id | Tarefa | Responsável | Depende de | Critério de pronto | Dias-pessoa |
| --- | --- | --- | --- | --- | --- |
| 0 | Guardar números de referência do `diagnostico` | `qa` | P3 | Arquivo de referência no repositório, com comando e semente usados | 0,5 |
| 1 | `rules/progression`, `combat`, `cooldowns`; constantes em `data/regras.json` | `programador-gameplay` | 0 | `player.gd` usa as regras puras; testes das funções puras no smoke; `diagnostico` = referência | 2,5 |
| 2 | `InputFrame`, `PlayerBody.apply_input`, `offline/local_input.gd`; bot gera quadros | `programador-gameplay` | 1 | Nenhum `Input.` fora de `local_input.gd`; bot do `diagnostico` roda sem `Input` global; `diagnostico` = referência | 2 |
| 3 | Separar view (`player_view`, `enemy_view`, `camera_rig`); HUD só ouve sinais | `programador-gameplay` | 2 | Teste: a sim roda sem nenhuma view; `take_damage` não chama `Fx` | 3 |
| 4 | `EnemyBrain` com N alvos | `programador-gameplay` | 2 | Teste offline com 2 `PlayerBody` na mesma sim: inimigo troca de alvo e respeita a coleira | 2 |
| 5 | `WorldSim` e `zone_builder`; timers em ticks; eventos; XP de grupo provisória | `programador-gameplay` | 3, 4 | Nenhum `await` de timer em regra; `main.gd` virou `offline/offline_game.gd`; `diagnostico` = referência | 4 |
| 6 | RD-002: camadas de colisão | `programador-gameplay` (aval `game-designer`) | 5, decisão D2 | Antes e depois do `diagnostico` anexados; aval escrito do `game-designer` | 1,5 |
| 7 | `offline_save.gd` (atômico, `.bak`, `formato`) | `programador-gameplay` | 5 | Teste de salvar e carregar; teste de arquivo corrompido recupera o `.bak` | 1,5 |

### Bloco B: rede (passos 8 a 16 da arquitetura)

| Id | Tarefa | Responsável | Depende de | Critério de pronto | Dias-pessoa |
| --- | --- | --- | --- | --- | --- |
| 8 | Esqueleto: `/root/Rede`, `servidor.tscn`, aperto de mão (versão, `data_hash`, token) | `engenheiro-rede-backend` | 5 | `rede_test`: 2 clientes entram e saem; cliente com `data_hash` errado é recusado | 3 |
| 9 | Movimento autoritativo sem previsão; snapshots; interpolação | `engenheiro-rede-backend` | 8, 6 | `rede_test`: posições de A em A, B e servidor a menos de 0,5 m | 4 |
| 10 | Previsão, reconciliação e simulador de atraso e perda | `engenheiro-rede-backend` | 9 | `rede_test` com 100 ms e 2%: erro médio abaixo de 5 cm | 5 |
| 11 | Habilidades pelo bit do quadro, `s_eventos`, animação cosmética; testes de trapaça | `engenheiro-rede-backend` + `programador-gameplay` | 10 | Os 6 testes de trapaça da arquitetura (seção 5, item 5) passam | 4 |
| 12 | Inimigos replicados: morte, renascimento, XP por evento | `engenheiro-rede-backend` | 11, decisão D3 | `rede_test` itens 3 e 4: estado completo idêntico nos três | 3 |
| 13 | `CharacterRepository` JSON, contas de teste, criação online, gravação periódica | `engenheiro-rede-backend` | 8 | `rede_test` item 6: reconectar mantém nível e XP; campo extra em `c_criar_personagem` recusado | 3 |
| 14 | Guardas de isolamento: grep e filtro de export | `devops-seguranca` | 13 | Grep falha de propósito num ramo de teste e passa no principal | 1 |
| 15 | `tools/teste_rede.sh` com 10 bots, métricas e rodada do portão | `qa` + `engenheiro-rede-backend` | 12, 13, 14 | Script sai com código 0; relatório com os critérios 1 a 7 do portão | 4 |
| H1 | Servidor numa VPS com IP público, porta 24600, log e reinício | `devops-seguranca` | 8, decisão D5 | Cliente de fora da rede local conecta e joga 10 min | 1,5 |
| 16 | Sessão humana de 30 min e relatório | `qa` (+ dono do projeto) | 15, H1, decisão D6 | 4 pessoas, máquinas e redes diferentes; zero bug bloqueante aberto | 2 |

**Soma:** pendências 4 · bloco A 17 · bloco B 30,5 · **total 51,5 dias-pessoa.**

---

## 3. Marcos

| Marco | Fecha em | O que o dono do projeto vê ou joga |
| --- | --- | --- |
| M1: protótipo aprovado | P3 | Joga 15 min offline com o balanceamento fechado |
| M2: offline refeito | 7 | Joga o offline igual a antes, fecha o jogo e reabre com o mesmo personagem; vê o relatório do `diagnostico` igual ao de referência |
| M3: dois na mesma tela | 12 | Abre servidor e 2 clientes no próprio PC e mata um inimigo junto com o segundo cliente, com atraso simulado |
| M4: portão | 16 | Relatório do `teste_rede.sh` com 10 bots, e joga a sessão de 30 min com 3 pessoas pela internet |

---

## 4. Riscos de produção

Os riscos técnicos estão na arquitetura, seção 6, e não se repetem aqui.

| Risco | Prob. | Impacto | O que fazer |
| --- | --- | --- | --- |
| Escopo cresce (arena, itens, classe nova, "só mais um sistema") | Alta | Alto | Toda proposta responde "cabe na fase 1 ou vai para o backlog?". O padrão é backlog. Nada entra sem mudar o portão, e o portão só muda com o dono do projeto. |
| Dependência de uma pessoa só (o dono revisa, integra e testa tudo) | Alta | Alto | Tarefas de no máximo 5 dias, cada uma com teste automático que prova o pronto. Decisões escritas em `docs/`. Contratar o programador sênior de multiplayer/backend antes do passo 8 (decisão D7). |
| Rede (passos 9 a 12) estoura sem alguém com experiência em netcode | Média | Alto | Revisão externa do código de previsão no passo 10. Se o passo 10 passar de 10 dias, parar e reavaliar com o `arquiteto-tecnico`. |
| Falta de arte | Baixa na fase 1 | Médio | O portão não depende de arte. Cubos e cápsulas bastam. A arte só é contratada depois do protótipo de rede aprovado (seção 10.1). O risco real é a pressão para "ficar bonito" antes da hora: vai para o backlog. |
| Teste humano não acontece (P2 e passo 16) | Média | Alto | Marcar as datas agora. Escolher as 4 pessoas até o passo 10 (D6). Sem sessão humana o portão não passa, por mais verdes que estejam os bots. |
| Código dos agentes entra sem revisão humana | Média | Médio | Todo passo termina com revisão da pessoa e testes verdes; nenhum merge só porque "o agente disse que funciona". |
| Refatoração move o balanceamento sem ninguém notar | Média | Médio | Referência do passo 0 congelada; qualquer variação além do ruído bloqueia o passo. |

---

## 5. Decisões do dono do projeto

O prazo é em relação ao passo, porque não há datas sem o tamanho da equipe. As semanas entre parênteses seguem a premissa da seção 7.

| Id | Decisão | Prazo | Recomendação do produtor |
| --- | --- | --- | --- |
| D1 | Aprovar a arquitetura da fase 1 (RD-001) e este plano | Antes do passo 0 (semana 1) | Aprovar |
| D2 | Aprovar a RD-002 (entidades não colidem entre si) | Antes do passo 6 (semana 4) | Aprovar se o aval do `game-designer` vier com o antes e depois |
| D3 | Regra de XP em grupo (o padrão provisório é XP cheia para quem causou dano) | Provisória no passo 5; final antes do passo 12 (semana 7) | Manter a provisória na fase 1 e rever com dados |
| D4 | Arena PvP dentro da fase 1 ou no backlog | Antes do passo 15 (semana 8) | Backlog (ver seção 6) |
| D5 | Hospedagem: provedor, região e orçamento mensal da VPS | Antes do passo 10 (semana 6) | Pedir ao `devops-seguranca` duas opções com custo |
| D6 | Quem são as 4 pessoas da sessão humana e quando | Antes do passo 10 (semana 6) | Escolher pessoas em cidades ou provedores diferentes |
| D7 | Contratar o programador sênior de multiplayer/backend antes da rede | Antes do passo 8 (semana 4) | Sim, se houver orçamento; muda a estimativa do bloco B |

---

## 6. Corte proposto

A fase 1 cabe, mas no limite para uma pessoa. Cortes recomendados, todos já fora do portão:

1. **Arena PvP para o backlog.** O portão é só PvE na zona 1. A arena é a única parte que pode exigir rewind (arquitetura, seção 6) e sozinha pode somar de 2 a 4 semanas-pessoa. Ela volta como primeira tarefa depois do portão, se a medição de acerto do bot permitir.
2. **Export "Dedicated Server" para a fase 2.** O `--headless` basta para o portão. O passo 14 faz só o grep; o filtro de export entra quando houver export.
3. **Se o bloco B estourar mais de 30%:** congelar o bloco A (sem melhorias no offline) e não abrir nenhuma tarefa nova até o passo 15.

---

## 7. Estimativa total

| Item | Valor |
| --- | --- |
| Soma das tarefas | 51,5 dias-pessoa ≈ **10,5 semanas-pessoa** |
| Faixa honesta | **9 a 16 semanas-pessoa** (−15% a +55%) |
| Premissa | 1 pessoa em tempo integral, que revisa, integra e testa o código escrito pelos agentes; semana de 5 dias úteis; dono do projeto disponível para P2, M1 a M4 e as decisões no prazo |

Por que a margem é assimétrica: a refatoração (bloco A) é previsível porque o código é pequeno e o `diagnostico` acusa erro na hora. A rede (passos 9 a 12) não é: previsão e reconciliação costumam pedir duas ou três voltas, e é dela a maior parte do risco para cima. Se a pessoa não tiver experiência com netcode, conte o lado alto da faixa. Com o programador sênior de rede contratado antes do passo 8 (D7), o bloco B pode rodar em paralelo ao fim do bloco A e o prazo de calendário cai, mas as semanas-pessoa não caem.

Nada da fase 2 (100 por zona, banco, contas reais) é planejado antes de o portão acima passar.
