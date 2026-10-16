class_name Separation
extends RefCounted
## Separação entre inimigos, pura: sem Node, física, Input, Fx nem rede.
## Desde a RD-002 os corpos móveis não colidem entre si (só com o mundo), então dois inimigos
## que perseguem o mesmo alvo podem acabar no mesmo ponto. Esta regra devolve, a cada tick,
## um pequeno deslocamento que afasta os pares mais próximos que `min_distance`.
##
## Determinística: depende só das posições recebidas (as do começo do tick) e da ordem da lista,
## não da ordem em que os corpos se movem. Inimigos no mesmo ponto exato se afastam numa
## direção fixa, calculada pelos índices do par (sem sorteio).

## Abaixo disso, dois pontos contam como o mesmo ponto e usam a direção fixa.
const SAME_POINT := 0.0001
## Ângulo áureo (radianos): espalha as direções fixas de pares diferentes em volta do círculo.
const GOLDEN_ANGLE := 2.399963


## Deslocamento de cada inimigo neste tick, no plano (y = 0), na mesma ordem de `positions`.
## - `positions`: Array de Vector3, posição de cada inimigo no começo do tick;
## - `active`: Array de bool, quem participa (os demais não empurram nem são empurrados);
## - `min_distance`: distância mínima no plano entre dois inimigos ativos;
## - `max_speed`: maior velocidade de afastamento (m/s); o deslocamento de um tick é no máximo
##   `max_speed * delta`.
## Cada par mais próximo que `min_distance` divide a sobreposição meio a meio, em sentidos opostos.
static func offsets(positions: Array, active: Array, min_distance: float, max_speed: float, delta: float) -> Array[Vector3]:
	var count := positions.size()
	var result: Array[Vector3] = []
	result.resize(count)
	result.fill(Vector3.ZERO)
	for i in count:
		if not active[i]:
			continue
		var a: Vector3 = positions[i]
		for j in range(i + 1, count):
			if not active[j]:
				continue
			var b: Vector3 = positions[j]
			var away := Vector3(b.x - a.x, 0.0, b.z - a.z)
			var distance := away.length()
			if distance >= min_distance:
				continue
			var direction := away / distance if distance > SAME_POINT else fixed_direction(i, j)
			var push := direction * (min_distance - distance) * 0.5
			result[i] -= push
			result[j] += push
	var max_step := max_speed * delta
	for i in count:
		result[i] = result[i].limit_length(max_step)
	return result


## Direção fixa para o par (i, j) que está no mesmo ponto: `i` vai para um lado, `j` para o outro.
static func fixed_direction(i: int, j: int) -> Vector3:
	var angle := float(i + j) * GOLDEN_ANGLE
	return Vector3(cos(angle), 0.0, sin(angle))
