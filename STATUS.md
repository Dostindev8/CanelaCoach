# Canela Coach® — status post-auditoría (2026-07-29)

## Verificación

| Check | Resultado |
|-------|-----------|
| Backend tests | ✅ 19/19 |
| Frontend tests | ✅ (passWithNoTests) |
| `tsc` + Vite build | ✅ |
| Login / proxy ECONNREFUSED | ✅ Mitigado (wait-on + 127.0.0.1 + mongo fallback 1 intento) |
| Secrets en UI login | ✅ Sin password hardcodeado |

## ¿Subir a Vercel?

| Qué | ¿Listo? | Notas |
|-----|---------|-------|
| **Frontend SPA** | ✅ SÍ | Root `frontend`, output `dist`, `vercel.json` con rewrite + headers |
| **Backend API** | ❌ NO en Vercel | Desplegar en Render/Railway/Fly; Puppeteer + proceso Node |
| **Go-live completo** | ⚠️ Parcial | Necesitas API externa + `VITE_API_BASE_URL` + Atlas + secrets prod |

Ver `docs/DEPLOY-VERCEL.md`.

## Cómo arrancar local

```bash
npm run dev
```

Frontend espera health en `:4000` hasta 120s.
