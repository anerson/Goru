extends Node
## Carrega as tabelas de dados (data/*.json) e registra os controles.
## Designers editam os JSON sem tocar em código.

const QUESTS_DIR := "res://data/missoes"
const QUEST_TEXTS_PATH := "res://data/textos/missoes.json"

const KEY_ACTIONS := {
	"move_forward": [KEY_W, KEY_UP],
	"move_back": [KEY_S, KEY_DOWN],
	"move_left": [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"jump": [KEY_SPACE],
	"skill": [KEY_Q],
	"toggle_mouse": [KEY_ESCAPE],
	"chat": [KEY_ENTER, KEY_KP_ENTER],
}

var classes: Dictionary
var enemies: Dictionary
## Id da zona carregada (nome do arquivo em data/), gravado no save do personagem.
var zone_id := "zona_1"
var zone: Dictionary
var companions: Dictionary
## Constantes de regra (XP e dano por nível, renascimento, coleira e separação dos inimigos, intervalo do save offline,
## faixa de XP das missões). Usadas por scripts/rules/ e scripts/sim/.
var rules: Dictionary
## Missões válidas de data/missoes/*.json: {id: missão}, na ordem dos arquivos (QuestValidator.catalog).
## Vazio se houver qualquer erro: o jogo recusa missões inválidas em vez de rodar metade delas.
var quests: Dictionary
## Erros do validador na última carga de data/missoes (vazio = tudo certo).
var quest_errors: Array[String] = []
## Textos das missões (chave -> texto em português), em data/textos/missoes.json.
var quest_texts: Dictionary


func _ready() -> void:
	classes = _load_table("res://data/classes.json")
	enemies = _load_table("res://data/enemies.json")
	zone = _load_table("res://data/%s.json" % zone_id)
	companions = _load_table("res://data/ajudantes.json")
	rules = _load_table("res://data/regras.json")
	for key in ["xp_por_nivel", "dano_por_nivel", "jogador_renascimento", "inimigo_coleira",
			"inimigo_tempo_max_volta", "inimigo_folga_ataque", "inimigo_velocidade_volta", "inimigo_raio_chegada",
			"inimigo_separacao_distancia", "inimigo_separacao_velocidade", "offline_salvamento_intervalo",
			"missao_xp_min_fracao", "missao_xp_max_fracao"]:
		if not rules.has(key):
			push_error("data/regras.json sem o campo %s" % key)
	quest_texts = _load_table(QUEST_TEXTS_PATH)
	var loaded := load_quests(QUESTS_DIR, quest_texts)
	quests = loaded.catalog
	quest_errors.assign(loaded.errors)
	if not quest_errors.is_empty():
		push_error("Missões recusadas: %d erro(s) em %s. O jogo segue sem nenhuma missão até corrigir:\n  %s"
			% [quest_errors.size(), QUESTS_DIR, "\n  ".join(quest_errors)])
	_register_inputs()


static func to_vector3(values: Array) -> Vector3:
	return Vector3(values[0], values[1], values[2])


static func to_color(values: Array) -> Color:
	return Color(values[0], values[1], values[2])


## Texto de uma chave (data/textos/missoes.json). Sem a chave, devolve a própria chave, para
## o buraco aparecer na tela em vez de sumir.
func quest_text(key: String) -> String:
	return str(quest_texts.get(key, key))


## Lê todos os .json de `folder` (em ordem alfabética), valida com QuestValidator e devolve
## {"catalog": {id: missão}, "errors": [texto]}. Com qualquer erro, o catálogo vem vazio.
func load_quests(folder: String, texts: Dictionary) -> Dictionary:
	var errors: Array[String] = []
	var files: Array = []
	if not DirAccess.dir_exists_absolute(folder):
		errors.append("pasta %s não existe" % folder)
		return {"catalog": {}, "errors": errors}
	var names := Array(DirAccess.get_files_at(folder)).filter(func(file_name: String) -> bool: return file_name.ends_with(".json"))
	names.sort()
	for file_name: String in names:
		var json := JSON.new()
		if json.parse(FileAccess.get_file_as_string(folder + "/" + file_name)) != OK:
			errors.append("%s: JSON inválido na linha %d (%s)" % [file_name, json.get_error_line() + 1, json.get_error_message()])
			continue
		files.append({"arquivo": file_name, "dados": json.data})
	var zones := {}
	for id in QuestValidator.zone_ids(files):
		var zone_path := "res://data/%s.json" % id
		if FileAccess.file_exists(zone_path):
			var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(zone_path))
			if parsed is Dictionary:
				zones[id] = parsed
	errors.append_array(QuestValidator.validate(files, texts, enemies, zones, rules))
	return {"catalog": {} if not errors.is_empty() else QuestValidator.catalog(files), "errors": errors}


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
