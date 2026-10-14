extends CanvasLayer
## Interface: escolha de classe, vida, experiência, recargas e tela de morte.

signal class_chosen(class_id: String)

var player: Node
var health_bar: ProgressBar
var health_text: Label
var xp_bar: ProgressBar
var level_text: Label
var ability_labels := {}
var class_panel: PanelContainer
var death_label: Label
var game_ui: Control


func _ready() -> void:
	_build_game_ui()
	death_label = _label("", 40, Color(1, 0.35, 0.35))
	death_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	death_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	death_label.visible = false
	add_child(death_label)


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


func bind_player(new_player: Node) -> void:
	player = new_player
	player.health_changed.connect(_on_health_changed)
	player.xp_changed.connect(_on_xp_changed)
	_on_health_changed(player.health, player.max_health)
	_on_xp_changed(player.xp, player.xp_to_next_level(), player.level)
	game_ui.visible = true


func show_death(delay: float) -> void:
	death_label.text = "Você morreu\nRenascendo em %d s" % ceili(delay)
	death_label.visible = true


func hide_death() -> void:
	death_label.visible = false


func _on_class_pressed(class_id: String) -> void:
	class_panel.queue_free()
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

	var help := _label("WASD mover · Mouse câmera · Espaço pular · Roda zoom · Esc soltar mouse", 14, Color(0.8, 0.8, 0.85))
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
