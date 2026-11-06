#!/bin/bash
# Richtet die lokale Entwicklung auf macOS ein: prüft Homebrew und Node 26, installiert die Pakete.
# Installiert nichts am System, ohne vorher zu fragen. Startet keinen Dev-Server.
# Getestet in tests/repo/bootstrap.test.mjs.
set -u

REQUIRED_NODE_MAJOR=26
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

info() { printf '› %s\n' "$*"; }
fail() { printf '✖ %s\n' "$*" >&2; exit 1; }

# Fragt mit Ja/Nein; nur "j", "ja", "y", "yes" gelten als Zustimmung.
confirm() {
  local answer=""
  printf '? %s [j/N] ' "$1"
  read -r answer || answer=""
  case "$answer" in j|J|ja|Ja|y|Y|yes|Yes) return 0 ;; *) return 1 ;; esac
}

# Fragt vor dem Ausführen eines Installationsbefehls; bei Nein: Befehl nennen und abbrechen.
run_or_explain() {
  local cmd="$1" reason="$2"
  info "$reason"
  if confirm "Jetzt ausführen: $cmd ?"; then
    $cmd || fail "Befehl fehlgeschlagen: $cmd"
  else
    fail "Abgebrochen. Bitte selbst ausführen: $cmd – danach scripts/bootstrap.sh erneut starten."
  fi
}

# 1. Homebrew
if ! command -v brew >/dev/null 2>&1; then
  fail "Homebrew fehlt. Installation siehe https://brew.sh, danach scripts/bootstrap.sh erneut starten."
fi

# 2. Node 26
if ! command -v node >/dev/null 2>&1; then
  run_or_explain "brew install node" "Node.js ist nicht installiert (benötigt: Node ${REQUIRED_NODE_MAJOR})."
else
  major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  if [ "$major" != "$REQUIRED_NODE_MAJOR" ]; then
    run_or_explain "brew upgrade node" "Node $(node -v) gefunden, benötigt wird Node ${REQUIRED_NODE_MAJOR}."
  fi
fi

# 3. Projektpakete (lokal im Repo, keine Systemänderung)
info "Installiere Projektpakete mit npm ci …"
(cd "$REPO_ROOT" && npm ci) || fail "npm ci fehlgeschlagen."

cat <<'EOF'

✔ Einrichtung abgeschlossen. Nächste Befehle (selbst ausführen):
  npm run verify   # Lint, Typprüfung, Tests, Build
  npm test         # nur Tests
  npm run dev      # Dev-Server starten (http://localhost:4200)
EOF
