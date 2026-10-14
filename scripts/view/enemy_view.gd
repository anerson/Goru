class_name EnemyView
extends Node3D
## Aparência de um inimigo: malha, piscada ao levar golpe, rótulo de vida e números flutuantes.
## Só ouve os sinais do corpo (EnemyBody) e copia a transformação dele; não muda regra.

const TEXT_HEIGHT := 2.0
const FLASH_TIME := 0.15

var body: Node3D
var material := StandardMaterial3D.new()

@onready var body_mesh: MeshInstance3D = $Body
@onready var health_label: Label3D = $HealthLabel


func bind(target: Node3D) -> void:
	body = target
	material.albedo_color = GameData.to_color(GameData.enemies[body.enemy_id].cor)
	body_mesh.material_override = material
	body.health_changed.connect(_on_health_changed)
	body.damaged.connect(_on_damaged)
	body.evaded.connect(_on_evaded)
	body.died.connect(_on_died)
	body.respawned.connect(_on_respawned)
	_on_health_changed(body.health, body.max_health)
	visible = body.is_alive()
	_follow()


func _process(_delta: float) -> void:
	if is_instance_valid(body):
		_follow()


func _follow() -> void:
	global_transform = body.global_transform


func _on_health_changed(current: float, maximum: float) -> void:
	health_label.text = "%s\n%d / %d" % [GameData.enemies[body.enemy_id].nome, ceili(current), ceili(maximum)]


func _on_damaged(amount: float) -> void:
	_text(str(roundi(amount)), Color(1, 0.95, 0.4))
	var tween := create_tween()
	material.emission_enabled = true
	material.emission = Color.WHITE
	tween.tween_property(material, "emission_energy_multiplier", 0.0, FLASH_TIME).from(2.0)


func _on_evaded() -> void:
	_text("Evadiu", Color(0.8, 0.8, 0.8))


func _on_died() -> void:
	visible = false


func _on_respawned() -> void:
	_follow()
	visible = true


func _text(text: String, color: Color) -> void:
	Fx.floating_text(get_parent(), body.global_position + Vector3.UP * TEXT_HEIGHT, text, color)
