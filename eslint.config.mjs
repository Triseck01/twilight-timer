// Zentrale ESLint-Konfiguration (Flat Config) für das Monorepo.
// apps/web ergänzt die Angular-Regeln in apps/web/eslint.config.mjs.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.angular/**', '**/node_modules/**', '**/coverage/**', 'apps/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Domänenlogik ist rein: keine Uhr, kein DOM. Zeit wird als Parameter übergeben (ADR 0003).
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Kein DOM in packages/domain.' },
        { name: 'document', message: 'Kein DOM in packages/domain.' },
        { name: 'performance', message: 'Zeit als Parameter (nowMs) übergeben.' },
        { name: 'localStorage', message: 'Persistenz gehört nicht in packages/domain.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Zeit als Parameter (nowMs) übergeben.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'new Date() liest die Uhr – Zeit als Parameter (nowMs) übergeben.',
        },
      ],
    },
  },
);
