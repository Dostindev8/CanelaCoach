# Canela Coach® — Status (2026-07-30)

## Verificación actual

| Check | Resultado |
|-------|-----------|
| `frontend/tsconfig.json` `baseUrl` (TS 6) | ✅ Corregido — paths sin `baseUrl` |
| Backend `tsc` + tests | ✅ 19/19 |
| Frontend build (Vite) | ✅ |
| Admin login / panel / clientes | ✅ |
| Prod deps audit (`npm audit --omit=dev`) | ⚠️ 1 advisory residual RSC (ver abajo) |

## Seguridad aplicada en esta pasada

- Eliminado `baseUrl` deprecado (TS 7-ready)
- `nodemailer` → 9.0.3, `sharp` → 0.35.3, `file-type` → 22.0.1
- `react-router-dom` → 7.18.2 (parche open-redirect)
- Emails: escape HTML + URL allowlist http(s) + TLS ≥1.2 en SMTP

### Advisory residual

`react-router` GHSA-qwww-vcr4-c8h2 (RSC CSRF) **no aplica**: Canela Coach usa `BrowserRouter` SPA, no React Server Components / framework mode. Forzar downgrade a 7.11.0 reabriría el open-redirect.

## Vercel

| Pieza | ¿Listo? |
|-------|---------|
| Frontend SPA | ✅ Root `frontend`, `dist`, `vercel.json` |
| Backend API | ❌ No en Vercel — Render/Railway/Fly + `VITE_API_BASE_URL` |

## Credenciales demo (solo local / seed)

- Admin: `admin@canelacoach.com` + `SEED_ADMIN_PASSWORD`
- Coach: `entrenador@canelacoach.com` + `SEED_ENTRENADOR_PASSWORD`

## Arranque

```bash
npm run dev
```
