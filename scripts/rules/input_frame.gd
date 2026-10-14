class_name InputFrame
extends RefCounted
## Um quadro de entrada do jogador: o que ele quer fazer neste tick.
## Vem do teclado e mouse (offline/local_input.gd), do bot do diagnóstico ou, no futuro, da rede.
## Só carrega intenção; quem decide o efeito é a simulação.

## Bits de `buttons`: botão segurado neste quadro.
const JUMP := 1
const ATTACK := 2
const SKILL := 4

## Número de sequência, crescente por quadro (para a rede reconhecer e reconciliar).
var seq := 0
## Direção pedida em coordenadas da câmera: x = direita, y = trás (mesma convenção do get_vector do Godot).
var move := Vector2.ZERO
## Giro da câmera em torno de Y, em radianos. Define a direção do movimento e da mira.
var yaw := 0.0
var buttons := 0


func has(button: int) -> bool:
	return buttons & button != 0
