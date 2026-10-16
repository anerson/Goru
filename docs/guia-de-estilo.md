# Goru: guia de estilo visual

Versão 0.1 · área de arte e áudio. Vale para personagens, ambientes, efeitos, HUD e placeholders. Quando este guia e o `documento-de-design.md` discordarem, o documento vence.

## 1. O que a referência acerta e o que o Goru faz diferente

O dono do projeto mostrou capturas da referência citada na seção 1 do documento. Elas servem para entender **por que** agradam, nunca como modelo. Nenhum personagem, figurino, criatura, cenário, logotipo ou ícone dela é descrito aqui para ser reproduzido.

**O que funciona, em termos gerais:**

| Princípio | Por que agrada |
| --- | --- |
| Saturação alta em pontos focais | O olho vai direto para o personagem e para a magia, mesmo com cenário cheio. |
| Contraste de valor entre figura e fundo | Personagens claros sobre cenário escuro (noite, mata fechada) se leem de longe. |
| Silhuetas grandes na cabeça e nos ombros | O topo do corpo é o que a câmera em terceira pessoa mais mostra. |
| Efeitos que brilham e somem rápido | Dão sensação de poder sem esconder o combate por muito tempo. |
| Céu noturno ou de crepúsculo | Esconde a pouca resolução do fundo e deixa os efeitos brilharem. |
| HUD nos cantos, centro livre | Convenção do gênero: vida no canto superior esquerdo, habilidades embaixo no centro, mapa no canto superior direito. |

**O que o Goru faz diferente (identidade própria):**

- **Sombrio de verdade, não noturno-bonito.** A referência é colorida e festiva mesmo à noite. O Goru tem mundo dessaturado e cansado; a cor saturada é rara e significa algo (magia, perigo, vida).
- **Peso em vez de elegância.** A referência usa corpos longos e finos com figurinos ornamentados. O Goru usa corpos robustos, mãos e pés grandes, roupa funcional e gasta. Pouco ornamento, muito volume.
- **Monstros com carisma.** Raças "monstruosas" jogáveis (seção 2, pilar 2) são feias de um jeito simpático: deformidades legíveis, expressão forte. Nada de "humano bonito com orelha diferente".
- **Brasa contra névoa.** A dupla de luz do Goru é **brasa quente** (âmbar, laranja) contra **névoa fria e cinzenta**. O violeta e o azul elétrico, dominantes na referência, ficam restritos a um único elemento (Sobrenatural) e nunca dominam a tela.
- **HUD discreta.** Painéis finos e escuros, sem molduras douradas nem pedras preciosas.

## 2. Pilares visuais

1. **Forma antes de detalhe:** todo personagem e inimigo é reconhecível só pela silhueta preta, a 64 px de altura.
2. **Cor é informação:** o mundo é cinza-terroso; cor saturada aparece só onde o jogador precisa olhar.
3. **Brasa contra névoa:** luz quente marca caminho e abrigo; luz fria ou carmesim marca perigo e corrupção.
4. **Usado, não novo:** armas lascadas, tecidos remendados, pedra rachada; o mundo sobreviveu à queda dos deuses.
5. **Barato por desenho:** poucos materiais, peças modulares e troca de cor por máscara; se um asset não pode ser reaproveitado, precisa de justificativa.

## 3. Paleta

**Regra de proporção:** cerca de 70% da tela em tons neutros do mundo, 20% em tons médios de material, 10% ou menos em cor saturada (efeitos, interativos, ajudante, HUD de alerta).

### 3.1 Cores-base do mundo

| Nome | Hex | Uso |
| --- | --- | --- |
| Carvão | `#1E1B22` | Sombras, fundo de painéis, troncos ao longe |
| Ardósia | `#4A4652` | Pedra de ruínas, rochas |
| Cinza-névoa | `#8A8790` | Névoa, distância, poeira |
| Musgo-escuro | `#3E4A32` | Vegetação, chão de mata |
| Terra-queimada | `#5A4636` | Chão batido, madeira velha |
| Couro | `#6E4A33` | Correias, bolsas, botas |
| Ferro-velho | `#6B6F75` | Metal de armaduras e ferramentas |
| Osso | `#D8CCB0` | Ossos, pergaminho, luz refletida em rostos |
| Brasa | `#E8813A` | Cor de assinatura do mundo: fogo, lanternas, caminho seguro |
| Carmesim-corrupção | `#8E1F2E` | Corrupção do caos, sangue, zonas hostis |

### 3.2 Céu e luz (crepúsculo de cinzas)

| Nome | Hex | Uso |
| --- | --- | --- |
| Céu alto | `#211C2E` | Topo do céu |
| Horizonte | `#7A5A58` | Faixa de horizonte, cor da névoa ao longe |
| Luz do sol baixo | `#F0B887` | `DirectionalLight3D`, energia baixa (0,6 a 0,9) |
| Ambiente | `#4C5566` | Luz ambiente fria, para as sombras não ficarem pretas |

### 3.3 Assinatura dos 4 elementos do ajudante

O ajudante só fala; ele não tem efeitos de combate. Por isso sua cor vive na HUD (borda do balão, nome) e numa pequena luz flutuante ao lado do jogador. Mesmo assim, cada cor deve se distinguir dos efeitos de combate da seção 5.3.

| Elemento | Atual em `data/ajudantes.json` | Proposta | Hex | Array para o JSON | Motivo |
| --- | --- | --- | --- | --- | --- |
| Sobrenatural | `#9E59E6` | manter | `#9E59E6` | `[0.62, 0.35, 0.9]` | Único elemento com direito ao violeta. |
| Folha | `#66CC66` | ajustar | `#9DBE4B` | `[0.62, 0.75, 0.29]` | O verde puro atual é igual ao texto de cura; o verde-musgo amarelado separa os dois. |
| Vento | `#8CD9FF` | ajustar | `#B9D3DC` | `[0.73, 0.83, 0.86]` | Ciano saturado colide com efeitos de gelo e controle; prata-azulado combina com a fala seca do Vento. |
| Amor | `#FF80B3` | ajustar levemente | `#F2789A` | `[0.95, 0.47, 0.6]` | Rosa-coral mais quente, conversa com a brasa do mundo. |

Os ajustes já foram aplicados em `data/ajudantes.json`.

## 4. Personagens

### 4.1 Proporção e estilização

- **Altura de cabeça:** 6 cabeças para raças de porte médio (a referência e o realismo usam 7 a 8). Cabeça um pouco maior lê melhor na câmera de terceira pessoa.
- **Exagero:** mãos, pés, ombros e armas 15% a 25% maiores que o realista. Cintura e pulsos finos para contrastar.
- **Estilização:** formas grandes e chanfradas, poucas dobras. Detalhe pintado na textura (luz de cima, sujeira embaixo), não esculpido na malha.
- **Rosto:** traços simples e expressivos, olhos legíveis a distância. Nada de rosto realista nem de traço de anime.
- **Figurino:** funcional e em camadas: tecido grosso, couro, placas de metal soltas, amarras. Peças assimétricas (uma ombreira, uma manga) em vez de simetria ornamental. Proibido acessório flutuante sem apoio físico (asas de enfeite, auréolas, fitas voando), exceto em efeitos de habilidade.
- **Materiais:** sem metal espelhado. Metal fosco com borda clara pintada; tecido e couro com rugosidade alta (0,8 a 0,95). Emissivo só em olhos, runas e pontos de magia.

### 4.2 Silhueta por papel

| Papel | Classes | Forma dominante | Regras |
| --- | --- | --- | --- |
| Tanque | Guerreiro, Guardião | Quadrado / trapézio largo em cima | Ombros largos, escudo ou arma pesada, base firme. Topo da silhueta mais largo que o quadril. |
| Cura e suporte | Curandeiro, Menestrel | Vertical alongado | Roupa longa até o chão, objeto vertical (cajado, instrumento) acima da cabeça; ponto de luz quente no topo. |
| Dano à distância | Caçador, Atirador | Triângulo estreito, assimétrico | Capuz ou chapéu, capa curta de um lado, arma na horizontal que quebra a silhueta. |
| Controle e área | Mago | Losango / sino | Mangas e barra largas, mãos sempre visíveis (é delas que sai a magia). |
| Dano direto corpo a corpo | Assassino, Ceifador | Curvas baixas | Postura curvada, armas curtas ou em gancho, pouca roupa solta. |

Teste obrigatório: preencher o modelo de preto, reduzir para 64 px e conferir se o papel é identificável sem cor.

### 4.3 Diferença visual entre as raças (nomes provisórios da seção 4)

Todas usam o **mesmo esqueleto humanoide**, com escala de ossos e pose base diferentes. Cada raça tem uma forma-assinatura e um material-assinatura.

| Raça | Altura | Forma-assinatura | Material-assinatura | Leitura |
| --- | --- | --- | --- | --- |
| Humanos | 1,80 m | Retângulo | Lã tingida, ferro rebitado, brasões geométricos simples | A base de comparação: comum, numerosa, prática. |
| Povo da floresta | 1,95 m | Vertical torto, como galho | Pele com veios de madeira nos antebraços e no pescoço, cabelo como líquen, olhos âmbar | Antigos e orgulhosos, mais árvore velha que gente bonita. Postura levemente encurvada. |
| Povo da montanha | 1,40 m | Bloco baixo e largo | Pele com veios minerais, couro grosso, lanternas e ferramentas presas ao corpo | Engenhosos: o equipamento é maior que eles. |
| Imortais da noite | 1,85 m | Triângulo invertido, imóvel | Pele cinza de cerâmica com rachaduras que deixam escapar luz fria; roupas de cor desbotada, nunca vermelho vivo | Isolados: movimentos contidos, como estátuas que andam. |
| Ferais | 1,70 m curvado (2,0 m ereto) | Curvas e corcunda | Pelagem com falhas, marcas pálidas que reagem à lua, garras | Amaldiçoados: braços longos, cabeça baixa, pés alongados (bota em forma de pata no mesmo esqueleto). |
| Raça de expansão | a definir | Forma ainda não usada (espiral ou hexágono) | A definir | Reservada; não pode repetir a forma de outra raça. |

## 5. Ambientes, iluminação e efeitos

### 5.1 Ambientes

- O mundo é de **ruínas habitadas**: o que sobrou de antes das guerras dos deuses, remendado por quem ficou. Pedra antiga embaixo, madeira e lona nova em cima.
- Construção em **kits modulares em grade de 2 m** (parede, canto, porta, escada, piso, pilar, telhado). Cada kit tem um único material com atlas compartilhado.
- Vegetação escura e baixa no plano próximo; silhuetas de árvores e ruínas recortadas contra a névoa no plano distante.
- Pontos de interesse marcados por luz quente (fogueira, lanterna). O jogador aprende a andar "de brasa em brasa".

### 5.2 Iluminação e céu

- **Um crepúsculo de cinzas permanente por zona**, sem ciclo dia e noite na fase 1 (mais barato e mais coerente).
- Sol baixo e quente (`#F0B887`), ambiente frio (`#4C5566`), névoa de altura cinza-arroxeada nos vales.
- No céu, uma **cicatriz de luz pálida** atravessando o horizonte: o selo que prendeu os deuses (seção 3, segunda guerra). É o marco visual do mundo no lugar de luas grandes.
- Godot: `tonemap_mode` filmic ou ACES, `glow` ligado com limiar alto (só emissivos brilham), névoa de profundidade e de altura (sem névoa volumétrica), sombras direcionais com 2 divisões e distância máxima de 60 m, SDFGI desligado.

### 5.3 Efeitos de habilidade

| Tipo | Cor | Hex | Forma |
| --- | --- | --- | --- |
| Físico | Faísca de osso | `#F2E6CC` | Arcos e lascas rápidas |
| Fogo | Brasa | `#FF7A2E` | Chamas curtas, fumaça escura |
| Gelo e controle | Azul-gelo | `#7FB0FF` | Cristais, anéis no chão |
| Natureza e veneno | Bile | `#A8C83A` | Gotas, nuvens baixas |
| Sombra e morte | Violeta-escuro | `#5B2E86` | Fumaça densa, bordas pretas |
| Cura e proteção | Verde-menta | `#5FE08A` | Partículas subindo, nunca explosões |
| Telegrafia de ataque inimigo | Vermelho-alerta | `#FF3B2F` | Contorno sólido no chão com preenchimento a 20% |

**Legibilidade em grupo (2 a 10 jogadores):**

- Os seus efeitos aparecem com intensidade total; os de aliados com 50% de opacidade e sem tremor de câmera.
- O vermelho-alerta é **exclusivo** de ataques inimigos. Nenhuma habilidade de jogador usa essa cor.
- Cura nunca usa vermelho; dano nunca usa verde.
- Duração: impacto de até 0,3 s; área persistente com contorno claro e borda definida.
- Teto por efeito: 64 partículas e no máximo 1 luz dinâmica de vida curta.
- Números flutuantes: dano causado em amarelo-osso, dano recebido em vermelho, cura em menta. A forma (sinal de + ou ícone) também diferencia, para quem não distingue vermelho e verde.

## 6. HUD

Seguir as convenções do gênero (não têm dono), com acabamento próprio.

- **Layout:** sua vida e recurso no canto superior esquerdo; alvo no topo ao centro; mapa no canto superior direito; missões abaixo do mapa; barra de habilidades embaixo ao centro; chat embaixo à esquerda; balão do ajudante acima do chat.
- **Centro livre:** nenhum painel fixo no terço central da tela. Avisos de combate aparecem e somem.
- **Acabamento:** painéis retos, fundo carvão translúcido (85%), borda de 1 px. Sem molduras douradas, gemas, asas ou filigrana. A cor só entra na borda do ajudante, nas barras e nos alertas.
- **Hierarquia:** vida do jogador é o maior elemento; recargas mostram o tempo restante em número e escurecem o ícone.
- **Texto:** uma fonte de títulos (serifada, de licença livre) e uma sem serifa para números, com algarismos de largura fixa. Mínimo de 14 px em 1080p; sempre com contorno escuro.
- **Ícones:** desenhados para o Goru, sem cópia de ícones de outros jogos; fundo da cor do tipo de efeito (seção 5.3) e símbolo claro no centro.

## 7. Orçamento técnico

Alvo: 1080p a 60 quadros por segundo numa placa de vídeo de entrada (classe GTX 1050 Ti), com 10 jogadores na tela.

| Item | Triângulos (LOD0) | Textura | Materiais | Ossos | Animações mínimas |
| --- | --- | --- | --- | --- | --- |
| Personagem jogável | 8.000 a 12.000 | 1 atlas 2048² (cor + normal opcional) | até 2 (corpo/equipamento e emissivo) | 55 a 65, até 4 influências por vértice | parado, andar, correr, pular (início, queda, aterrissar), 3 golpes básicos, 2 habilidades, conjurar em loop, receber dano, atordoado, morrer, renascer |
| NPC | 5.000 a 8.000 | 1024² | 1 | esqueleto humanoide | parado, falar, andar, 1 gesto |
| Inimigo comum | 3.000 a 6.000 | 1024² | 1 | 20 a 40 | parado, alerta, andar, correr, 2 ataques, receber dano, morrer |
| Chefe | 15.000 a 25.000 | 2048² | até 3 | até 80 | as do inimigo comum, mais 3 ataques telegrafados e troca de fase |
| Peça modular | 200 a 2.000 | atlas do kit 2048² (trim sheet) | 1 por kit | — | — |
| Objeto de cenário | 50 a 1.500 | atlas compartilhado | 1 por kit | — | — |

**Limites por cena:**

- Até 1 milhão de triângulos visíveis e até 1.000 chamadas de desenho por quadro.
- Até 1 GB de memória de textura por zona.
- LOD automático do importador do Godot ligado em todas as malhas; LOD1 em 50% e LOD2 em 20% dos triângulos.
- Até 8 luzes dinâmicas com sombra visíveis; as demais sem sombra.

**Reaproveitamento obrigatório:**

- **Um esqueleto humanoide para todas as raças** (perfil humanoide do Godot); uma biblioteca de animações compartilhada, com pose base por raça.
- **Troca de cor por máscara:** cada atlas tem uma máscara RGB com três zonas de tingimento; um único shader recebe as três cores como parâmetros. Facção, raridade e variantes de inimigo saem daí.
- **Variantes de inimigo** por cor, escala e um acessório (ex.: lobo comum e lobo líder com o mesmo modelo).
- **Kits modulares** com `GridMap` ou cenas instanciadas; `MultiMeshInstance3D` para grama, pedras e detritos repetidos.
- Equipamento em peças trocáveis (cabeça, torso, mãos, pernas, pés, arma) presas ao mesmo esqueleto.

## 8. Saindo das cápsulas: passos baratos em Godot

Cada passo é pequeno, testável e comparado com capturas antes e depois (`tests/diagnostico.tscn` com tela virtual, ver `CLAUDE.md`).

1. **Luz e ambiente primeiro.** Ajustar o `Environment` de `main.tscn` para a paleta da seção 3.2: céu de cinzas, sol baixo e quente com sombras, ambiente frio, névoa de altura, glow com limiar alto. É o passo que mais muda a cara do jogo pelo menor custo.
2. **Um material-padrão de placeholder.** `StandardMaterial3D` com albedo da paleta, rugosidade 0,85, sem metal e com `rim_enabled` (borda clara) para destacar a figura do fundo. Inimigos com o mesmo material, mudando só a cor.
3. **Silhueta por primitivas.** Montar personagem e inimigo com 3 a 6 primitivas (cápsula, esfera, caixa, cilindro) seguindo a seção 4.2: o guerreiro ganha ombreiras de caixa e escudo; o caçador, capuz em cone e arco em cilindro fino; o lobo, corpo horizontal baixo; o carniçal, corcunda de esfera e braços longos. Placeholder bom é legível, não bonito.
4. **Olhos e pontos emissivos.** Duas pequenas esferas emissivas por inimigo (olhos) e uma na arma do jogador. Lê-se de longe e já ensina a regra "cor saturada é informação".
5. **Sombra de chão.** Um decal escuro e redondo embaixo de cada personagem, para ancorar a figura no terreno mesmo sem sombra dinâmica.
6. **Ruínas em vez de caixas.** Trocar os obstáculos cinza por composições de caixas e cilindros levemente rotacionados (pilares quebrados, muros baixos) em ardósia, com uma fogueira (`OmniLight3D` brasa e `GPUParticles3D` simples) como ponto de referência.
7. **Telegrafia de inimigo.** Um disco ou cone vermelho-alerta no chão antes do golpe do carniçal; testa a regra de cor da seção 5.3 antes de existir qualquer efeito final.
8. **Só então, assets.** Substituir primitivas por modelos (próprios, encomendados ou de pacote com licença compatível, como CC0), um tipo por vez, respeitando a seção 7.

## 9. Nunca fazer

- Copiar, decalcar, retocar ou "adaptar" textura, modelo, efeito, ícone, som, logotipo ou interface de outro jogo, incluindo a referência da seção 1 do documento.
- Usar capturas de outros jogos como textura, fundo, referência colada no projeto ou material dentro do repositório.
- Recriar personagem, figurino, criatura, montaria, cenário ou marco reconhecível de outro jogo, mesmo com outra cor ou outro nome.
- Usar nomes da referência em arquivos, materiais, cenas ou pastas.
- Usar asset de terceiros sem licença compatível ou sem registro da licença em `docs/` (fonte, autor, licença, data e arquivos afetados).
- Vender na loja visual que dê vantagem de leitura em combate (ex.: efeito que esconde telegrafia, figurino que muda a silhueta do papel).
- Deixar o vermelho-alerta em algo que não seja ataque inimigo, ou cura vermelha, ou dano verde.
- Encher a tela de cor saturada: se tudo brilha, nada se lê.
- Figurino ornamental com fitas, asas e peças flutuantes sem função; metal espelhado; rostos realistas ou de anime.
- Criar asset que não caiba no orçamento da seção 7 sem aprovação registrada.
- Criar malha, esqueleto ou textura exclusivos quando um kit, máscara de cor ou variante resolve.
