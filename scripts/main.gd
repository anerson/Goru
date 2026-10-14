extends Node3D
## Monta a zona a partir de data/zona_1.json, cria o jogador após a escolha de classe
## e cuida de morte e renascimento.

const PLAYER_SCENE := preload("res://scenes/player.tscn")
const ENEMY_SCENE := preload("res://scenes/enemy.tscn")
const RESPAWN_DELAY := 3.0

var player: CharacterBody3D
var companion: Companion
var local_input: LocalInput
var _chosen_class := ""

@onready var hud: CanvasLayer = $HUD
@onready var enemies_root: Node3D = $Enemies
@onready var obstacles_root: Node3D = $Obstacles


func _ready() -> void:
	$Sun.rotation_degrees = Vector3(-50, 30, 0)
	$MenuCamera.look_at_from_position(Vector3(0, 25, 30), Vector3.ZERO)
	_build_obstacles()
	_spawn_enemies()
	hud.class_chosen.connect(_on_class_chosen)
	hud.element_chosen.connect(_on_element_chosen)
	hud.show_class_selection(GameData.classes, GameData.zone.nome)


func start_game(class_id: String, element_id := "folha") -> void:
	player = PLAYER_SCENE.instantiate()
	player.class_id = class_id
	add_child(player)
	player.global_position = GameData.to_vector3(GameData.zone.spawn_jogador)
	local_input = LocalInput.new(player)
	player.input_source = local_input.next_frame
	player.died.connect(_on_player_died)
	hud.bind_player(player)
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


func _spawn_enemies() -> void:
	for spawn: Dictionary in GameData.zone.inimigos:
		var enemy := ENEMY_SCENE.instantiate()
		enemy.enemy_id = spawn.tipo
		enemy.spawn_position = GameData.to_vector3(spawn.posicao)
		enemy.killed.connect(_on_enemy_killed)
		enemies_root.add_child(enemy)


func _build_obstacles() -> void:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.32, 0.3, 0.33)
	for data: Dictionary in GameData.zone.obstaculos:
		var size := GameData.to_vector3(data.tamanho)
		var body := StaticBody3D.new()
		var shape := CollisionShape3D.new()
		shape.shape = BoxShape3D.new()
		shape.shape.size = size
		var mesh := MeshInstance3D.new()
		mesh.mesh = BoxMesh.new()
		mesh.mesh.size = size
		mesh.material_override = material
		body.add_child(shape)
		body.add_child(mesh)
		obstacles_root.add_child(body)
		body.position = GameData.to_vector3(data.posicao) + Vector3.UP * size.y / 2.0


func _on_enemy_killed(xp_reward: int) -> void:
	if player:
		player.add_xp(xp_reward)
	if companion:
		companion.react("abate")


func _on_player_died() -> void:
	hud.show_death(RESPAWN_DELAY)
	# Conta em tempo de física (ticks), como o resto da simulação, e não em quadros de tela.
	await get_tree().create_timer(RESPAWN_DELAY, true, true).timeout
	player.respawn(GameData.to_vector3(GameData.zone.spawn_jogador))
	hud.hide_death()
