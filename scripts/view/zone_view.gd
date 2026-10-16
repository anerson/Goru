class_name ZoneView
extends RefCounted
## Aparência da zona: malhas dos obstáculos, nas mesmas posições da física (sim/zone_builder.gd),
## e um marco de brasa em cada ponto de exploração (guia de estilo, 5.1: pontos de interesse
## marcados por luz quente). O chão desenhado (com textura) fica na cena principal.

const OBSTACLE_COLOR := Color(0.32, 0.3, 0.33)
## Brasa do guia de estilo (#E8813A).
const POINT_COLOR := Color("#E8813A")


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
	for id: String in ZoneBuilder.points(zone):
		_build_point_marker(parent, ZoneBuilder.points(zone)[id])


## Braseiro baixo com luz quente e um disco tênue no chão do tamanho da área que conta.
static func _build_point_marker(parent: Node3D, point: Dictionary) -> void:
	var marker := Node3D.new()
	marker.name = "PointMarker"
	parent.add_child(marker)
	marker.position = point.posicao
	var ember := StandardMaterial3D.new()
	ember.albedo_color = POINT_COLOR
	ember.emission_enabled = true
	ember.emission = POINT_COLOR
	ember.emission_energy_multiplier = 2.0
	var brazier := MeshInstance3D.new()
	brazier.mesh = CylinderMesh.new()
	brazier.mesh.top_radius = 0.35
	brazier.mesh.bottom_radius = 0.25
	brazier.mesh.height = 0.6
	brazier.material_override = ember
	marker.add_child(brazier)
	brazier.position = Vector3(0, -0.7, 0)
	var area := StandardMaterial3D.new()
	area.albedo_color = Color(POINT_COLOR, 0.12)
	area.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	area.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var disc := MeshInstance3D.new()
	disc.mesh = CylinderMesh.new()
	disc.mesh.top_radius = point.raio
	disc.mesh.bottom_radius = point.raio
	disc.mesh.height = 0.02
	disc.material_override = area
	marker.add_child(disc)
	disc.position = Vector3(0, -0.98, 0)
	var light := OmniLight3D.new()
	light.light_color = POINT_COLOR
	light.light_energy = 1.5
	light.omni_range = 6.0
	marker.add_child(light)
	light.position = Vector3(0, 0.2, 0)
