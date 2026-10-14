extends CharacterBody3D
## Personagem do jogador: movimento em terceira pessoa, ataque, habilidade e progressão.

signal health_changed(current: float, maximum: float)
signal xp_changed(xp: int, xp_next: int, level: int)
signal ability_used(ability_key: String, cooldown: float)
signal died

const GRAVITY := 20.0
const JUMP_VELOCITY := 7.0
const MOUSE_SENSITIVITY := 0.003
const TURN_SPEED := 12.0
const DAMAGE_PER_LEVEL := 0.1

var class_id := "guerreiro"
var stats: Dictionary
var max_health := 1.0
var health := 1.0
var level := 1
var xp := 0
var is_dead := false
var controls_enabled := true
var cooldowns := {"ataque": 0.0, "habilidade": 0.0}

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
	max_health = _max_health_for(level)
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
	for key: String in cooldowns:
		cooldowns[key] = maxf(cooldowns[key] - delta, 0.0)

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	if is_dead:
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return

	if controls_enabled and Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var input := Vector2.ZERO
	if controls_enabled:
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction := camera_pivot.global_basis * Vector3(input.x, 0.0, input.y)
	direction.y = 0.0
	direction = direction.normalized()
	velocity.x = direction.x * stats.velocidade
	velocity.z = direction.z * stats.velocidade
	if direction != Vector3.ZERO:
		model.rotation.y = lerp_angle(model.rotation.y, atan2(-direction.x, -direction.z), TURN_SPEED * delta)
	move_and_slide()

	if controls_enabled and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		if Input.is_action_pressed("attack"):
			use_ability("ataque")
		if Input.is_action_just_pressed("skill"):
			use_ability("habilidade")


## Usa "ataque" ou "habilidade". Retorna quantos inimigos foram atingidos, ou -1 se não pôde usar.
func use_ability(ability_key: String) -> int:
	if is_dead or cooldowns[ability_key] > 0.0:
		return -1
	var ability: Dictionary = stats[ability_key]
	cooldowns[ability_key] = ability.recarga
	ability_used.emit(ability_key, ability.recarga)

	# Mira para onde a câmera olha.
	model.rotation.y = camera_pivot.rotation.y
	var forward := -model.global_basis.z
	var half_angle := deg_to_rad(ability.angulo) / 2.0
	var damage: float = ability.dano * damage_multiplier()
	var hits := 0
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if not enemy.is_alive():
			continue
		var to_enemy: Vector3 = enemy.global_position - global_position
		to_enemy.y = 0.0
		if to_enemy.length() > ability.alcance:
			continue
		if ability.angulo < 360 and to_enemy.length() > 0.01 and forward.angle_to(to_enemy.normalized()) > half_angle:
			continue
		enemy.take_damage(damage)
		hits += 1
	# Cura uma fração da vida máxima por inimigo atingido (campo opcional, padrão 0).
	var heal_per_hit: float = ability.get("cura_por_acerto", 0.0)
	if hits > 0 and heal_per_hit > 0.0:
		heal(max_health * heal_per_hit * hits)
	_play_swing(ability.angulo >= 360)
	return hits


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
	xp += amount
	while xp >= xp_to_next_level():
		xp -= xp_to_next_level()
		level += 1
		max_health = _max_health_for(level)
		health = max_health
		health_changed.emit(health, max_health)
		Fx.floating_text(get_parent(), global_position + Vector3.UP * 2.6, "Nível %d!" % level, Color(1, 0.85, 0.2))
	xp_changed.emit(xp, xp_to_next_level(), level)


func xp_to_next_level() -> int:
	return 100 * level


func damage_multiplier() -> float:
	return 1.0 + DAMAGE_PER_LEVEL * (level - 1)


func _max_health_for(for_level: int) -> float:
	return stats.vida_base + stats.vida_por_nivel * (for_level - 1)


func _play_swing(spin: bool) -> void:
	var tween := create_tween()
	if spin:
		tween.tween_property(model, "rotation:y", model.rotation.y + TAU, 0.35)
	else:
		weapon.rotation.x = 0.0
		tween.tween_property(weapon, "rotation:x", -1.3, 0.08)
		tween.tween_property(weapon, "rotation:x", 0.0, 0.15)
