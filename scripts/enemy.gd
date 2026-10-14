extends CharacterBody3D
## Inimigo com máquina de estados simples: parado, perseguindo, atacando, voltando e morto.

signal killed(xp_reward: int)

enum State { IDLE, CHASE, ATTACK, RETURN, DEAD }

const GRAVITY := 20.0
const LEASH_DISTANCE := 22.0
const MAX_RETURN_TIME := 6.0  # Se travar num obstáculo, volta direto para o ponto de origem.

var enemy_id := "lobo_sombrio"
var spawn_position := Vector3.ZERO
var stats: Dictionary
var max_health := 1.0
var health := 1.0
var state := State.IDLE
var attack_timer := 0.0
var return_timer := 0.0
var material := StandardMaterial3D.new()

@onready var body_mesh: MeshInstance3D = $Body
@onready var health_label: Label3D = $HealthLabel
@onready var collision: CollisionShape3D = $CollisionShape3D


func _ready() -> void:
	stats = GameData.enemies[enemy_id]
	max_health = stats.vida
	health = max_health
	material.albedo_color = GameData.to_color(stats.cor)
	body_mesh.material_override = material
	scale = Vector3.ONE * stats.escala
	global_position = spawn_position
	_update_label()


func _physics_process(delta: float) -> void:
	if state == State.DEAD:
		return
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	attack_timer = maxf(attack_timer - delta, 0.0)

	var player := get_tree().get_first_node_in_group("player")
	var player_alive: bool = player != null and not player.is_dead
	var distance := INF
	if player_alive:
		distance = _flat_distance(player.global_position)

	var move := Vector3.ZERO
	match state:
		State.IDLE:
			if player_alive and distance <= stats.alcance_agro:
				state = State.CHASE
		State.CHASE:
			if not player_alive or _flat_distance(spawn_position) > LEASH_DISTANCE:
				state = State.RETURN
			elif distance <= stats.alcance_ataque:
				state = State.ATTACK
			else:
				move = _direction_to(player.global_position) * stats.velocidade
		State.ATTACK:
			if not player_alive:
				state = State.RETURN
			elif distance > stats.alcance_ataque * 1.2:
				state = State.CHASE
			else:
				_face(player.global_position)
				if attack_timer == 0.0:
					attack_timer = stats.recarga
					player.take_damage(stats.dano)
		State.RETURN:
			return_timer += delta
			if return_timer > MAX_RETURN_TIME:
				global_position = spawn_position
			if _flat_distance(spawn_position) < 0.6:
				return_timer = 0.0
				state = State.IDLE
				health = max_health
				_update_label()
			else:
				move = _direction_to(spawn_position) * stats.velocidade * 1.5

	velocity.x = move.x
	velocity.z = move.z
	if move != Vector3.ZERO:
		_face(global_position + move)
	move_and_slide()


func is_alive() -> bool:
	return state != State.DEAD


func take_damage(amount: float) -> void:
	if state == State.DEAD:
		return
	if state == State.RETURN:
		Fx.floating_text(get_parent(), global_position + Vector3.UP * 2.0, "Evadiu", Color(0.8, 0.8, 0.8))
		return
	health = maxf(health - amount, 0.0)
	Fx.floating_text(get_parent(), global_position + Vector3.UP * 2.0, str(roundi(amount)), Color(1, 0.95, 0.4))
	_flash()
	if state == State.IDLE:
		state = State.CHASE
	_update_label()
	if health <= 0.0:
		_die()


func _die() -> void:
	state = State.DEAD
	visible = false
	collision.set_deferred("disabled", true)
	killed.emit(stats.xp)
	# Conta em tempo de física (ticks), como o resto da simulação, e não em quadros de tela.
	await get_tree().create_timer(stats.respawn, true, true).timeout
	global_position = spawn_position
	velocity = Vector3.ZERO
	health = max_health
	visible = true
	collision.set_deferred("disabled", false)
	state = State.IDLE
	_update_label()


func _flash() -> void:
	var tween := create_tween()
	material.emission_enabled = true
	material.emission = Color.WHITE
	tween.tween_property(material, "emission_energy_multiplier", 0.0, 0.15).from(2.0)


func _update_label() -> void:
	health_label.text = "%s\n%d / %d" % [stats.nome, ceili(health), ceili(max_health)]


func _face(point: Vector3) -> void:
	var direction := point - global_position
	direction.y = 0.0
	if direction.length() > 0.01:
		rotation.y = atan2(-direction.x, -direction.z)


func _direction_to(point: Vector3) -> Vector3:
	var direction := point - global_position
	direction.y = 0.0
	return direction.normalized()


func _flat_distance(point: Vector3) -> float:
	return Vector2(global_position.x, global_position.z).distance_to(Vector2(point.x, point.z))
