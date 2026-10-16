#!/usr/bin/env bash
# Baixa o Godot 4.3 (Linux) para .godot-bin/godot, usado pelos testes e pelos agentes.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x .godot-bin/godot ]; then
	echo "Godot já está em .godot-bin/godot"
	exit 0
fi
mkdir -p .godot-bin
curl -sSL -o .godot-bin/godot.zip https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_linux.x86_64.zip
unzip -oq .godot-bin/godot.zip -d .godot-bin
mv .godot-bin/Godot_v4.3-stable_linux.x86_64 .godot-bin/godot
rm .godot-bin/godot.zip
echo "Godot instalado em .godot-bin/godot"
