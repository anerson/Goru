class_name PhysicsLayers
extends RefCounted
## Camadas de colisão da simulação (RD-002, aprovada pelo dono do projeto).
## Os valores são bits de `collision_layer` e `collision_mask`: camada 1 = mundo,
## camada 2 = jogadores, camada 3 = inimigos. Os nomes aparecem no editor
## (project.godot, layer_names/3d_physics).
##
## Todo corpo móvel colide só com o mundo: jogador e inimigo atravessam um ao outro, e
## jogadores atravessam jogadores. Com rede, empurrão entre corpos de pessoas diferentes
## é a principal causa de divergência na previsão. Combate não depende de colisão física:
## alvos são escolhidos por distância e ângulo (rules/combat.gd, rules/enemy_brain.gd).

const WORLD := 1
const PLAYERS := 1 << 1
const ENEMIES := 1 << 2
