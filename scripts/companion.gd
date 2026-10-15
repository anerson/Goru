class_name Companion
extends Node
## Ajudante do jogador. Comenta o que acontece e responde perguntas.
## Com o OpenJarvis rodando no computador do jogador, conversa livre por IA;
## sem ele, usa as falas prontas de data/ajudantes.json.
## Só fala: nunca age no jogo nem decide regra (vale também no online).

signal said(text: String)
signal thinking_changed(is_thinking: bool)
signal ai_status_changed(available: bool)

const REACTION_COOLDOWN := 6.0
const IDLE_TIME := 45.0
const HISTORY_LIMIT := 6
const NEARBY_DISTANCE := 15.0
const LOW_HEALTH := 0.3
const HEALTH_RECOVERED := 0.6

var element_id := "folha"
var element: Dictionary
var player: Node
var ai_available := false
var ai_model := ""
var busy := false
var history: Array[Dictionary] = []

var _base_url := ""
var _cooldown := 0.0
var _idle := 0.0
var _low_health_warned := false
var _last_level := 1
var _probe: HTTPRequest
var _chat: HTTPRequest


func _ready() -> void:
	var config: Dictionary = GameData.companions.openjarvis
	_base_url = OS.get_environment("GORU_OPENJARVIS_URL")
	if _base_url.is_empty():
		_base_url = config.url
	_base_url = _base_url.trim_suffix("/")
	_probe = HTTPRequest.new()
	_probe.timeout = 3.0
	add_child(_probe)
	_chat = HTTPRequest.new()
	_chat.timeout = config.tempo_limite
	_chat.request_completed.connect(_on_chat_completed)
	add_child(_chat)


func setup(new_element_id: String, new_player: Node) -> void:
	element_id = new_element_id
	element = GameData.companions.elementos[element_id]
	player = new_player
	_last_level = player.level
	player.died.connect(react.bind("morte", true))
	player.health_changed.connect(_on_health_changed)
	player.xp_changed.connect(_on_xp_changed)
	probe_ai()


func _process(delta: float) -> void:
	_cooldown = maxf(_cooldown - delta, 0.0)
	_idle += delta
	if _idle >= IDLE_TIME:
		react("ocioso", true)


## Fala uma reação pronta ao evento (inicio, abate, vida_baixa, morte, nivel, ocioso, missao_concluida).
func react(event: String, force := false) -> void:
	if not force and _cooldown > 0.0:
		return
	var lines: Array = element.falas.get(event, [])
	if lines.is_empty():
		return
	_say(lines.pick_random())
	_cooldown = REACTION_COOLDOWN


## Responde a uma pergunta do jogador: pela IA, se disponível, ou com uma fala pronta.
func ask(question: String) -> void:
	question = question.strip_edges()
	if question.is_empty() or busy:
		return
	if not ai_available:
		_say(offline_answer())
		return
	var messages: Array = [{"role": "system", "content": system_prompt()}]
	messages.append_array(history)
	messages.append({"role": "user", "content": question})
	var body := JSON.stringify({
		"model": ai_model,
		"messages": messages,
		"temperature": element.temperatura,
		"max_tokens": 200,
		"stream": false,
	})
	var error := _chat.request(_base_url + "/v1/chat/completions", ["Content-Type: application/json"], HTTPClient.METHOD_POST, body)
	if error != OK:
		_set_ai_available(false)
		_say(offline_answer())
		return
	history.append({"role": "user", "content": question})
	_set_busy(true)


func offline_answer() -> String:
	return element.falas.sem_ia.pick_random()


func system_prompt() -> String:
	var rules: Array = GameData.companions.regras_gerais
	return "\n".join(rules) + "\n\n" + element.personalidade + "\n\nEstado atual do jogo:\n" + game_context()


## Resumo do que o jogador vê. É tudo o que o ajudante sabe sobre a partida.
func game_context() -> String:
	var nearby := 0
	var nearest := INF
	var nearest_name := ""
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if not enemy.is_alive():
			continue
		var distance: float = enemy.global_position.distance_to(player.global_position)
		if distance <= NEARBY_DISTANCE:
			nearby += 1
		if distance < nearest:
			nearest = distance
			nearest_name = enemy.stats.nome
	var stats: Dictionary = player.stats
	var lines := [
		"Zona: %s." % GameData.zone.nome,
		"Classe: %s (%s). Nível %d. XP %d de %d." % [stats.nome, stats.papel, player.level, player.xp, player.xp_to_next_level()],
		"Vida: %d de %d.%s" % [ceili(player.health), ceili(player.max_health), " O jogador está morto." if player.is_dead else ""],
		"Ataque básico (clique): %s, alcance %s m." % [stats.ataque.nome, stats.ataque.alcance],
		"Habilidade (Q): %s, alcance %s m, recarga %s s." % [stats.habilidade.nome, stats.habilidade.alcance, stats.habilidade.recarga],
		"Inimigos vivos a menos de %d m: %d." % [NEARBY_DISTANCE, nearby],
	]
	if nearest_name:
		lines.append("Inimigo mais próximo: %s, a %d m." % [nearest_name, roundi(nearest)])
	return "\n".join(lines)


## Verifica se o OpenJarvis está rodando e escolhe o modelo.
func probe_ai() -> void:
	if _probe.request(_base_url + "/health") != OK:
		_set_ai_available(false)
		return
	var health: Array = await _probe.request_completed
	if health[0] != HTTPRequest.RESULT_SUCCESS or health[1] != 200:
		_set_ai_available(false)
		return
	ai_model = GameData.companions.openjarvis.modelo
	if ai_model.is_empty():
		if _probe.request(_base_url + "/v1/models") != OK:
			_set_ai_available(false)
			return
		var models: Array = await _probe.request_completed
		var parsed: Variant = JSON.parse_string(models[3].get_string_from_utf8()) if models[1] == 200 else null
		if parsed is Dictionary and parsed.get("data") is Array and not parsed.data.is_empty():
			ai_model = parsed.data[0].get("id", "")
	_set_ai_available(not ai_model.is_empty())


## Limpa a resposta do modelo: tira o raciocínio interno e respeita o tamanho do elemento.
static func clean_reply(text: String, max_chars: int) -> String:
	var regex := RegEx.create_from_string("(?s)<think>.*?</think>")
	text = regex.sub(text, "", true).strip_edges()
	if text.length() <= max_chars:
		return text
	var cut := text.substr(0, max_chars)
	var sentence_end := maxi(cut.rfind(". "), maxi(cut.rfind("! "), cut.rfind("? ")))
	if sentence_end > max_chars / 2:
		return cut.substr(0, sentence_end + 1)
	return cut.strip_edges() + "…"


func _on_chat_completed(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	_set_busy(false)
	var reply := ""
	if result == HTTPRequest.RESULT_SUCCESS and code == 200:
		var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
		if parsed is Dictionary and parsed.get("choices") is Array and not parsed.choices.is_empty():
			reply = clean_reply(str(parsed.choices[0].get("message", {}).get("content", "")), element.max_caracteres)
	if reply.is_empty():
		history.pop_back()
		_set_ai_available(false)
		_say(offline_answer())
		return
	history.append({"role": "assistant", "content": reply})
	while history.size() > HISTORY_LIMIT:
		history.pop_front()
	_say(reply)


func _on_health_changed(current: float, maximum: float) -> void:
	var ratio := current / maximum
	if ratio <= LOW_HEALTH and current > 0.0 and not _low_health_warned:
		_low_health_warned = true
		react("vida_baixa", true)
	elif ratio >= HEALTH_RECOVERED:
		_low_health_warned = false


func _on_xp_changed(_xp: int, _xp_next: int, level: int) -> void:
	if level > _last_level:
		react("nivel", true)
	_last_level = level


func _say(text: String) -> void:
	_idle = 0.0
	said.emit(text)


func _set_busy(value: bool) -> void:
	busy = value
	thinking_changed.emit(value)


func _set_ai_available(value: bool) -> void:
	ai_available = value
	ai_status_changed.emit(value)
