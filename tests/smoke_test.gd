extends Node
## Teste de fumaça: roda a cena principal em modo headless e verifica o loop básico.
## Uso: godot --headless --path . res://tests/smoke_test.tscn

var failures := 0


func _ready() -> void:
	_test_rules()

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
	await _test_input_frames(main, player)

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
		player.cooldowns.reset("ataque")
		hits += maxi(player.use_ability("ataque", 0.0), 0)
		await get_tree().physics_frame
	_check(hits > 0, "ataque acerta inimigo à frente")
	_check(not enemy.is_alive(), "inimigo morre")
	_check(player.xp > xp_before or player.level > 1, "jogador ganha XP")

	# Inimigo atrás não é atingido pelo ataque frontal.
	var behind: CharacterBody3D = main.enemies_root.get_child(1)
	behind.spawn_position = player.global_position + Vector3(0, 0, 1.5)
	behind.global_position = behind.spawn_position
	player.cooldowns.reset("ataque")
	var health_before: float = behind.health
	player.use_ability("ataque", 0.0)
	_check(behind.health == health_before, "ataque frontal não acerta atrás")

	# Habilidade de 360° acerta atrás e cura uma fração da vida máxima por inimigo atingido.
	var heal_per_hit: float = player.stats.habilidade.get("cura_por_acerto", 0.0)
	_check(heal_per_hit > 0.0, "golpe giratório tem cura por acerto")
	player.health = player.max_health * 0.5
	var player_health_before: float = player.health
	var spin_hits: int = player.use_ability("habilidade", 0.0)
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


## O jogador só se move e age pelo InputFrame (passo 2 da arquitetura).
func _test_input_frames(main: Node3D, player: CharacterBody3D) -> void:
	var frame := InputFrame.new()
	player.input_source = func() -> InputFrame: return frame

	var start: Vector3 = player.global_position
	frame.move = Vector2(0, -1)
	await _physics_frames(10)
	var moved: Vector3 = player.global_position - start
	_check(moved.z < -0.5 and absf(moved.x) < 0.01, "quadro com giro 0 anda para -Z")
	start = player.global_position
	frame.yaw = PI / 2.0
	await _physics_frames(10)
	moved = player.global_position - start
	_check(moved.x < -0.5 and absf(moved.z) < 0.01, "o giro do quadro define a direção do movimento")
	frame.move = Vector2(0, -0.2)
	start = player.global_position
	await _physics_frames(10)
	_check(is_equal_approx((player.global_position - start).length(), moved.length()), "módulo do movimento não muda a velocidade")
	frame.move = Vector2.ZERO
	await _physics_frames(1)

	frame.buttons = InputFrame.JUMP
	await _physics_frames(1)
	_check(player.velocity.y > 0.0, "botão de pular pula")
	await _physics_frames(90)
	_check(player.is_on_floor(), "segurar o pulo não pula de novo")
	frame.buttons = 0
	await _physics_frames(1)
	frame.buttons = InputFrame.JUMP
	await _physics_frames(1)
	_check(player.velocity.y > 0.0, "soltar e apertar pula de novo")
	frame.buttons = 0
	await _physics_frames(60)

	var used: Array[String] = []
	var on_used := func(key: String, _cooldown: float): used.append(key)
	player.ability_used.connect(on_used)
	frame.buttons = InputFrame.ATTACK
	await _physics_frames(1)
	player.cooldowns.reset("ataque")
	await _physics_frames(1)
	_check(used.count("ataque") == 2, "ataque segurado repete quando a recarga deixa")
	frame.buttons = InputFrame.SKILL
	await _physics_frames(1)
	player.cooldowns.reset("habilidade")
	await _physics_frames(1)
	_check(used.count("habilidade") == 1, "habilidade só dispara ao apertar, não segurando")
	frame.buttons = 0
	player.ability_used.disconnect(on_used)
	player.cooldowns.reset("ataque")
	player.cooldowns.reset("habilidade")
	player.heal(player.max_health)

	# Entrada local: teclado vira quadro; com o chat aberto, nada passa.
	var local := LocalInput.new(player)
	Input.action_press("move_forward")
	Input.action_press("jump")
	var local_frame := local.next_frame()
	_check(local_frame.move.is_equal_approx(Vector2(0, -1)) and local_frame.has(InputFrame.JUMP), "entrada local lê movimento e pulo")
	_check(is_equal_approx(local_frame.yaw, player.camera_pivot.rotation.y), "entrada local usa o giro da câmera")
	player.controls_enabled = false
	var blocked := local.next_frame()
	_check(blocked.move == Vector2.ZERO and blocked.buttons == 0 and blocked.seq == local_frame.seq + 1, "controles desligados geram quadro vazio")
	player.controls_enabled = true
	Input.action_release("move_forward")
	Input.action_release("jump")
	player.input_source = main.local_input.next_frame


func _physics_frames(count: int) -> void:
	for i in count:
		await get_tree().physics_frame


## Regras puras (scripts/rules/): não precisam de cena.
func _test_rules() -> void:
	var table := {"xp_por_nivel": 100, "dano_por_nivel": 0.1}
	_check(GameData.rules.has("xp_por_nivel") and GameData.rules.has("dano_por_nivel"), "carrega data/regras.json")
	_check(Progression.xp_to_next_level(1, table) == 100 and Progression.xp_to_next_level(3, table) == 300, "XP para o próximo nível cresce com o nível")
	_check(Progression.xp_to_next_level(2, {"xp_por_nivel": 50}) == 100, "XP por nível vem da tabela")
	var warrior: Dictionary = GameData.classes.guerreiro
	_check(Progression.max_health_for(warrior, 3) == warrior.vida_base + 2 * warrior.vida_por_nivel, "vida máxima por nível")
	var state := {"level": 1, "xp": 90}
	var gained := Progression.apply_xp(state, 250, table)
	_check(gained == [2, 3] and state.level == 3 and state.xp == 40, "XP sobe vários níveis de uma vez e guarda a sobra")
	gained = Progression.apply_xp(state, 10, table)
	_check(gained.is_empty() and state.level == 3 and state.xp == 50, "XP sem subir de nível só acumula")
	_check(Progression.xp_shares(60, ["a", "b"]) == {"a": 60, "b": 60}, "XP de grupo provisória: cheia para cada participante")

	_check(is_equal_approx(Combat.damage_multiplier(1, table), 1.0) and is_equal_approx(Combat.damage_multiplier(3, table), 1.2), "multiplicador de dano por nível")
	_check(is_equal_approx(Combat.damage_for({"dano": 10}, 3, table), 12.0), "dano da habilidade no nível")
	_check(Combat.forward_from_yaw(0.0).is_equal_approx(Vector3.FORWARD) and Combat.forward_from_yaw(PI / 2.0).is_equal_approx(Vector3.LEFT), "direção da mira pelo giro")
	var fwd := Vector3.FORWARD
	_check(Combat.is_in_arc(Vector3.ZERO, fwd, Vector3(0, 0, -2), 2.6, 100), "arco acerta à frente")
	_check(not Combat.is_in_arc(Vector3.ZERO, fwd, Vector3(0, 0, 2), 2.6, 100), "arco não acerta atrás")
	_check(Combat.is_in_arc(Vector3.ZERO, fwd, Vector3(0, 0, 2), 2.6, 360), "arco de 360 graus acerta atrás")
	_check(not Combat.is_in_arc(Vector3.ZERO, fwd, Vector3(0, 0, -3), 2.6, 100), "arco respeita o alcance")
	_check(Combat.is_in_arc(Vector3.ZERO, fwd, Vector3(0, 5, -2), 2.6, 100), "arco ignora a altura")
	var targets := [
		{"pos": Vector3(0, 0, -2), "alive": true},
		{"pos": Vector3(0, 0, -1), "alive": false},
		{"pos": Vector3(0, 0, 2), "alive": true},
		{"pos": Vector3(1, 0, -1.5), "alive": true},
	]
	_check(Combat.select_targets(Vector3.ZERO, 0.0, {"alcance": 2.6, "angulo": 100}, targets) == [0, 3], "escolhe só alvos vivos dentro do arco")
	_check(is_equal_approx(Combat.heal_for_hits({"cura_por_acerto": 0.05}, 200.0, 3), 30.0), "cura por acerto: fração da vida máxima por alvo")
	_check(Combat.heal_for_hits({}, 200.0, 3) == 0.0 and Combat.heal_for_hits({"cura_por_acerto": 0.05}, 200.0, 0) == 0.0, "sem campo ou sem acerto, sem cura")

	var cooldowns := Cooldowns.new()
	_check(cooldowns.is_ready("ataque") and cooldowns.remaining("ataque") == 0.0, "recarga nunca usada está pronta")
	cooldowns.start("ataque", 1.0)
	cooldowns.tick(0.4)
	_check(not cooldowns.is_ready("ataque") and is_equal_approx(cooldowns.remaining("ataque"), 0.6), "recarga conta o tempo")
	cooldowns.tick(1.0)
	_check(cooldowns.is_ready("ataque") and cooldowns.remaining("ataque") == 0.0, "recarga termina sem ficar negativa")
	cooldowns.start("habilidade", 5.0)
	cooldowns.reset("habilidade")
	_check(cooldowns.is_ready("habilidade"), "recarga pode ser zerada")

	# As regras puras não podem depender de cena, entrada, efeitos nem rede.
	var forbidden := ["extends Node", "Input.", "Fx.", "get_tree", "get_node", "multiplayer", "GameData."]
	for file_name in DirAccess.get_files_at("res://scripts/rules"):
		if not file_name.ends_with(".gd"):
			continue
		var clean := true
		for line in FileAccess.get_file_as_string("res://scripts/rules/" + file_name).split("\n"):
			if line.strip_edges().begins_with("#"):
				continue  # Comentários podem citar esses nomes.
			for word: String in forbidden:
				clean = clean and not line.contains(word)
		_check(clean, "rules/%s é pura" % file_name)


func _check(condition: bool, description: String) -> void:
	print(("  ok    " if condition else "  FALHA ") + description)
	if not condition:
		failures += 1
