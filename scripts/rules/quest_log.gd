class_name QuestLog
extends RefCounted
## Regras puras de missões: quais estão disponíveis, aceitar, e progresso por evento.
## Sem Node, Input, Fx nem rede: roda igual no offline e no servidor. Quem decide quando um
## evento acontece (abate, posição do jogador) é a WorldSim; aqui só se calcula o estado novo.
##
## Estado de um jogador (as chaves seguem o português de data/, porque vão para o save):
##   {"ativas": {id: {"progresso": [int por objetivo]}}, "concluidas": [id, ...]}
## Catálogo: {id: missão}, já validado por QuestValidator (data/missoes/*.json).
##
## Eventos:
##   {"tipo": "abate", "inimigo": "<id em data/enemies.json>"}
##   {"tipo": "posicao", "posicao": Vector3}
## Pontos de exploração: {id: {"posicao": Vector3, "raio": float}} (ZoneBuilder.points).

const EVENT_KILL := "abate"
const EVENT_POSITION := "posicao"
const OBJECTIVE_KILL := "matar"
const OBJECTIVE_EXPLORE := "explorar"


static func new_state() -> Dictionary:
	return {"ativas": {}, "concluidas": []}


## Ids das missões que o jogador pode receber agora, na ordem do catálogo: nem ativas nem
## concluídas, com todos os pré-requisitos concluídos e nível mínimo alcançado.
static func available(state: Dictionary, catalog: Dictionary, level: int) -> Array[String]:
	var found: Array[String] = []
	for quest_id: String in catalog:
		if state.ativas.has(quest_id) or state.concluidas.has(quest_id):
			continue
		var quest: Dictionary = catalog[quest_id]
		if level < int(quest.nivel_min):
			continue
		var ready := true
		for required: String in quest.pre_requisitos:
			ready = ready and state.concluidas.has(required)
		if ready:
			found.append(quest_id)
	return found


## Estado novo com `quest_id` ativa e progresso zerado. Não confere disponibilidade.
static func accept(state: Dictionary, quest_id: String, catalog: Dictionary) -> Dictionary:
	var next := state.duplicate(true)
	var progress: Array = []
	progress.resize(catalog[quest_id].objetivos.size())
	progress.fill(0)
	next.ativas[quest_id] = {"progresso": progress}
	return next


## Aceita todas as disponíveis (sem NPC ainda, a missão chega sozinha).
## Devolve {"state": estado novo, "accepted": [ids aceitos, em ordem]}.
static func accept_available(state: Dictionary, catalog: Dictionary, level: int) -> Dictionary:
	var next := state
	var accepted := available(state, catalog, level)
	for quest_id in accepted:
		next = accept(next, quest_id, catalog)
	return {"state": next if not accepted.is_empty() else state.duplicate(true), "accepted": accepted}


## Quanto falta contar para o objetivo estar cumprido.
static func goal_for(objective: Dictionary) -> int:
	if objective.tipo == OBJECTIVE_KILL:
		return int(objective.quantidade)
	return 1


static func is_complete(quest: Dictionary, progress: Array) -> bool:
	for index in quest.objetivos.size():
		if index >= progress.size() or int(progress[index]) < goal_for(quest.objetivos[index]):
			return false
	return true


## Aplica um evento ao estado. Missão com todos os objetivos cumpridos sai de "ativas" e entra em
## "concluidas". Não mexe em `state`.
## Devolve {"state": estado novo, "progressed": [ids que avançaram], "completed": [ids concluídas]}.
static func apply_event(state: Dictionary, catalog: Dictionary, event: Dictionary, points := {}) -> Dictionary:
	var next := state.duplicate(true)
	var progressed: Array[String] = []
	var completed: Array[String] = []
	for quest_id: String in next.ativas:
		var quest: Dictionary = catalog.get(quest_id, {})
		if quest.is_empty():
			continue
		var progress: Array = next.ativas[quest_id].progresso
		var changed := false
		for index in quest.objetivos.size():
			var objective: Dictionary = quest.objetivos[index]
			if int(progress[index]) >= goal_for(objective) or not _matches(objective, event, points):
				continue
			progress[index] = int(progress[index]) + 1
			changed = true
		if not changed:
			continue
		progressed.append(quest_id)
		if is_complete(quest, progress):
			completed.append(quest_id)
	for quest_id in completed:
		next.ativas.erase(quest_id)
		next.concluidas.append(quest_id)
	return {"state": next, "progressed": progressed, "completed": completed}


## Se alguma missão ativa espera chegar a um ponto (para a sim não testar a posição à toa).
static func needs_position(state: Dictionary, catalog: Dictionary) -> bool:
	for quest_id: String in state.ativas:
		var quest: Dictionary = catalog.get(quest_id, {})
		for objective: Dictionary in quest.get("objetivos", []):
			if objective.tipo == OBJECTIVE_EXPLORE:
				return true
	return false


## Lê o estado vindo de fora (save). Devolve null se o formato estiver errado. Números viram int.
static func parse_state(raw: Variant) -> Variant:
	if not raw is Dictionary or not raw.get("ativas") is Dictionary or not raw.get("concluidas") is Array:
		return null
	var state := new_state()
	for quest_id: Variant in raw.ativas:
		var entry: Variant = raw.ativas[quest_id]
		if not quest_id is String or not entry is Dictionary or not entry.get("progresso") is Array:
			return null
		var progress: Array = []
		for value: Variant in entry.progresso:
			if not (value is int or value is float) or float(value) < 0.0 or float(value) != floorf(float(value)):
				return null
			progress.append(int(value))
		state.ativas[quest_id] = {"progresso": progress}
	for quest_id: Variant in raw.concluidas:
		if not quest_id is String:
			return null
		if not state.concluidas.has(quest_id):
			state.concluidas.append(quest_id)
	return state


## Ajusta um estado salvo ao catálogo atual: tira missões ativas que não existem mais (ou que já
## constam como concluídas), zera progresso com número de objetivos diferente e limita cada
## contagem à meta. As concluídas ficam como estão (servem de pré-requisito).
static func sanitize(state: Dictionary, catalog: Dictionary) -> Dictionary:
	var clean := new_state()
	clean.concluidas = state.concluidas.duplicate()
	for quest_id: String in state.ativas:
		if not catalog.has(quest_id) or clean.concluidas.has(quest_id):
			continue
		var objectives: Array = catalog[quest_id].objetivos
		var saved: Array = state.ativas[quest_id].progresso
		var progress: Array = []
		for index in objectives.size():
			var value: int = int(saved[index]) if saved.size() == objectives.size() else 0
			progress.append(clampi(value, 0, goal_for(objectives[index])))
		clean.ativas[quest_id] = {"progresso": progress}
	return clean


static func _matches(objective: Dictionary, event: Dictionary, points: Dictionary) -> bool:
	match objective.tipo:
		OBJECTIVE_KILL:
			return event.get("tipo") == EVENT_KILL and event.get("inimigo") == objective.inimigo
		OBJECTIVE_EXPLORE:
			if event.get("tipo") != EVENT_POSITION or not points.has(objective.ponto):
				return false
			var point: Dictionary = points[objective.ponto]
			var at: Vector3 = event.posicao
			var center: Vector3 = point.posicao
			# Distância no chão, como o alcance das habilidades: a altura não conta.
			return Vector2(at.x - center.x, at.z - center.z).length() <= float(point.raio)
	return false
