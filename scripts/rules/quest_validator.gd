class_name QuestValidator
extends RefCounted
## Validador das missões (data/missoes/*.json). Puro: recebe os arquivos já lidos e as tabelas
## e devolve a lista de erros em português, um por linha, com arquivo e id (vazia = tudo certo).
## Quem lê os arquivos do disco é o GameData; o servidor vai usar o mesmo validador ao subir.
##
## Formato de um arquivo: {"missoes": [missão, ...]}. Campos de uma missão:
##   id             texto único em todos os arquivos (letras minúsculas, números e _)
##   zona           id da zona (nome do arquivo em data/, ex.: "zona_1")
##   nivel_min      inteiro de 1 em diante
##   pre_requisitos lista de ids de missões que precisam estar concluídas
##   tipo           um de KNOWN_TYPES; só SUPPORTED_TYPES funcionam por enquanto
##   objetivos      lista de {"tipo", "texto"} mais, para "matar", "inimigo" e "quantidade";
##                  para "explorar", "ponto" (id em "pontos" da zona)
##   recompensa     {"xp": N, "ouro": N (opcional), "itens": {"id_do_item": quantidade} (opcional)}.
##                  Por enquanto só a XP é dada; ouro e itens são aceitos e guardados para depois.
##   textos         chaves em data/textos/missoes.json: "titulo", "descricao", "conclusao"

const KNOWN_TYPES := ["conversa", "matar", "coletar", "entregar", "escoltar", "explorar", "instancia"]
const SUPPORTED_TYPES := ["matar", "explorar"]
const TEXT_FIELDS := ["titulo", "descricao", "conclusao"]
const REWARD_FIELDS := ["xp", "ouro", "itens"]
const ID_PATTERN := "^[a-z0-9_]+$"


## `files`: [{"arquivo": nome, "dados": JSON lido}]. `texts`: chave -> texto.
## `enemies`: data/enemies.json. `zones`: {id da zona: tabela da zona}. `rules`: data/regras.json.
static func validate(files: Array, texts: Dictionary, enemies: Dictionary, zones: Dictionary, rules: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	var id_pattern := RegEx.create_from_string(ID_PATTERN)
	var owner := {}
	var missions: Array[Dictionary] = []
	for file: Dictionary in files:
		var data: Variant = file.dados
		if not data is Dictionary or not data.get("missoes") is Array:
			errors.append("%s: falta a lista \"missoes\"" % file.arquivo)
			continue
		for index in data.missoes.size():
			var quest: Variant = data.missoes[index]
			var where := "%s, missão %d" % [file.arquivo, index + 1]
			if not quest is Dictionary:
				errors.append("%s: não é um objeto" % where)
				continue
			var quest_id: Variant = quest.get("id")
			if not quest_id is String or id_pattern.search(quest_id) == null:
				errors.append("%s: id inválido (%s); use letras minúsculas, números e _" % [where, var_to_str(quest_id)])
				continue
			if owner.has(quest_id):
				errors.append("%s [%s]: id repetido (já usado em %s)" % [file.arquivo, quest_id, owner[quest_id]])
				continue
			owner[quest_id] = file.arquivo
			missions.append({"arquivo": file.arquivo, "missao": quest})
	for entry in missions:
		errors.append_array(_check_quest(entry.arquivo, entry.missao, owner, texts, enemies, zones, rules))
	errors.append_array(_check_cycles(missions))
	return errors


## Ids das zonas citadas pelas missões, para quem chama carregar as tabelas delas.
static func zone_ids(files: Array) -> Array[String]:
	var ids: Array[String] = []
	var id_pattern := RegEx.create_from_string(ID_PATTERN)
	for file: Dictionary in files:
		if not file.dados is Dictionary or not file.dados.get("missoes") is Array:
			continue
		for quest: Variant in file.dados.missoes:
			if quest is Dictionary and quest.get("zona") is String and id_pattern.search(quest.zona) != null and not ids.has(quest.zona):
				ids.append(quest.zona)
	return ids


## Catálogo {id: missão} na ordem dos arquivos, com os números convertidos para int.
## Só chame depois de validate() sem erros.
static func catalog(files: Array) -> Dictionary:
	var result := {}
	for file: Dictionary in files:
		for raw: Dictionary in file.dados.missoes:
			var quest := raw.duplicate(true)
			quest.nivel_min = int(quest.nivel_min)
			for objective: Dictionary in quest.objetivos:
				if objective.has("quantidade"):
					objective.quantidade = int(objective.quantidade)
			quest.recompensa.xp = int(quest.recompensa.xp)
			quest.recompensa.ouro = int(quest.recompensa.get("ouro", 0))
			var items := {}
			for item_id: String in quest.recompensa.get("itens", {}):
				items[item_id] = int(quest.recompensa.itens[item_id])
			quest.recompensa.itens = items
			result[quest.id] = quest
	return result


## Faixa de XP aceita para uma missão de nível mínimo `level`: [mínimo, máximo] em XP, como
## frações da XP que o nível pede para subir (data/regras.json, missao_xp_min/max_fracao).
static func xp_range(level: int, rules: Dictionary) -> Array[int]:
	var needed := float(Progression.xp_to_next_level(level, rules))
	return [ceili(needed * float(rules.missao_xp_min_fracao)), floori(needed * float(rules.missao_xp_max_fracao))]


static func _check_quest(file_name: String, quest: Dictionary, owner: Dictionary, texts: Dictionary,
		enemies: Dictionary, zones: Dictionary, rules: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	var prefix := "%s [%s]: " % [file_name, quest.id]

	var level := -1
	if _is_whole(quest.get("nivel_min")) and int(quest.nivel_min) >= 1:
		level = int(quest.nivel_min)
	else:
		errors.append(prefix + "nivel_min deve ser um inteiro de 1 em diante")

	var required: Variant = quest.get("pre_requisitos")
	if not required is Array:
		errors.append(prefix + "pre_requisitos deve ser uma lista (vazia se não houver)")
	else:
		for other: Variant in required:
			if not other is String:
				errors.append(prefix + "pré-requisito inválido %s" % var_to_str(other))
			elif other == quest.id:
				errors.append(prefix + "a missão é pré-requisito dela mesma")
			elif not owner.has(other):
				errors.append(prefix + "pré-requisito inexistente \"%s\"" % other)

	var type_error := _type_error(quest.get("tipo"))
	if not type_error.is_empty():
		errors.append(prefix + type_error)

	var zone: Dictionary = {}
	var zone_id: Variant = quest.get("zona")
	if zone_id is String and zones.get(zone_id) is Dictionary:
		zone = zones[zone_id]
	else:
		errors.append(prefix + "zona inexistente %s" % var_to_str(zone_id))

	var objectives: Variant = quest.get("objetivos")
	if not objectives is Array or objectives.is_empty():
		errors.append(prefix + "objetivos deve ser uma lista com pelo menos um objetivo")
	else:
		for index in objectives.size():
			errors.append_array(_check_objective(prefix + "objetivo %d: " % (index + 1), objectives[index], texts, enemies, zone, str(zone_id)))

	errors.append_array(_check_reward(prefix, quest.get("recompensa"), level, rules))

	var quest_texts: Variant = quest.get("textos")
	if not quest_texts is Dictionary:
		errors.append(prefix + "falta o objeto \"textos\" (%s)" % ", ".join(TEXT_FIELDS))
	else:
		for field: String in TEXT_FIELDS:
			var key_error := _text_error(quest_texts.get(field), texts)
			if not key_error.is_empty():
				errors.append(prefix + "texto \"%s\": %s" % [field, key_error])
	return errors


static func _check_objective(prefix: String, objective: Variant, texts: Dictionary, enemies: Dictionary, zone: Dictionary, zone_id: String) -> Array[String]:
	var errors: Array[String] = []
	if not objective is Dictionary:
		return [prefix + "não é um objeto"]
	var type_error := _type_error(objective.get("tipo"))
	if not type_error.is_empty():
		errors.append(prefix + type_error)
	var key_error := _text_error(objective.get("texto"), texts)
	if not key_error.is_empty():
		errors.append(prefix + "texto: " + key_error)
	match objective.get("tipo"):
		QuestLog.OBJECTIVE_KILL:
			var enemy: Variant = objective.get("inimigo")
			if not enemy is String or not enemies.has(enemy):
				errors.append(prefix + "inimigo inexistente %s" % var_to_str(enemy))
			elif not zone.is_empty() and not _zone_has_enemy(zone, enemy):
				errors.append(prefix + "inimigo \"%s\" não aparece em %s" % [enemy, zone_id])
			if not _is_whole(objective.get("quantidade")) or int(objective.quantidade) < 1:
				errors.append(prefix + "quantidade deve ser um inteiro de 1 em diante")
		QuestLog.OBJECTIVE_EXPLORE:
			var point: Variant = objective.get("ponto")
			if not point is String or (not zone.is_empty() and not _zone_points(zone).has(point)):
				errors.append(prefix + "ponto inexistente %s em %s" % [var_to_str(point), zone_id])
	return errors


static func _check_reward(prefix: String, reward: Variant, level: int, rules: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	if not reward is Dictionary:
		return [prefix + "falta o objeto \"recompensa\" com \"xp\""]
	for field: Variant in reward:
		if not REWARD_FIELDS.has(field):
			errors.append(prefix + "campo desconhecido em recompensa %s (use %s)" % [var_to_str(field), ", ".join(REWARD_FIELDS)])
	if not _is_whole(reward.get("xp")) or int(reward.xp) < 0:
		errors.append(prefix + "recompensa sem XP inteira")
	elif level >= 1:
		var limits := xp_range(level, rules)
		if int(reward.xp) < limits[0] or int(reward.xp) > limits[1]:
			errors.append(prefix + "recompensa de %d XP fora da faixa do nível %d (%d a %d XP)" % [int(reward.xp), level, limits[0], limits[1]])
	if reward.has("ouro") and (not _is_whole(reward.ouro) or int(reward.ouro) < 0):
		errors.append(prefix + "ouro da recompensa deve ser um inteiro de 0 em diante")
	if reward.has("itens"):
		if not reward.itens is Dictionary:
			errors.append(prefix + "itens da recompensa deve ser um objeto {\"id_do_item\": quantidade}")
		else:
			for item_id: Variant in reward.itens:
				if not _is_whole(reward.itens[item_id]) or int(reward.itens[item_id]) < 1:
					errors.append(prefix + "item \"%s\" da recompensa com quantidade inválida" % str(item_id))
	return errors


## Pré-requisitos em ciclo nunca ficam disponíveis. Um erro por ciclo encontrado.
static func _check_cycles(missions: Array[Dictionary]) -> Array[String]:
	var requires := {}
	for entry in missions:
		var list: Array = []
		var raw: Variant = entry.missao.get("pre_requisitos")
		if raw is Array:
			for other: Variant in raw:
				if other is String and other != entry.missao.id:
					list.append(other)
		requires[entry.missao.id] = list
	var errors: Array[String] = []
	var finished := {}
	for quest_id: String in requires:
		_visit(quest_id, requires, [], finished, errors)
	return errors


static func _visit(quest_id: String, requires: Dictionary, path: Array, finished: Dictionary, errors: Array[String]) -> void:
	if finished.has(quest_id) or not requires.has(quest_id):
		return
	var at := path.find(quest_id)
	if at >= 0:
		var cycle := path.slice(at)
		cycle.append(quest_id)
		errors.append("pré-requisitos em ciclo: %s" % " -> ".join(cycle))
		return
	path.append(quest_id)
	for other: String in requires[quest_id]:
		_visit(other, requires, path, finished, errors)
	path.pop_back()
	finished[quest_id] = true


static func _type_error(type: Variant) -> String:
	if not type is String or not KNOWN_TYPES.has(type):
		return "tipo desconhecido %s (conhecidos: %s)" % [var_to_str(type), ", ".join(KNOWN_TYPES)]
	if not SUPPORTED_TYPES.has(type):
		return "tipo \"%s\" reconhecido, mas ainda não suportado (por enquanto: %s)" % [type, ", ".join(SUPPORTED_TYPES)]
	return ""


static func _text_error(key: Variant, texts: Dictionary) -> String:
	if not key is String or key.is_empty():
		return "falta a chave de texto"
	if not texts.get(key) is String:
		return "chave de texto inexistente \"%s\"" % key
	return ""


static func _zone_has_enemy(zone: Dictionary, enemy: String) -> bool:
	for spawn: Variant in zone.get("inimigos", []):
		if spawn is Dictionary and spawn.get("tipo") == enemy:
			return true
	return false


static func _zone_points(zone: Dictionary) -> Dictionary:
	var points := {}
	for point: Variant in zone.get("pontos", []):
		if point is Dictionary and point.get("id") is String:
			points[point.id] = point
	return points


static func _is_whole(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) == floorf(float(value))
