class_name ZoneBuilder
extends RefCounted
## Monta a parte física de uma zona a partir da tabela (data/zona_*.json): chão e obstáculos.
## Sem malha nem material: serve igual ao jogo offline e ao servidor. A aparência da zona
## fica em scripts/view/zone_view.gd.


## Cria o chão e os obstáculos dentro de `parent`, nessa ordem.
static func build(parent: Node3D, zone: Dictionary) -> void:
	build_ground(parent, zone)
	build_obstacles(parent, zone)


static func build_ground(parent: Node3D, zone: Dictionary) -> StaticBody3D:
	var ground := _box_body(GameData.to_vector3(zone.chao.tamanho))
	ground.name = "Ground"
	parent.add_child(ground)
	ground.position = GameData.to_vector3(zone.chao.posicao)
	return ground


static func build_obstacles(parent: Node3D, zone: Dictionary) -> Array[StaticBody3D]:
	var bodies: Array[StaticBody3D] = []
	for data: Dictionary in zone.obstaculos:
		var body := _box_body(GameData.to_vector3(data.tamanho))
		parent.add_child(body)
		body.position = obstacle_center(data)
		bodies.append(body)
	return bodies


## Centro de um obstáculo: a tabela dá o ponto no chão; a caixa sobe metade da altura.
static func obstacle_center(data: Dictionary) -> Vector3:
	var size := GameData.to_vector3(data.tamanho)
	return GameData.to_vector3(data.posicao) + Vector3.UP * size.y / 2.0


## Lista de {"tipo": String, "posicao": Vector3} dos inimigos da zona, na ordem da tabela.
static func enemy_spawns(zone: Dictionary) -> Array[Dictionary]:
	var spawns: Array[Dictionary] = []
	for spawn: Dictionary in zone.inimigos:
		spawns.append({"tipo": spawn.tipo, "posicao": GameData.to_vector3(spawn.posicao)})
	return spawns


static func player_spawn(zone: Dictionary) -> Vector3:
	return GameData.to_vector3(zone.spawn_jogador)


static func _box_body(size: Vector3) -> StaticBody3D:
	var body := StaticBody3D.new()
	# Mundo na camada 1. Parado, não procura colisão com nada (máscara vazia).
	body.collision_layer = PhysicsLayers.WORLD
	body.collision_mask = 0
	var shape := CollisionShape3D.new()
	shape.shape = BoxShape3D.new()
	shape.shape.size = size
	body.add_child(shape)
	return body
