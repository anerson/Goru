extends Node
## Teste de fumaça: roda a cena principal em modo headless e verifica o loop básico.
## Uso: godot --headless --path . res://tests/smoke_test.tscn

var failures := 0


func _ready() -> void:
	_test_rules()
	_test_layers()
	await _test_sim_without_view()
	await _test_two_players()

	var main: Node3D = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame
	var world: WorldSim = main.world

	_check(GameData.classes.size() >= 2, "carrega as classes")
	_check(world.enemies.size() == GameData.zone.inimigos.size(), "cria todos os inimigos da zona")
	_check(main.views_root.get_children().filter(func(v): return v is EnemyView).size() == world.enemies.size(), "cada inimigo tem uma view")

	main.start_game("guerreiro")
	var player: PlayerBody = main.player
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
	world.apply_damage(WorldSim.NO_ENTITY, player.id, 99999)
	_check(player.is_dead, "jogador morre")
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
	# Em diagonal, para o corpo de quem morreu não ficar no caminho até o próximo alvo
	# (corpos ainda colidem entre si até a RD-002).
	var a := world.add_player("guerreiro", Vector3(0, 0.1, 3))
	var b := world.add_player("cacador", Vector3(4, 0.1, 4))
	var c := world.add_player("guerreiro", Vector3(-6, 0.1, 8))
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
