class_name Cooldowns
extends RefCounted
## Recargas de habilidades, em segundos. Regra pura: sem Node, Input, Fx nem rede.

var _remaining := {}


## Avança o tempo de todas as recargas.
func tick(delta: float) -> void:
	for key: String in _remaining:
		_remaining[key] = maxf(_remaining[key] - delta, 0.0)


func is_ready(key: String) -> bool:
	return remaining(key) <= 0.0


func start(key: String, seconds: float) -> void:
	_remaining[key] = seconds


## Segundos que faltam para `key` ficar pronta (0 se pronta ou nunca usada).
func remaining(key: String) -> float:
	return _remaining.get(key, 0.0)


## Deixa `key` pronta na hora. Uso em testes e ferramentas de depuração.
func reset(key: String) -> void:
	_remaining.erase(key)
