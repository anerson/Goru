class_name WorldSim
extends Node3D
## Simulação de uma instância (zona, masmorra ou arena): dona das entidades.
## Monta a zona, cria inimigos e jogadores, avança tudo num tick de física em ordem fixa
## (inimigos, depois jogadores, depois renascimentos), resolve habilidades e dano, divide a XP
## e emite eventos. Roda igual no jogo offline e, no futuro, no servidor; não conhece view,
## câmera, HUD, entrada local nem rede.
##
## Toda espera é contada em ticks (sem timer nem `await`): pausável, testável e igual em
## qualquer FPS.

signal entity_added(id: int, body: Node3D)
signal entity_removed(id: int)
## Um golpe acertou (não conta golpe evadido nem em quem já morreu). `amount` é o valor do golpe.
signal damage_dealt(source_id: int, target_id: int, amount: float)
## Emitido depois de a XP do abate ter sido dividida. `participants`: jogadores que causaram dano.
signal entity_died(id: int, killer_id: int, participants: Array)
signal xp_gained(id: int, amount: int)
signal level_up(id: int, level: int)
signal respawned(id: int, position: Vector3)

const PLAYER_BODY_SCENE := preload("res://scenes/player_body.tscn")
const ENEMY_BODY_SCENE := preload("res://scenes/enemy_body.tscn")
## Id que nunca é de uma entidade (ambiente, teste, ninguém).
const NO_ENTITY := 0

var zone: Dictionary
## Tabela de regras (data/regras.json).
var rules: Dictionary
## Ticks já simulados.
var tick := 0
## Ticks por segundo, para converter os tempos das tabelas.
var tick_rate: int = Engine.physics_ticks_per_second
var players: Array[PlayerBody] = []
var enemies: Array[EnemyBody] = []

var _entities := {}
var _next_id := 1
## Renascimentos pendentes, na ordem em que as mortes aconteceram: {"id": int, "ticks": int}.
var _respawns: Array[Dictionary] = []
## Por inimigo, os ids dos jogadores que causaram dano a ele desde que nasceu ou voltou para casa.
var _participants := {}
var _zone_root: Node3D
var _enemies_root: Node3D
var _players_root: Node3D


## Monta a zona e cria os inimigos dela. Chamar uma vez, já dentro da árvore.
## `rules_table` vazio usa GameData.rules.
func setup(zone_data: Dictionary, rules_table := {}) -> void:
	zone = zone_data
	rules = rules_table if not rules_table.is_empty() else GameData.rules
	_zone_root = _child_root("Zone")
	_enemies_root = _child_root("Enemies")
	_players_root = _child_root("Players")
	ZoneBuilder.build(_zone_root, zone)
	for spawn in ZoneBuilder.enemy_spawns(zone):
		_spawn_enemy(spawn.tipo, spawn.posicao)


## Cria um jogador em `at` (sem posição, no ponto de nascimento da zona).
func add_player(class_id: String, at: Variant = null) -> PlayerBody:
	var body: PlayerBody = PLAYER_BODY_SCENE.instantiate()
	body.class_id = class_id
	body.id = _take_id()
	_players_root.add_child(body)
	body.global_position = at if at is Vector3 else player_spawn()
	players.append(body)
	_entities[body.id] = body
	entity_added.emit(body.id, body)
	return body


## Tira um jogador da instância (saiu ou caiu). Os inimigos trocam de alvo no próximo tick.
func remove_player(id: int) -> void:
	var body: PlayerBody = _entities.get(id) as PlayerBody
	if body == null:
		return
	players.erase(body)
	_entities.erase(id)
	for enemy_id: int in _participants:
		_participants[enemy_id].erase(id)
	_respawns = _respawns.filter(func(entry: Dictionary) -> bool: return entry.id != id)
	body.queue_free()
	entity_removed.emit(id)


func get_entity(id: int) -> Node3D:
	return _entities.get(id)


func is_enemy(id: int) -> bool:
	return _entities.get(id) is EnemyBody


func is_player(id: int) -> bool:
	return _entities.get(id) is PlayerBody


func player_spawn() -> Vector3:
	return ZoneBuilder.player_spawn(zone)


## Quantos ticks dura uma espera de `seconds` segundos.
func ticks_for(seconds: float) -> int:
	return maxi(roundi(seconds * tick_rate), 1)


func _physics_process(delta: float) -> void:
	step(delta)


## Avança um tick: inimigos, jogadores (entrada, movimento e habilidades) e renascimentos.
func step(delta: float) -> void:
	for enemy in enemies:
		# A lista de alvos é montada para cada inimigo: quem morreu no golpe de um inimigo
		# anterior, neste mesmo tick, já aparece morto para o seguinte.
		var attacked := enemy.step(delta, _targets())
		if attacked != EnemyBrain.NO_TARGET:
			apply_damage(enemy.id, attacked, enemy.stats.dano)
	for player in players:
		var frame := player.next_input()
		for ability_key in player.apply_input(frame, delta):
			resolve_ability(player.id, ability_key, frame.yaw)
	_tick_respawns()
	tick += 1


## Usa "ataque" ou "habilidade" de `attacker_id` mirando no giro `yaw`: recarga, escolha
## de alvos, dano e cura. Retorna quantos inimigos foram atingidos, ou -1 se não pôde usar.
func resolve_ability(attacker_id: int, ability_key: String, yaw: float) -> int:
	var player: PlayerBody = _entities.get(attacker_id) as PlayerBody
	if player == null or not player.begin_ability(ability_key, yaw):
		return -1
	var ability: Dictionary = player.stats[ability_key]
	var targets: Array = []
	for enemy in enemies:
		targets.append({"pos": enemy.global_position, "alive": enemy.is_alive()})
	var hit := Combat.select_targets(player.global_position, yaw, ability, targets)
	var damage := Combat.damage_for(ability, player.level, rules)
	for index in hit:
		apply_damage(attacker_id, enemies[index].id, damage)
	player.heal(Combat.heal_for_hits(ability, player.max_health, hit.size()))
	player.finish_ability(ability_key, hit.size())
	return hit.size()


## Aplica um golpe de `source_id` em `target_id`. Devolve quanto de vida saiu.
## Toda perda de vida passa por aqui, para a sim saber quem participou e quem matou.
func apply_damage(source_id: int, target_id: int, amount: float) -> float:
	var target: Node3D = _entities.get(target_id)
	if target == null or not target.is_alive():
		return 0.0
	var applied: float
	if target is EnemyBody:
		applied = target.take_damage(amount, source_id)
		if applied > 0.0 and is_player(source_id):
			if not _participants.has(target_id):
				_participants[target_id] = []
			if not _participants[target_id].has(source_id):
				_participants[target_id].append(source_id)
	else:
		applied = target.take_damage(amount)
	if applied > 0.0:
		damage_dealt.emit(source_id, target_id, amount)
	if not target.is_alive():
		_on_killed(target, source_id)
	return applied


## Soma XP a um jogador e emite os eventos. Devolve os níveis alcançados.
func give_xp(id: int, amount: int) -> Array[int]:
	var player: PlayerBody = _entities.get(id) as PlayerBody
	if player == null:
		return []
	var levels := player.add_xp(amount)
	xp_gained.emit(id, amount)
	for level in levels:
		level_up.emit(id, level)
	return levels


func _on_killed(target: Node3D, killer_id: int) -> void:
	var participants: Array = []
	if target is EnemyBody:
		participants = _participants.get(target.id, []).duplicate()
		_participants.erase(target.id)
		_respawns.append({"id": target.id, "ticks": ticks_for(target.stats.respawn)})
		# Regra de grupo da fase 1: XP cheia para cada jogador que causou dano.
		var shares := Progression.xp_shares(target.stats.xp, participants)
		for id: int in shares:
			give_xp(id, shares[id])
	else:
		_respawns.append({"id": target.id, "ticks": ticks_for(rules.jogador_renascimento)})
	entity_died.emit(target.id, killer_id, participants)


func _tick_respawns() -> void:
	var due: Array[int] = []
	for entry in _respawns:
		entry.ticks -= 1
		if entry.ticks <= 0:
			due.append(entry.id)
	if due.is_empty():
		return
	_respawns = _respawns.filter(func(entry: Dictionary) -> bool: return entry.ticks > 0)
	for id in due:
		var body: Node3D = _entities.get(id)
		if body is EnemyBody:
			body.respawn()
		elif body is PlayerBody:
			body.respawn(player_spawn())
		else:
			continue
		respawned.emit(id, body.global_position)


func _targets() -> Array:
	var targets: Array = []
	for player in players:
		targets.append({"id": player.id, "pos": player.global_position, "alive": not player.is_dead})
	return targets


func _spawn_enemy(enemy_id: String, at: Vector3) -> EnemyBody:
	var body: EnemyBody = ENEMY_BODY_SCENE.instantiate()
	body.enemy_id = enemy_id
	body.spawn_position = at
	body.id = _take_id()
	_enemies_root.add_child(body)
	# Voltou para casa com a vida cheia: quem bateu antes não conta mais para a XP.
	body.returned_home.connect(func() -> void: _participants.erase(body.id))
	enemies.append(body)
	_entities[body.id] = body
	entity_added.emit(body.id, body)
	return body


func _child_root(root_name: String) -> Node3D:
	var root := Node3D.new()
	root.name = root_name
	add_child(root)
	return root


func _take_id() -> int:
	_next_id += 1
	return _next_id - 1
