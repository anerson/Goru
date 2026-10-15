extends Node
## Diagnóstico: um bot joga cada classe por alguns minutos e mede o combate.
## O bot entrega um InputFrame por tick ao jogador, como o teclado faria; não usa o Input global.
## Tudo conta em ticks de física, então o resultado não depende do FPS (ver tests/referencia_diagnostico.md).
## Com tela, também salva capturas. Uso:
##   godot --path . res://tests/diagnostico.tscn -- --saida=/pasta --segundos=120
## Missões ficam desligadas (a XP delas mudaria o combate medido); --com-missoes liga, só para comparar.

var out_dir := ""
var seconds := 120.0
var with_quests := false
var main: Node3D
var player: CharacterBody3D
var metrics := {}
var bot_frame := InputFrame.new()
var _bot_yaw := 0.0
var _health_snapshot := 0.0


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--saida="):
			out_dir = arg.trim_prefix("--saida=")
		elif arg.begins_with("--segundos="):
			seconds = float(arg.trim_prefix("--segundos="))
		elif arg == "--com-missoes":
			with_quests = true
	var report := []
	for class_id: String in GameData.classes:
		report.append(await _run_class(class_id))
	print("\n=== RESULTADO ===")
	for line in report:
		print(line)
	get_tree().quit()


func _run_class(class_id: String) -> String:
	main = load("res://scenes/main.tscn").instantiate()
	# Missões desligadas: a XP das recompensas mudaria nível e dano do bot e tiraria o
	# diagnóstico da referência (tests/referencia_diagnostico.md). O bot mede só o combate.
	main.quests_enabled = with_quests
	add_child(main)
	# Esperas em ticks de física, para o estado inicial não depender do FPS.
	await _physics_frames(5)
	await _shot("%s_0_menu" % class_id)
	main.start_game(class_id)
	player = main.player
	bot_frame = InputFrame.new()
	player.input_source = _bot_input
	metrics = {"dano_causado": 0.0, "dano_recebido": 0.0, "mortes": 0, "abates": 0,
		"tempo_andando": 0.0, "tempo_atacando": 0.0, "tempo_morto": 0.0, "ttk": [], "fps": []}
	player.health_changed.connect(_on_health_changed.bind([player.health]))
	player.died.connect(func(): metrics.mortes += 1)
	player.ability_used.connect(_on_ability_used)
	player.ability_resolved.connect(_on_ability_resolved)
	main.world.entity_died.connect(_on_entity_died)
	await _physics_frames(30)
	await _shot("%s_1_inicio" % class_id)

	var engaged_at := {}
	var elapsed := 0.0
	var shots_taken := 0
	while elapsed < seconds:
		var delta := get_physics_process_delta_time()
		await get_tree().physics_frame
		elapsed += delta
		metrics.fps.append(Engine.get_frames_per_second())
		_bot_step(delta, engaged_at, elapsed)
		if shots_taken < 3 and elapsed > 6.0 + shots_taken * 12.0:
			await _shot("%s_%d_combate" % [class_id, shots_taken + 2])
			shots_taken += 1
	bot_frame = InputFrame.new()

	var ttk: Array = metrics.ttk
	var avg_ttk: float = 0.0 if ttk.is_empty() else ttk.reduce(func(a, b): return a + b) / ttk.size()
	var fps: Array = metrics.fps
	var avg_fps: float = fps.reduce(func(a, b): return a + b) / maxi(fps.size(), 1)
	var quests_done: int = main.world.quest_state(player.id).get("concluidas", []).size()
	var line := ("[com missões: %d concluídas] " % quests_done if with_quests else "") + "%s: nível %d, abates %d, mortes %d, dano causado %d, recebido %d, TTK médio %.1fs, andando %d%%, atacando %d%%, morto %d%%, FPS %.0f" % [
		GameData.classes[class_id].nome, player.level, metrics.abates, metrics.mortes,
		metrics.dano_causado, metrics.dano_recebido, avg_ttk,
		100.0 * metrics.tempo_andando / seconds, 100.0 * metrics.tempo_atacando / seconds,
		100.0 * metrics.tempo_morto / seconds, avg_fps]
	main.queue_free()
	await _frames(2)
	return line


## Decide o quadro de entrada deste tick. Roda no início do tick, antes do _physics_process do jogador.
func _bot_step(delta: float, engaged_at: Dictionary, now: float) -> void:
	var frame := InputFrame.new()
	frame.seq = bot_frame.seq + 1
	frame.yaw = _bot_yaw
	bot_frame = frame
	if player.is_dead:
		metrics.tempo_morto += delta
		return
	var target: Node3D = null
	var best := INF
	for enemy in main.world.enemies:
		if not enemy.is_alive():
			if engaged_at.has(enemy):
				metrics.ttk.append(now - engaged_at[enemy])
				engaged_at.erase(enemy)
			continue
		var d: float = enemy.global_position.distance_to(player.global_position)
		if d < best:
			best = d
			target = enemy
	if target == null:
		return
	var to_target := target.global_position - player.global_position
	_bot_yaw = atan2(-to_target.x, -to_target.z)
	frame.yaw = _bot_yaw
	main.camera_rig.rotation.y = _bot_yaw  # Só para as capturas de tela.
	var attack_range: float = player.stats.ataque.alcance
	if best > attack_range * 0.8:
		frame.move = Vector2(0.0, -1.0)  # Para a frente, como a tecla W.
		metrics.tempo_andando += delta
	else:
		if not engaged_at.has(target):
			engaged_at[target] = now
		metrics.tempo_atacando += delta
		frame.buttons |= InputFrame.ATTACK
		# A habilidade dispara na borda do botão: o bot só aperta quando ela está pronta,
		# e solta no tick seguinte (com a recarga correndo), como uma pessoa faria.
		if best <= player.stats.habilidade.alcance and player.cooldowns.is_ready("habilidade"):
			frame.buttons |= InputFrame.SKILL


func _bot_input() -> InputFrame:
	return bot_frame


func _on_ability_used(_ability_key: String, _cooldown: float) -> void:
	_health_snapshot = _enemy_health_total()


func _on_ability_resolved(_ability_key: String, _hits: int) -> void:
	metrics.dano_causado += _health_snapshot - _enemy_health_total()


func _enemy_health_total() -> float:
	var total := 0.0
	for enemy in main.world.enemies:
		total += enemy.health
	return total


func _on_entity_died(id: int, _killer_id: int, _participants: Array) -> void:
	if main.world.is_enemy(id):
		metrics.abates += 1


func _on_health_changed(current: float, _maximum: float, last: Array) -> void:
	if current < last[0]:
		metrics.dano_recebido += last[0] - current
	last[0] = current


func _frames(count: int) -> void:
	for i in count:
		await get_tree().process_frame


func _physics_frames(count: int) -> void:
	for i in count:
		await get_tree().physics_frame


func _shot(shot_name: String) -> void:
	if out_dir.is_empty() or DisplayServer.get_name() == "headless":
		return
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [out_dir, shot_name])
