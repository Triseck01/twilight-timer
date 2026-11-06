# ADR 0002: TypeScript 6.0 fest gepinnt

Datum: 2026-11-06 · Status: angenommen

## Kontext
Aktuell ist TypeScript 7.0.x. Angular 22 verlangt `typescript >=6.0 <6.1`, typescript-eslint 8.72 `<6.1.0`. Ein `npm i typescript@latest` würde den Build brechen.

## Entscheidung
TypeScript **6.0.3** exakt, nur in der Root-`package.json` (`devDependencies`). Workspaces legen keine eigene Version fest. Test: `tests/repo/toolchain.test.mjs`.

## Folgen
- Upgrade auf TypeScript 7 erst zusammen mit einem Angular-Major, der es unterstützt (voraussichtlich Angular 23, ca. Juni 2027).
- Hinweis: TypeScript 6.0 setzt `strict` standardmäßig auf `true`; die von Angular erzeugten tsconfigs nennen es deshalb nicht explizit.
