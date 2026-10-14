class_name EnemyBody
extends CharacterBody3D
## Corpo do inimigo na simulação. Quem decide o que fazer é o EnemyBrain (rules/enemy_brain.gd);
## o corpo aplica a decisão com a física (andar, virar, cair, voltar para casa).
## Quem avança o tick, aplica o golpe e conta o renascimento é a WorldSim.
## Sem malha, rótulo nem Fx: a view (scripts/view/enemy_view.gd) desenha a partir dos sinais.

signal health_changed(current: float, maximum: float)
signal damaged(amount: float)
## Recebeu um golpe enquanto voltava para casa e o ignorou.
signal evaded
signal died
signal respawned
## Chegou em casa depois de voltar, com a vida cheia de novo.
signal returned_home

const GRAVITY := 20.0

var id := 0
var enemy_id := "lobo_sombrio"
var spawn_position := Vector3.ZERO
var stats: Dictionary
var max_health := 1.0
var health := 1.0
var brain: EnemyBrain

@onready var collision: CollisionShape3D = $CollisionShape3D


func _ready() -> void:
	stats = GameData.enemies[enemy_id]
	brain = EnemyBrain.new(stats, GameData.rules)
	max_health = stats.vida
	health = max_health
	scale = Vector3.ONE * stats.escala
	global_position = spawn_position


## Avança um tick com a lista de alvos {"id", "pos", "alive"}.
## Devolve o id de quem leva o golpe neste tick (EnemyBrain.NO_TARGET se ninguém);
## quem chama aplica o dano.
func step(delta: float, targets: Array) -> int:
	if not brain.is_alive():
		return EnemyBrain.NO_TARGET
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	var result := brain.think(global_position, spawn_position, targets, delta)
	if result.teleport_home:
		global_position = spawn_position
	if result.arrived_home:
		health = max_health
		health_changed.emit(health, max_health)
		returned_home.emit()
	if result.face_point != null:
		_face(result.face_point)
	var move: Vector3 = result.move
	velocity.x = move.x
	velocity.z = move.z
	if move != Vector3.ZERO:
		_face(global_position + move)
	move_and_slide()
	return result.attack_target_id


func is_alive() -> bool:
	return brain.is_alive()


## Aplica dano de `attacker_id` e devolve quanto de vida saiu (0 se morto ou voltando para casa).
## Só muda estado e emite sinais; números e piscada ficam na view.
## Use WorldSim.apply_damage(), que registra quem bateu e cuida da morte.
func take_damage(amount: float, attacker_id := 0) -> float:
	if not brain.is_alive():
		return 0.0
	if brain.ignores_damage():
		evaded.emit()
		return 0.0
	var before := health
	health = maxf(health - amount, 0.0)
	damaged.emit(amount)
	brain.on_damaged(attacker_id)
	health_changed.emit(health, max_health)
	if health <= 0.0:
		_die()
	return before - health


func _die() -> void:
	brain.on_died()
	collision.set_deferred("disabled", true)
	died.emit()


## Volta à vida no ponto de origem. Chamado pela WorldSim quando o contador de ticks acaba.
func respawn() -> void:
	global_position = spawn_position
	velocity = Vector3.ZERO
	health = max_health
	collision.set_deferred("disabled", false)
	brain.on_respawned()
	health_changed.emit(health, max_health)
	respawned.emit()


func _face(point: Vector3) -> void:
	var direction := point - global_position
	direction.y = 0.0
	if direction.length() > 0.01:
		rotation.y = atan2(-direction.x, -direction.z)
