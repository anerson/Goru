extends Node
## Teste de fumaça: roda a cena principal em modo headless e verifica o loop básico.
## Uso: godot --headless --path . res://tests/smoke_test.tscn

## Pasta dos testes de save: dentro de .godot/ (ignorada pelo git), nunca no user:// do jogador.
const SAVE_TEST_DIR := "res://.godot/testes/offline_save"

var failures := 0


func _ready() -> void:
	_test_rules()
	_test_layers()
	await _test_sim_without_view()
	await _test_two_players()
	await _test_collision_layers()
	var real_saves := _real_save_files()
	_remove_dir(SAVE_TEST_DIR)
	_test_offline_save()
	_test_save_isolation()

	var main: Node3D = load("res://scenes/main.tscn").instantiate()
	_check(main.offline_save == null, "save: desligado por padrão quando o jogo roda dentro de um teste")
	var game_saves := OfflineSave.new(SAVE_TEST_DIR + "/jogo")
	main.offline_save = game_saves
	add_child(main)
	await get_tree().process_frame
	var world: WorldSim = main.world

	_check(GameData.classes.size() >= 2, "carrega as classes")
	_check(world.enemies.size() == GameData.zone.inimigos.size(), "cria todos os inimigos da zona")
	_check(main.views_root.get_children().filter(func(v): return v is EnemyView).size() == world.enemies.size(), "cada inimigo tem uma view")

	main.start_game("guerreiro")
	var player: PlayerBody = main.player
	var save_path := game_saves.path_for(main.character.id)
	_check(FileAccess.file_exists(save_path) and _saved_level(save_path) == 1, "save: personagem novo é gravado ao entrar, no nível 1")
	for i in 30:
		await get_tree().physics_frame
	_check(player.is_on_floor(), "jogador fica no chão")
	_check(main.player_view.global_position == player.global_position, "a view do jogador segue o corpo")
	await _test_input_frames(main, player)

	# Coloca um inimigo na frente do jogador e mata ele com ataques.
	# O ponto de origem vai junto para a coleira não mandar o inimigo de volta.
	# Ticks gravados com world.tick: a espera de N ticks inclui o tick da morte,
	# então o renascimento sai no passo world.tick == morte + N - 1.
	var events := {"died": [], "died_tick": {}, "xp": [], "damage": 0, "level_up": [], "respawned": []}
	world.entity_died.connect(func(id: int, killer: int, participants: Array):
		events.died.append([id, killer, participants])
		events.died_tick[id] = world.tick)
	world.xp_gained.connect(func(id: int, amount: int): events.xp.append([id, amount]))
	world.damage_dealt.connect(func(_source: int, _target: int, _amount: float): events.damage += 1)
	world.level_up.connect(func(id: int, level: int): events.level_up.append([id, level]))
	world.respawned.connect(func(id: int, _at: Vector3): events.respawned.append([id, world.tick]))
	var enemy: EnemyBody = world.enemies[0]
	enemy.spawn_position = player.global_position + Vector3(0, 0, -1.5)
	enemy.global_position = enemy.spawn_position
	main.camera_rig.rotation.y = 0.0
	var xp_before: int = player.xp
	var hits := 0
	for i in 20:
		if not enemy.is_alive():
			break
		player.cooldowns.reset("ataque")
		hits += maxi(world.resolve_ability(player.id, "ataque", 0.0), 0)
		await get_tree().physics_frame
	_check(hits > 0 and events.damage >= hits, "ataque acerta inimigo à frente")
	_check(not enemy.is_alive(), "inimigo morre")
	_check(player.xp > xp_before or player.level > 1, "jogador ganha XP")
	_check(events.died.size() == 1 and events.died[0] == [enemy.id, player.id, [player.id]], "evento de morte diz quem matou e quem participou")
	_check(events.xp == [[player.id, int(enemy.stats.xp)]], "evento de XP com a recompensa da tabela")

	# Inimigo atrás não é atingido pelo ataque frontal.
	var behind: EnemyBody = world.enemies[1]
	behind.spawn_position = player.global_position + Vector3(0, 0, 1.5)
	behind.global_position = behind.spawn_position
	player.cooldowns.reset("ataque")
	var health_before: float = behind.health
	world.resolve_ability(player.id, "ataque", 0.0)
	_check(behind.health == health_before, "ataque frontal não acerta atrás")

	# Habilidade de 360° acerta atrás e cura uma fração da vida máxima por inimigo atingido.
	var heal_per_hit: float = player.stats.habilidade.get("cura_por_acerto", 0.0)
	_check(heal_per_hit > 0.0, "golpe giratório tem cura por acerto")
	player.health = player.max_health * 0.5
	var player_health_before: float = player.health
	var spin_hits: int = world.resolve_ability(player.id, "habilidade", 0.0)
	_check(behind.health < health_before, "golpe giratório acerta em volta")
	var expected_health := minf(player_health_before + player.max_health * heal_per_hit * spin_hits, player.max_health)
	_check(spin_hits > 0 and is_equal_approx(player.health, expected_health), "cura por acerto recupera vida")
	_check(world.resolve_ability(player.id, "habilidade", 0.0) == -1, "habilidade em recarga não sai")

	# Cura nunca passa da vida máxima.
	player.health = player.max_health
	player.heal(50.0)
	_check(player.health == player.max_health, "cura não passa da vida máxima")

	# Inimigo travado voltando para casa é teleportado de volta.
	behind.brain.state = EnemyBrain.State.RETURN
	behind.brain.return_timer = GameData.rules.inimigo_tempo_max_volta
	behind.global_position = behind.spawn_position + Vector3(5, 0, 0)
	await get_tree().physics_frame
	_check(behind.brain.state == EnemyBrain.State.IDLE and behind.health == behind.max_health, "inimigo travado volta ao ponto de origem com vida cheia")

	# Morte e renascimento. Afasta os inimigos para nada atacar durante o teste.
	for i in world.enemies.size():
		var e: EnemyBody = world.enemies[i]
		e.spawn_position = GameData.to_vector3(GameData.zone.inimigos[i].posicao)
		e.global_position = e.spawn_position
		if e.is_alive():
			e.brain.state = EnemyBrain.State.IDLE
			e.brain.target_id = EnemyBrain.NO_TARGET
	DirAccess.remove_absolute(save_path)
	world.apply_damage(WorldSim.NO_ENTITY, player.id, 99999)
	_check(player.is_dead, "jogador morre")
	var dead_save := game_saves.load_character(main.character.id)
	_check(dead_save != null and dead_save.position.is_equal_approx(world.player_spawn()), "save: grava ao morrer, já no ponto de renascimento")
	_check(main.hud.death_label.visible, "HUD mostra a tela de morte")
	var respawn_ticks := world.ticks_for(GameData.rules.jogador_renascimento)
	await _physics_frames(respawn_ticks - 1)
	_check(player.is_dead, "jogador ainda morto um tick antes do renascimento")
	await _physics_frames(1)
	_check(not player.is_dead and player.health == player.max_health, "jogador renasce com vida cheia")
	_check(events.respawned.has([player.id, events.died_tick[player.id] + respawn_ticks - 1]), "renascimento do jogador conta em ticks (%d)" % respawn_ticks)
	_check(not main.hud.death_label.visible, "HUD esconde a tela de morte")
	_check(player.global_position.distance_to(world.player_spawn()) < 0.5, "jogador renasce no ponto da zona")

	# Subida de nível.
	var level_before: int = player.level
	world.give_xp(player.id, player.xp_to_next_level())
	_check(player.level == level_before + 1 and events.level_up[-1] == [player.id, level_before + 1], "sobe de nível e emite o evento")
	_check(_saved_level(save_path) == player.level, "save: grava ao subir de nível")
	DirAccess.remove_absolute(save_path)
	main.notification(NOTIFICATION_WM_CLOSE_REQUEST)
	_check(_saved_level(save_path) == player.level, "save: grava ao fechar o jogo")

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

	await _test_continue_from_save(main, game_saves)
	main.offline_save = null
	_remove_dir(SAVE_TEST_DIR)
	DirAccess.remove_absolute(SAVE_TEST_DIR.get_base_dir())  # Só apaga se ficou vazia.
	_check(_real_save_files() == real_saves, "save: o teste não mexeu nos saves do jogador (%s)" % OfflineSave.DEFAULT_DIR)

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
	main.hud._process(0.0)
	var skill_text: String = main.hud.ability_labels.habilidade.text
	_check(skill_text.contains(player.stats.habilidade.nome) and not skill_text.contains("pronto"), "HUD mostra a recarga pelo sinal da habilidade")
	frame.buttons = 0
	player.ability_used.disconnect(on_used)
	player.cooldowns.reset("ataque")
	player.cooldowns.reset("habilidade")
	player.heal(player.max_health)

	# Entrada local: teclado vira quadro; com o chat aberto, nada passa.
	var local := LocalInput.new(main.camera_rig)
	Input.action_press("move_forward")
	Input.action_press("jump")
	var local_frame := local.next_frame()
	_check(local_frame.move.is_equal_approx(Vector2(0, -1)) and local_frame.has(InputFrame.JUMP), "entrada local lê movimento e pulo")
	_check(is_equal_approx(local_frame.yaw, main.camera_rig.rotation.y), "entrada local usa o giro da câmera")
	local.controls_enabled = false
	var blocked := local.next_frame()
	_check(blocked.move == Vector2.ZERO and blocked.buttons == 0 and blocked.seq == local_frame.seq + 1, "controles desligados geram quadro vazio")
	main.hud.chat_toggled.emit(true)
	_check(not main.local_input.controls_enabled and not main.camera_rig.controls_enabled, "abrir o chat desliga os controles")
	main.hud.chat_toggled.emit(false)
	_check(main.local_input.controls_enabled and main.camera_rig.controls_enabled, "fechar o chat religa os controles")
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

	_test_enemy_brain()

	# As regras puras não podem depender de cena, entrada, efeitos nem rede.
	var forbidden := ["extends Node", "Input.", "Fx.", "get_tree", "get_node", "multiplayer", "GameData.", "FileAccess", "DirAccess", "user://"]
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


## EnemyBrain sem corpo nem cena: escolha de alvo entre N jogadores, troca de alvo e coleira (passo 4).
func _test_enemy_brain() -> void:
	var stats := {"alcance_agro": 12.0, "alcance_ataque": 1.8, "recarga": 1.0, "velocidade": 5.0}
	var table := {"inimigo_coleira": 22.0, "inimigo_tempo_max_volta": 6.0, "inimigo_folga_ataque": 1.2,
		"inimigo_velocidade_volta": 1.5, "inimigo_raio_chegada": 0.6}
	var dt := 1.0 / 60.0
	var home := Vector3.ZERO
	var brain := EnemyBrain.new(stats, table)
	var far := {"id": 7, "pos": Vector3(0, 0, 30), "alive": true}
	var result := brain.think(home, home, [far], dt)
	_check(result.state == EnemyBrain.State.IDLE and brain.target_id == EnemyBrain.NO_TARGET, "cérebro: ninguém no agro, fica parado")

	var a := {"id": 1, "pos": Vector3(0, 0, -8), "alive": true}
	var b := {"id": 2, "pos": Vector3(5, 0, 0), "alive": true}
	brain.think(home, home, [a, b], dt)
	_check(brain.state == EnemyBrain.State.CHASE and brain.target_id == 2, "cérebro: escolhe o vivo mais próximo no agro")
	result = brain.think(home, home, [a, b], dt)
	_check(result.move_dir.is_equal_approx(Vector3.RIGHT) and result.move.is_equal_approx(Vector3.RIGHT * 5.0), "cérebro: persegue o alvo na velocidade da tabela")

	# Mantém o alvo mesmo fora do agro e com outro mais perto, enquanto estiver dentro da coleira.
	b.pos = Vector3(20, 0, 0)
	a.pos = Vector3(0, 0, -3)
	result = brain.think(Vector3(4, 0, 0), home, [a, b], dt)
	_check(brain.target_id == 2 and result.move_dir.is_equal_approx(Vector3.RIGHT), "cérebro: mantém o alvo até a coleira")
	result = brain.think(Vector3(23, 0, 0), home, [a, b], dt)
	_check(result.state == EnemyBrain.State.RETURN and brain.target_id == EnemyBrain.NO_TARGET, "cérebro: passou da coleira, volta para casa")
	result = brain.think(Vector3(23, 0, 0), home, [a, b], dt)
	_check(result.move_dir.is_equal_approx(Vector3.LEFT) and result.move.is_equal_approx(Vector3.LEFT * 7.5), "cérebro: volta mais rápido")
	result = brain.think(Vector3(0.3, 0, 0), home, [a, b], dt)
	_check(result.state == EnemyBrain.State.IDLE and result.arrived_home, "cérebro: chega em casa e para")

	# Troca de alvo quando o primeiro morre ou some.
	brain = EnemyBrain.new(stats, table)
	a = {"id": 1, "pos": Vector3(0, 0, -1), "alive": true}
	b = {"id": 2, "pos": Vector3(0, 0, 4), "alive": true}
	var c := {"id": 3, "pos": Vector3(0, 0, 8), "alive": true}
	brain.think(home, home, [a, b, c], dt)  # Parado -> perseguindo o mais próximo.
	result = brain.think(home, home, [a, b, c], dt)  # Perseguindo -> atacando (já no alcance).
	_check(result.state == EnemyBrain.State.ATTACK and brain.target_id == 1, "cérebro: alvo no alcance passa a atacar")
	result = brain.think(home, home, [a, b, c], dt)
	_check(result.attack_target_id == 1, "cérebro: alvo no alcance leva o golpe")
	result = brain.think(home, home, [a, b, c], dt)
	_check(result.attack_target_id == EnemyBrain.NO_TARGET and result.face_point == a.pos, "cérebro: espera a recarga entre golpes")
	a.alive = false
	result = brain.think(home, home, [a, b, c], dt)
	_check(brain.target_id == 2 and result.state == EnemyBrain.State.CHASE, "cérebro: alvo morreu, troca para o próximo vivo")
	result = brain.think(home, home, [a, c], dt)
	_check(brain.target_id == 3 and result.move_dir.is_equal_approx(Vector3.BACK), "cérebro: alvo sumiu da lista, troca para o próximo")
	result = brain.think(home, home, [a], dt)
	_check(result.state == EnemyBrain.State.RETURN, "cérebro: sem ninguém vivo, volta para casa")

	# Dano acorda o inimigo parado contra quem bateu; voltando para casa, ignora dano.
	brain = EnemyBrain.new(stats, table)
	brain.on_damaged(9)
	_check(brain.state == EnemyBrain.State.CHASE and brain.target_id == 9, "cérebro: levar dano parado persegue quem bateu")
	brain.state = EnemyBrain.State.RETURN
	_check(brain.ignores_damage(), "cérebro: voltando para casa ignora dano")
	brain.return_timer = 6.0
	result = brain.think(Vector3(9, 0, 9), home, [], dt)
	_check(result.teleport_home and result.arrived_home and result.state == EnemyBrain.State.IDLE, "cérebro: travado voltando, vai direto para casa")
	brain.on_died()
	result = brain.think(home, home, [b], dt)
	_check(not brain.is_alive() and result.state == EnemyBrain.State.DEAD and result.attack_target_id == EnemyBrain.NO_TARGET, "cérebro: morto não age")
	brain.on_respawned()
	_check(brain.state == EnemyBrain.State.IDLE and brain.target_id == EnemyBrain.NO_TARGET, "cérebro: renasce parado e sem alvo")


## Inimigo com vários jogadores na mesma simulação: escolhe o mais próximo, troca de alvo
## quando ele morre ou some, mantém o alvo fora do agro e respeita a coleira (passo 4).
## Depois, XP de grupo e renascimento em ticks (passo 5).
func _test_two_players() -> void:
	var viewport := _isolated_world()
	var world := WorldSim.new()
	viewport.add_child(world)
	world.setup({
		"nome": "Teste",
		"spawn_jogador": [0, 0.1, 60],
		"chao": {"posicao": [0, -0.5, 0], "tamanho": [140, 1, 140]},
		"inimigos": [{"tipo": "lobo_sombrio", "posicao": [0, 0.1, 0]}],
		"obstaculos": [],
	})
	var wolf: EnemyBody = world.enemies[0]
	# Em fila: o inimigo passa por dentro de quem morreu para chegar ao próximo (RD-002).
	var a := world.add_player("guerreiro", Vector3(0, 0.1, 3))
	var b := world.add_player("cacador", Vector3(0, 0.1, 6))
	var c := world.add_player("guerreiro", Vector3(0, 0.1, 10))
	var brain := wolf.brain
	var leash: float = GameData.rules.inimigo_coleira

	var ok := await _wait_until(func(): return a.health < a.max_health, 120)
	_check(ok and brain.target_id == a.id and b.health == b.max_health, "2 jogadores: inimigo ataca o mais próximo")
	world.apply_damage(WorldSim.NO_ENTITY, a.id, 99999)
	ok = await _wait_until(func(): return brain.target_id == b.id, 5)
	_check(ok, "2 jogadores: o primeiro morreu, o inimigo troca para o outro")
	ok = await _wait_until(func(): return b.health < b.max_health, 180)
	_check(ok and brain.target_id == b.id, "2 jogadores: o inimigo ataca o novo alvo")
	var b_id := b.id
	world.remove_player(b_id)
	ok = await _wait_until(func(): return brain.target_id == c.id, 5)
	_check(ok and world.get_entity(b_id) == null and world.players.size() == 2, "2 jogadores: o alvo saiu da instância, o inimigo troca para quem sobrou")

	# Alvo foge para longe: fora do agro ele continua sendo perseguido, até a coleira.
	await _wait_until(func(): return brain.state == EnemyBrain.State.ATTACK, 120)
	c.global_position = Vector3(0, 0.1, 40)
	var kept := true
	ok = await _wait_until(func():
		var from_home := EnemyBrain.flat_distance(wolf.global_position, wolf.spawn_position)
		var to_target := EnemyBrain.flat_distance(wolf.global_position, c.global_position)
		if from_home <= leash and to_target > wolf.stats.alcance_agro:
			kept = kept and brain.target_id == c.id and brain.state == EnemyBrain.State.CHASE
		return brain.state == EnemyBrain.State.RETURN, 360)
	_check(ok and kept, "2 jogadores: mantém o alvo fora do agro até a coleira")
	_check(EnemyBrain.flat_distance(wolf.global_position, wolf.spawn_position) > leash and brain.target_id == EnemyBrain.NO_TARGET, "2 jogadores: passou da coleira, larga o alvo")
	ok = await _wait_until(func(): return brain.state == EnemyBrain.State.IDLE, 420)
	_check(ok and EnemyBrain.flat_distance(wolf.global_position, wolf.spawn_position) < 1.0, "2 jogadores: volta para casa depois da coleira")
	_check(not a.is_dead and a.global_position.distance_to(world.player_spawn()) < 1.0, "2 jogadores: o morto renasce no ponto da zona")

	# XP de grupo (decisão do dono do projeto): cheia para cada jogador que causou dano.
	# Daqui em diante os ticks são dados à mão, sem esperar o relógio.
	world.set_physics_process(false)
	var d := world.add_player("cacador", Vector3(0, 0.1, 50))
	var died: Array = []
	world.entity_died.connect(func(id: int, killer: int, participants: Array): died.append([id, killer, participants]))
	var gained := {}
	world.xp_gained.connect(func(id: int, amount: int): gained[id] = amount)
	var respawn_tick := [-1]
	world.respawned.connect(func(id: int, _at: Vector3): if id == wolf.id: respawn_tick[0] = world.tick)
	world.apply_damage(a.id, wolf.id, 10)
	world.apply_damage(c.id, wolf.id, 99999)
	var reward: int = wolf.stats.xp
	_check(died == [[wolf.id, c.id, [a.id, c.id]]], "XP de grupo: a morte lista quem matou e quem causou dano")
	_check(gained == {a.id: reward, c.id: reward} and d.xp == 0, "XP de grupo: XP cheia para cada um que causou dano, nada para quem não bateu")

	# Renascimento do inimigo em ticks: a morte foi fora de um passo, então o primeiro
	# decremento é o do próximo passo, e o renascimento sai no passo N.
	var died_at := world.tick
	var ticks := world.ticks_for(wolf.stats.respawn)
	var dt := 1.0 / world.tick_rate
	for i in ticks - 1:
		world.step(dt)
	_check(not wolf.is_alive(), "inimigo ainda morto um tick antes do renascimento")
	world.step(dt)
	_check(wolf.is_alive() and respawn_tick[0] == died_at + ticks - 1 and wolf.health == wolf.max_health, "inimigo renasce depois de %d ticks, com vida cheia" % ticks)
	viewport.queue_free()
	await _physics_frames(1)


## Save offline (passo 7): gravação atômica com .bak, leitura, recuperação de arquivo quebrado e
## recusa de formato desconhecido. Tudo na pasta de teste.
func _test_offline_save() -> void:
	var store := OfflineSave.new(SAVE_TEST_DIR + "/unidade")
	var id := OfflineSave.new_id()
	_check(store.is_valid_id(id) and id.begins_with("off-") and id.length() == 40 and id != OfflineSave.new_id(), "save: id off-<uuid>, novo a cada personagem")
	_check(not store.is_valid_id("off-../../x") and not store.is_valid_id("on-" + id.trim_prefix("off-")), "save: recusa id que não é off-<uuid>")
	_check(store.load_character("../segredo") == null and store.last_status == OfflineSave.Status.INVALID_ID, "save: não lê caminho fora da pasta")
	_check(store.list_ids().is_empty() and store.latest_for_class("guerreiro") == null, "save: pasta vazia não tem personagem")

	var state := CharacterState.new()
	state.id = id
	state.display_name = "Arin"
	state.class_id = "guerreiro"
	state.level = 3
	state.xp = 40
	state.zone_id = "zona_1"
	state.position = Vector3(1.5, 1.0, -2.25)
	state.played_seconds = 1234
	_check(store.save(state) == OK, "save: grava o personagem")
	var path := store.path_for(id)
	_check(path == SAVE_TEST_DIR + "/unidade/" + id + ".json", "save: arquivo <pasta>/off-<uuid>.json")
	var file: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	var keys: Array = file.personagem.keys() if file is Dictionary and file.get("personagem") is Dictionary else []
	keys.sort()
	_check(file is Dictionary and file.formato == OfflineSave.FORMAT and file.versao_jogo == ProjectSettings.get_setting("application/config/version") and str(file.salvo_em).ends_with("Z"), "save: arquivo com formato, versão do jogo e hora")
	_check(keys == ["classe", "id", "nivel", "nome", "posicao", "tempo_jogado_s", "xp", "zona"], "save: personagem com as chaves da arquitetura, sem vida")
	_check(not FileAccess.file_exists(path + ".tmp") and not FileAccess.file_exists(path + ".bak"), "save: primeira gravação sem .tmp nem .bak")
	var loaded := store.load_character(id)
	_check(loaded != null and loaded.to_dict() == state.to_dict() and not store.last_from_backup, "save: carrega igual ao que gravou")
	_check(loaded != null and typeof(loaded.level) == TYPE_INT and typeof(loaded.xp) == TYPE_INT, "save: nível e XP voltam como inteiros")

	# Segunda gravação: a anterior vira .bak.
	state.level = 4
	store.save(state)
	_check(_saved_level(path) == 4 and _saved_level(path + ".bak") == 3 and not FileAccess.file_exists(path + ".tmp"), "save: a gravação anterior vira .bak")

	# Arquivo principal quebrado: usa o .bak, e a próxima gravação não troca o .bak bom pelo quebrado.
	_write(path, "{\"formato\": 1, \"personagem\": {\"id\": ")
	loaded = store.load_character(id)
	_check(loaded != null and loaded.level == 3 and store.last_from_backup, "save: arquivo corrompido recupera o .bak")
	state.level = 5
	store.save(state)
	_check(_saved_level(path) == 5 and _saved_level(path + ".bak") == 3, "save: arquivo quebrado não vira .bak")
	DirAccess.remove_absolute(path)
	loaded = store.load_character(id)
	_check(loaded != null and loaded.level == 3 and store.last_from_backup, "save: sem o arquivo principal, usa o .bak")
	_check(store.list_ids() == [id], "save: lista o personagem que só tem .bak")
	var broken := {"formato": 1, "personagem": {"id": id, "nome": "Arin", "classe": "guerreiro", "nivel": 0, "xp": 0, "zona": "zona_1", "posicao": [0, 0, 0], "tempo_jogado_s": 0}}
	_write(path, JSON.stringify(broken))
	loaded = store.load_character(id)
	_check(loaded != null and loaded.level == 3 and store.last_from_backup, "save: JSON válido com dado impossível (nível 0) também recupera o .bak")
	_write(path + ".bak", "não é json")
	_check(store.load_character(id) == null and store.last_status == OfflineSave.Status.CORRUPT, "save: os dois quebrados, devolve nada sem travar")

	# Formato desconhecido (de uma versão mais nova): recusa sem travar, sem usar o .bak e sem mexer no arquivo.
	state.level = 9
	var future := {"formato": 99, "versao_jogo": "9.9.9", "salvo_em": "2030-01-01T00:00:00Z", "personagem": state.to_dict()}
	_write(path, JSON.stringify(future))
	state.level = 3
	_write(path + ".bak", JSON.stringify({"formato": 1, "salvo_em": "2026-01-01T00:00:00Z", "personagem": state.to_dict()}))
	var before := FileAccess.get_file_as_string(path)
	_check(store.load_character(id) == null and store.last_status == OfflineSave.Status.UNKNOWN_FORMAT and not store.last_from_backup, "save: formato desconhecido é recusado sem travar")
	_check(FileAccess.get_file_as_string(path) == before, "save: formato desconhecido não é alterado")
	_check(OfflineSave.migrate({"formato": 1.0}) == {"formato": 1.0} and OfflineSave.migrate({"formato": 2}).is_empty() and OfflineSave.migrate({}).is_empty(), "save: migrate conhece o formato 1 e recusa os outros")

	# O mais recente da classe: pela hora gravada; ignora outra classe e o formato desconhecido.
	for entry in [["2026-03-01T10:00:00Z", "guerreiro", 2], ["2026-03-02T10:00:00Z", "guerreiro", 7], ["2026-04-01T10:00:00Z", "cacador", 4]]:
		var other := CharacterState.new()
		other.id = OfflineSave.new_id()
		other.display_name = "Outro"
		other.class_id = entry[1]
		other.level = entry[2]
		other.zone_id = "zona_1"
		_write(store.path_for(other.id), JSON.stringify({"formato": 1, "versao_jogo": "0.1.0", "salvo_em": entry[0], "personagem": other.to_dict()}))
	var latest := store.latest_for_class("guerreiro")
	_check(latest != null and latest.level == 7, "save: continua do save mais recente da classe")
	_check(store.latest_for_class("cacador").level == 4 and store.latest_for_class("mago") == null, "save: cada classe acha o seu, classe sem save não acha nada")

	# CharacterState recusa dado incompleto ou impossível.
	var valid := state.to_dict()
	_check(CharacterState.from_dict(valid) != null, "estado do personagem: dicionário completo é aceito")
	for bad: Array in [["classe", null], ["nivel", 0], ["xp", -1], ["posicao", [1, 2]], ["id", 7], ["nivel", "3"]]:
		var data := valid.duplicate()
		if bad[1] == null:
			data.erase(bad[0])
		else:
			data[bad[0]] = bad[1]
		_check(CharacterState.from_dict(data) == null, "estado do personagem: recusa %s = %s" % [bad[0], var_to_str(bad[1])])


## Nenhum código fora de scripts/offline/ conhece o save offline (nem a classe, nem a pasta).
func _test_save_isolation() -> void:
	var outside: Array[String] = []
	for path in _script_files("res://scripts"):
		if not path.begins_with("res://scripts/offline/"):
			outside.append(path)
	_check(outside.size() > 10, "save: confere %d scripts fora de scripts/offline/" % outside.size())
	var clean := true
	for path in outside:
		clean = _code_free_of(path, ["OfflineSave", "offline_save", "user://offline"]) and clean
	_check(clean, "save: nenhum código fora de scripts/offline/ lê o save offline")


## Continuar do save: com um save da classe, o jogo novo começa dele (mesmo id, nível, XP e lugar).
func _test_continue_from_save(main: Node3D, saves: OfflineSave) -> void:
	var saved: CharacterState = saves.load_character(main.character.id)
	var again: Node3D = load("res://scenes/main.tscn").instantiate()
	again.offline_save = saves
	add_child(again)
	await get_tree().process_frame
	again.start_game("guerreiro")
	var body: PlayerBody = again.player
	_check(again.character.id == saved.id and body.level == saved.level and body.xp == saved.xp, "save: o jogo continua do save da mesma classe (nível %d)" % body.level)
	_check(body.health == body.max_health and body.max_health == Progression.max_health_for(body.stats, saved.level), "save: volta com a vida cheia do nível")
	_check(body.global_position.is_equal_approx(saved.position), "save: volta onde foi salvo")
	_check(saves.list_ids().size() == 1, "save: continuar não cria outro personagem")
	again.offline_save = null
	again.queue_free()
	await _physics_frames(1)


## Nível gravado num arquivo de save (-1 se não der para ler).
func _saved_level(path: String) -> int:
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(path)) if FileAccess.file_exists(path) else null
	if data is Dictionary and data.get("personagem") is Dictionary:
		return int(data.personagem.get("nivel", -1))
	return -1


func _write(path: String, text: String) -> void:
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(text)
	file.close()


## Arquivos na pasta real de saves do jogador, com a hora de modificação (só leitura).
func _real_save_files() -> Dictionary:
	var found := {}
	if DirAccess.dir_exists_absolute(OfflineSave.DEFAULT_DIR):
		for file_name in DirAccess.get_files_at(OfflineSave.DEFAULT_DIR):
			found[file_name] = FileAccess.get_modified_time(OfflineSave.DEFAULT_DIR + "/" + file_name)
	return found


## Apaga uma pasta de teste com tudo dentro.
func _remove_dir(path: String) -> void:
	if not DirAccess.dir_exists_absolute(path):
		return
	for sub in DirAccess.get_directories_at(path):
		_remove_dir(path + "/" + sub)
	for file_name in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path + "/" + file_name)
	DirAccess.remove_absolute(path)


## Todos os .gd dentro de `folder`, recursivo.
func _script_files(folder: String) -> Array[String]:
	var found: Array[String] = []
	for sub in DirAccess.get_directories_at(folder):
		found.append_array(_script_files(folder + "/" + sub))
	for file_name in DirAccess.get_files_at(folder):
		if file_name.ends_with(".gd"):
			found.append(folder + "/" + file_name)
	return found


## RD-002: camadas 1 = mundo, 2 = jogadores, 3 = inimigos, e todo corpo móvel colide só com o
## mundo. Jogador atravessa jogador e inimigo, e inimigos não se empurram.
func _test_collision_layers() -> void:
	_check(PhysicsLayers.WORLD == 1 << 0 and PhysicsLayers.PLAYERS == 1 << 1 and PhysicsLayers.ENEMIES == 1 << 2, "camadas: 1 mundo, 2 jogadores, 3 inimigos")
	for layer in [[1, "mundo"], [2, "jogadores"], [3, "inimigos"]]:
		_check(ProjectSettings.get_setting("layer_names/3d_physics/layer_%d" % layer[0]) == layer[1], "camada %d se chama %s no editor" % layer)
	var viewport := _isolated_world()
	var world := WorldSim.new()
	viewport.add_child(world)
	world.setup({
		"nome": "Teste",
		"spawn_jogador": [0, 0.1, 60],
		"chao": {"posicao": [0, -0.5, 0], "tamanho": [140, 1, 140]},
		"inimigos": [{"tipo": "lobo_sombrio", "posicao": [0, 0.1, 0]}, {"tipo": "lobo_sombrio", "posicao": [0, 0.1, 0]}],
		"obstaculos": [{"posicao": [30, 0, 0], "tamanho": [2, 2, 2]}],
	})
	var walker := world.add_player("guerreiro", Vector3(0, 0.1, 6))
	var blocker := world.add_player("cacador", Vector3(0, 0.1, 3))
	var statics := world.find_children("*", "StaticBody3D", true, false)
	_check(statics.size() == 2 and statics.all(func(body: StaticBody3D): return body.collision_layer == PhysicsLayers.WORLD), "chão e obstáculos na camada do mundo")
	_check(walker.collision_layer == PhysicsLayers.PLAYERS and walker.collision_mask == PhysicsLayers.WORLD, "jogador na camada 2, colide só com o mundo")
	var wolf: EnemyBody = world.enemies[0]
	_check(wolf.collision_layer == PhysicsLayers.ENEMIES and wolf.collision_mask == PhysicsLayers.WORLD, "inimigo na camada 3, colide só com o mundo")
	await _physics_frames(10)

	# Anda 90 ticks para -Z, passando pelo outro jogador (z = 3) e pelos lobos (z = 0):
	# ninguém segura, então anda a distância cheia.
	var frame := InputFrame.new()
	frame.move = Vector2(0, -1)
	walker.input_source = func() -> InputFrame: return frame
	var start := walker.global_position
	var ticks := 90
	await _physics_frames(ticks)
	var expected: float = walker.stats.velocidade * ticks / float(world.tick_rate)
	var walked := start.z - walker.global_position.z
	_check(absf(walked - expected) < 0.05 and walker.global_position.z < -1.0, "jogador atravessa jogador e inimigos (andou %.2f de %.2f m)" % [walked, expected])
	var gap := EnemyBrain.flat_distance(world.enemies[0].global_position, world.enemies[1].global_position)
	_check(gap < 0.1, "inimigos no mesmo ponto não se empurram (%.2f m)" % gap)

	# O mundo continua sólido: andando contra o obstáculo, o jogador para nele.
	frame.move = Vector2.ZERO
	walker.global_position = Vector3(26, 0.1, 0)
	frame.yaw = -PI / 2.0  # Olha e anda para +X.
	frame.move = Vector2(0, -1)
	await _physics_frames(120)
	_check(walker.global_position.x < 29.0 - 0.3, "o mundo continua sólido para o jogador (x = %.2f)" % walker.global_position.x)
	walker.input_source = Callable()
	viewport.queue_free()
	await _physics_frames(1)


## Espera, tick a tick, até `condition` ser verdadeira ou passar de `max_ticks`.
func _wait_until(condition: Callable, max_ticks: int) -> bool:
	for i in max_ticks:
		if condition.call():
			return true
		await get_tree().physics_frame
	return condition.call()


## Mundo de física separado (SubViewport com World3D próprio), para a simulação de um teste
## não esbarrar na cena principal nem em outro teste.
func _isolated_world() -> SubViewport:
	var viewport := SubViewport.new()
	viewport.own_world_3d = true
	viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
	add_child(viewport)
	return viewport


## Nós de apresentação encontrados em `root` (malha, câmera, rótulo 3D, interface).
func _view_nodes(root: Node) -> Array[Node]:
	var found: Array[Node] = []
	for node in root.find_children("*", "", true, false):
		if node is MeshInstance3D or node is Camera3D or node is Label3D or node is CanvasItem or node is SpringArm3D:
			found.append(node)
	return found


## A simulação roda alguns segundos sem nenhuma view: sem malha, câmera, rótulo, HUD nem Fx (passo 3).
## É a mesma WorldSim do jogo, com a zona inteira, como o servidor vai usar.
func _test_sim_without_view() -> void:
	var viewport := _isolated_world()
	var world := WorldSim.new()
	viewport.add_child(world)
	world.setup(GameData.zone)
	var enemy: EnemyBody = world.enemies[0]
	var player := world.add_player("guerreiro", enemy.spawn_position + Vector3(0, 0, 2))
	var frame := InputFrame.new()
	frame.buttons = InputFrame.ATTACK  # Giro 0 olha para -Z, onde está o inimigo.
	player.input_source = func() -> InputFrame: return frame
	var dealt := {"by_player": 0, "to_player": 0}
	world.damage_dealt.connect(func(source: int, target: int, _amount: float):
		if source == player.id:
			dealt.by_player += 1
		if target == player.id:
			dealt.to_player += 1)

	await _physics_frames(180)
	_check(_view_nodes(viewport).is_empty(), "simulação sem view não tem malha, câmera nem rótulo")
	_check(world.tick >= 170, "sem view, a simulação avança os ticks")
	_check(dealt.by_player > 0 and enemy.health < enemy.max_health or not enemy.is_alive(), "sem view, o jogador acerta o inimigo")
	_check(dealt.to_player > 0 and player.health < player.max_health, "sem view, os inimigos acertam o jogador")
	_check(player.is_on_floor(), "sem view, o jogador fica no chão")
	viewport.queue_free()
	await _physics_frames(1)


## Separação em camadas: a simulação não desenha e o HUD não lê o estado do jogador.
func _test_layers() -> void:
	var sim_forbidden := ["Fx.", "Input.", "Camera3D", "MeshInstance3D", "Label3D", "create_tween", "material", "res://scripts/view", "view/"]
	for file_name in DirAccess.get_files_at("res://scripts/sim"):
		if file_name.ends_with(".gd"):
			_check(_code_free_of("res://scripts/sim/" + file_name, sim_forbidden), "sim/%s não tem apresentação" % file_name)
	for scene in ["player_body", "enemy_body"]:
		var text := FileAccess.get_file_as_string("res://scenes/%s.tscn" % scene)
		_check(not text.contains("MeshInstance3D") and not text.contains("Camera3D") and not text.contains("Label3D"), "scenes/%s.tscn sem malha, câmera nem rótulo" % scene)
	_check(_code_free_of("res://scripts/hud.gd", ["cooldowns", "controls_enabled"]), "hud.gd não mexe em recarga nem em controles")
	# Do jogador, o HUD só pode tocar nos sinais.
	var touched := {}
	for found in RegEx.create_from_string("player\\.(\\w+)").search_all(FileAccess.get_file_as_string("res://scripts/hud.gd")):
		touched[found.get_string(1)] = true
	var allowed := ["health_changed", "xp_changed", "ability_used"]
	_check(touched.keys().all(func(member: String): return allowed.has(member)), "hud.gd só ouve sinais do jogador (%s)" % ", ".join(touched.keys()))
	_check(_code_free_of("res://scripts/offline/local_input.gd", ["player"]), "entrada local não conhece o corpo do jogador")
	# Toda espera de regra conta em ticks dentro da WorldSim (passo 5).
	for folder in ["res://scripts/sim", "res://scripts/rules"]:
		for file_name in DirAccess.get_files_at(folder):
			if file_name.ends_with(".gd"):
				_check(_code_free_of(folder + "/" + file_name, ["await", "create_timer", "Timer.new"]), "%s/%s sem timer nem await" % [folder.get_file(), file_name])
	_check(not FileAccess.file_exists("res://scripts/main.gd") and FileAccess.file_exists("res://scripts/offline/offline_game.gd"), "main.gd virou offline/offline_game.gd")


## Diz se nenhuma linha de código (fora comentários) de `path` contém uma das palavras.
func _code_free_of(path: String, words: Array) -> bool:
	for line in FileAccess.get_file_as_string(path).split("\n"):
		var code := line.strip_edges()
		if code.begins_with("#"):
			continue
		for word: String in words:
			if code.contains(word):
				print("        %s: %s" % [path, code])
				return false
	return true


func _check(condition: bool, description: String) -> void:
	print(("  ok    " if condition else "  FALHA ") + description)
	if not condition:
		failures += 1
