# Dependencias diferidas (npm audit) — MEGA-19

Actualizado tras `npm audit fix` (seguro) + bumps no-breaking.

## Resuelto en este sprint

| Paquete | Acción |
|---|---|
| `shell-quote` / `concurrently` | `npm audit fix` |
| `vite` (frontend) | `6.4.3` (parche esbuild/dev-server) |
| `vitest` (backend + frontend) | `3.2.7` (elimina CVE crítico en cadena vitest≤3.2.5) |

## Diferido — requiere decisión de producto

### react-router / react-router-dom `7.18.2`

- **CVE / advisory:** [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) (high) — CSRF bypass en **RSC Mode**.
- **Versión limpia en línea 8.x:** `react-router@8.3.0` exige `react` / `react-dom` `>=19.2.7`.
- **Downgrade a 7.11.0:** npm lo sugiere, pero reintroduce un árbol anidado con múltiples XSS/DoS históricos en SSR/RSC — peor para este monorepo.
- **Justificación de aceptación temporal:** Canela Coach frontend es **Vite SPA (React 18)** sin React Server Components ni SSR de React Router. El vector RSC del advisory no aplica al runtime actual.
- **Plan:** sprint dedicado a React 19 + `react-router-dom@8.3+`, con regresión de rutas `/portal/*` y app entrenador.

No usar `npm audit fix --force` a ciegas: fuerza majors que rompen el stack.
