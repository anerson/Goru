extends Node3D
## Jogo offline: junta a simulação (WorldSim), a entrada local, as views, o HUD e o ajudante.
## A simulação monta a zona e cuida de combate, XP, morte e renascimento; aqui só se liga
## o que aparece na tela aos eventos dela e se cria o jogador após a escolha de classe.
##
## Save do personagem offline (OfflineSave): ao escolher a classe, continua do save mais recente
## dessa classe, se houver; senão cria um personagem novo. Grava ao entrar, ao subir de nível,
## ao morrer, ao fechar a janela e a cada `offline_salvamento_intervalo` segundos (data/regras.json).

const PLAYER_VIEW_SCENE := preload("res://scenes/player_view.tscn")
const ENEMY_VIEW_SCENE := preload("res://scenes/enemy_view.tscn")
const CAMERA_RIG_SCENE := preload("res://scenes/camera_rig.tscn")

var player: PlayerBody
var player_view: PlayerView
var camera_rig: CameraRig
var companion: Companion
var local_input: LocalInput
## Onde o personagem offline é salvo. Null desliga o save. Só a cena principal do jogo cria o
## save padrão (user://offline/personagens): quando main.tscn roda dentro de um teste, o save
## fica desligado, a menos que o teste ponha aqui um OfflineSave com uma pasta de teste.
var offline_save: OfflineSave
## Personagem em jogo, como vai para o save.
var character: CharacterState
var _chosen_class := ""
var _save_elapsed := 0.0
var _played_base := 0
var _session_start_tick := 0

@onready var hud: CanvasLayer = $HUD
@onready var world: WorldSim = $WorldSim
@onready var views_root: Node3D = $Views


func _ready() -> void:
	if offline_save == null and get_tree().current_scene == self:
		offline_save = OfflineSave.new()
	$Sun.rotation_degrees = Vector3(-50, 30, 0)
	$MenuCamera.look_at_from_position(Vector3(0, 25, 30), Vector3.ZERO)
	world.setup(GameData.zone)
	ZoneView.build(views_root, GameData.zone)
	for enemy in world.enemies:
		var view: EnemyView = ENEMY_VIEW_SCENE.instantiate()
		views_root.add_child(view)
		view.bind(enemy)
	world.entity_died.connect(_on_entity_died)
	world.respawned.connect(_on_respawned)
	world.level_up.connect(_on_level_up)
	hud.class_chosen.connect(_on_class_chosen)
	hud.element_chosen.connect(_on_element_chosen)
	hud.chat_toggled.connect(_on_chat_toggled)
	hud.show_class_selection(GameData.classes, GameData.zone.nome)


func start_game(class_id: String, element_id := "folha") -> void:
	character = _load_or_create_character(class_id)
	# Salvo em outra zona: começa no ponto de nascimento desta.
	var at: Vector3 = character.position if character.zone_id == GameData.zone_id else world.player_spawn()
	player = world.add_player(class_id, at)
	player.set_progress(character.level, character.xp)
	_played_base = character.played_seconds
	_session_start_tick = world.tick
	player_view = PLAYER_VIEW_SCENE.instantiate()
	views_root.add_child(player_view)
	player_view.bind(player)
	camera_rig = CAMERA_RIG_SCENE.instantiate()
	views_root.add_child(camera_rig)
	camera_rig.follow(player)
	local_input = LocalInput.new(camera_rig)
	player.input_source = local_input.next_frame
	hud.bind_player(player, GameData.classes[class_id])
	player.emit_state()
	companion = Companion.new()
	companion.name = "Companion"
	add_child(companion)
	companion.setup(element_id, player)
	hud.bind_companion(companion)
	companion.react("inicio", true)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	save_character()


## Grava o personagem offline agora. Morto, grava no ponto de renascimento, onde ele vai voltar.
## Devolve OK, ou o erro (também sem save ligado ou sem jogador).
func save_character() -> Error:
	if offline_save == null or player == null or character == null:
		return ERR_UNCONFIGURED
	character.level = player.level
	character.xp = player.xp
	character.zone_id = GameData.zone_id
	if player.is_dead:
		character.position = world.player_spawn()
	elif player.is_inside_tree():
		character.position = player.global_position
	character.played_seconds = _played_base + int((world.tick - _session_start_tick) / float(world.tick_rate))
	_save_elapsed = 0.0
	var result := offline_save.save(character)
	if result != OK:
		push_warning("Não foi possível salvar o personagem offline (%s)." % error_string(result))
	return result


func _process(delta: float) -> void:
	if offline_save == null or player == null:
		return
	_save_elapsed += delta
	if _save_elapsed >= float(GameData.rules.offline_salvamento_intervalo):
		save_character()


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		save_character()


## Save mais recente da classe, ou um personagem novo no nível 1.
func _load_or_create_character(class_id: String) -> CharacterState:
	if offline_save:
		var saved := offline_save.latest_for_class(class_id)
		if saved:
			return saved
	var state := CharacterState.new()
	state.id = OfflineSave.new_id()
	state.display_name = GameData.classes[class_id].nome
	state.class_id = class_id
	state.zone_id = GameData.zone_id
	state.position = world.player_spawn()
	return state


func _on_class_chosen(class_id: String) -> void:
	_chosen_class = class_id
	hud.show_element_selection(GameData.companions.elementos)


func _on_element_chosen(element_id: String) -> void:
	start_game(_chosen_class, element_id)


func _on_chat_toggled(is_open: bool) -> void:
	if local_input:
		local_input.controls_enabled = not is_open
	if camera_rig:
		camera_rig.controls_enabled = not is_open


func _on_entity_died(id: int, _killer_id: int, participants: Array) -> void:
	if player == null:
		return
	if id == player.id:
		hud.show_death(world.rules.jogador_renascimento)
		save_character()
	elif world.is_enemy(id) and companion and participants.has(player.id):
		companion.react("abate")


func _on_respawned(id: int, _position: Vector3) -> void:
	if player and id == player.id:
		hud.hide_death()


func _on_level_up(id: int, _level: int) -> void:
	if player and id == player.id:
		save_character()
