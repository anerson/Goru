extends CanvasLayer
## Interface: escolha de classe e de ajudante, vida, experiência, recargas, fala do ajudante e tela de morte.

signal class_chosen(class_id: String)
signal element_chosen(element_id: String)

const SPEECH_HOLD := 6.0

var player: Node
var health_bar: ProgressBar
var health_text: Label
var xp_bar: ProgressBar
var level_text: Label
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


func _process(_delta: float) -> void:
	if player == null:
		return
	for key: String in ability_labels:
		var ability: Dictionary = player.stats[key]
		var remaining: float = player.cooldowns[key]
		var hint := "Clique" if key == "ataque" else "Q"
		var status := "pronto" if remaining <= 0.0 else "%.1fs" % remaining
		ability_labels[key].text = "[%s] %s: %s" % [hint, ability.nome, status]
		ability_labels[key].modulate = Color.WHITE if remaining <= 0.0 else Color(0.6, 0.6, 0.6)


func show_class_selection(classes: Dictionary, zone_name: String) -> void:
	game_ui.visible = false
	class_panel = PanelContainer.new()
	class_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	class_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	class_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	class_panel.add_child(box)
	box.add_child(_label("GORU · protótipo", 36, Color(0.9, 0.8, 1)))
	box.add_child(_label(zone_name, 18, Color(0.75, 0.75, 0.8)))
	box.add_child(_label("Escolha sua classe", 22, Color.WHITE))
	for class_id: String in classes:
		var data: Dictionary = classes[class_id]
		var button := Button.new()
		button.name = "Class_" + class_id
		button.text = "%s · %s" % [data.nome, data.papel]
		button.custom_minimum_size = Vector2(320, 48)
		button.pressed.connect(_on_class_pressed.bind(class_id))
		box.add_child(button)
	add_child(class_panel)


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


func bind_player(new_player: Node) -> void:
	player = new_player
	for panel in [class_panel, element_panel]:
		if is_instance_valid(panel):
			panel.queue_free()
	player.health_changed.connect(_on_health_changed)
	player.xp_changed.connect(_on_xp_changed)
	_on_health_changed(player.health, player.max_health)
	_on_xp_changed(player.xp, player.xp_to_next_level(), player.level)
	game_ui.visible = true
	crosshair.visible = true


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
	player.controls_enabled = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func close_chat() -> void:
	chat_input.clear()
	chat_input.release_focus()
	chat_input.visible = false
	player.controls_enabled = true
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
	box.offset_bottom = -24
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
	for key in ["ataque", "habilidade"]:
		ability_labels[key] = _label("", 16, Color.WHITE)
		bottom.add_child(ability_labels[key])

	var help := _label("WASD mover · Mouse câmera · Espaço pular · Enter falar com o ajudante · Esc soltar mouse", 14, Color(0.8, 0.8, 0.85))
	help.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	help.size_flags_horizontal = Control.SIZE_SHRINK_END
	game_ui.add_child(help)


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
