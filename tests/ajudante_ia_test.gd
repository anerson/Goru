extends Node
## Teste da conversa por IA do ajudante contra o servidor falso (tools/openjarvis_falso.py).
## Uso: GORU_OPENJARVIS_URL=http://127.0.0.1:8765 godot --headless --path . res://tests/ajudante_ia_test.tscn -- --registro=/caminho/registro.jsonl

var failures := 0


func _ready() -> void:
	var log_path := ""
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--registro="):
			log_path = arg.trim_prefix("--registro=")

	var main: Node3D = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().process_frame
	main.start_game("cacador", "vento")
	var companion: Companion = main.companion

	var waited := 0.0
	while not companion.ai_available and waited < 5.0:
		await get_tree().create_timer(0.1).timeout
		waited += 0.1
	_check(companion.ai_available, "detecta o OpenJarvis rodando")
	_check(companion.ai_model == "modelo-falso", "escolhe o modelo pela lista do servidor")

	var replies: Array[String] = []
	companion.said.connect(func(text: String): replies.append(text))
	companion.ask("Onde estou?")
	_check(companion.busy, "fica pensando enquanto espera a resposta")
	waited = 0.0
	while replies.is_empty() and waited < 5.0:
		await get_tree().create_timer(0.1).timeout
		waited += 0.1
	var reply := "" if replies.is_empty() else replies[0]
	_check(reply.begins_with("Resposta falsa para: Onde estou?"), "mostra a resposta da IA")
	_check(not reply.contains("raciocínio"), "remove o raciocínio interno do modelo")
	_check(reply.length() <= companion.element.max_caracteres + 1, "respeita o tamanho máximo do Vento")
	_check(companion.history.size() == 2, "guarda pergunta e resposta no histórico")

	if not log_path.is_empty():
		var lines := FileAccess.get_file_as_string(log_path).strip_edges().split("\n")
		var request: Dictionary = JSON.parse_string(lines[-1])
		var system: String = request.messages[0].content
		_check(request.model == "modelo-falso", "envia o modelo escolhido")
		_check(system.contains("Seu elemento é o Vento"), "envia a personalidade do elemento")
		_check(system.contains("Classe: Caçador"), "envia o estado do jogo")
		_check(system.contains("Você só conversa e aconselha"), "envia as regras gerais")

	print("AJUDANTE IA TEST: %s" % ("OK" if failures == 0 else "%d FALHA(S)" % failures))
	get_tree().quit(1 if failures else 0)


func _check(condition: bool, description: String) -> void:
	print(("  ok    " if condition else "  FALHA ") + description)
	if not condition:
		failures += 1
