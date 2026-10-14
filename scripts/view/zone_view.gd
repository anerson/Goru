class_name ZoneView
extends RefCounted
## Aparência da zona: malhas dos obstáculos, nas mesmas posições da física (sim/zone_builder.gd).
## O chão desenhado (com textura) fica na cena principal.

const OBSTACLE_COLOR := Color(0.32, 0.3, 0.33)


static func build(parent: Node3D, zone: Dictionary) -> void:
	var material := StandardMaterial3D.new()
	material.albedo_color = OBSTACLE_COLOR
	for data: Dictionary in zone.obstaculos:
		var mesh := MeshInstance3D.new()
		mesh.mesh = BoxMesh.new()
		mesh.mesh.size = GameData.to_vector3(data.tamanho)
		mesh.material_override = material
		parent.add_child(mesh)
		mesh.position = ZoneBuilder.obstacle_center(data)
