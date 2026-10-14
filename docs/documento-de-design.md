# Goru: Documento de Design

Oct 13, 2026 · @anderson

## 1. Regra de originalidade

O Forsaken Online aproveita estruturas e padrões de design estudados no Forsaken World, mas todo o conteúdo é próprio. Ideias de sistema não têm dono; código, textos, nomes, arte e dados têm.

| Pode aproveitar (estrutura) | Não pode copiar (expressão) |
| --- | --- |
| Regra "raça restringe classe" e papéis de grupo | Nomes de raças, classes, deuses, zonas e vilões |
| Progressão por faixas de nível e loop diário | Textos de missões, falas, descrições de itens |
| Tipos de sistema de endgame (fortificação, gemas, runas) | Tabelas de números, fórmulas e IDs do elements.data |
| Arquitetura cliente: motor + UI em script + dados em tabela | Scripts Lua, XML de interface, API com os mesmos nomes |
| Padrões de loja (promoção com prazo, brinde, pacotes) | Lista de itens, preços e nomes da loja |
|  | Texturas, modelos, efeitos e sons |

O material extraído do cliente fica como **referência de estudo**, fora do repositório do jogo. Qualquer uso direto depende de autorização da Perfect World.

## 2. Visão e pilares

Forsaken Online é um MMORPG de fantasia sombria em que raças rivais precisam cooperar contra uma ameaça que sobreviveu aos deuses. Os cinco pilares vêm dos padrões que funcionaram na referência, reescritos para o seu jogo:

1. **Familiar por fora, profundo por dentro.** Interface e controles conhecidos de MMO ocidental, com sistemas de progressão longos no estilo asiático.
2. **Os monstros também jogam.** Raças que seriam vilões em outros jogos (mortos-vivos, ferais) são jogáveis e têm motivos próprios.
3. **Grátis e justo.** Loja vende conveniência, visual e tempo, nunca poder que só se compra.
4. **Cooperação forçada pela história.** Alianças e rivalidades entre raças geram missões e conflito sem obrigar PvP.
5. **Economia de ofícios.** Profissões incomuns (social, criação, doma) dão um caminho de jogo que não é combate.

## 3. Mundo e história

A história segue um mito em camadas: cada camada entrega ao jogo uma raça, uma perda ou um vilão. Os nomes abaixo são vagas a preencher, e nenhum deve repetir os da referência.

| Camada | O que acontece | O que entrega ao jogo |
| --- | --- | --- |
| Criação | Um criador molda o mundo e seus marcos (uma árvore, um céu de estrelas) | Cenário e panteão |
| Herdeiros | Três deuses recebem o mundo e patrocinam raças diferentes | Origem e lealdade de cada raça |
| Primeira guerra | Uma força do caos ataca; um continente afunda | Primeira perda e regiões em ruínas |
| Segunda guerra | Um herói mortal usa relíquias para selar os deuses e o inimigo | Protagonismo dos mortais |
| Vácuo | Sem deuses, uma raça domina e as outras se dividem | Mundo jogável e tensão política |
| Vilão ativo | Um líder reúne os restos do caos num exército | Antagonista da campanha |
| Expansões | Cada atualização abre uma raça, zona, classe ou sistema | Conteúdo contínuo |

A campanha principal é contada em **capítulos**, e cada capítulo fecha uma faixa de nível. O texto em si sai do pipeline da seção 9, partindo do zero.

## 4. Raças e classes

A raça define quais classes o jogador pode escolher, então escolher a raça já é uma decisão de build. A proposta inicial tem 6 raças e 8 classes, com nomes provisórios.

| Raça (provisória) | Fantasia | Classes permitidas | Patrono |
| --- | --- | --- | --- |
| Humanos | Políticos e numerosos | Guerreiro, Mago, Caçador | Deus da ordem |
| Povo da floresta | Antigos e orgulhosos | Guerreiro, Curandeiro, Menestrel | Deusa da vida |
| Povo da montanha | Engenhosos e devotos | Atirador, Guardião | Deus da terra |
| Imortais da noite | Isolados, temidos pela imortalidade | Assassino, Mago, Ceifador | Heroína mortal |
| Ferais | Amaldiçoados, aliados por conveniência | Assassino, Curandeiro | Deusa da lua |
| Raça de expansão | Chega com a primeira expansão | Uma classe exclusiva | A definir |

**Papéis de grupo:** Guardião e Guerreiro tanqueiam; Curandeiro e Menestrel curam e dão suporte; Mago controla e causa dano em área; Assassino, Atirador, Caçador e Ceifador causam dano direto.

Cada raça tem uma habilidade racial ganha na campanha e quatro habilidades de essência liberadas nos níveis 1, 20, 40 e 60. As relações entre raças (uma aliança, dois laços religiosos, um desprezo, um isolamento e uma aliança de conveniência) viram missões de facção.

## 5. Loop de jogo e progressão

O jogador avança por faixas de nível, e cada faixa combina campanha, diárias, uma masmorra de grupo e um evento. O ciclo do dia é: campanha → diárias → masmorra da faixa → evento → melhorar equipamento.

| Faixa | Campanha | Liberado na faixa | Masmorra de grupo |
| --- | --- | --- | --- |
| 1–14 | Capítulo 1: origem da raça | Habilidade racial, primeira montaria | Tutorial em grupo |
| 15–29 | Capítulo 2 | Diárias do quadro de recados | Primeira masmorra |
| 30–49 | Capítulo 3 | Caças de recompensa (nível 25+), profissões, arena | Masmorra 30–40 |
| 50–69 | Capítulo 4 | Fortificação, gemas, fendas dimensionais | Masmorra 50–60 |
| 70–80 | Capítulo 5: o vilão | Runas, asas, eventos de guerra entre servidores | Masmorras 70+ e raide |

**Recompensa de marco:** um baú a cada 5 níveis até o 50 mantém o ritmo no início, quando o jogador mais abandona.

**Tipos de conteúdo repetível:** masmorras de equipamento, fendas dimensionais (desafio por ondas), eventos com horário, mascotes e minijogos, e arena PvP opcional.

## 6. Sistemas de endgame

O endgame se apoia em camadas de melhoria do personagem que o jogador avança aos poucos, cada uma com sua fonte de material. Esses tipos de sistema são padrão do gênero; regras, números e nomes serão próprios.

| Sistema | O que melhora | Fonte do material | Libera |
| --- | --- | --- | --- |
| Fortificação | Nível de cada peça de equipamento, com chance de falha | Masmorras e loja | Nível 50 |
| Gemas | Atributos encaixados em engastes | Masmorras, ofícios | Nível 50 |
| Identificação | Revela atributos ocultos de um item | Consumível comum | Nível 30 |
| Runas | Bônus por classe, em conjuntos | Raide, eventos | Nível 70 |
| Essência | Habilidades raciais extras via acessório | Campanha | Níveis 1, 20, 40, 60 |
| Asas e montarias | Velocidade e visual | Conquistas, eventos, loja (só visual) | Nível 15 |
| Mascotes | Ajudante de combate ou coleta | Doma (ofício) | Nível 20 |
| Fé | Pontos gastos em bênçãos do patrono | Diárias de templo | Nível 40 |
| Ascensão | Competição de servidor por um título divino | Ranking sazonal | Endgame |

Profissões gastam **vigor**, um recurso diário que limita a produção e protege a economia de bots.

## 7. Economia e loja

A loja da referência vendia 753 itens. Ela se apoiava em três alavancas: promoções com prazo (183 itens, desconto mediano de 35%), brindes junto da compra (556 itens) e pacotes (46 itens com "pacote" no nome). O preço mediano era 300 unidades de moeda premium (de 5 a 7.500).

O Forsaken Online usa as mesmas alavancas, com catálogo, nomes e preços próprios e com regras mais rígidas que as da referência:

- **Pode vender:** visual (trajes, asas e montarias só de aparência), conveniência (espaço de mochila e banco), tempo (bônus de experiência limitado) e passe de temporada.
- **Não pode vender:** atributos que só existem na loja, materiais de fortificação sem limite, nem chance de fortificar sem falha.
- **Promoções:** com início e fim visíveis e preço cheio sempre mostrado.
- **Caixas aleatórias:** só com as chances publicadas, ou ficam de fora, conforme a lei de cada país de lançamento.
- **Moeda premium:** também pode ser obtida jogando, por um mercado entre jogadores, para quem não paga.

## 8. Arquitetura técnica

A arquitetura copia a ideia que deu certo na referência: o motor compilado faz o trabalho pesado e expõe poucas funções, e todo o resto vive em arquivos que a equipe de design edita sem recompilar.

&#91;embedded content: arquitetura · servidor, cliente em 4 camadas, pacotes\]

Na referência, 109 funções de jogo e 38 de interface bastavam para 1.548 janelas e 632 scripts. As mais usadas consultavam o personagem (nível de habilidade e de efeitos), mostravam e escondiam elementos e preenchiam textos. Essa é a ordem de prioridade para a API do Forsaken Online, com nomes próprios. O script do cliente nunca fala com a rede: toda regra que vale dinheiro ou poder fica no servidor.

### 8.1 Modo offline e modo online

Offline e online são **personagens separados**, como no Diablo 2. Isso fecha a porta para a trapaça mais simples: editar o save offline e entrar no PvP com nível máximo.

| | Personagem offline | Personagem online |
| --- | --- | --- |
| Onde fica salvo | No computador do jogador | Só no servidor |
| Precisa de internet | Não | Sim |
| Upar sozinho | Sim | Sim (conectado) |
| PvP, masmorra em grupo, comércio, ranking | Não | Sim |
| Pode virar o outro tipo | Nunca | Nunca |

O offline serve para experimentar o jogo, jogar sem conexão e testar builds. O código de regras (dano, XP, habilidades) é o mesmo nos dois modos; no online ele roda no servidor.

### 8.2 Escala em degraus

| Fase | Meta de jogadores | Portão para passar |
| --- | --- | --- |
| 1 | 2 a 10 numa masmorra ou arena | Partida completa sem dessincronizar e sem regra decidida no cliente |
| 2 | 100 por zona | Teste de carga com clientes simulados dentro da latência alvo |
| 3 | 10.000 simultâneos (meta de longo prazo) | Só é planejada depois da fase 2 aprovada |

### 8.3 Ajudante por elemento

O jogador escolhe um ajudante por elemento, que comenta a partida e responde perguntas.

| Elemento | Jeito de falar |
| --- | --- |
| Sobrenatural | Hostil e debochado; chama de burro e lerdo, sempre sobre a jogada |
| Folha | Calmo e lento, com pausas |
| Vento | Direto, uma frase curta |
| Amor | Positivo, elogia e encoraja |

- **Sem instalação:** falas prontas por evento (início, abate, vida baixa, morte, nível, parado) e dicas.
- **Com o OpenJarvis no computador do jogador:** conversa livre por IA local, sem custo de servidor. O jogo envia só o que o jogador vê (classe, vida, nível, inimigos próximos).
- **Limites:** o ajudante só fala; não ataca nem joga. O Sobrenatural nunca ofende a pessoa, só a jogada. Detalhes em `data/ajudantes.json`.

## 9. Pipeline da história

A história é escrita do zero e melhora em rodadas. Cada rodada pega um tópico do backlog e passa por quatro papéis fixos, e nada entra no cânone sem a sua aprovação.

&#91;embedded content: pipeline da história · 1 orquestrador, 4 papéis, você com veto\]

**Critérios de voto (sugestão):** coerência com o mito, interesse para o jogador, gancho para sistemas de jogo (missão, raça, zona), originalidade em relação à referência e custo de produção. O Questionador sempre checa se um nome ou trecho lembra demais o Forsaken World.

## 10. Roteiro de produção

O próximo marco concreto é um protótipo pequeno e jogável, não o jogo inteiro. Cada fase só começa quando a anterior passa no seu portão; as datas dependem do tamanho da equipe, ainda não definido.

&#91;embedded content: roteiro · 5 fases, 4 portões, sem datas\]

### 10.1 Equipe

A equipe de referência para o pico de produção tem 42 pessoas: direção 3, programação 14, arte 3D 8, design 5, QA 4, animação e efeitos 3, direção e gestão 3, interface 2, operações e comunidade 2, áudio 1. Ela não é contratada de uma vez. A ordem é:

1. Diretor técnico, programador sênior de multiplayer/backend e game designer principal.
2. Programadores de gameplay e de rede, para a fase 1 de escala.
3. Diretor de arte e artista técnico, depois do protótipo de rede aprovado.
4. O restante conforme cada portão do roteiro for aprovado.

Enquanto isso, os 42 cargos estão consolidados em **12 agentes de IA** em `.claude/agents/` (lista e cobertura no `CLAUDE.md`). Eles escrevem texto e código; nas áreas de arte, animação e áudio, entregam especificações, não os assets.

## 11. Decisões em aberto

- [ ] Nomes definitivos do jogo (nome de trabalho: **Goru**), do mundo, do panteão, das raças, das classes e do vilão
- [ ] Pipeline da história: agentes de IA, pessoas ou os dois
- [x] Plataforma: **PC**
- [x] Motor: **Godot 4.3**
- [x] Linguagem de script do cliente: **GDScript** (a do motor)
- [x] Visual: **3D completo** (custo de arte maior, aceito)
- [ ] Origem da arte: equipe própria, freelancers, pacotes licenciados ou geração com IA
- [x] Primeiro protótipo: **solo e offline** (rede fica para a fase seguinte)
- [ ] Linguagem e arquitetura do servidor
- [x] Modo offline e online: **personagens separados** (seção 8.1)
- [x] Escala: **em degraus**, de 2–10 jogadores até 10.000 (seção 8.2)
- [x] Fase 1: jogadores e inimigos não se empurram (RD-002), XP de grupo cheia para quem causou dano, arena PvP depois da fase 1
- [x] Ajudante: falas prontas para todos, conversa por IA opcional via OpenJarvis local, só fala e dá dicas (seção 8.3)
- [ ] Região de lançamento
- [ ] Autorização da Perfect World, se algum dado da referência for usado além de estudo
