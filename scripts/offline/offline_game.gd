extends Node3D
## Jogo offline: junta a simulação (WorldSim), a entrada local, as views, o HUD e o ajudante.
## A simulação monta a zona e cuida de combate, XP, morte e renascimento; aqui só se liga
## o que aparece na tela aos eventos dela e se cria o jogador após a escolha de classe.

const PLAYER_VIEW_SCENE := preload("res://scenes/player_view.tscn")
const ENEMY_VIEW_SCENE := preload("res://scenes/enemy_view.tscn")
const CAMERA_RIG_SCENE := preload("res://scenes/camera_rig.tscn")

var player: PlayerBody
var player_view: PlayerView
var camera_rig: CameraRig
var companion: Companion
var local_input: LocalInput
var _chosen_class := ""

@onready var hud: CanvasLayer = $HUD
@onready var world: WorldSim = $WorldSim
@onready var views_root: Node3D = $Views


func _ready() -> void:
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
	hud.class_chosen.connect(_on_class_chosen)
	hud.element_chosen.connect(_on_element_chosen)
	hud.chat_toggled.connect(_on_chat_toggled)
	hud.show_class_selection(GameData.classes, GameData.zone.nome)


func start_game(class_id: String, element_id := "folha") -> void:
	player = world.add_player(class_id)
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
	elif world.is_enemy(id) and companion and participants.has(player.id):
		companion.react("abate")


func _on_respawned(id: int, _position: Vector3) -> void:
	if player and id == player.id:
		hud.hide_death()
