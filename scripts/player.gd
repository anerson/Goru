extends CharacterBody3D
## Personagem do jogador: movimento em terceira pessoa, ataque, habilidade e progressão.
## Não lê o teclado: a cada tick pede um InputFrame a `input_source` e o aplica com apply_input().

signal health_changed(current: float, maximum: float)
signal xp_changed(xp: int, xp_next: int, level: int)
signal ability_used(ability_key: String, cooldown: float)
## Emitido depois que a habilidade causou dano e cura.
signal ability_resolved(ability_key: String, hits: int)
signal died

const GRAVITY := 20.0
const JUMP_VELOCITY := 7.0
const MOUSE_SENSITIVITY := 0.003
const TURN_SPEED := 12.0

var class_id := "guerreiro"
var stats: Dictionary
var max_health := 1.0
var health := 1.0
var level := 1
var xp := 0
var is_dead := false
var controls_enabled := true
var cooldowns := Cooldowns.new()
## Fonte da entrada: função sem argumentos que devolve o InputFrame do tick
## (offline/local_input.gd no jogo, o bot no diagnóstico). Sem fonte, o jogador fica parado.
var input_source: Callable
var _previous_buttons := 0

@onready var model: Node3D = $Model
@onready var weapon: Node3D = $Model/Weapon
@onready var camera_pivot: Node3D = $CameraPivot
@onready var spring_arm: SpringArm3D = $CameraPivot/SpringArm3D
@onready var camera: Camera3D = $CameraPivot/SpringArm3D/Camera3D


func _ready() -> void:
	add_to_group("player")
	stats = GameData.classes[class_id]
	var material := StandardMaterial3D.new()
	material.albedo_color = GameData.to_color(stats.cor)
	$Model/Body.material_override = material
	spring_arm.add_excluded_object(get_rid())
	spring_arm.rotation.x = -0.35
	camera.make_current()
	max_health = Progression.max_health_for(stats, level)
	health = max_health
	health_changed.emit(health, max_health)
	xp_changed.emit(xp, xp_to_next_level(), level)


func _unhandled_input(event: InputEvent) -> void:
	if not controls_enabled:
		return
	if event.is_action_pressed("toggle_mouse"):
		var captured := Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if captured else Input.MOUSE_MODE_CAPTURED
	elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		camera_pivot.rotate_y(-event.relative.x * MOUSE_SENSITIVITY)
		spring_arm.rotation.x = clampf(spring_arm.rotation.x - event.relative.y * MOUSE_SENSITIVITY, -1.2, 0.3)
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			spring_arm.spring_length = maxf(spring_arm.spring_length - 0.5, 2.5)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			spring_arm.spring_length = minf(spring_arm.spring_length + 0.5, 12.0)
		elif Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			get_viewport().set_input_as_handled()


func _physics_process(delta: float) -> void:
	var frame: InputFrame = input_source.call() if input_source.is_valid() else InputFrame.new()
	apply_input(frame, delta)


## Avança um tick com a intenção do jogador. Mesma função para o jogo local, o bot e,
## no futuro, a previsão no cliente e o servidor.
func apply_input(frame: InputFrame, delta: float) -> void:
	cooldowns.tick(delta)
	# Pular e habilidade valem na borda (apertou neste quadro); ataque vale enquanto segurado.
	var pressed := frame.buttons & ~_previous_buttons
	_previous_buttons = frame.buttons

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	if is_dead:
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return

	if pressed & InputFrame.JUMP and is_on_floor():
		velocity.y = JUMP_VELOCITY

	# A direção é relativa ao giro da câmera; o módulo de `move` não importa (sempre normalizada).
	var direction := Basis.from_euler(Vector3(0.0, frame.yaw, 0.0)) * Vector3(frame.move.x, 0.0, frame.move.y)
	direction.y = 0.0
	direction = direction.normalized()
	velocity.x = direction.x * stats.velocidade
	velocity.z = direction.z * stats.velocidade
	if direction != Vector3.ZERO:
		model.rotation.y = lerp_angle(model.rotation.y, atan2(-direction.x, -direction.z), TURN_SPEED * delta)
	move_and_slide()

	if frame.has(InputFrame.ATTACK):
		use_ability("ataque", frame.yaw)
	if pressed & InputFrame.SKILL:
		use_ability("habilidade", frame.yaw)


## Usa "ataque" ou "habilidade" mirando no giro `yaw` (o da câmera).
## Retorna quantos inimigos foram atingidos, ou -1 se não pôde usar.
func use_ability(ability_key: String, yaw: float) -> int:
	if is_dead or not cooldowns.is_ready(ability_key):
		return -1
	var ability: Dictionary = stats[ability_key]
	cooldowns.start(ability_key, ability.recarga)
	ability_used.emit(ability_key, ability.recarga)

	model.rotation.y = yaw
	var enemies := get_tree().get_nodes_in_group("enemies")
	var targets: Array = []
	for enemy in enemies:
		targets.append({"pos": enemy.global_position, "alive": enemy.is_alive()})
	var hit := Combat.select_targets(global_position, yaw, ability, targets)
	var damage := Combat.damage_for(ability, level, GameData.rules)
	for index in hit:
		enemies[index].take_damage(damage)
	heal(Combat.heal_for_hits(ability, max_health, hit.size()))
	_play_swing(ability.angulo >= 360)
	ability_resolved.emit(ability_key, hit.size())
	return hit.size()


func take_damage(amount: float) -> void:
	if is_dead:
		return
	health = maxf(health - amount, 0.0)
	health_changed.emit(health, max_health)
	Fx.floating_text(get_parent(), global_position + Vector3.UP * 2.3, str(roundi(amount)), Color(1, 0.3, 0.3))
	if health <= 0.0:
		is_dead = true
		model.rotation.x = -PI / 2.0
		model.position.y = 0.4
		died.emit()


func heal(amount: float) -> void:
	if is_dead or amount <= 0.0:
		return
	var healed := minf(amount, max_health - health)
	if healed <= 0.0:
		return
	health += healed
	health_changed.emit(health, max_health)
	Fx.floating_text(get_parent(), global_position + Vector3.UP * 2.3, "+%d" % roundi(healed), Color(0.4, 1, 0.4))


func respawn(at: Vector3) -> void:
	global_position = at
	velocity = Vector3.ZERO
	model.rotation.x = 0.0
	model.position.y = 0.0
	is_dead = false
	health = max_health
	health_changed.emit(health, max_health)


func add_xp(amount: int) -> void:
	var state := {"level": level, "xp": xp}
	var levels_gained := Progression.apply_xp(state, amount, GameData.rules)
	xp = state.xp
	for new_level in levels_gained:
		level = new_level
		max_health = Progression.max_health_for(stats, level)
		health = max_health
		health_changed.emit(health, max_health)
		Fx.floating_text(get_parent(), global_position + Vector3.UP * 2.6, "Nível %d!" % level, Color(1, 0.85, 0.2))
	xp_changed.emit(xp, xp_to_next_level(), level)


func xp_to_next_level() -> int:
	return Progression.xp_to_next_level(level, GameData.rules)


func damage_multiplier() -> float:
	return Combat.damage_multiplier(level, GameData.rules)


func _play_swing(spin: bool) -> void:
	var tween := create_tween()
	if spin:
		tween.tween_property(model, "rotation:y", model.rotation.y + TAU, 0.35)
	else:
		weapon.rotation.x = 0.0
		tween.tween_property(weapon, "rotation:x", -1.3, 0.08)
		tween.tween_property(weapon, "rotation:x", 0.0, 0.15)
