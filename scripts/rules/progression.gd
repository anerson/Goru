class_name Progression
extends RefCounted
## Regras puras de progressão: XP, nível e vida máxima.
## Sem Node, Input, Fx nem rede: roda igual no offline e no servidor.
## `table` é a tabela data/regras.json (GameData.rules).


## XP necessária para sair de `level` e ir ao próximo: xp_por_nivel × nível.
static func xp_to_next_level(level: int, table: Dictionary) -> int:
	return roundi(float(table.xp_por_nivel) * level)


## Vida máxima de uma classe (`stats` é a entrada de data/classes.json) no nível dado.
static func max_health_for(stats: Dictionary, level: int) -> float:
	return stats.vida_base + stats.vida_por_nivel * (level - 1)


## Soma `amount` de XP a `state` ({"level": int, "xp": int}), sobe quantos níveis couberem
## e devolve a lista dos níveis alcançados, em ordem (vazia se não subiu).
static func apply_xp(state: Dictionary, amount: int, table: Dictionary) -> Array[int]:
	var gained: Array[int] = []
	var level: int = state.level
	var xp: int = state.xp + amount
	while xp >= xp_to_next_level(level, table):
		xp -= xp_to_next_level(level, table)
		level += 1
		gained.append(level)
	state.level = level
	state.xp = xp
	return gained


## Divisão de XP de um abate entre os participantes (ids de quem causou dano).
## Regra provisória da fase 1: XP cheia para cada participante.
static func xp_shares(reward: int, participant_ids: Array) -> Dictionary:
	var shares := {}
	for id: Variant in participant_ids:
		shares[id] = reward
	return shares
