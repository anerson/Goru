# Goru: capítulo 1 da campanha

> **Aprovado pelo dono do projeto em 15/10/2026:** mundo Goru; o Oleiro, a Friagem e os deuses Prumo, Seiva e Veio; a heroína Arminda; a vilã Odália; zona 1 "Capão do Sereno"; textos das 3 primeiras missões (seção 5). As 15 missões entram depois de itens, inventário e NPC. As propostas menores (seção 1.6) e os conflitos da seção 7 continuam em aberto.

Out 15, 2026 · `narrativa-missoes` · **PROPOSTA PARA APROVAÇÃO. Nada aqui é cânone.**

Faixa de nível 1 a 14 (seção 5 do documento de design: "origem da raça"). Escrito do zero para a zona 1 que existe hoje (`data/zona_1.json`: 10 Lobos Sombrios, 3 Carniçais, 6 obstáculos). Todo nome é provisório até o dono do projeto aprovar. Os textos aqui são cânone proposto; quando aprovados, os que o código usa vão para `data/missoes/*.json` (seção 6.1, item 3), e não para script.

---

## 1. Decisões grandes (pipeline da seção 9)

Critérios: **Coerência** com o mito, **Interesse** para o jogador, **Gancho** para sistemas (missão, raça, zona), **Originalidade** em relação à referência e a outros jogos, **Custo** de produção.

**Como verifiquei os nomes:** (1) comparei com os nomes do mito da referência que encontrei em resumos públicos: o mundo Eyrda, o criador Dyos, o irmão Nyos, os herdeiros Tytan, Illyfue e Vyda, a cria Mylvada, a deusa Shylia, as raças Kindred e Stonemen, e o marco da árvore gigante com uma roda de estrelas; (2) busquei cada nome recomendado na web com "game", "character" ou "fantasy"; (3) conferi de memória contra franquias grandes (Dark Souls, Hollow Knight, WoW, Tolkien, Fire Emblem, Marvel). Isso **não é busca de marca registrada**: antes do lançamento, os nomes finais precisam de consulta no INPI e no USPTO.

### 1.1 Nome do mundo

| Opção | Coerência | Interesse | Gancho | Originalidade | Custo |
| --- | --- | --- | --- | --- | --- |
| **A. Goru** (o nome que o Oleiro deu ao que moldou) | Boa: dá sentido ao título de trabalho. | Alto: jogo e mundo com o mesmo nome se memorizam juntos. | Fraco sozinho. | Som próximo de Gorou (nome japonês comum: Genshin Impact, Darling in the Franxx) e de Gorr (Marvel, "matador de deuses"). Sentido e grafia diferentes. Nada no mito da referência. | Zero. |
| B. Cinérea (cor de cinza) | Boa com a paleta cinzenta. | Médio. | Fraco. | Busca sem resultado como mundo de jogo. Mas "cinza" puxa Dark Souls (Ashen One) e o atual "Bosque das Cinzas". | Zero. |
| C. O Ermo | Boa: mundo cansado e vazio. | Baixo: palavra comum, some no texto. | Fraco. | Palavra comum, impossível de proteger; em inglês vira "the Wastes", genérico (Fallout). | Zero. |

**Recomendo A (Goru).** Se o jogo mudar de nome, o mundo pode continuar Goru.

### 1.2 Os três deuses herdeiros (ordem, vida, terra; seção 4)

| Opção | Coerência | Interesse | Gancho | Originalidade | Custo |
| --- | --- | --- | --- | --- | --- |
| **A. Prumo** (ordem), **Seiva** (vida), **Veio** (terra) | Alta: o criador é um oleiro; os filhos têm nome de ferramenta e de material. | Alto: o jogador entende o deus pelo nome, sem glossário. | Bom: templos e bênçãos de Fé (seção 6) ganham ícone óbvio (fio de prumo, gota, filão). | Busca sem resultado como deuses em jogo. Palavras do português, longe de Tytan/Illyfue/Vyda. | Baixo. Em inglês viram Plumb, Sap e Lode, e ainda funcionam. |
| B. o Juiz, a Parteira, o Mineiro | Boa. | Médio: títulos claros, mas frios. | Bom. | Alta, mas genéricos demais para virar marca. | Baixo. |
| C. Ostran, Ilvena, Tórrio (inventados) | Neutra: não dizem nada. | Baixo: o jogador precisa decorar. | Fraco. | **Risco:** "Ilvena" começa e soa como "Illyfue", a herdeira da vida na referência. Nomes inventados soltos colidem com mais facilidade. | Médio: exigem glossário. |

**Recomendo A.**

### 1.3 A heroína mortal que selou os deuses (patrona dos Imortais da noite)

| Opção | Coerência | Interesse | Gancho | Originalidade | Custo |
| --- | --- | --- | --- | --- | --- |
| **A. Arminda**, forneira que fechou a rachadura do céu com barro em brasa | Alta: liga o mito do oleiro, a cicatriz no céu e a pele de cerâmica rachada dos Imortais (guia de estilo, seção 4.3). | Alto: uma trabalhadora, não uma princesa. | Forte: patrona dos Imortais; os Três Ferros dela viram relíquias de capítulos futuros. | Busca: personagem de ópera (Mozart, *La finta giardiniera*) e de um jogo britânico obscuro de 1985. Nenhum mito de jogo atual. | Baixo. |
| B. Zana | Neutra. | Médio. | Médio. | É o nome de uma fada da montanha no folclore albanês. | Baixo. |
| C. Odila | Neutra. | Médio. | Médio. | Lembra Santa Odila e a Odile de *O Lago dos Cisnes*. | Baixo. |

**Recomendo A.**

### 1.4 O vilão ativo (capítulo 5, com sinais desde o capítulo 1)

| Opção | Coerência | Interesse | Gancho | Originalidade | Custo |
| --- | --- | --- | --- | --- | --- |
| **A. Odália**, a primeira Imortal, braço direito de Arminda. Quer reabrir o céu para que os Imortais possam morrer, mesmo que a Friagem volte junto. | Alta: nasce do selo e usa o caos que sobrou. | Alto: dá para entender o motivo dela. Combina com o pilar 2 (os monstros têm razões). | Forte: divide os Imortais (missões de facção), reúne os restos da Friagem e ameaça o selo, que é o marco visual do mundo. | Busca: nenhum vilão de jogo com esse nome. | Médio: precisa de modelo de chefe próprio no capítulo 5. |
| A'. O mesmo conceito com o nome **Severa** | Igual. | Igual. | Igual. | **Risco:** Severa é personagem de Fire Emblem Awakening, e há uma Severa Magia em Morrowind. Por isso troquei para Odália. | Igual. |
| B. Regente Amaro, humano que quer libertar Prumo para legitimar o próprio governo | Boa: usa o Vácuo (humanos dominam). | Médio: vilão político é comum. | Bom para PvP e política. | Sem colisão conhecida. | Baixo. |
| C. A Friagem com voz, sem líder de corpo | Boa. | Baixo: vilão sem rosto não gera diálogo. | Fraco para missões. | Média: "frio antigo que fala" é comum no gênero. | Baixo. |

**Recomendo A (Odália).** No capítulo 1, ela aparece só como um nome dito no fim.

### 1.5 Nome da zona 1

| Opção | Coerência | Interesse | Gancho | Originalidade | Custo |
| --- | --- | --- | --- | --- | --- |
| A. Bosque das Cinzas (o nome atual) | Fraca com o mito novo: nada queima ali. | Baixo: genérico. | Fraco. | **Risco:** é quase a tradução de "Ashwood" e lembra Ashenvale (WoW) e as cinzas de Dark Souls. | Zero: já está no `zona_1.json`. |
| **B. Capão do Sereno** | Alta: "sereno" é o frio úmido da noite, e é ali que a Friagem vaza. | Alto: soa brasileiro, e nenhum outro jogo tem esse nome. | Bom: o capão é a mata isolada que a zona já é. | Busca sem resultado (só há topônimos como Capão Bonito e Capão da Canoa). | Baixo: trocar `nome` no JSON quando aprovado. |
| C. Mata do Dedo | Boa: usa o pilar alto da zona. | Médio. | Médio. | Sem colisão conhecida. | Baixo. |

**Recomendo B.** Atenção: "capão" também quer dizer galo castrado. Alguém no chat vai fazer piada. Para mim, o risco é aceitável.

### 1.6 Propostas menores (também precisam de aprovação, sem rodada completa)

| Nome | O que é | Verificação |
| --- | --- | --- |
| **o Oleiro** | O criador. Não tem nome próprio. | O deus oleiro é mito de domínio público (Khnum, barro do Gênesis). Não é o Dyos da referência, que *encontra* o mundo. |
| **a Friagem** | A força do caos: o frio que sobe do fundo da névoa e racha o que foi cozido. | Palavra comum. Existe um jogo indie de terror chamado *Friagem* (Prisma Game Lab, itch.io). Risco baixo. Alternativa: "a Geada Funda". |
| **o Fundo** | O continente que a névoa engoliu na primeira guerra. | Palavra comum. Sem colisão. |
| **os Três Ferros** | As relíquias de Arminda: tenaz, espátula e atiçador do forno do Oleiro. | Sem colisão conhecida. |
| **lascas do céu** | Pedaços da cicatriz que se soltam e caem com luz fria. | Sem colisão conhecida. |
| **os Raspadores** | Gente paga para raspar lascas da cicatriz. | Sem colisão conhecida. |
| **as Vozes** | O que são os ajudantes por elemento: coisas que passaram pela rachadura antes de Arminda fechá-la e ficaram deste lado sem corpo. Por isso só falam. | Sem colisão conhecida. Explica no mito a regra "o ajudante só fala". |
| Mãe Dita, Bento, Zaíra, Ciro, Juca | Personagens do Pouso. | Nomes comuns em português. Zaíra lembra de longe a cidade "Zaira" de Calvino, sem problema. |

---

## 2. Mito em camadas (resumo, opções recomendadas)

**Criação.** No começo havia só névoa. O Oleiro tirou barro do fundo dela, moldou o chão, cozeu tudo no seu forno e chamou o que fez de Goru. O céu é a tampa do forno. A névoa ficou embaixo, onde sempre esteve.

**Herdeiros.** O Oleiro foi embora e deixou Goru para três filhos. **Prumo** mede e endireita: os Humanos são dele. **Seiva** faz crescer: o Povo da floresta é dela. **Veio** conhece o que corre dentro da pedra: o Povo da montanha é dele.

**Primeira guerra.** Da névoa subiu a **Friagem**, um frio que racha o que foi cozido. Ela partiu o chão ao meio, e o continente do **Fundo** afundou na névoa com tudo o que tinha. Os três deuses empurraram a Friagem de volta, mas o céu ficou com uma rachadura.

**Segunda guerra.** A Friagem voltou pela rachadura, e os deuses subiram para lutar lá dentro. A guerra no céu queimava as colheitas aqui embaixo. **Arminda**, uma forneira mortal, pegou os **Três Ferros** do Oleiro e fechou a rachadura com barro em brasa, deixando deuses e Friagem do outro lado. O remendo esfriou e virou a **cicatriz** de luz fria que atravessa o céu. Os soldados que seguraram o barro quente foram cozidos junto. Não morrem mais, e a pele deles racha e vaza a mesma luz da cicatriz: são os **Imortais da noite**, e Arminda é a patrona deles. Algumas coisas passaram pela rachadura antes de ela fechar e ficaram deste lado sem corpo. São as **Vozes**, os ajudantes do jogador. Só conseguem falar.

**Vácuo.** Sem deuses, os Humanos de Prumo, que são muitos e organizados, tomaram as estradas e as cidades. O Povo da floresta se fechou nas matas, o Povo da montanha vende para quem pagar, os Imortais vivem afastados e os Ferais são aceitos quando alguém precisa deles.

**Vilão ativo.** **Odália**, a primeira Imortal, está cansada de não morrer. Ela quer reabrir o céu, porque só uma nova rachadura deixaria os seus descansarem. Para isso, paga Raspadores e junta o que restou da Friagem. Se ela conseguir, os deuses voltam, e a Friagem volta com eles.

**Expansões.** Cada lasca que cai abre uma frente nova: uma zona onde a Friagem vazou, uma raça que estava no Fundo (a raça de expansão), um Ferro perdido.

---

## 3. Enredo do capítulo 1: "O céu está descascando"

A zona inteira fica embaixo do ponto mais baixo da cicatriz. Nomes propostos para os pontos que já existem em `data/zona_1.json`:

| Ponto | Coordenadas | O que é |
| --- | --- | --- |
| Pouso do Sereno | (0, 0) | Acampamento inicial. Mãe Dita e Bento ficam aqui. |
| Marco do Pouso | (6, -4), pilar de 5 m | Pilar velho onde os viajantes deixam recado. |
| Pedra Partida | (-7, 5) | Rocha rachada pelo frio. |
| Mureta da Zaíra | (18, 2) | Muro baixo onde Zaíra estuda as lascas. |
| Dedo de Pedra | (-18, -20), pilar de 7 m | A coluna mais alta. Do topo, quase se alcança a cicatriz. |
| Cerca Caída | (4, -22) | Muro baixo derrubado. Ciro dormia aqui. |
| Muro Velho | (-25, 0) | Muro comprido de antes das guerras. |
| Clareira do Dedo | (-6, -30) | 3 lobos e um Carniçal (o Juca). |
| Valão Leste | (27, -8) | 3 lobos e um Carniçal. |
| Covas do Sul | (14, 27) | Cemitério velho. 2 lobos e um Carniçal. |
| Matilha do Muro | (-24, 19) | 3 lobos. Um deles é o Focinho Branco. |

**Passos:**

0. **Por que você veio (vaga por raça).** Cada raça chega ao Pouso por um motivo próprio, com uma missão de abertura que muda conforme a raça. Humanos: vieram cobrar o imposto de Prumo de um pouso que parou de pagar. Povo da floresta: as árvores do capão estão morrendo do topo para baixo. Povo da montanha: lasca do céu vale mais que prata para quem sabe vender. Imortais: as rachaduras do corpo doem quando cai lasca, e esta semana doeram muito. Ferais: os lobos do capão são parentes distantes que perderam o juízo. Enquanto não houver raças, o jogador só chega.
1. **O Pouso.** Mãe Dita conta que, duas noites atrás, um pedaço do céu caiu no capão. Desde então os lobos atacam perto do fogo e ninguém dorme.
2. **A lasca.** No Dedo de Pedra, o jogador acha o chão rachado e gelado. Alguém já levou a maior parte da lasca.
3. **Olho branco.** Os Lobos Sombrios comeram fragmentos e agora têm olhos de luz fria. Não fogem do fogo. Bento pede ajuda.
4. **A voz ouve.** Zaíra estuda as lascas. Ela pede ao jogador que deixe o ajudante guiá-lo até uma lasca escondida. Ao achar, o jogador vê a borda reta: **ela foi cortada, não caiu.**
5. **Os mortos.** Onde a lasca toca uma cova, o morto levanta, porque a luz que impede os Imortais de morrer também impede os mortos de terminar de morrer. São os Carniçais. O primeiro é o Juca, que cavava poços para o Pouso.
6. **As covas abertas.** No cemitério do sul, as covas foram abertas por dentro, e há pegadas de bota de gente viva indo embora. Bento some no leste, volta ferido, e o lobo que o atacou é caçado.
7. **Ciro.** O aprendiz de Zaíra sumiu na noite da lasca. A bolsa dele, deixada na Cerca Caída, tem raspador de ferro e moeda estrangeira. Ele foi trabalhar para alguém.
8. **A Toca dos Raspadores** (masmorra de tutorial em grupo). Embaixo do Dedo de Pedra, os Raspadores guardam as lascas que tiraram do céu. Os jogadores vencem o chefe e encontram Ciro.
9. **O nome.** Ciro conta quem paga: Odália. Nenhum personagem do Pouso sabe quem ela é. Os Imortais (quando houver raças) sabem, e se calam. Fim do capítulo: habilidade racial (missão 15) e primeira montaria.

---

## 4. Missões do capítulo 1

15 missões. Matar: 3 de 15 (20%, abaixo do limite de 30%). Tipos: conversa 3, explorar 3 (uma delas com o ajudante), matar 3, coletar 2, entregar 2, escoltar 1, instância 1.

| # | Título | Tipo | Quem dá | Objetivo |
| --- | --- | --- | --- | --- |
| 1 | Fogo aceso | conversa | Mãe Dita | Falar com Mãe Dita no Pouso. |
| 2 | O Dedo de Pedra | explorar | Mãe Dita | Chegar ao Dedo de Pedra. |
| 3 | Olho branco | matar | Bento | Matar 5 Lobos Sombrios. |
| 4 | Lascas no mato | coletar | Zaíra | Pegar 4 lascas pequenas perto das ruínas. |
| 5 | Pote fechado | entregar | Zaíra | Levar uma lasca num pote até Mãe Dita. |
| 6 | O que a Voz ouve | explorar (ajudante) | Zaíra | Achar a lasca escondida seguindo só as falas do ajudante. |
| 7 | O poceiro | matar | Mãe Dita | Matar o Carniçal da Clareira do Dedo. |
| 8 | Covas do Sul | explorar | Mãe Dita | Examinar 3 covas abertas no cemitério. |
| 9 | Virotes no caminho | coletar | Mãe Dita | Seguir os 3 virotes de Bento até o Valão Leste. |
| 10 | Perna ruim | escoltar | Bento | Levar Bento do Valão Leste até o Pouso. |
| 11 | Focinho Branco | matar | Bento | Matar o Focinho Branco e os 2 lobos da Matilha do Muro. |
| 12 | A bolsa do Ciro | entregar | Zaíra | Achar a bolsa na Cerca Caída e levar até Zaíra. |
| 13 | Quem paga pelo céu | conversa | Mãe Dita | Ouvir Dita, Zaíra e Bento no fogo. |
| 14 | A Toca dos Raspadores | instância | Zaíra | Vencer a toca e encontrar Ciro. |
| 15 | O que a sua gente deixou | conversa (por raça) | NPC da raça | Receber a habilidade racial. |

### Textos

**1. Fogo aceso** (conversa)
- Entrega: "Chegou numa semana ruim. Caiu um pedaço do céu anteontem, ali pro norte. Senta, come alguma coisa, e depois eu te digo onde ajudar."
- Conclusão: "Comeu? Então escuta. Ninguém aqui dorme direito desde que o céu soltou aquele pedaço."

**2. O Dedo de Pedra** (explorar)
- Entrega: "A lasca caiu perto do Dedo de Pedra, aquela coluna alta no noroeste. Vai lá e me diz o que viu. Não toca em nada que brilhe."
- Conclusão: "Chão rachado e gelado no meio do mato? É lasca, sim. Pelo rastro, alguém já levou a maior parte."

**3. Olho branco** (matar)
- Entrega: "Os lobos comeram lasca. Agora têm olho branco e não fogem de fogo. Derruba cinco antes que cheguem nas cabras."
- Conclusão: "Viu os olhos? Continuam acesos depois de mortos. Isso não é coisa de bicho."

**4. Lascas no mato** (coletar)
- Entrega: "Lasca pequena some em dois dias. Antes disso, eu preciso de quatro. Procura perto das pedras velhas: a luz gruda em pedra."
- Conclusão: "Quatro, e ainda frias. Esfrega as mãos. Quem segura lasca muito tempo fica com os dedos dormentes."

**5. Pote fechado** (entregar)
- Entrega: "Leva esta, num pote fechado, para a Dita. Ela só acredita no que vê. Não abre no caminho."
- Conclusão (Dita): "Fria como água de poço. Tá bom, a Zaíra ganhou. Ninguém sai do Pouso depois do escuro."

**6. O que a Voz ouve** (explorar com o ajudante)
- Entrega: "Tem uma lasca grande escondida perto do Muro Velho. Eu sinto o frio, mas não acho. Essa voz que anda com você ouve o que a gente não ouve. Deixa ela te guiar."
- Conclusão (Zaíra): "Olha a borda. Lasca que cai quebra torta, e esta foi cortada reto. Alguém está raspando o céu."
- Ver detalhes na seção 4.1.

**7. O poceiro** (matar)
- Entrega: "Tem um morto andando perto do Dedo. É o Juca, que cavava poço para nós. A lasca caiu na cova dele. Deita ele de novo, por favor."
- Conclusão: "Obrigada. Amanhã a gente enterra o Juca longe de qualquer luz."

**8. Covas do Sul** (explorar)
- Entrega: "O cemitério velho fica no sul. Se o Juca levantou, outros podem ter levantado. Vai ver quantas covas estão abertas."
- Conclusão: "Três abertas, e todas por dentro. E pegadas de bota indo embora. Morto não usa bota."

**9. Virotes no caminho** (coletar)
- Entrega: "O Bento foi pro leste ontem e não voltou. Ele sempre espeta um virote no chão quando muda de rumo. Segue os virotes."
- Conclusão (Bento): "Achou meus virotes e me achou. Bom. Minha perna é que não está boa."

**10. Perna ruim** (escoltar)
- Entrega: "Não consigo correr. Anda do meu lado até o Pouso e segura os lobos. Se eu cair, me levanta."
- Conclusão (Dita): "Trouxe ele inteiro. Quase. Senta aí, Bento, e para de reclamar."

**11. Focinho Branco** (matar)
- Entrega: "O lobo que me pegou tem o focinho branco. Anda com mais dois perto do Muro Velho. Sem ele, os outros perdem a coragem."
- Conclusão: "Focinho Branco no chão. Hoje eu durmo."

**12. A bolsa do Ciro** (entregar)
- Entrega: "Meu aprendiz, o Ciro, sumiu na noite da lasca. Ele dormia na Cerca Caída. Se achar qualquer coisa dele, me traz."
- Conclusão: "Raspador de ferro, luva grossa e moeda que não é daqui. Ele não sumiu. Foi trabalhar para alguém."

**13. Quem paga pelo céu** (conversa)
- Entrega (Dita): "Chega perto do fogo. Bento, Zaíra, você também. Vamos juntar o que cada um viu."
- Conclusão (Bento): "As pegadas das covas e as do Ciro vão para o mesmo buraco, embaixo do Dedo. Sozinho, ninguém volta de lá. Chama mais gente."

**14. A Toca dos Raspadores** (instância, tutorial em grupo)
- Entrega: "Traz o Ciro de volta. Vivo, se der. Se ele não quiser vir, traz pelo menos o que ele sabe."
- Conclusão (Ciro): "Ela paga em moeda fria. Diz que, se o céu abrir de novo, quem não consegue morrer finalmente descansa. O nome dela é Odália."
- Formato: 2 a 5 jogadores no online (fase 1 de escala). O personagem offline faz uma versão solo com menos inimigos, porque não entra em grupo (seção 8.1). Chefe: **o Juntado**, um Carniçal feito de vários mortos, que reaproveita o modelo do Carniçal com escala maior e outra cor (guia de estilo, seção 7). Ele dá o primeiro golpe telegrafado do jogo.
- Recompensa sugerida: Bento empresta a mula **Teimosa**, a primeira montaria, montável a partir do nível 15 (ver seção 7, ponto 1).

**15. O que a sua gente deixou** (conversa, um texto por raça)
- Molde da entrega: "[NPC da raça] Você viu a lasca, viu os mortos e ouviu o nome. Então já pode carregar isto."
- Molde da conclusão: "[NPC da raça] Agora é seu. Use antes que alguém precise."
- Escrever as cinco versões quando as raças forem aprovadas. Cada uma entrega a habilidade racial (seção 4).

### 4.1 A missão do ajudante: "O que a Voz ouve"

Só o Goru tem isto: o jogador acha uma coisa **sem marcador no mapa**, guiado apenas pelas falas do ajudante. Cada elemento guia do seu jeito. O ajudante **só fala**: não mostra seta, não move o personagem e não pega a lasca. Quem anda e quem pega é o jogador.

- **Lógica:** a missão cria um ponto escondido (sugestão: atrás do Muro Velho, por volta de (-28, 6)). A cada poucos segundos, o jogo calcula uma faixa de distância (frio, morno, quente) e um lado (frente, esquerda, direita, atrás) e dispara uma fala do ajudante. No online, o servidor calcula a faixa e decide quando a missão termina. O cliente só recebe a faixa, nunca a coordenada.
- **Sem OpenJarvis:** usa as falas prontas abaixo, com `{lado}` trocado pela palavra.
- **Com OpenJarvis:** o estado enviado à IA ganha só a linha "lasca escondida: {faixa}, {lado}". Assim, o jogador pode perguntar "pra onde?" e o ajudante responde no seu jeito. A IA nunca recebe a posição.

| Elemento | Frio | Morno | Quente | Achou |
| --- | --- | --- | --- | --- |
| Sobrenatural | "Frio. Gelado igual sua pontaria. Tenta pela {lado}." | "Morno. Até você está chegando perto." | "Quente! Olha pro chão, gênio." | "Achou. Agora olha a borda, lerdo: isso foi cortado." |
| Folha | "Ainda longe... o frio vem da {lado}." | "Mais perto... sinta o chão esfriar." | "Aqui... bem aqui, junto da pedra." | "Veja a borda... reta demais. Mão de gente fez isso." |
| Vento | "Frio. {lado}." | "Morno. Segue." | "Quente. Para." | "Cortada. Não caiu." |
| Amor | "Ainda está frio, mas a gente acha! Vai pela {lado}." | "Esquentou! Você está no caminho certo!" | "Está quentíssimo, é aqui!" | "Você achou! Mas olha a borda... alguém cortou isso." |

As falas da coluna "frio" com `{lado}` pedem "pela esquerda", "pela direita" etc. O `programador-gameplay` decide se a palavra vem com o artigo. Quando aprovadas, essas falas vão para `data/` (não sou eu quem edita agora).

### 4.2 Descrições dos inimigos atuais (para o quadro do alvo ou o bestiário)

- **Lobo Sombrio:** "Comeu lasca do céu. Os olhos brilham frios e ele já não tem medo de fogo."
- **Carniçal:** "Morto que a luz da lasca não deixa terminar de morrer. Anda torto e bate pesado."
- **Focinho Branco** (variante do lobo, mesmo modelo): "Líder da matilha. Foi quem pegou o Bento."
- **O Juntado** (variante do carniçal): "Vários mortos que a lasca colou num só. Avisa antes de bater, e bate forte."

---

## 5. Reescrita das 3 primeiras missões (para o `programador-gameplay`)

Os textos abaixo servem para qualquer formato de chave que ele escolher. Os ids são só sugestão. Se o ponto de explorar escolhido não for o Dedo de Pedra, troque pelo nome do ponto na tabela da seção 3. A quantidade de lobos é a que estiver na tabela (sugestão: 5).

**`c1_dedo_de_pedra`, explorar**
- Título: O Dedo de Pedra
- Rastreador: "Vá até o Dedo de Pedra."
- Entrega (Mãe Dita): "A lasca caiu perto do Dedo de Pedra, aquela coluna alta no noroeste. Vai lá e me diz o que viu. Não toca em nada que brilhe."
- Conclusão: "Chão rachado e gelado no meio do mato? É lasca, sim. Pelo rastro, alguém já levou a maior parte."
- Ponto sugerido: (-18, 0, -20), raio de 4 m.

**`c1_olho_branco`, matar Lobos Sombrios**
- Título: Olho branco
- Rastreador: "Lobos Sombrios: {atual}/{total}"
- Entrega (Bento): "Os lobos comeram lasca. Agora têm olho branco e não fogem de fogo. Derruba {total} antes que cheguem nas cabras."
- Conclusão: "Viu os olhos? Continuam acesos depois de mortos. Isso não é coisa de bicho."

**`c1_o_poceiro`, matar o Carniçal**
- Título: O poceiro
- Rastreador: "Deite o Carniçal perto do Dedo de Pedra."
- Entrega (Mãe Dita): "Tem um morto andando perto do Dedo. É o Juca, que cavava poço para nós. A lasca caiu na cova dele. Deita ele de novo, por favor."
- Conclusão: "Obrigada. Amanhã a gente enterra o Juca longe de qualquer luz."
- Se a missão aceitar qualquer Carniçal da zona, troque o rastreador por "Deite um Carniçal." e mantenha os textos: o Juca vira "um dos mortos".

Enquanto os NPCs não existirem no protótipo, a entrega pode aparecer como texto na tela e a conclusão, como balão ao completar.

---

## 6. Riscos de originalidade encontrados e o que evitei

1. **A camada "Criação" do próprio documento de design** ("uma árvore, um céu de estrelas") repete o marco central da referência: a árvore gigante que liga céu e terra, com a roda de estrelas no topo. Evitei os dois. O marco do Goru é o forno do Oleiro e a cicatriz no céu. **Sugiro atualizar a tabela da seção 3**. Quem decide é o dono do projeto, e eu não editei o documento.
2. **Dark Souls.** Minha primeira versão tinha uma "Primeira Brasa" como fonte do mundo, uma fogueira central com guardiã e mortos-vivos ligados ao fogo. Isso é a Chama Original, o santuário com a Guardiã do Fogo e a maldição dos mortos-vivos. Troquei a chama por um forno de oleiro e liguei o não-morrer à luz fria da cicatriz, e não ao fogo. Mãe Dita é dona do Pouso, não guarda fogo nenhum. A brasa continua só na paleta (guia de estilo).
3. **Hollow Knight / Silksong.** Uma versão tinha um vilão-traça, um selo costurado com agulha e "luz pálida" como poder. Juntos, isso remete a Hollow Knight (tribo das mariposas, Rei Pálido, selos) e a Silksong (agulha, seda, tecelãs). Tirei traças, agulha e costura. O selo é barro em brasa. "Luz fria" substitui "luz pálida" nos textos.
4. **Kill la Kill** (fios e tesoura gigante): evitei nomes com "Tesoura" e "Fio" pelo mesmo motivo. A masmorra é dos Raspadores, não da Tesoura.
5. **Bosque das Cinzas** (nome atual da zona) é praticamente "Ashwood" e lembra Ashenvale (WoW). Proponho trocar.
6. **Severa**, opção de nome da vilã, é personagem de Fire Emblem. Troquei por Odália.
7. **Ilvena** (opção C dos herdeiros) soa como Illyfue, a herdeira da referência. Descartada.
8. **Heroína patrona de imortais.** A estrutura vem do documento e é permitida. Para não lembrar o povo vampiro da referência, os Imortais do Goru não têm sangue, mordida nem sede. Eles são barro cozido que racha.
9. **"Lobo Sombrio" e "Carniçal"** são nomes genéricos do gênero (shadow wolf, ghoul). Risco baixo. Mantive.
10. **O que não fiz:** não li nenhum texto de missão da referência, e nenhuma frase aqui foi adaptada de outro jogo. As buscas foram feitas só em resumos públicos do mito, para saber o que evitar.

---

## 7. Conflitos encontrados nos documentos (para o `diretor-do-jogo`)

1. **Montaria:** a seção 5 põe a "primeira montaria" na faixa 1 a 14, mas as seções 6 e 6.1 (item 4) põem a montaria no nível 15. Aqui, ela é ganha no fim do capítulo e só pode ser usada a partir do nível 15.
2. **Deusa da lua dos Ferais × céu sem lua grande:** o guia de estilo (5.2) põe a cicatriz "no lugar de luas grandes", e as marcas dos Ferais "reagem à lua" (4.3). Opções: uma lua pequena que só aparece em certas noites, ou as marcas reagem à cicatriz e a patrona deles passa a ser outra figura. Fica para o capítulo dos Ferais.
3. **Patronos:** nesta proposta, as raças da floresta, da montanha e os Humanos ficam com os três herdeiros, os Imortais com Arminda e os Ferais em aberto. Isso fecha com a tabela da seção 4.
