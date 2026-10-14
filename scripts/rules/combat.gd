class_name Combat
extends RefCounted
## Regras puras de combate: dano, área de acerto e cura por acerto.
## Sem Node, Input, Fx nem rede: roda igual no offline e no servidor.
## `ability` é a entrada "ataque" ou "habilidade" de data/classes.json;
## `table` é a tabela data/regras.json (GameData.rules).


## Multiplicador de dano do nível: 1 + dano_por_nivel × (nível - 1).
static func damage_multiplier(level: int, table: Dictionary) -> float:
	return 1.0 + table.dano_por_nivel * (level - 1)


## Dano de uma habilidade no nível dado.
static func damage_for(ability: Dictionary, level: int, table: Dictionary) -> float:
	return ability.dano * damage_multiplier(level, table)


## Direção para onde se olha com o giro `yaw` (radianos, em torno de Y; 0 olha para -Z).
static func forward_from_yaw(yaw: float) -> Vector3:
	return -Basis.from_euler(Vector3(0.0, yaw, 0.0)).z


## Diz se `target` está no arco: dentro de `reach` metros no plano e a até `angle_degrees` / 2
## de `forward`. Com 360 graus, vale qualquer direção. A altura é ignorada.
static func is_in_arc(origin: Vector3, forward: Vector3, target: Vector3, reach: float, angle_degrees: float) -> bool:
	var to_target := target - origin
	to_target.y = 0.0
	var distance := to_target.length()
	if distance > reach:
		return false
	if angle_degrees < 360 and distance > 0.01 and forward.angle_to(to_target.normalized()) > deg_to_rad(angle_degrees) / 2.0:
		return false
	return true


## Escolhe quem a habilidade atinge. `targets` é uma lista de {"pos": Vector3, "alive": bool};
## devolve os índices atingidos, na ordem da lista.
static func select_targets(origin: Vector3, yaw: float, ability: Dictionary, targets: Array) -> Array[int]:
	var forward := forward_from_yaw(yaw)
	var hit: Array[int] = []
	for i in targets.size():
		var target: Dictionary = targets[i]
		if target.alive and is_in_arc(origin, forward, target.pos, ability.alcance, ability.angulo):
			hit.append(i)
	return hit


## Vida recuperada por acertar `hits` alvos: uma fração da vida máxima por alvo
## (campo opcional "cura_por_acerto", padrão 0).
static func heal_for_hits(ability: Dictionary, max_health: float, hits: int) -> float:
	var heal_per_hit: float = ability.get("cura_por_acerto", 0.0)
	if hits <= 0 or heal_per_hit <= 0.0:
		return 0.0
	return max_health * heal_per_hit * hits
