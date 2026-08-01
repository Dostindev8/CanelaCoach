# Despliegue Canela Coach® — Vercel (FE) + Render (API)

## Arquitectura (obligatoria)

| Pieza | Dónde | Por qué |
|-------|--------|---------|
| Frontend (Vite/React) | **Vercel** | SPA estática + rewrites |
| Backend (Express + Puppeteer + Mongo) | **Render** | Proceso Node persistente; Puppeteer no corre en Vercel serverless |

> No subas el monorepo a Vercel esperando que el API viva ahí.

---

## 1) Backend → Render

### Opción A — Blueprint (recomendado)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Conecta `https://github.com/Dostindev8/CanelaCoach`
3. Usa el `render.yaml` de la raíz del repo
4. Completa los env `sync: false` (ver tabla abajo)

### Opción B — Web Service manual

| Campo | Valor |
|-------|--------|
| Root Directory | `backend` |
| Runtime | Node |
| Build | `npm install && npm run build` |
| Start | `npm start` |
| Health Check | `/api/health` |

### Env obligatorias (producción)

| Variable | Notas |
|----------|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas; Network Access permite outbound de Render (o `0.0.0.0/0` temporal) |
| `FIELD_ENCRYPTION_KEY` | 64 hex (`openssl rand -hex 32`) |
| `CLIENT_JWT_SECRET` | ≥32 chars (portal cliente) |
| `FRONTEND_URL` | Exacto: `https://tu-app.vercel.app` (sin slash final) |
| `JWT_PRIVATE_KEY` | PEM completo inline (incluye `\n` o multilínea) |
| `JWT_PUBLIC_KEY` | PEM completo inline |
| `SEED_*_PASSWORD` | **Distintos** a los demo locales |

### Env recomendadas

`REDIS_URL`, `CLOUDINARY_*`, `SMTP_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

### JWT en Render (sin archivos `.pem`)

En el panel, pega el contenido PEM en `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`.  
El código ya acepta PEM inline (`env.ts` → `readKey` + fallback a env).

### Post-deploy API

```bash
curl https://TU-API.onrender.com/api/health
# {"ok":true,"database":"ready",...}
```

Seed una vez (Shell Render o one-off):

```bash
npm run seed
```

---

## 2) Frontend → Vercel

1. [Vercel](https://vercel.com) → Import `Dostindev8/CanelaCoach`
2. **Root Directory:** `frontend`
3. Framework: Other / Vite (detectado)
4. Build settings (también en `frontend/vercel.json`):
   - Install: `cd .. && npm install`
   - Build: `npm run build`
   - Output: `dist`
5. Environment Variable:

```
VITE_API_BASE_URL=https://TU-API.onrender.com/api
```

> Debe terminar en `/api`. El cliente axios usa `baseURL: VITE_API_BASE_URL || '/api'`.

6. Deploy → copia la URL (`https://….vercel.app`) y pégala en Render como `FRONTEND_URL`.
7. Redeploy API si cambiaste `FRONTEND_URL` (CORS + cookies).

---

## 3) Checklist go-live

### Código / repo
- [x] `frontend/vercel.json` — install monorepo + SPA rewrite + headers
- [x] `render.yaml` — Web Service + health `/api/health`
- [x] `CLIENT_JWT_SECRET` documentado y exigido en producción
- [x] CORS vía `FRONTEND_URL`
- [x] Cookies `Secure` en production

### Tú debes completar en los paneles
- [ ] Servicio Render vivo + `/api/health` → `ok: true`
- [ ] Atlas URI + whitelist
- [ ] PEM JWT en env (no paths de disco)
- [ ] `VITE_API_BASE_URL` en Vercel apuntando a Render
- [ ] `FRONTEND_URL` en Render = URL Vercel exacta
- [ ] Seed ejecutado + passwords no-demo
- [ ] SMTP (verify email portal) y Cloudinary si usas fotos/video
- [ ] Probar login admin + portal `/portal/login` en HTTPS

### No listo / limitaciones
- Free tier Render **duerme** tras inactividad (~15 min) → primer request lento
- Puppeteer PDF necesita plan con RAM suficiente (starter+)
- WhatsApp templates Meta siguen siendo ops externo

---

## 4) Orden correcto de alta

```
1. Atlas cluster + FIELD_ENCRYPTION_KEY + JWT PEMs
2. Deploy API en Render → health OK
3. npm run seed (Shell)
4. Deploy FE en Vercel con VITE_API_BASE_URL
5. Set FRONTEND_URL en Render → redeploy API
6. Smoke: /login + /portal/login + /api/health
```

## Dev local

```bash
npm run dev
```

- FE: http://localhost:5173  
- API: http://127.0.0.1:4000/api/health  
