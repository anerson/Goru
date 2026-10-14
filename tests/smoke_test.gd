extends Node
## Teste de fumaça: roda a cena principal em modo headless e verifica o loop básico.
## Uso: godot --headless --path . res://tests/smoke_test.tscn

var failures := 0


func _ready() -> void:
	var main: Node3D = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame

	_check(GameData.classes.size() >= 2, "carrega as classes")
	_check(main.enemies_root.get_child_count() == GameData.zone.inimigos.size(), "cria todos os inimigos da zona")

	main.start_game("guerreiro")
	var player: CharacterBody3D = main.player
	for i in 30:
		await get_tree().physics_frame
	_check(player.is_on_floor(), "jogador fica no chão")

	# Coloca um inimigo na frente do jogador e mata ele com ataques.
	# O ponto de origem vai junto para a coleira (LEASH_DISTANCE) não mandar o inimigo de volta.
	var enemy: CharacterBody3D = main.enemies_root.get_child(0)
	enemy.spawn_position = player.global_position + Vector3(0, 0, -1.5)
	enemy.global_position = enemy.spawn_position
	player.camera_pivot.rotation.y = 0.0
	var xp_before: int = player.xp
	var hits := 0
	for i in 20:
		if not enemy.is_alive():
			break
		player.cooldowns["ataque"] = 0.0
		hits += maxi(player.use_ability("ataque"), 0)
		await get_tree().physics_frame
	_check(hits > 0, "ataque acerta inimigo à frente")
	_check(not enemy.is_alive(), "inimigo morre")
	_check(player.xp > xp_before or player.level > 1, "jogador ganha XP")

	# Inimigo atrás não é atingido pelo ataque frontal.
	var behind: CharacterBody3D = main.enemies_root.get_child(1)
	behind.spawn_position = player.global_position + Vector3(0, 0, 1.5)
	behind.global_position = behind.spawn_position
	player.cooldowns["ataque"] = 0.0
	var health_before: float = behind.health
	player.use_ability("ataque")
	_check(behind.health == health_before, "ataque frontal não acerta atrás")

	# Habilidade de 360° acerta atrás e cura uma fração da vida máxima por inimigo atingido.
	var heal_per_hit: float = player.stats.habilidade.get("cura_por_acerto", 0.0)
	_check(heal_per_hit > 0.0, "golpe giratório tem cura por acerto")
	player.health = player.max_health * 0.5
	var player_health_before: float = player.health
	var spin_hits: int = player.use_ability("habilidade")
	_check(behind.health < health_before, "golpe giratório acerta em volta")
	var expected_health := minf(player_health_before + player.max_health * heal_per_hit * spin_hits, player.max_health)
	_check(spin_hits > 0 and is_equal_approx(player.health, expected_health), "cura por acerto recupera vida")

	# Cura nunca passa da vida máxima.
	player.health = player.max_health
	player.heal(50.0)
	_check(player.health == player.max_health, "cura não passa da vida máxima")

	# Inimigo travado voltando para casa é teleportado de volta.
	behind.state = behind.State.RETURN
	behind.return_timer = behind.MAX_RETURN_TIME
	behind.global_position = behind.spawn_position + Vector3(5, 0, 0)
	await get_tree().physics_frame
	_check(behind.state == behind.State.IDLE, "inimigo travado volta ao ponto de origem")

	# Morte e renascimento. Afasta os inimigos para nada atacar durante o teste.
	for e in get_tree().get_nodes_in_group("enemies"):
		e.spawn_position = GameData.to_vector3(GameData.zone.inimigos[e.get_index()].posicao)
		e.global_position = e.spawn_position
		e.state = e.State.IDLE if e.is_alive() else e.state
	player.take_damage(99999)
	_check(player.is_dead, "jogador morre")
	await get_tree().create_timer(main.RESPAWN_DELAY + 0.2).timeout
	_check(not player.is_dead and player.health == player.max_health, "jogador renasce com vida cheia")

	# Subida de nível.
	var level_before: int = player.level
	player.add_xp(player.xp_to_next_level())
	_check(player.level == level_before + 1, "sobe de nível")

	# Ajudante: sem OpenJarvis, usa falas prontas do elemento.
	var companion: Companion = main.companion
	_check(companion != null and companion.element_id == "folha", "cria o ajudante com o elemento padrão")
	var heard: Array[String] = []
	companion.said.connect(func(text: String): heard.append(text))
	companion.ai_available = false
	companion.ask("Como eu ataco?")
	_check(heard.size() == 1 and companion.element.falas.sem_ia.has(heard[0]), "sem OpenJarvis responde com fala pronta")
	companion.react("morte", true)
	_check(companion.element.falas.morte.has(heard[-1]), "reage a eventos com a fala do elemento")
	_check(companion.game_context().contains("Classe: Guerreiro"), "contexto do ajudante tem a classe")
	_check(Companion.clean_reply("<think>x</think> Oi.", 50) == "Oi.", "remove raciocínio interno da resposta")
	_check(Companion.clean_reply("Primeira frase longa. Segunda frase que passa do limite.", 30) == "Primeira frase longa.", "corta a resposta no fim de uma frase")
	for element_id: String in GameData.companions.elementos:
		var element: Dictionary = GameData.companions.elementos[element_id]
		var complete := true
		for event in ["inicio", "abate", "vida_baixa", "morte", "nivel", "ocioso", "sem_ia"]:
			complete = complete and not element.falas.get(event, []).is_empty()
		_check(complete, "elemento %s tem falas para todos os eventos" % element_id)

	print("SMOKE TEST: %s" % ("OK" if failures == 0 else "%d FALHA(S)" % failures))
	get_tree().quit(1 if failures else 0)


func _check(condition: bool, description: String) -> void:
	print(("  ok    " if condition else "  FALHA ") + description)
	if not condition:
		failures += 1
