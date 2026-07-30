# Despliegue Canela Coach®

## Arquitectura recomendada

| Pieza | Dónde | Por qué |
|-------|--------|---------|
| **Frontend** (Vite/React) | **Vercel** | SPA estática + rewrites |
| **Backend** (Express + Puppeteer + Mongo + Redis) | **Render / Railway / Fly.io** | Proceso Node largo; Puppeteer no es viable en Vercel serverless |

> **No subas el monorepo completo a Vercel esperando que el API corra ahí.** Puppeteer + Mongo Memory + workers requieren un servidor Node persistente.

## Frontend → Vercel

1. Root Directory: `frontend`
2. Build: `npm run build` (o desde monorepo: `npm run build -w frontend`)
3. Output: `dist`
4. Env:
   ```
   VITE_API_BASE_URL=https://TU-API.onrender.com/api
   ```
5. `vercel.json` ya incluye SPA rewrite + security headers.

## Backend → Render/Railway

1. Root: `backend` (o monorepo start `npm run start -w backend`)
2. Env obligatorias producción:
   - `NODE_ENV=production`
   - `MONGODB_URI` (Atlas, IP whitelist / 0.0.0.0/0 controlado)
   - `FIELD_ENCRYPTION_KEY` (64 hex)
   - `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (o paths)
   - `FRONTEND_URL=https://tu-app.vercel.app`
   - `CLOUDINARY_*`, `SMTP_*`, `REDIS_URL` (opcional)
   - `SEED_*_PASSWORD` distintos a los demo
3. CORS: `FRONTEND_URL` debe coincidir exactamente con el dominio Vercel.

## Checklist “¿podemos subir a Vercel?”

- [x] Frontend build limpio (`npm run build -w frontend`)
- [x] SPA rewrite + headers
- [ ] API en hosting Node separado con health `GET /api/health`
- [ ] `VITE_API_BASE_URL` apuntando a esa API
- [ ] Atlas IP / secrets / cookies `secure` en HTTPS

## Dev local

```bash
npm run dev
```

El frontend espera a `http://127.0.0.1:4000/api/health` (hasta 120s) para evitar `ECONNREFUSED` mientras Mongo/Atlas o el fallback Memory Server arrancan.

Demo coach (solo tras seed): `entrenador@canelacoach.com` / password en `SEED_ENTRENADOR_PASSWORD` o default de seed en `.env`.
