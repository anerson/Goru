class_name PlayerBody
extends CharacterBody3D
## Corpo do jogador na simulação: movimento, recargas, vida e progressão.
## Sem malha, câmera, Fx nem Input. A WorldSim pede o InputFrame do tick (next_input),
## aplica com apply_input() e resolve as habilidades pedidas (alvos e dano são dela).
## O que aparece na tela (modelo, números, câmera) fica em scripts/view/ e só ouve os sinais abaixo.

signal health_changed(current: float, maximum: float)
signal xp_changed(xp: int, xp_next: int, level: int)
signal ability_used(ability_key: String, cooldown: float)
## Emitido depois que a habilidade causou dano e cura (pela WorldSim).
signal ability_resolved(ability_key: String, hits: int)
signal damaged(amount: float)
signal healed(amount: float)
signal leveled_up(level: int)
signal died
signal respawned

const GRAVITY := 20.0
const JUMP_VELOCITY := 7.0
const TURN_SPEED := 12.0

var id := 0
var class_id := "guerreiro"
var stats: Dictionary
var max_health := 1.0
var health := 1.0
var level := 1
var xp := 0
var is_dead := false
## Para onde o corpo olha (giro em Y, radianos). Estado da simulação que a view desenha.
var facing_yaw := 0.0
var cooldowns := Cooldowns.new()
## Fonte da entrada: função sem argumentos que devolve o InputFrame do tick
## (offline/local_input.gd no jogo, o bot no diagnóstico). Sem fonte, o jogador fica parado.
var input_source: Callable
var _previous_buttons := 0


func _ready() -> void:
	stats = GameData.classes[class_id]
	max_health = Progression.max_health_for(stats, level)
	health = max_health


## Reemite vida e XP atuais, para quem acabou de se ligar aos sinais (HUD, ajudante).
func emit_state() -> void:
	health_changed.emit(health, max_health)
	xp_changed.emit(xp, xp_to_next_level(), level)


## Restaura nível e XP de um personagem salvo, com a vida cheia do nível. Só para montar o
## personagem ao entrar; em jogo, a progressão passa por add_xp().
func set_progress(new_level: int, new_xp: int) -> void:
	level = maxi(new_level, 1)
	xp = maxi(new_xp, 0)
	max_health = Progression.max_health_for(stats, level)
	health = max_health
	emit_state()


## O quadro de entrada deste tick (vazio se não houver fonte).
func next_input() -> InputFrame:
	return input_source.call() if input_source.is_valid() else InputFrame.new()


func is_alive() -> bool:
	return not is_dead


## Avança um tick com a intenção do jogador: recargas, pulo e movimento. Mesma função para
## o jogo local, o bot e, no futuro, a previsão no cliente e o servidor.
## Devolve as habilidades pedidas neste tick ("ataque" e/ou "habilidade"), em ordem;
## quem resolve é WorldSim.resolve_ability().
func apply_input(frame: InputFrame, delta: float) -> Array[String]:
	var requested: Array[String] = []
	cooldowns.tick(delta)
	# Pular e habilidade valem na borda (apertou neste quadro); ataque vale enquanto segurado.
	var pressed := frame.buttons & ~_previous_buttons
	_previous_buttons = frame.buttons

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	if is_dead:
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return requested

	if pressed & InputFrame.JUMP and is_on_floor():
		velocity.y = JUMP_VELOCITY

	# A direção é relativa ao giro da câmera; o módulo de `move` não importa (sempre normalizada).
	var direction := Basis.from_euler(Vector3(0.0, frame.yaw, 0.0)) * Vector3(frame.move.x, 0.0, frame.move.y)
	direction.y = 0.0
	direction = direction.normalized()
	velocity.x = direction.x * stats.velocidade
	velocity.z = direction.z * stats.velocidade
	if direction != Vector3.ZERO:
		facing_yaw = lerp_angle(facing_yaw, atan2(-direction.x, -direction.z), TURN_SPEED * delta)
	move_and_slide()

	if frame.has(InputFrame.ATTACK):
		requested.append("ataque")
	if pressed & InputFrame.SKILL:
		requested.append("habilidade")
	return requested


## Começa a usar `ability_key` mirando em `yaw`: confere se pode, inicia a recarga e vira o corpo.
## Devolve false se morto ou em recarga.
func begin_ability(ability_key: String, yaw: float) -> bool:
	if is_dead or not cooldowns.is_ready(ability_key):
		return false
	var ability: Dictionary = stats[ability_key]
	cooldowns.start(ability_key, ability.recarga)
	facing_yaw = yaw
	ability_used.emit(ability_key, ability.recarga)
	return true


## Fim da habilidade, depois de dano e cura resolvidos pela WorldSim.
func finish_ability(ability_key: String, hits: int) -> void:
	ability_resolved.emit(ability_key, hits)


## Aplica dano e devolve quanto de vida saiu. Só muda estado e emite sinais.
## Use WorldSim.apply_damage(), que registra quem bateu e cuida da morte.
func take_damage(amount: float) -> float:
	if is_dead:
		return 0.0
	var before := health
	health = maxf(health - amount, 0.0)
	health_changed.emit(health, max_health)
	damaged.emit(amount)
	if health <= 0.0:
		is_dead = true
		died.emit()
	return before - health


func heal(amount: float) -> void:
	if is_dead or amount <= 0.0:
		return
	var healed_amount := minf(amount, max_health - health)
	if healed_amount <= 0.0:
		return
	health += healed_amount
	health_changed.emit(health, max_health)
	healed.emit(healed_amount)


func respawn(at: Vector3) -> void:
	global_position = at
	velocity = Vector3.ZERO
	is_dead = false
	health = max_health
	health_changed.emit(health, max_health)
	respawned.emit()


## Soma XP e devolve os níveis alcançados (vazio se não subiu).
func add_xp(amount: int) -> Array[int]:
	var state := {"level": level, "xp": xp}
	var levels_gained := Progression.apply_xp(state, amount, GameData.rules)
	xp = state.xp
	for new_level in levels_gained:
		level = new_level
		max_health = Progression.max_health_for(stats, level)
		health = max_health
		health_changed.emit(health, max_health)
		leveled_up.emit(level)
	xp_changed.emit(xp, xp_to_next_level(), level)
	return levels_gained


func xp_to_next_level() -> int:
	return Progression.xp_to_next_level(level, GameData.rules)


func damage_multiplier() -> float:
	return Combat.damage_multiplier(level, GameData.rules)
