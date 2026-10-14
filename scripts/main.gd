extends Node3D
## Monta a zona a partir de data/zona_1.json, cria o jogador após a escolha de classe
## e cuida de morte e renascimento.

const PLAYER_SCENE := preload("res://scenes/player.tscn")
const ENEMY_SCENE := preload("res://scenes/enemy.tscn")
const RESPAWN_DELAY := 3.0

var player: CharacterBody3D

@onready var hud: CanvasLayer = $HUD
@onready var enemies_root: Node3D = $Enemies
@onready var obstacles_root: Node3D = $Obstacles


func _ready() -> void:
	$Sun.rotation_degrees = Vector3(-50, 30, 0)
	$MenuCamera.look_at_from_position(Vector3(0, 25, 30), Vector3.ZERO)
	_build_obstacles()
	_spawn_enemies()
	hud.class_chosen.connect(start_game)
	hud.show_class_selection(GameData.classes, GameData.zone.nome)


func start_game(class_id: String) -> void:
	player = PLAYER_SCENE.instantiate()
	player.class_id = class_id
	add_child(player)
	player.global_position = GameData.to_vector3(GameData.zone.spawn_jogador)
	player.died.connect(_on_player_died)
	hud.bind_player(player)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


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


func _on_player_died() -> void:
	hud.show_death(RESPAWN_DELAY)
	await get_tree().create_timer(RESPAWN_DELAY).timeout
	player.respawn(GameData.to_vector3(GameData.zone.spawn_jogador))
	hud.hide_death()
