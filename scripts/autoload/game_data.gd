extends Node
## Carrega as tabelas de dados (data/*.json) e registra os controles.
## Designers editam os JSON sem tocar em código.

const KEY_ACTIONS := {
	"move_forward": [KEY_W, KEY_UP],
	"move_back": [KEY_S, KEY_DOWN],
	"move_left": [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"jump": [KEY_SPACE],
	"skill": [KEY_Q],
	"toggle_mouse": [KEY_ESCAPE],
}

var classes: Dictionary
var enemies: Dictionary
var zone: Dictionary


func _ready() -> void:
	classes = _load_table("res://data/classes.json")
	enemies = _load_table("res://data/enemies.json")
	zone = _load_table("res://data/zona_1.json")
	_register_inputs()


static func to_vector3(values: Array) -> Vector3:
	return Vector3(values[0], values[1], values[2])


static func to_color(values: Array) -> Color:
	return Color(values[0], values[1], values[2])


func _load_table(path: String) -> Dictionary:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Não foi possível abrir %s" % path)
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		push_error("JSON inválido em %s" % path)
		return {}
	return parsed


func _register_inputs() -> void:
	for action: String in KEY_ACTIONS:
		if InputMap.has_action(action):
			continue
		InputMap.add_action(action)
		for keycode: Key in KEY_ACTIONS[action]:
			var event := InputEventKey.new()
			event.physical_keycode = keycode
			InputMap.action_add_event(action, event)
	if not InputMap.has_action("attack"):
		InputMap.add_action("attack")
		var click := InputEventMouseButton.new()
		click.button_index = MOUSE_BUTTON_LEFT
		InputMap.action_add_event("attack", click)
