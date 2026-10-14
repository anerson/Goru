class_name CharacterState
extends RefCounted
## Dados do personagem que sobrevivem entre sessões: quem é, classe, nível, XP, onde está e
## quanto tempo jogou. Dados puros, sem Node nem arquivo: quem grava é OfflineSave (offline)
## e, no futuro, o CharacterRepository do servidor (online). Os dois não se conhecem.
##
## A vida não fica aqui: o personagem volta sempre com a vida cheia do nível
## (docs/arquitetura-fase-1.md, seção 4). As chaves do dicionário seguem o português de data/.

var id := ""
var display_name := ""
var class_id := ""
var level := 1
var xp := 0
var zone_id := ""
var position := Vector3.ZERO
var played_seconds := 0


func to_dict() -> Dictionary:
	return {
		"id": id,
		"nome": display_name,
		"classe": class_id,
		"nivel": level,
		"xp": xp,
		"zona": zone_id,
		"posicao": [position.x, position.y, position.z],
		"tempo_jogado_s": played_seconds,
	}


## Monta o estado a partir de `to_dict()`. Devolve null se faltar campo ou algum tipo estiver
## errado. O JSON do Godot lê todo número como float, então nível, XP e tempo viram int aqui.
static func from_dict(data: Dictionary) -> CharacterState:
	for key in ["id", "nome", "classe", "zona"]:
		if not data.get(key) is String:
			return null
	for key in ["nivel", "xp", "tempo_jogado_s"]:
		if not _is_number(data.get(key)):
			return null
	var raw_position: Variant = data.get("posicao")
	if not raw_position is Array or raw_position.size() != 3:
		return null
	for value: Variant in raw_position:
		if not _is_number(value) or not is_finite(float(value)):
			return null
	if data.id.is_empty() or data.classe.is_empty() or int(data.nivel) < 1 or int(data.xp) < 0 or int(data.tempo_jogado_s) < 0:
		return null
	var state := CharacterState.new()
	state.id = data.id
	state.display_name = data.nome
	state.class_id = data.classe
	state.level = int(data.nivel)
	state.xp = int(data.xp)
	state.zone_id = data.zona
	state.position = Vector3(float(raw_position[0]), float(raw_position[1]), float(raw_position[2]))
	state.played_seconds = int(data.tempo_jogado_s)
	return state


static func _is_number(value: Variant) -> bool:
	return value is int or value is float
