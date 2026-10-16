extends CanvasLayer
## Interface: escolha de classe e de ajudante, vida, experiência, barra de habilidades, quadro do alvo,
## rastreador de missões, avisos de missão, fala do ajudante e tela de morte.
## Só ouve sinais (vida, XP, habilidade usada, golpe acertado) e guarda o que precisa exibir. Não lê o
## estado do jogador; do alvo, lê nome, vida e posição (esta só para esconder o quadro quando ele some
## de vista, medida a partir da câmera).

signal class_chosen(class_id: String)
signal element_chosen(element_id: String)
## O chat abriu (true) ou fechou (false). Quem cuida da entrada desliga e religa os controles.
signal chat_toggled(is_open: bool)

const SPEECH_HOLD := 6.0
## Quanto tempo um aviso de missão fica na tela antes de sumir (segundos), e o desbotar.
const NOTICE_HOLD := 5.0
const NOTICE_FADE := 0.8
## Topo dos avisos: abaixo do quadro do alvo (margem de 20 + uns 70 px de quadro + folga).
const NOTICE_TOP := 120.0
const NOTICE_WIDTH := 520.0
const QUEST_PANEL_WIDTH := 280.0
## No máximo esta quantidade de avisos na tela; chegando outro, o mais antigo sai. Com 2, a pilha
## termina bem acima da mira (centro da tela).
const MAX_NOTICES := 2
## Quadro do alvo some quando o alvo fica mais longe que isto da câmera (metros). Só exibição.
## A câmera fica até 12 m atrás do jogador; 30 m da câmera dá uns 18 a 30 m do jogador.
const TARGET_MAX_DISTANCE := 30.0
const SLOT_SIZE := Vector2(132, 64)
const ABILITY_KEYS := ["ataque", "habilidade"]
const ABILITY_HINTS := {"ataque": "Clique", "habilidade": "Q"}
const DIFFICULTY_MAX := 5
## Paleta do guia de estilo (docs/guia-de-estilo.md, seções 3 e 5.3).
const COLOR_CHARCOAL := Color("#1E1B22")
const COLOR_SLATE := Color("#4A4652")
const COLOR_MIST := Color("#8A8790")
const COLOR_IRON := Color("#6B6F75")
const COLOR_BONE := Color("#D8CCB0")
const COLOR_EMBER := Color("#E8813A")
const COLOR_CRIMSON := Color("#8E1F2E")
## Faísca de osso: cor do efeito físico, borda das habilidades físicas.
const COLOR_PHYSICAL := Color("#F2E6CC")

var health_bar: ProgressBar
var health_text: Label
var xp_bar: ProgressBar
var level_text: Label
## Por habilidade: {"slot", "shade", "time", "name", "key"}. Os nós da barra de habilidades.
var ability_slots := {}
## Rótulo do nome em cada espaço (o mesmo nó de ability_slots[key].name). Mantido porque o
## smoke_test ainda lê `ability_labels`; para recarga, use ability_slots[key].time e cooldown_ratio().
var ability_labels := {}
var class_panel: PanelContainer
var death_label: Label
var game_ui: Control
var crosshair: Label
var element_panel: PanelContainer
var companion: Companion
var speech_panel: PanelContainer
var speech_name: Label
var speech_text: Label
var chat_input: LineEdit
var ai_label: Label
var _speech_tween: Tween
## Estado de exibição das habilidades: nome (da tabela) e segundos de recarga que faltam.
var _ability_names := {}
var _cooldown_left := {}
var _cooldown_total := {}
var target_frame: PanelContainer
var target_name: Label
var target_info: Label
var target_bar: ProgressBar
## Inimigo mostrado no quadro do alvo (null se nenhum). Regra em _resolve_target().
var target: Node3D
var _world: Node
var _player_id := 0
## Rastreador de missões (direita, abaixo da ajuda) e as linhas dele, por id de missão.
var quest_panel: PanelContainer
var quest_list: VBoxContainer
var quest_rows := {}
## Avisos de missão nova e concluída (topo, abaixo do quadro do alvo). Somem sozinhos.
var notice_box: VBoxContainer
## Inimigos que o jogador acertou na habilidade em curso. Uma habilidade resolve todos os golpes
## de uma vez (WorldSim.resolve_ability), então a escolha fica para o fim do quadro (_choose_target).
var _pending_hits: Array[Node3D] = []


func _ready() -> void:
	_build_game_ui()
	death_label = _label("", 40, Color(1, 0.35, 0.35))
	death_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	death_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	death_label.visible = false
	add_child(death_label)
	crosshair = _label("+", 28, Color(1, 1, 1, 0.8))
	crosshair.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	crosshair.grow_horizontal = Control.GROW_DIRECTION_BOTH
	crosshair.grow_vertical = Control.GROW_DIRECTION_BOTH
	crosshair.visible = false
	add_child(crosshair)


func _process(delta: float) -> void:
	if _ability_names.is_empty():
		return
	for key: String in ability_slots:
		# Contagem só para exibir: quem decide se a habilidade está pronta é a simulação.
		var remaining: float = maxf(_cooldown_left.get(key, 0.0) - delta, 0.0)
		_cooldown_left[key] = remaining
		_draw_slot(key)
	var camera := get_viewport().get_camera_3d()
	if target and camera and target.global_position.distance_to(camera.global_position) > TARGET_MAX_DISTANCE:
		_set_target(null)


## Fração da recarga que falta (1 = acabou de usar, 0 = pronta). Só exibição.
func cooldown_ratio(key: String) -> float:
	var total: float = _cooldown_total.get(key, 0.0)
	return 0.0 if total <= 0.0 else clampf(_cooldown_left.get(key, 0.0) / total, 0.0, 1.0)


func show_class_selection(classes: Dictionary, zone_name: String) -> void:
	game_ui.visible = false
	class_panel = PanelContainer.new()
	class_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	class_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	class_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var panel_style := _panel_style(COLOR_IRON)
	panel_style.set_content_margin_all(20)
	class_panel.add_theme_stylebox_override("panel", panel_style)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	class_panel.add_child(box)
	box.add_child(_label("GORU · protótipo", 36, Color(0.9, 0.8, 1)))
	box.add_child(_label(zone_name, 18, Color(0.75, 0.75, 0.8)))
	box.add_child(_label("Escolha sua classe", 22, Color.WHITE))
	for class_id: String in classes:
		var data: Dictionary = classes[class_id]
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 16)
		box.add_child(row)
		var button := Button.new()
		button.name = "Class_" + class_id
		button.text = "%s · %s" % [data.nome, data.papel]
		button.custom_minimum_size = Vector2(320, 48)
		button.pressed.connect(_on_class_pressed.bind(class_id))
		row.add_child(button)
		if data.has("dificuldade"):
			row.add_child(_difficulty_meter(class_id, int(data.dificuldade)))
	add_child(class_panel)


## "Dificuldade" e 5 pontos: cheios até o valor da tabela, vazados depois. A forma (cheio ou só
## contorno) diferencia sem depender da cor. O texto "2 de 5" vai na dica, para leitor de tela.
func _difficulty_meter(class_id: String, value: int) -> HBoxContainer:
	value = clampi(value, 1, DIFFICULTY_MAX)
	var meter := HBoxContainer.new()
	meter.name = "Difficulty_" + class_id
	meter.set_meta("dificuldade", value)
	meter.tooltip_text = "Dificuldade %d de %d" % [value, DIFFICULTY_MAX]
	meter.alignment = BoxContainer.ALIGNMENT_CENTER
	meter.add_theme_constant_override("separation", 5)
	var title := _label("Dificuldade", 14, COLOR_MIST)
	title.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	meter.add_child(title)
	for i in DIFFICULTY_MAX:
		var dot := Panel.new()
		dot.name = "Dot%d" % i
		dot.custom_minimum_size = Vector2(12, 12)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var style := StyleBoxFlat.new()
		style.set_corner_radius_all(6)
		style.set_border_width_all(2)
		style.border_color = COLOR_EMBER if i < value else COLOR_SLATE
		style.bg_color = COLOR_EMBER if i < value else Color(0, 0, 0, 0)
		dot.add_theme_stylebox_override("panel", style)
		meter.add_child(dot)
	return meter


func show_element_selection(elements: Dictionary) -> void:
	if is_instance_valid(class_panel):
		class_panel.queue_free()
	element_panel = PanelContainer.new()
	element_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	element_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	element_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	element_panel.add_child(box)
	box.add_child(_label("Escolha o elemento do seu ajudante", 24, Color.WHITE))
	for element_id: String in elements:
		var data: Dictionary = elements[element_id]
		var button := Button.new()
		button.name = "Element_" + element_id
		button.text = "%s · %s" % [data.nome, data.descricao]
		button.custom_minimum_size = Vector2(380, 46)
		button.add_theme_color_override("font_color", GameData.to_color(data.cor))
		button.pressed.connect(_on_element_pressed.bind(element_id))
		box.add_child(button)
		if not data.aviso.is_empty():
			box.add_child(_label(data.aviso, 13, Color(0.85, 0.75, 0.75)))
	add_child(element_panel)


## Liga o HUD aos sinais do jogador. `class_stats` é a entrada de data/classes.json,
## usada só para os nomes das habilidades. O estado inicial chega pelos próprios sinais
## (quem chama pede ao corpo para reemiti-lo).
func bind_player(player: Node, class_stats: Dictionary) -> void:
	for panel in [class_panel, element_panel]:
		if is_instance_valid(panel):
			panel.queue_free()
	for key: String in ability_slots:
		_ability_names[key] = class_stats[key].nome
		ability_slots[key].name.text = class_stats[key].nome
		_cooldown_left[key] = 0.0
		_cooldown_total[key] = 0.0
		_draw_slot(key)
	player.health_changed.connect(_on_health_changed)
	player.xp_changed.connect(_on_xp_changed)
	player.ability_used.connect(_on_ability_used)
	game_ui.visible = true
	crosshair.visible = true


## Liga o quadro do alvo aos eventos da simulação (`world`: WorldSim) para o jogador de id `player_id`.
## Regra do alvo exibido: o último inimigo que o jogador acertou (sinal damage_dealt). Num golpe que
## acerta vários de uma vez, o alvo atual continua se estiver entre eles; senão, vale o atingido mais
## perto da mira (centro da tela). O quadro some quando o alvo morre, quando desiste da perseguição e
## volta para casa, ou quando fica a mais de TARGET_MAX_DISTANCE da câmera.
## Só exibição: a mira continua vindo do giro da câmera e nada aqui muda o combate.
func bind_target_source(world: Node, player_id: int) -> void:
	_world = world
	_player_id = player_id
	world.damage_dealt.connect(_on_damage_dealt)


## Liga o rastreador e os avisos de missão aos eventos da simulação (`world`: WorldSim) para o
## jogador `player_id`. Só exibição: os textos vêm de data/textos/missoes.json, as metas do
## catálogo, e o progresso chega pelos sinais.
func bind_quests(world: Node, player_id: int) -> void:
	_player_id = player_id
	world.quest_log_changed.connect(_on_quest_log_changed)
	world.quest_started.connect(_on_quest_started)
	world.quest_completed.connect(_on_quest_completed)


## Mostra um aviso no topo, que some sozinho depois de NOTICE_HOLD segundos.
## `title` em brasa (destaque do guia), `detail` menor em cinza-névoa.
func show_notice(title: String, detail := "") -> Control:
	var shown := notice_box.get_children().filter(func(node: Node) -> bool: return not node.is_queued_for_deletion())
	while shown.size() >= MAX_NOTICES:
		var oldest: Node = shown.pop_front()
		notice_box.remove_child(oldest)
		oldest.queue_free()
	var box := VBoxContainer.new()
	box.name = "Notice"
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_theme_constant_override("separation", 2)
	var head := _label(title, 22, COLOR_EMBER)
	head.name = "Title"
	box.add_child(head)
	if not detail.is_empty():
		var body := _label(detail, 15, COLOR_BONE)
		body.name = "Detail"
		body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		body.custom_minimum_size.x = NOTICE_WIDTH
		box.add_child(body)
	notice_box.add_child(box)
	var tween := box.create_tween()
	tween.tween_interval(NOTICE_HOLD)
	tween.tween_property(box, "modulate:a", 0.0, NOTICE_FADE)
	tween.tween_callback(box.queue_free)
	return box


## Texto de progresso de um objetivo, como no rastreador: "Lobos Sombrios: 2/5".
## O texto da tabela pode usar {atual} e {total}; sem eles, a contagem vai no fim quando a meta
## passa de 1 ("Lobos Sombrios 2/5"), e objetivo de uma vez só ("Vá até...") fica só com o texto.
static func objective_line(objective: Dictionary, count: int) -> String:
	var text := GameData.quest_text(objective.texto)
	var goal := QuestLog.goal_for(objective)
	if text.contains("{atual}") or text.contains("{total}"):
		return text.format({"atual": count, "total": goal})
	return "%s %d/%d" % [text, count, goal] if goal > 1 else text


## Texto da missão (título, descrição, conclusão) com {total} trocado pela meta do primeiro objetivo.
static func quest_line(quest: Dictionary, field: String) -> String:
	return GameData.quest_text(quest.textos[field]).format({"total": QuestLog.goal_for(quest.objetivos[0])})


func _on_quest_log_changed(player_id: int, state: Dictionary) -> void:
	if player_id != _player_id:
		return
	for child in quest_list.get_children():
		child.queue_free()
	quest_rows.clear()
	for quest_id: String in state.ativas:
		var quest: Dictionary = GameData.quests.get(quest_id, {})
		if quest.is_empty():
			continue
		var row := VBoxContainer.new()
		row.name = "Quest_" + quest_id
		row.add_theme_constant_override("separation", 0)
		var title := _label(quest_line(quest, "titulo"), 16, COLOR_BONE)
		title.name = "Title"
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		row.add_child(title)
		var progress: Array = state.ativas[quest_id].progresso
		var lines: Array[Label] = []
		for index in quest.objetivos.size():
			var line := _label(objective_line(quest.objetivos[index], int(progress[index])), 14, COLOR_MIST)
			line.name = "Objective%d" % index
			line.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			row.add_child(line)
			lines.append(line)
		quest_list.add_child(row)
		quest_rows[quest_id] = {"row": row, "title": title, "objectives": lines}
	quest_panel.visible = not quest_rows.is_empty()


func _on_quest_started(player_id: int, quest_id: String) -> void:
	if player_id != _player_id or not GameData.quests.has(quest_id):
		return
	var quest: Dictionary = GameData.quests[quest_id]
	show_notice("Nova missão: " + quest_line(quest, "titulo"), quest_line(quest, "descricao"))


func _on_quest_completed(player_id: int, quest_id: String, xp: int) -> void:
	if player_id != _player_id or not GameData.quests.has(quest_id):
		return
	var quest: Dictionary = GameData.quests[quest_id]
	show_notice("Missão concluída: %s  (+%d XP)" % [quest_line(quest, "titulo"), xp], quest_line(quest, "conclusao"))


func bind_companion(new_companion: Companion) -> void:
	companion = new_companion
	_build_companion_ui(GameData.to_color(companion.element.cor))
	speech_name.text = companion.element.nome
	companion.said.connect(show_speech)
	companion.thinking_changed.connect(_on_thinking_changed)
	companion.ai_status_changed.connect(_on_ai_status_changed)
	_on_ai_status_changed(companion.ai_available)


func show_speech(text: String) -> void:
	speech_text.text = text
	speech_panel.visible = true
	if _speech_tween:
		_speech_tween.kill()
	var speed: float = companion.element.velocidade_texto
	speech_text.visible_characters = 0
	_speech_tween = create_tween()
	_speech_tween.tween_property(speech_text, "visible_characters", text.length(), text.length() / speed)
	_speech_tween.tween_interval(SPEECH_HOLD)
	_speech_tween.tween_callback(func(): speech_panel.visible = false)


func open_chat() -> void:
	chat_input.visible = true
	chat_input.grab_focus()
	chat_toggled.emit(true)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func close_chat() -> void:
	chat_input.clear()
	chat_input.release_focus()
	chat_input.visible = false
	chat_toggled.emit(false)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(event: InputEvent) -> void:
	if companion and not chat_input.visible and event.is_action_pressed("chat"):
		open_chat()
		get_viewport().set_input_as_handled()


func _on_chat_submitted(text: String) -> void:
	close_chat()
	companion.ask(text)


func _on_chat_gui_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		close_chat()
		chat_input.accept_event()


func _on_thinking_changed(is_thinking: bool) -> void:
	if is_thinking:
		if _speech_tween:
			_speech_tween.kill()
		speech_text.text = "..."
		speech_text.visible_characters = -1
		speech_panel.visible = true


func _on_ai_status_changed(available: bool) -> void:
	ai_label.text = "Ajudante: conversa livre (OpenJarvis)" if available else "Ajudante: falas prontas (OpenJarvis desligado)"


func _on_element_pressed(element_id: String) -> void:
	element_chosen.emit(element_id)


func _build_companion_ui(color: Color) -> void:
	var box := VBoxContainer.new()
	box.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	box.grow_vertical = Control.GROW_DIRECTION_BEGIN
	# Acima da barra de habilidades (margem de 20 + altura do espaço + folga).
	box.offset_bottom = -(20 + SLOT_SIZE.y + 12)
	box.custom_minimum_size.x = 520
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(box)

	speech_panel = PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.04, 0.08, 0.85)
	style.border_color = color
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	style.set_content_margin_all(12)
	speech_panel.add_theme_stylebox_override("panel", style)
	speech_panel.visible = false
	box.add_child(speech_panel)
	var lines := VBoxContainer.new()
	speech_panel.add_child(lines)
	speech_name = _label("", 15, color)
	speech_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	lines.add_child(speech_name)
	speech_text = _label("", 19, Color.WHITE)
	speech_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	speech_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lines.add_child(speech_text)

	chat_input = LineEdit.new()
	chat_input.placeholder_text = "Fale com o ajudante e aperte Enter (Esc cancela)"
	chat_input.max_length = 200
	chat_input.visible = false
	chat_input.text_submitted.connect(_on_chat_submitted)
	chat_input.gui_input.connect(_on_chat_gui_input)
	box.add_child(chat_input)

	ai_label = _label("", 13, Color(0.75, 0.75, 0.8))
	ai_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	ai_label.position = Vector2(20, 20)
	add_child(ai_label)


func show_death(delay: float) -> void:
	death_label.text = "Você morreu\nRenascendo em %d s" % ceili(delay)
	death_label.visible = true


func hide_death() -> void:
	death_label.visible = false


func _on_class_pressed(class_id: String) -> void:
	class_chosen.emit(class_id)


func _on_health_changed(current: float, maximum: float) -> void:
	health_bar.max_value = maximum
	health_bar.value = current
	health_text.text = "Vida %d / %d" % [ceili(current), ceili(maximum)]


func _on_ability_used(ability_key: String, cooldown: float) -> void:
	_cooldown_left[ability_key] = cooldown
	_cooldown_total[ability_key] = cooldown
	if ability_slots.has(ability_key):
		_draw_slot(ability_key)


func _draw_slot(key: String) -> void:
	var slot: Dictionary = ability_slots[key]
	var remaining: float = _cooldown_left.get(key, 0.0)
	var ratio := cooldown_ratio(key)
	# O escurecimento cobre a fração da recarga que falta e desce até sumir.
	slot.shade.anchor_top = 1.0 - ratio
	slot.shade.visible = ratio > 0.0
	slot.time.visible = remaining > 0.0
	slot.time.text = "%.1f" % remaining if remaining < 10.0 else "%d" % ceili(remaining)
	slot.name.modulate = Color.WHITE if remaining <= 0.0 else Color(1, 1, 1, 0.55)


## Golpe do jogador num inimigo: guarda até a habilidade terminar (pode acertar vários).
func _on_damage_dealt(source_id: int, target_id: int, _amount: float) -> void:
	if source_id != _player_id or not _world.is_enemy(target_id):
		return
	var enemy: Node3D = _world.get_entity(target_id)
	if enemy == null or _pending_hits.has(enemy):
		return
	if _pending_hits.is_empty():
		_choose_target.call_deferred()
	_pending_hits.append(enemy)


## Fim do quadro: todos os golpes da habilidade já chegaram.
func _choose_target() -> void:
	var hits := _pending_hits
	_pending_hits = []
	if hits.is_empty():
		return
	_set_target(_resolve_target(hits))


## Regra do alvo exibido (ver bind_target_source): mantém o atual se foi atingido de novo,
## senão o atingido vivo mais perto da mira. Mortos não entram.
func _resolve_target(hits: Array[Node3D]) -> Node3D:
	if target and hits.has(target) and target.is_alive():
		return target
	var camera := get_viewport().get_camera_3d()
	var aim := get_viewport().get_visible_rect().size / 2.0
	var best: Node3D = null
	var best_distance := INF
	for enemy in hits:
		if not enemy.is_alive():
			continue
		# Sem câmera, vale a ordem dos golpes (todos empatam).
		var distance := 0.0
		if camera:
			distance = camera.unproject_position(enemy.global_position).distance_to(aim)
		if distance < best_distance:
			best_distance = distance
			best = enemy
	# O golpe matou todos os atingidos: o quadro some, a menos que o alvo atual siga vivo.
	if best == null and target and target.is_alive():
		return target
	return best


func _set_target(enemy: Node3D) -> void:
	if enemy == target:
		return
	if target and is_instance_valid(target):
		target.health_changed.disconnect(_on_target_health_changed)
		target.died.disconnect(_on_target_died)
		target.returned_home.disconnect(_on_target_died)
	target = enemy
	target_frame.visible = target != null
	if target == null:
		return
	target.health_changed.connect(_on_target_health_changed)
	target.died.connect(_on_target_died)
	# Voltou para casa: o jogador saiu da coleira e o inimigo desistiu.
	target.returned_home.connect(_on_target_died)
	var data: Dictionary = GameData.enemies[target.enemy_id]
	target_name.text = data.nome
	target_info.set_meta("tipo", data.get("tipo", ""))
	_on_target_health_changed(target.health, target.max_health)


func _on_target_health_changed(current: float, maximum: float) -> void:
	target_bar.max_value = maximum
	target_bar.value = current
	var kind: String = target_info.get_meta("tipo", "")
	var life := "Vida %d / %d" % [ceili(current), ceili(maximum)]
	target_info.text = life if kind.is_empty() else "%s · %s" % [kind, life]


## Alvo morreu ou desistiu da perseguição: o quadro some.
func _on_target_died() -> void:
	_set_target(null)


func _on_xp_changed(xp: int, xp_next: int, level: int) -> void:
	xp_bar.max_value = xp_next
	xp_bar.value = xp
	level_text.text = "Nível %d · XP %d / %d" % [level, xp, xp_next]


func _build_game_ui() -> void:
	game_ui = MarginContainer.new()
	game_ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	game_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side in ["left", "right", "top", "bottom"]:
		game_ui.add_theme_constant_override("margin_" + side, 20)
	add_child(game_ui)

	var bottom := VBoxContainer.new()
	bottom.size_flags_vertical = Control.SIZE_SHRINK_END
	bottom.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	bottom.custom_minimum_size.x = 340
	game_ui.add_child(bottom)

	health_text = _label("", 18, Color.WHITE)
	bottom.add_child(health_text)
	health_bar = _bar(Color(0.8, 0.2, 0.2), 22)
	bottom.add_child(health_bar)
	level_text = _label("", 16, Color(1, 0.85, 0.3))
	bottom.add_child(level_text)
	xp_bar = _bar(Color(0.95, 0.75, 0.2), 10)
	bottom.add_child(xp_bar)

	# Barra de habilidades: embaixo ao centro (guia de estilo, seção 6). O balão do ajudante fica acima.
	var ability_bar := HBoxContainer.new()
	ability_bar.name = "AbilityBar"
	ability_bar.size_flags_vertical = Control.SIZE_SHRINK_END
	ability_bar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	ability_bar.add_theme_constant_override("separation", 8)
	ability_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	game_ui.add_child(ability_bar)
	for key: String in ABILITY_KEYS:
		ability_slots[key] = _ability_slot(key)
		ability_labels[key] = ability_slots[key].name
		ability_bar.add_child(ability_slots[key].slot)

	_build_target_frame()

	# Coluna da direita: ajuda em duas linhas (para não encostar no quadro do alvo) e, abaixo dela,
	# o rastreador de missões (guia de estilo, seção 6: missões abaixo do mapa, fora do centro).
	var right := VBoxContainer.new()
	right.name = "RightColumn"
	right.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	right.size_flags_horizontal = Control.SIZE_SHRINK_END
	right.add_theme_constant_override("separation", 10)
	right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	game_ui.add_child(right)
	var help := _label("WASD mover · Mouse câmera · Espaço pular\nEnter falar com o ajudante · Esc soltar mouse", 14, Color(0.8, 0.8, 0.85))
	help.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	help.size_flags_horizontal = Control.SIZE_SHRINK_END
	right.add_child(help)
	_build_quest_panel(right)
	_build_notices()


## Um espaço da barra: tecla no canto, nome embaixo, segundos no meio e o escurecimento por cima.
func _ability_slot(key: String) -> Dictionary:
	var slot := Panel.new()
	slot.name = "Slot_" + key
	slot.custom_minimum_size = SLOT_SIZE
	slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Fundo ardósia (mais claro que o carvão) para o escurecimento da recarga se destacar.
	var slot_style := _panel_style(COLOR_PHYSICAL)
	slot_style.bg_color = Color(COLOR_SLATE, 0.9)
	slot.add_theme_stylebox_override("panel", slot_style)

	var shade := ColorRect.new()
	shade.name = "Shade"
	shade.color = Color(COLOR_CHARCOAL, 0.85)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shade.visible = false
	slot.add_child(shade)

	var hint := _label(ABILITY_HINTS[key], 14, COLOR_BONE)
	hint.name = "Key"
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	hint.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	hint.position = Vector2(6, 2)
	slot.add_child(hint)

	var name_label := _label("", 14, Color.WHITE)
	name_label.name = "Name"
	name_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	name_label.offset_top = -24
	name_label.offset_bottom = -3
	slot.add_child(name_label)

	var time := _label("", 22, Color.WHITE)
	time.name = "Time"
	time.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	time.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	time.offset_bottom = -8
	time.visible = false
	slot.add_child(time)
	return {"slot": slot, "shade": shade, "time": time, "name": name_label, "key": hint}


## Rastreador: painel reto do guia, título "Missões" e uma linha por missão ativa.
func _build_quest_panel(parent: Control) -> void:
	quest_panel = PanelContainer.new()
	quest_panel.name = "QuestTracker"
	quest_panel.size_flags_horizontal = Control.SIZE_SHRINK_END
	quest_panel.custom_minimum_size.x = QUEST_PANEL_WIDTH
	quest_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := _panel_style(COLOR_IRON)
	style.set_content_margin_all(10)
	quest_panel.add_theme_stylebox_override("panel", style)
	quest_panel.visible = false
	parent.add_child(quest_panel)
	var lines := VBoxContainer.new()
	lines.add_theme_constant_override("separation", 6)
	quest_panel.add_child(lines)
	var header := _label("Missões", 14, COLOR_MIST)
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	lines.add_child(header)
	quest_list = VBoxContainer.new()
	quest_list.name = "List"
	quest_list.add_theme_constant_override("separation", 8)
	lines.add_child(quest_list)


## Avisos: coluna no topo ao centro, abaixo do quadro do alvo e longe da barra e do balão.
func _build_notices() -> void:
	notice_box = VBoxContainer.new()
	notice_box.name = "Notices"
	notice_box.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	notice_box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	notice_box.offset_top = NOTICE_TOP
	notice_box.custom_minimum_size.x = NOTICE_WIDTH
	notice_box.offset_left = -NOTICE_WIDTH / 2.0
	notice_box.offset_right = NOTICE_WIDTH / 2.0
	notice_box.add_theme_constant_override("separation", 10)
	notice_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(notice_box)


## Quadro do alvo: topo ao centro, nome, tipo e vida do inimigo exibido.
func _build_target_frame() -> void:
	target_frame = PanelContainer.new()
	target_frame.name = "TargetFrame"
	target_frame.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	target_frame.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	target_frame.custom_minimum_size.x = 300
	target_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := _panel_style(COLOR_IRON)
	style.set_content_margin_all(8)
	target_frame.add_theme_stylebox_override("panel", style)
	target_frame.visible = false
	game_ui.add_child(target_frame)
	var lines := VBoxContainer.new()
	lines.add_theme_constant_override("separation", 2)
	target_frame.add_child(lines)
	target_name = _label("", 18, COLOR_BONE)
	lines.add_child(target_name)
	target_bar = _bar(COLOR_CRIMSON, 14)
	lines.add_child(target_bar)
	target_info = _label("", 14, COLOR_MIST)
	lines.add_child(target_info)


## Painel reto do guia: fundo carvão a 85% e borda de 1 px.
func _panel_style(border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(COLOR_CHARCOAL, 0.85)
	style.border_color = border
	style.set_border_width_all(1)
	return style


func _label(text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_outline_color", Color.BLACK)
	label.add_theme_constant_override("outline_size", 6)
	return label


func _bar(color: Color, height: float) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.show_percentage = false
	bar.custom_minimum_size.y = height
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	bar.add_theme_stylebox_override("fill", fill)
	return bar
