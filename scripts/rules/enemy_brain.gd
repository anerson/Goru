class_name EnemyBrain
extends RefCounted
## Máquina de estados do inimigo, pura: sem Node, física, Input, Fx nem rede.
## A cada tick recebe a própria posição, a origem (ponto de nascimento) e a lista de alvos
## {"id": int, "pos": Vector3, "alive": bool}, e devolve o que o corpo deve fazer.
##
## Alvo: o mais próximo vivo dentro do alcance de agro. Ele é mantido enquanto estiver vivo
## e na lista, mesmo que saia do agro ou que outro fique mais perto, até o inimigo passar
## da coleira (distância da origem). Se o alvo morre ou some, o inimigo troca para o mais
## próximo vivo no agro; sem ninguém, volta para casa. Tabela de ameaça fica para depois.
##
## `stats` é a entrada de data/enemies.json; `table` é data/regras.json (GameData.rules).

enum State { IDLE, CHASE, ATTACK, RETURN, DEAD }

## Id que nunca é de uma entidade (sem alvo).
const NO_TARGET := 0

var state := State.IDLE
var target_id := NO_TARGET
## Segundos até o próximo golpe poder sair.
var attack_timer := 0.0
## Segundos voltando para casa; passou do limite, o corpo é levado direto à origem.
var return_timer := 0.0

var _stats: Dictionary
var _table: Dictionary


func _init(stats: Dictionary, table: Dictionary) -> void:
	_stats = stats
	_table = table


## Avança um tick. Devolve:
## - "state": estado depois do tick;
## - "move_dir": direção no plano (normalizada, ou zero);
## - "move": velocidade horizontal a aplicar (move_dir × velocidade da tabela);
## - "attack_target_id": id de quem leva o golpe neste tick (NO_TARGET se ninguém);
## - "face_point": ponto para onde virar (Vector3) ou null;
## - "teleport_home": o corpo deve ir direto à origem (travou voltando);
## - "arrived_home": chegou em casa neste tick (a vida volta a cheia).
func think(position: Vector3, origin: Vector3, targets: Array, delta: float) -> Dictionary:
	var result := {
		"state": state,
		"move_dir": Vector3.ZERO,
		"move": Vector3.ZERO,
		"attack_target_id": NO_TARGET,
		"face_point": null,
		"teleport_home": false,
		"arrived_home": false,
	}
	if state == State.DEAD:
		return result
	attack_timer = maxf(attack_timer - delta, 0.0)

	match state:
		State.IDLE:
			var found := nearest_in_agro(position, targets)
			if not found.is_empty():
				target_id = found.id
				state = State.CHASE
		State.CHASE:
			var target := _current_target(position, targets)
			if target.is_empty() or flat_distance(position, origin) > _table.inimigo_coleira:
				_go_home()
			elif flat_distance(position, target.pos) <= _stats.alcance_ataque:
				state = State.ATTACK
			else:
				result.move_dir = direction_to(position, target.pos)
				result.move = result.move_dir * _stats.velocidade
		State.ATTACK:
			var target := _current_target(position, targets)
			if target.is_empty():
				_go_home()
			elif flat_distance(position, target.pos) > _stats.alcance_ataque * _table.inimigo_folga_ataque:
				state = State.CHASE
			else:
				result.face_point = target.pos
				if attack_timer == 0.0:
					attack_timer = _stats.recarga
					result.attack_target_id = target.id
		State.RETURN:
			return_timer += delta
			var at := position
			if return_timer > _table.inimigo_tempo_max_volta:
				result.teleport_home = true
				at = origin
			if flat_distance(at, origin) < _table.inimigo_raio_chegada:
				return_timer = 0.0
				state = State.IDLE
				result.arrived_home = true
			else:
				result.move_dir = direction_to(at, origin)
				result.move = result.move_dir * _stats.velocidade * _table.inimigo_velocidade_volta

	result.state = state
	return result


## Levou dano de `attacker_id`. Parado, passa a perseguir quem bateu.
func on_damaged(attacker_id: int) -> void:
	if state == State.IDLE:
		state = State.CHASE
		target_id = attacker_id


func on_died() -> void:
	state = State.DEAD
	target_id = NO_TARGET


## Renasceu na origem. A recarga do golpe continua de onde parou, como antes da separação.
func on_respawned() -> void:
	state = State.IDLE
	target_id = NO_TARGET
	return_timer = 0.0


func is_alive() -> bool:
	return state != State.DEAD


## Voltando para casa o inimigo não leva dano (o golpe "evade").
func ignores_damage() -> bool:
	return state == State.RETURN


## O alvo vivo mais próximo dentro do agro, ou {} se não houver. Empate: o primeiro da lista.
func nearest_in_agro(position: Vector3, targets: Array) -> Dictionary:
	var best := {}
	var best_distance := INF
	for target: Dictionary in targets:
		if not target.alive:
			continue
		var distance := flat_distance(position, target.pos)
		if distance <= _stats.alcance_agro and distance < best_distance:
			best = target
			best_distance = distance
	return best


## O alvo atual, se ainda vivo e na lista; senão, troca para o mais próximo vivo no agro.
func _current_target(position: Vector3, targets: Array) -> Dictionary:
	for target: Dictionary in targets:
		if target.id == target_id and target.alive:
			return target
	var found := nearest_in_agro(position, targets)
	target_id = found.get("id", NO_TARGET)
	return found


func _go_home() -> void:
	state = State.RETURN
	target_id = NO_TARGET


## Distância no plano (a altura é ignorada).
static func flat_distance(from: Vector3, to: Vector3) -> float:
	return Vector2(from.x, from.z).distance_to(Vector2(to.x, to.z))


## Direção no plano de `from` para `to`, normalizada (zero se forem o mesmo ponto).
static func direction_to(from: Vector3, to: Vector3) -> Vector3:
	var direction := to - from
	direction.y = 0.0
	return direction.normalized()
