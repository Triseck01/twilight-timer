#!/usr/bin/env node
// PreToolUse-Hook (Bash): Claude darf keinen Dev-Server starten, nur die Befehle nennen.
// Exit 2 blockiert den Aufruf; stderr geht als Begründung an Claude.
// Getestet in tests/repo/dev-server-hook.test.mjs.

const PATTERNS = [
  /\bng\s+(serve|s)\b/,
  /\bnpm\s+(?:-\S+\s+(?:\S+\s+)?)*(start|run\s+(start|dev|serve))\b/,
  /\bturbo\s+(run\s+)?dev\b/,
  /\bnpx\s+(http-server|serve|live-server|vite)\b/,
  /\bvite(\s+(dev|serve|preview))?\s*$/,
  /\bpython3?\s+-m\s+http\.server\b/,
];

/** Entfernt Inhalte in Anführungszeichen (z. B. Commit-Messages), damit sie keinen Fehlalarm auslösen. */
const stripQuoted = (cmd) => cmd.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, '""');

function isDevServer(command) {
  return stripQuoted(command)
    .split(/&&|\|\||;|\||\n/)
    .some((part) => PATTERNS.some((re) => re.test(part.trim())));
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  const command = payload?.tool_name === 'Bash' ? payload.tool_input?.command : undefined;
  if (typeof command === 'string' && isDevServer(command)) {
    process.stderr.write(
      'Blockiert: Claude startet keinen Dev-Server (Projektregel, siehe CLAUDE.md). ' +
        'Nenne dem Nutzer stattdessen den Befehl, z. B. "npm run dev".\n',
    );
    process.exit(2);
  }
  process.exit(0);
});
