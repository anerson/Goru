extends Node
## Teste da interface: dificuldade na escolha de classe, quadro do alvo, barra de habilidades e
## rastreador e avisos de missão.
## Só confere o que a HUD mostra; as regras de combate são do smoke_test.
## Uso: godot --headless --path . res://tests/hud_test.tscn
## Com tela, salva capturas: godot --path . res://tests/hud_test.tscn -- --saida=/pasta

var failures := 0
var out_dir := ""


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--saida="):
			out_dir = arg.trim_prefix("--saida=")

	# Sem tela (headless) a janela nasce com 64x64: põe o tamanho do projeto para conferir o layout.
	get_window().size = Vector2i(
		ProjectSettings.get_setting("display/window/size/viewport_width"),
		ProjectSettings.get_setting("display/window/size/viewport_height"))

	var main: Node3D = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame
	var hud: CanvasLayer = main.hud
	var world: WorldSim = main.world

	_test_difficulty(hud)
	await _shot("hud_escolha_classe")

	main.start_game("guerreiro")
	var player: PlayerBody = main.player
	for i in 10:
		await get_tree().physics_frame
	_check(not hud.target_frame.visible, "alvo: quadro escondido antes de acertar alguém")
	_check(hud.ability_slots.ataque.name.text == player.stats.ataque.nome, "barra: nome do ataque vem da tabela")
	_check(hud.ability_slots.habilidade.name.text == player.stats.habilidade.nome, "barra: nome da habilidade vem da tabela")
	_check(hud.ability_slots.ataque.key.text == "Clique" and hud.ability_slots.habilidade.key.text == "Q", "barra: mostra a tecla de cada espaço")
	_check(not hud.ability_slots.habilidade.shade.visible and not hud.ability_slots.habilidade.time.visible, "barra: pronta sem escurecimento nem segundos")

	# Inimigo na frente do jogador; a casa vai junto para a coleira não levar ele embora.
	var enemy: EnemyBody = world.enemies[0]
	enemy.spawn_position = player.global_position + Vector3(0, 0, -1.5)
	enemy.global_position = enemy.spawn_position
	main.camera_rig.rotation.y = 0.0
	await get_tree().physics_frame

	player.cooldowns.reset("ataque")
	_check(world.resolve_ability(player.id, "ataque", 0.0) == 1, "alvo: ataque acerta o inimigo à frente")
	# A HUD escolhe o alvo no fim do quadro, depois de todos os golpes da habilidade.
	await get_tree().process_frame
	_check(hud.target_frame.visible and hud.target == enemy, "alvo: quadro aparece com o inimigo atingido")
	_check(hud.target_name.text == enemy.stats.nome, "alvo: mostra o nome do inimigo")
	_check(hud.target_info.text.begins_with(String(enemy.stats.get("tipo", "Vida"))), "alvo: mostra o tipo do inimigo (se a tabela tiver) e a vida")
	_check(is_equal_approx(hud.target_bar.value, enemy.health) and is_equal_approx(hud.target_bar.max_value, enemy.max_health), "alvo: barra com a vida atual do inimigo")

	# Recarga: logo depois de usar, o espaço escurece inteiro e mostra os segundos.
	_check(is_equal_approx(hud.cooldown_ratio("ataque"), 1.0), "barra: recarga do ataque cheia logo depois de usar")
	_check(hud.ability_slots.ataque.shade.visible and hud.ability_slots.ataque.time.visible, "barra: ataque em recarga escurece e mostra segundos")
	player.cooldowns.reset("habilidade")
	world.resolve_ability(player.id, "habilidade", 0.0)
	await get_tree().process_frame
	var slot: Dictionary = hud.ability_slots.habilidade
	var recharge: float = player.stats.habilidade.recarga
	_check(slot.shade.visible and slot.time.visible and float(slot.time.text) > recharge - 0.2 and float(slot.time.text) <= recharge, "barra: habilidade mostra os segundos da recarga (%s s de %.1f)" % [slot.time.text, recharge])
	await _shot("hud_combate")
	var ratio_before: float = hud.cooldown_ratio("habilidade")
	for i in 20:
		await get_tree().process_frame
	var ratio_after: float = hud.cooldown_ratio("habilidade")
	_check(ratio_after < ratio_before and ratio_after > 0.0, "barra: escurecimento diminui com o tempo")
	_check(is_equal_approx(slot.shade.anchor_top, 1.0 - ratio_after), "barra: altura do escurecimento segue a recarga")
	_check(hud.target == enemy, "alvo: golpe em área que acerta o alvo atual mantém o alvo")

	# Mata o inimigo: o quadro some.
	for i in 30:
		if not enemy.is_alive():
			break
		player.cooldowns.reset("ataque")
		world.resolve_ability(player.id, "ataque", 0.0)
		await get_tree().physics_frame
	_check(not enemy.is_alive(), "alvo: inimigo morre")
	_check(not hud.target_frame.visible and hud.target == null, "alvo: quadro some quando o alvo morre")

	# Outro inimigo atingido e depois longe: o quadro some.
	var other: EnemyBody = world.enemies[1]
	other.spawn_position = player.global_position + Vector3(0, 0, -1.5)
	other.global_position = other.spawn_position
	await get_tree().physics_frame
	player.cooldowns.reset("ataque")
	world.resolve_ability(player.id, "ataque", 0.0)
	await get_tree().process_frame
	_check(hud.target == other and hud.target_frame.visible, "alvo: troca para o novo inimigo atingido")
	other.spawn_position = player.global_position + Vector3(0, 0, -(hud.TARGET_MAX_DISTANCE + 20.0))
	other.global_position = other.spawn_position
	await get_tree().process_frame
	await get_tree().process_frame
	_check(not hud.target_frame.visible, "alvo: quadro some quando o alvo fica longe")

	await _test_quests(main, hud, world, player)
	_test_layout(hud)

	print("HUD TEST: %s" % ("OK" if failures == 0 else "%d FALHA(S)" % failures))
	get_tree().quit(1 if failures else 0)


## Rastreador de missões e avisos: missão inicial, conclusão de explorar, progresso dos lobos.
func _test_quests(main: Node3D, hud: CanvasLayer, world: WorldSim, player: PlayerBody) -> void:
	# O personagem novo recebeu a primeira missão ao entrar.
	_check(hud.quest_panel.visible and hud.quest_rows.keys() == ["c1_dedo_de_pedra"], "missões: rastreador com a missão de explorar")
	var row: Dictionary = hud.quest_rows.get("c1_dedo_de_pedra", {})
	_check(not row.is_empty() and row.title.text == "O Dedo de Pedra" and row.objectives[0].text == "Vá até o Dedo de Pedra.", "missões: rastreador mostra título e objetivo da tabela de textos")

	# Chega ao ponto: aviso de concluída (com a XP), aviso da próxima e fala do ajudante.
	var point: Dictionary = ZoneBuilder.points(GameData.zone).dedo_de_pedra
	player.global_position = point.posicao
	main.camera_rig.rotation.y = 0.0
	for i in 3:
		await get_tree().physics_frame
	await get_tree().process_frame
	var titles: Array[String] = []
	for notice in hud.notice_box.get_children():
		if not notice.is_queued_for_deletion():
			titles.append(notice.get_node("Title").text)
	_check(titles.has("Missão concluída: O Dedo de Pedra  (+%d XP)" % GameData.quests.c1_dedo_de_pedra.recompensa.xp), "missões: aviso ao concluir, com a XP")
	_check(titles.has("Nova missão: Olho branco"), "missões: aviso ao receber a missão seguinte")
	_check(hud.speech_panel.visible and main.companion.element.falas.missao_concluida.has(hud.speech_text.text), "missões: o ajudante comenta a missão concluída")
	_check(hud.quest_rows.keys() == ["c1_olho_branco"], "missões: rastreador troca a concluída pela nova")
	_check(hud.notice_box.get_child_count() == hud.MAX_NOTICES, "missões: no máximo %d avisos na tela (o mais antigo sai)" % hud.MAX_NOTICES)
	# Espera o balão terminar de escrever, para a captura mostrar a fala inteira.
	await get_tree().create_timer(3.0).timeout
	await _shot("hud_missao_concluida")
	_test_quest_layout(hud, "aviso e rastreador")

	# Dois lobos abatidos: "Lobos Sombrios: 2/5".
	var killed := 0
	for enemy in world.enemies:
		if killed == 2:
			break
		if enemy.enemy_id == "lobo_sombrio" and enemy.is_alive():
			world.apply_damage(player.id, enemy.id, 99999)
			killed += 1
	await get_tree().process_frame
	_check(hud.quest_rows.c1_olho_branco.objectives[0].text == "Lobos Sombrios: 2/5", "missões: progresso no rastreador (%s)" % hud.quest_rows.c1_olho_branco.objectives[0].text)
	_check(hud.objective_line({"tipo": "matar", "quantidade": 5, "texto": "sem_chave_ainda"}, 2) == "sem_chave_ainda 2/5", "missões: texto sem {atual} ganha a contagem no fim")
	main.companion.react("missao_concluida", true)
	await get_tree().create_timer(3.0).timeout
	await _shot("hud_rastreador")

	# Os avisos somem sozinhos.
	var notice: Control = hud.show_notice("Teste de aviso")
	await get_tree().create_timer(hud.NOTICE_HOLD - 0.5).timeout
	var still_there: bool = is_instance_valid(notice) and notice.get_parent() == hud.notice_box
	await get_tree().create_timer(hud.NOTICE_FADE + 0.8).timeout
	_check(still_there and hud.notice_box.get_child_count() == 0, "missões: avisos somem depois de %.1f s" % (hud.NOTICE_HOLD + hud.NOTICE_FADE))


## Rastreador e avisos não cobrem o quadro do alvo, a barra de habilidades, o balão do ajudante nem a vida.
func _test_quest_layout(hud: CanvasLayer, moment: String) -> void:
	var quest_rect: Rect2 = hud.quest_panel.get_global_rect()
	var notice_rect: Rect2 = hud.notice_box.get_global_rect()
	var target_rect: Rect2 = hud.target_frame.get_global_rect()
	var bar_rect: Rect2 = hud.ability_slots.ataque.slot.get_parent().get_global_rect()
	var speech_rect: Rect2 = hud.speech_panel.get_parent().get_global_rect()
	var health_rect: Rect2 = hud.health_bar.get_parent().get_global_rect()
	var screen: Rect2 = hud.get_viewport().get_visible_rect()
	print("  retângulos (%s): rastreador %s, avisos %s, alvo %s" % [moment, quest_rect, notice_rect, target_rect])
	for other: Array in [[target_rect, "o quadro do alvo"], [bar_rect, "a barra de habilidades"], [speech_rect, "o balão do ajudante"], [health_rect, "vida e XP"]]:
		_check(not quest_rect.intersects(other[0]), "layout: rastreador não cobre %s" % other[1])
		_check(not notice_rect.intersects(other[0]), "layout: avisos não cobrem %s" % other[1])
	_check(screen.encloses(quest_rect) and quest_rect.position.x >= screen.size.x * 2.0 / 3.0, "layout: rastreador cabe na tela, fora do terço central (à direita)")
	_check(not quest_rect.intersects(notice_rect), "layout: avisos não cobrem o rastreador")
	_check(notice_rect.end.y < screen.size.y / 2.0 - 20.0, "layout: avisos terminam acima da mira (y %d)" % notice_rect.end.y)


func _test_difficulty(hud: CanvasLayer) -> void:
	for class_id: String in GameData.classes:
		var expected: int = GameData.classes[class_id].get("dificuldade", 0)
		_check(expected >= 1 and expected <= 5, "dificuldade: %s tem valor de 1 a 5 na tabela" % class_id)
		var meter: Control = hud.class_panel.find_child("Difficulty_" + class_id, true, false)
		_check(meter != null, "dificuldade: aparece ao lado de %s" % class_id)
		if meter == null:
			continue
		_check(meter.get_meta("dificuldade") == expected, "dificuldade: %s mostra %d" % [class_id, expected])
		var filled := 0
		for dot in meter.get_children():
			if dot is Panel and dot.get_theme_stylebox("panel").bg_color.a > 0.0:
				filled += 1
		_check(filled == expected, "dificuldade: %s com %d pontos cheios" % [class_id, expected])
	_check(GameData.classes.guerreiro.dificuldade == 2 and GameData.classes.cacador.dificuldade == 3, "dificuldade: Guerreiro 2, Caçador 3")


## A barra não cobre o balão do ajudante nem a vida e a XP.
func _test_layout(hud: CanvasLayer) -> void:
	hud.show_speech("Teste de layout")
	var bar_rect: Rect2 = hud.ability_slots.ataque.slot.get_parent().get_global_rect()
	var speech_rect: Rect2 = hud.speech_panel.get_parent().get_global_rect()
	var health_rect: Rect2 = hud.health_bar.get_parent().get_global_rect()
	var target_rect: Rect2 = hud.target_frame.get_global_rect()
	print("  retângulos: barra %s, balão %s, vida %s, alvo %s, tela %s" % [bar_rect, speech_rect, health_rect, target_rect, hud.get_viewport().get_visible_rect()])
	_check(not bar_rect.intersects(speech_rect), "layout: barra de habilidades não cobre o balão do ajudante")
	_check(not bar_rect.intersects(health_rect), "layout: barra de habilidades não cobre vida e XP")
	_check(not speech_rect.intersects(health_rect), "layout: balão do ajudante não cobre vida e XP")
	_check(bar_rect.position.y + bar_rect.size.y <= hud.get_viewport().get_visible_rect().size.y, "layout: barra cabe na tela")
	_check(target_rect.position.y < bar_rect.position.y, "layout: quadro do alvo fica no topo")


func _shot(shot_name: String) -> void:
	if out_dir.is_empty() or DisplayServer.get_name() == "headless":
		return
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [out_dir, shot_name])


func _check(condition: bool, description: String) -> void:
	print(("  ok  " if condition else "FALHA ") + description)
	if not condition:
		failures += 1
