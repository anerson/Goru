class_name LocalInput
extends RefCounted
## Entrada local do jogo offline: lê teclado e mouse e monta um InputFrame por tick.
## É o único lugar que lê `Input` para movimento e botões. A câmera e o HUD ainda
## mexem no modo do mouse, que é apresentação.

var player: Node
var _seq := 0


func _init(for_player: Node) -> void:
	player = for_player


## Chamado pelo jogador uma vez por tick de física.
func next_frame() -> InputFrame:
	var frame := InputFrame.new()
	_seq += 1
	frame.seq = _seq
	frame.yaw = player.camera_pivot.rotation.y
	if not player.controls_enabled:
		return frame
	frame.move = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	# "Segurado ou apertado neste tick": um toque mais curto que um tick não se perde.
	if Input.is_action_pressed("jump") or Input.is_action_just_pressed("jump"):
		frame.buttons |= InputFrame.JUMP
	# Ataque e habilidade só valem com o mouse preso, como antes.
	if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		if Input.is_action_pressed("attack"):
			frame.buttons |= InputFrame.ATTACK
		if Input.is_action_pressed("skill") or Input.is_action_just_pressed("skill"):
			frame.buttons |= InputFrame.SKILL
	return frame
