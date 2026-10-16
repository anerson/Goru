# Goru

MMORPG de fantasia sombria. Nome de trabalho: Goru. Este repositório contém o protótipo offline de combate 3D, feito em Godot 4.3.

- [Documento de design](docs/documento-de-design.md)

## Como rodar

1. Instale o [Godot 4.3](https://godotengine.org/download) (versão padrão, não a .NET).
2. Abra o Godot, clique em **Importar** e escolha o arquivo `project.godot` desta pasta.
3. Aperte **F5**, escolha uma classe e jogue.

| Controle | Ação |
| --- | --- |
| W A S D | Mover |
| Mouse | Girar a câmera |
| Clique esquerdo (segurar) | Ataque básico |
| Q | Habilidade |
| Espaço | Pular |
| Roda do mouse | Zoom |
| Enter | Falar com o ajudante |
| Esc | Soltar ou prender o mouse |

## O que o protótipo tem

- 2 classes: Guerreiro (tanque, golpe giratório) e Caçador (distância, rajada)
- 1 zona com 8 inimigos de 2 tipos que perseguem, atacam, voltam para casa e renascem
- Vida, XP, subida de nível, morte e renascimento
- Sem rede, loja nem endgame (de propósito)

## Ajudante

Depois da classe, o jogador escolhe o elemento do ajudante, que comenta a partida e responde perguntas (Enter):

| Elemento | Jeito |
| --- | --- |
| Sobrenatural | Hostil e debochado. Zomba das jogadas, nunca da pessoa. |
| Folha | Calmo, fala devagar. |
| Vento | Direto, uma frase só. |
| Amor | Positivo e encorajador. |

Sem nada instalado, o ajudante usa falas prontas. Para conversa livre, rode o [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) no mesmo computador:

```sh
curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash   # instala OpenJarvis, Ollama e um modelo
jarvis serve                                                           # deixa a API em http://127.0.0.1:8000
```

O jogo detecta sozinho ao começar a partida (canto superior esquerdo mostra o estado). Personalidades, falas e o endereço ficam em `data/ajudantes.json`; o endereço também pode vir da variável `GORU_OPENJARVIS_URL`.

Para testar sem o OpenJarvis, use o servidor falso:

```sh
python3 tools/openjarvis_falso.py 8765 /tmp/registro.jsonl &
GORU_OPENJARVIS_URL=http://127.0.0.1:8765 godot --headless --path . res://tests/ajudante_ia_test.tscn -- --registro=/tmp/registro.jsonl
```

## Dados

Os números do jogo ficam em `data/` e podem ser editados sem mexer em código:

- `data/classes.json`: vida, velocidade, dano, alcance, ângulo e recarga de cada classe
- `data/enemies.json`: atributos, XP e tempo de renascimento dos inimigos
- `data/zona_1.json`: onde ficam o jogador, os inimigos e os obstáculos
- `data/ajudantes.json`: personalidade, limites e falas de cada elemento do ajudante

## Teste automático

```sh
godot --headless --path . res://tests/smoke_test.tscn
```

Verifica o loop básico (ataque, morte do inimigo, XP, renascimento e nível) e sai com código 0 se tudo passar.

## Diagnóstico de balanceamento

```sh
godot --path . res://tests/diagnostico.tscn -- --saida=/pasta/capturas --segundos=120
```

Um bot joga cada classe pelo tempo indicado e imprime abates, mortes, dano e tempo andando ou atacando. Com `--saida`, também salva capturas de tela. O bot é simples (não desvia nem usa a habilidade com estratégia), então compare as classes entre si, não com um jogador real.

Material extraído de jogos de referência não entra neste repositório (ver seção 1 do documento).
