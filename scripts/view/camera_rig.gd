class_name CameraRig
extends Node3D
## Câmera em terceira pessoa que segue um corpo. Cuida do mouse (prender, soltar, girar, zoom).
## O giro em Y (`rotation.y`) é o `yaw` que a entrada local põe no InputFrame.
## Não é filho do corpo: a simulação roda sem câmera.

const MOUSE_SENSITIVITY := 0.003
const PIVOT_HEIGHT := 1.6
const START_PITCH := -0.35
const MIN_PITCH := -1.2
const MAX_PITCH := 0.3
const MIN_DISTANCE := 2.5
const MAX_DISTANCE := 12.0
const ZOOM_STEP := 0.5

var target: Node3D
## Desligado enquanto o chat está aberto: o mouse não gira a câmera.
var controls_enabled := true
## Giro da câmera em torno de Y, em radianos.
var yaw: float:
	get:
		return rotation.y

@onready var spring_arm: SpringArm3D = $SpringArm3D
@onready var camera: Camera3D = $SpringArm3D/Camera3D


func _ready() -> void:
	spring_arm.rotation.x = START_PITCH


## Passa a seguir `body` e vira a câmera ativa.
func follow(body: CollisionObject3D) -> void:
	target = body
	spring_arm.add_excluded_object(body.get_rid())
	_follow()
	camera.make_current()


func _process(_delta: float) -> void:
	if is_instance_valid(target):
		_follow()


func _follow() -> void:
	global_position = target.global_position + Vector3.UP * PIVOT_HEIGHT


func _unhandled_input(event: InputEvent) -> void:
	if not controls_enabled:
		return
	if event.is_action_pressed("toggle_mouse"):
		var captured := Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if captured else Input.MOUSE_MODE_CAPTURED
	elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * MOUSE_SENSITIVITY)
		spring_arm.rotation.x = clampf(spring_arm.rotation.x - event.relative.y * MOUSE_SENSITIVITY, MIN_PITCH, MAX_PITCH)
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			spring_arm.spring_length = maxf(spring_arm.spring_length - ZOOM_STEP, MIN_DISTANCE)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			spring_arm.spring_length = minf(spring_arm.spring_length + ZOOM_STEP, MAX_DISTANCE)
		elif Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			get_viewport().set_input_as_handled()
