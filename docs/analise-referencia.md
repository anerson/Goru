# Goru: análise das capturas de referência

Out 14, 2026 · análise de 5 capturas do jogo de referência enviadas pelo dono do projeto. As imagens não entram no repositório. Esta análise extrai **estruturas de sistema e de interface**, que são padrão do gênero; nomes, arte, textos e números da referência continuam proibidos (seção 1 do documento de design). O lado visual está em `docs/guia-de-estilo.md`.

## 1. O que as capturas mostram

| Captura | O que aparece | Sistema por trás |
| --- | --- | --- |
| Personagens parados na cidade | Retrato com vida e mana; retrato do colega de grupo; retrato do mascote com barras; ícones de efeitos ativos; lista de 20 missões à direita; chat global com "procuro tanque para masmorra"; duas barras de habilidades; minimapa com nome da zona; menu de ícones no topo | Grupo, mascote de combate, efeitos, rastreador de missões, procura de grupo pelo chat |
| Criação de personagem | Lista de 5 raças com retrato à esquerda; botão de sexo; 3 ícones de classe por raça; texto da classe com dificuldade em estrelas; cenário de fundo da raça escolhida | Raça restringe classe (já está na seção 4); dificuldade da classe visível na escolha |
| Personagem com harpa | Habilidade com círculo mágico enorme e brilhante | Fantasia de classe pelo objeto (instrumento = classe de suporte) e efeito grande para habilidade importante |
| Combate no campo | Quadro do alvo no topo, com nome e vida; números de dano flutuantes; inimigos montados; explosão de fogo; título acima do jogador | Alvo selecionado, leitura do dano, inimigos com montaria, títulos |
| Acampamento com NPCs | NPCs com marcador de missão; caixa de correio; aviso "nova habilidade disponível"; mensagens de XP no chat; minimapa | Centro de missões, correio entre jogadores, tutorial por aviso, registro de eventos |

## 2. Comparação com o Goru hoje

| Sistema | Na referência | No Goru | Já está no design? |
| --- | --- | --- | --- |
| Vida e barra de habilidades | Sim | Vida, XP e 2 habilidades em texto | Sim |
| Quadro do alvo | Sim, no topo | Não (só rótulo sobre o inimigo) | Não; **falta** |
| Números de dano | Sim | Sim | Sim |
| Grupo (retratos dos colegas) | Sim | Não | Implícito na masmorra de grupo; **falta a interface** |
| Procura de grupo | Pelo chat global, manual | Não | Não; **falta** (oportunidade de fazer melhor) |
| Rastreador de missões | Lista lateral com contadores | Não há missões | Campanha e diárias (seção 5), sem interface definida |
| Mascote de combate com barras | Sim | Não | Sim, nível 20 (seção 6) |
| Domar e alimentar mascote | Missão de "dieta" com tempo | Não | Doma como ofício (seção 2, pilar 5) |
| Montaria e asas | Inimigos montados; ornamento nas costas | Não | Sim, nível 15 (seção 6) |
| Títulos acima do nome | Sim | Não | Não; **falta** (barato e bom para ranking e conquistas) |
| Correio | Caixa no acampamento | Não | Não; **falta** (depende do online) |
| Chat por canais | Global, próximo | Não (só o ajudante) | Não; **falta** para o online |
| Criação com raça, sexo e dificuldade | Sim | Só a classe | Raças sim; dificuldade **falta** |
| Tutorial por avisos | "Nova habilidade disponível" | Só a linha de ajuda no topo | Não; o ajudante pode cumprir esse papel |
| Minimapa | Sim | Não | Não; **falta** |

## 3. Lições de design

1. **A interface carrega o MMO.** A captura da cidade tem pelo menos 10 sistemas visíveis ao mesmo tempo. O jogador entende que o jogo é grande pela HUD, antes de ver qualquer conteúdo. O Goru hoje mostra 4 informações.
2. **O risco oposto é real.** A mesma captura mostra 20 missões, duas barras de habilidades e 15 ícones de menu: é a poluição típica do gênero. Regra para o Goru: cada elemento novo da HUD precisa de um motivo, e o que não é usado em combate fica escondido até ser pedido.
3. **A procura de grupo pelo chat é um sintoma.** "Procuro tanque para masmorra" no chat global significa que o jogo não resolveu o problema. O Goru tem a fase 1 inteira baseada em masmorra de grupo: precisa de uma fila de grupo simples (papel + masmorra), não de chat.
4. **O ajudante do Goru já é um diferencial contra a referência.** O aviso "nova habilidade disponível" é um texto seco. No Goru, o ajudante pode dizer isso no jeito do elemento escolhido, e explicar a habilidade. É o tutorial com personalidade.
5. **Dificuldade da classe na criação** é uma informação barata que reduz abandono: quem começa numa classe difícil e se frustra sai do jogo.
6. **Fantasia de classe vem do objeto e do efeito.** A classe de suporte com instrumento e o círculo mágico gigante comunicam o papel sem texto. Para o Goru: cada classe precisa de um objeto-símbolo e de uma habilidade "de cartaz" com efeito grande, e o resto dos efeitos fica discreto para o combate em grupo continuar legível.
7. **Mascote com barras próprias** significa que o mascote é um segundo personagem para cuidar. Isso aumenta muito o trabalho de rede e de interface; no Goru fica para depois do nível 20, como já está na seção 6.

## 4. O que entra e quando

| Item | Fase | Responsável | Motivo |
| --- | --- | --- | --- |
| Quadro do alvo (nome, vida, nível) | Agora, depois do passo 3 do bloco A | `ui-ux` | Barato; melhora o combate já no protótipo |
| Barra de habilidades com ícones e recarga visual | Agora, depois do passo 3 | `ui-ux` | Substitui o texto atual |
| Minimapa simples | Fase 1 | `ui-ux` | Masmorra de grupo precisa de orientação |
| Retratos do grupo | Fase 1 (bloco B) | `ui-ux` + `engenheiro-rede-backend` | Sem isso não há jogo em grupo |
| Fila de grupo por papel | Fase 1, no fim ou fase 2 | `game-designer` + `engenheiro-rede-backend` | Resolve o problema que a referência deixa para o chat |
| Dificuldade da classe na escolha | Agora | `game-designer` (campo em `data/classes.json`) + `ui-ux` | Uma linha de dado e um texto |
| Ajudante avisa habilidade nova e explica sistemas | Quando houver habilidades por nível | `game-designer` + `narrativa-missoes` | Tutorial com personalidade |
| Centro de missões com NPCs e rastreador | Fase 2 | `narrativa-missoes` + `programador-gameplay` + `ui-ux` | Precisa da campanha escrita (seção 9) |
| Chat por canais | Fase 2 | `engenheiro-rede-backend` + `devops-seguranca` | Exige moderação e anti-spam |
| Títulos | Fase 2 | `game-designer` | Barato, alimenta ranking e conquistas |
| Correio, mascote, montaria, asas | Depois da fase 2 | vários | Já estão na seção 6; dependem do online e de arte |

## 5. O que o Goru não deve copiar

- Nenhum nome, texto de missão, ícone, retrato, figurino, criatura, cenário ou efeito específico das capturas.
- A quantidade de elementos na tela: o Goru começa enxuto e cresce só com motivo.
- Procura de grupo pelo chat como solução.
- Missões de matar 20 da mesma coisa como base do conteúdo: aparecem na lista da referência e são o tipo de missão que o gênero inteiro já cansou.
