class_name OfflineSave
extends RefCounted
## Save do personagem offline, no computador do jogador (docs/arquitetura-fase-1.md, seção 4).
## Um arquivo por personagem: <pasta>/off-<uuid>.json, com o número de formato, a versão do jogo,
## a hora da gravação e o CharacterState.
##
## Gravação atômica: escreve <id>.json.tmp, confere, troca o <id>.json válido para <id>.json.bak
## e renomeia o .tmp para <id>.json. Na leitura, se o arquivo principal faltar ou estiver
## quebrado, usa o .bak. Formato desconhecido (de uma versão mais nova do jogo) é recusado sem
## tocar no arquivo e sem cair para o .bak, para não esconder nem sobrescrever o progresso.
##
## Só o jogo offline usa esta classe. O personagem online vive no servidor, e nenhum código fora
## de scripts/offline/ pode ler esta pasta (o smoke_test confere).

enum Status { OK, NOT_FOUND, CORRUPT, UNKNOWN_FORMAT, INVALID_ID, WRITE_FAILED }

## Formato atual do arquivo. Subiu o formato: acrescente o passo em migrate().
## 1: personagem sem missões. 2: personagem com "missoes" (ativas e concluídas).
const FORMAT := 2
const DEFAULT_DIR := "user://offline/personagens"
const ID_PREFIX := "off-"
const BACKUP_SUFFIX := ".bak"
const TEMP_SUFFIX := ".tmp"

## Pasta dos saves. Os testes usam uma pasta própria, nunca a do jogador.
var folder: String
## Resultado da última leitura ou gravação.
var last_status := Status.OK
## A última leitura usou o .bak porque o arquivo principal faltava ou estava quebrado.
var last_from_backup := false

var _id_pattern := RegEx.create_from_string("^off-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


func _init(save_folder := DEFAULT_DIR) -> void:
	folder = save_folder.trim_suffix("/")


## Id novo no formato off-<uuid v4>.
static func new_id() -> String:
	var bytes := Crypto.new().generate_random_bytes(16)
	bytes[6] = (bytes[6] & 0x0f) | 0x40
	bytes[8] = (bytes[8] & 0x3f) | 0x80
	var hex := bytes.hex_encode()
	return ID_PREFIX + "%s-%s-%s-%s-%s" % [hex.substr(0, 8), hex.substr(8, 4), hex.substr(12, 4), hex.substr(16, 4), hex.substr(20, 12)]


## Só ids gerados por new_id(): impede caminho estranho (../) no nome do arquivo.
func is_valid_id(id: String) -> bool:
	return _id_pattern.search(id) != null


func path_for(id: String) -> String:
	return "%s/%s.json" % [folder, id]


## Converte um save antigo para o formato atual, um passo de formato por vez, sem mexer em
## `data`. Devolve {} se o formato for desconhecido. Cada passo é congelado: escreve o formato
## seguinte como ele era, sem depender do código atual.
static func migrate(data: Dictionary) -> Dictionary:
	var raw_format: Variant = data.get("formato")
	if not (raw_format is int or raw_format is float) or float(raw_format) != floorf(float(raw_format)):
		return {}
	var format := int(raw_format)
	if format < 1 or format > FORMAT:
		return {}
	var migrated := data.duplicate(true)
	if format == 1:
		# 1 -> 2: personagem ganha as missões, ainda sem nenhuma.
		if migrated.get("personagem") is Dictionary and not migrated.personagem.has("missoes"):
			migrated.personagem["missoes"] = {"ativas": {}, "concluidas": []}
		format = 2
	migrated.formato = format
	return migrated


## Grava o personagem de forma atômica. Devolve OK ou o erro do arquivo.
func save(state: CharacterState) -> Error:
	if not is_valid_id(state.id):
		last_status = Status.INVALID_ID
		return ERR_INVALID_PARAMETER
	var made := DirAccess.make_dir_recursive_absolute(folder)
	if made != OK:
		last_status = Status.WRITE_FAILED
		return made
	var path := path_for(state.id)
	var temp := path + TEMP_SUFFIX
	var backup := path + BACKUP_SUFFIX
	var text := JSON.stringify({
		"formato": FORMAT,
		"versao_jogo": str(ProjectSettings.get_setting("application/config/version", "")),
		"salvo_em": Time.get_datetime_string_from_system(true) + "Z",
		"personagem": state.to_dict(),
	}, "\t")

	var file := FileAccess.open(temp, FileAccess.WRITE)
	if file == null:
		last_status = Status.WRITE_FAILED
		return FileAccess.get_open_error()
	file.store_string(text)
	file.close()
	# Confere o que foi para o disco antes de mexer na versão anterior.
	if FileAccess.get_file_as_string(temp) != text:
		DirAccess.remove_absolute(temp)
		last_status = Status.WRITE_FAILED
		return ERR_FILE_CANT_WRITE

	# Só uma versão boa vira .bak; se a atual estiver quebrada, o .bak antigo fica.
	if FileAccess.file_exists(path):
		if _read(path, state.id).status == Status.OK:
			_replace(path, backup)
		else:
			DirAccess.remove_absolute(path)
	var renamed := _replace(temp, path)
	last_status = Status.OK if renamed == OK else Status.WRITE_FAILED
	return renamed


## Lê o personagem `id`. Devolve null se não existir, estiver quebrado sem .bak bom,
## ou tiver formato desconhecido; o motivo fica em last_status.
func load_character(id: String) -> CharacterState:
	var result := _load(id)
	return result.state


## Ids com save nesta pasta (pelo arquivo principal ou pelo .bak), em ordem.
func list_ids() -> Array[String]:
	var ids: Array[String] = []
	if not DirAccess.dir_exists_absolute(folder):
		return ids
	for file_name in DirAccess.get_files_at(folder):
		var id := file_name.trim_suffix(BACKUP_SUFFIX).trim_suffix(".json")
		if id != file_name and is_valid_id(id) and not ids.has(id):
			ids.append(id)
	ids.sort()
	return ids


## O save mais recente da classe (pela hora gravada; empate, mais tempo jogado, depois o id),
## ou null se não houver nenhum que dê para ler.
func latest_for_class(class_id: String) -> CharacterState:
	var best: CharacterState = null
	var best_saved_at := ""
	for id in list_ids():
		var result := _load(id)
		var state: CharacterState = result.state
		if state == null:
			if result.status == Status.UNKNOWN_FORMAT:
				push_warning("Save offline %s tem formato desconhecido e foi ignorado." % id)
			continue
		if state.class_id != class_id:
			continue
		# As datas ISO 8601 em UTC comparam certo como texto. Ids vêm em ordem, então no
		# empate total fica o último.
		var newer: bool = best == null or result.saved_at > best_saved_at \
				or (result.saved_at == best_saved_at and state.played_seconds >= best.played_seconds)
		if newer:
			best = state
			best_saved_at = result.saved_at
	return best


func _load(id: String) -> Dictionary:
	last_from_backup = false
	if not is_valid_id(id):
		last_status = Status.INVALID_ID
		return {"status": last_status, "state": null}
	var path := path_for(id)
	var result := _read(path, id)
	if result.status == Status.NOT_FOUND or result.status == Status.CORRUPT:
		var backup := _read(path + BACKUP_SUFFIX, id)
		if backup.status == Status.OK:
			last_from_backup = true
			if result.status == Status.CORRUPT:
				push_warning("Save offline %s quebrado; usando a cópia %s." % [id, BACKUP_SUFFIX])
			result = backup
		elif backup.status != Status.NOT_FOUND:
			result = backup
	last_status = result.status
	return result


## Lê e valida um arquivo. Devolve {"status", "state", "saved_at"}.
func _read(path: String, id: String) -> Dictionary:
	var result := {"status": Status.NOT_FOUND, "state": null, "saved_at": ""}
	if not FileAccess.file_exists(path):
		return result
	result.status = Status.CORRUPT
	var json := JSON.new()
	if json.parse(FileAccess.get_file_as_string(path)) != OK or not json.data is Dictionary:
		return result
	var data: Dictionary = json.data
	var raw_format: Variant = data.get("formato")
	if not (raw_format is int or raw_format is float):
		return result
	data = migrate(data)
	if data.is_empty():
		result.status = Status.UNKNOWN_FORMAT
		return result
	if not data.get("personagem") is Dictionary:
		return result
	var state := CharacterState.from_dict(data.personagem)
	if state == null or state.id != id:
		return result
	result.status = Status.OK
	result.state = state
	result.saved_at = str(data.get("salvo_em", ""))
	return result


## Renomeia `from` para `to`, apagando `to` antes (no Windows, renomear não sobrescreve).
func _replace(from: String, to: String) -> Error:
	if FileAccess.file_exists(to):
		var removed := DirAccess.remove_absolute(to)
		if removed != OK:
			return removed
	return DirAccess.rename_absolute(from, to)
