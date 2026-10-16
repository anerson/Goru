class_name PlayerView
extends Node3D
## Aparência de um jogador: malha, golpe da arma, pose de morte e números flutuantes.
## Só ouve os sinais do corpo (PlayerBody) e copia a posição e o giro dele; não muda regra.

const SWING_TIME := 0.08
const SWING_BACK_TIME := 0.15
const SPIN_TIME := 0.35
const TEXT_HEIGHT := 2.3
const LEVEL_TEXT_HEIGHT := 2.6

var body: Node3D
## Giro extra do golpe giratório, somado ao giro do corpo enquanto a animação roda.
var _spin := 0.0

@onready var model: Node3D = $Model
@onready var weapon: Node3D = $Model/Weapon


func bind(target: Node3D) -> void:
	body = target
	var material := StandardMaterial3D.new()
	material.albedo_color = GameData.to_color(GameData.classes[body.class_id].cor)
	$Model/Body.material_override = material
	body.damaged.connect(_on_damaged)
	body.healed.connect(_on_healed)
	body.leveled_up.connect(_on_leveled_up)
	body.ability_resolved.connect(_on_ability_resolved)
	body.died.connect(_on_died)
	body.respawned.connect(_on_respawned)
	_follow()


func _process(_delta: float) -> void:
	if is_instance_valid(body):
		_follow()


func _follow() -> void:
	global_position = body.global_position
	model.rotation.y = body.facing_yaw + _spin


func _on_damaged(amount: float) -> void:
	_text(str(roundi(amount)), Color(1, 0.3, 0.3), TEXT_HEIGHT)


func _on_healed(amount: float) -> void:
	_text("+%d" % roundi(amount), Color(0.4, 1, 0.4), TEXT_HEIGHT)


func _on_leveled_up(level: int) -> void:
	_text("Nível %d!" % level, Color(1, 0.85, 0.2), LEVEL_TEXT_HEIGHT)


func _on_ability_resolved(ability_key: String, _hits: int) -> void:
	var ability: Dictionary = GameData.classes[body.class_id][ability_key]
	var tween := create_tween()
	if ability.angulo >= 360:
		tween.tween_property(self, "_spin", TAU, SPIN_TIME).from(0.0)
		tween.tween_callback(func(): _spin = 0.0)
	else:
		weapon.rotation.x = 0.0
		tween.tween_property(weapon, "rotation:x", -1.3, SWING_TIME)
		tween.tween_property(weapon, "rotation:x", 0.0, SWING_BACK_TIME)


func _on_died() -> void:
	model.rotation.x = -PI / 2.0
	model.position.y = 0.4


func _on_respawned() -> void:
	model.rotation.x = 0.0
	model.position.y = 0.0


func _text(text: String, color: Color, height: float) -> void:
	Fx.floating_text(get_parent(), body.global_position + Vector3.UP * height, text, color)
