#!/usr/bin/env python3
"""Servidor falso com a mesma API do OpenJarvis, para testar o ajudante sem IA instalada.

Uso: python3 tools/openjarvis_falso.py [porta] [arquivo_de_registro]
Responde /health, /v1/models e /v1/chat/completions. Grava cada pedido de conversa
no arquivo de registro (JSON por linha), para o teste conferir o que o jogo enviou.
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
LOG = sys.argv[2] if len(sys.argv) > 2 else None


class Handler(BaseHTTPRequestHandler):
    def _send(self, payload, code=200):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send({"status": "ok"})
        elif self.path == "/v1/models":
            self._send({"object": "list", "data": [{"id": "modelo-falso"}]})
        else:
            self._send({"detail": "não encontrado"}, 404)

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self._send({"detail": "não encontrado"}, 404)
            return
        request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if LOG:
            with open(LOG, "a", encoding="utf-8") as log:
                log.write(json.dumps(request, ensure_ascii=False) + "\n")
        question = request["messages"][-1]["content"]
        content = "<think>raciocínio interno</think>Resposta falsa para: " + question
        self._send({"choices": [{"index": 0, "message": {"role": "assistant", "content": content}}]})

    def log_message(self, *_args):
        pass


HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
