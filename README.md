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
| Esc | Soltar ou prender o mouse |

## O que o protótipo tem

- 2 classes: Guerreiro (tanque, golpe giratório) e Caçador (distância, rajada)
- 1 zona com 8 inimigos de 2 tipos que perseguem, atacam, voltam para casa e renascem
- Vida, XP, subida de nível, morte e renascimento
- Sem rede, loja nem endgame (de propósito)

## Dados

Os números do jogo ficam em `data/` e podem ser editados sem mexer em código:

- `data/classes.json`: vida, velocidade, dano, alcance, ângulo e recarga de cada classe
- `data/enemies.json`: atributos, XP e tempo de renascimento dos inimigos
- `data/zona_1.json`: onde ficam o jogador, os inimigos e os obstáculos

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
