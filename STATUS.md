# Canela Coach® — Status (2026-07-30)

## Verificación actual

| Check | Resultado |
|-------|-----------|
| Pantalla blanca `/login` | ✅ Corregida |
| Login UI visible | ✅ |
| Admin → Dashboard (3 clientes) | ✅ Verificado en browser |
| API `:4000` + Vite `:5173` | ✅ En ejecución |
| Build frontend | ✅ |

## Causas de “no se ve nada”

1. Servidores apagados (`ERR_CONNECTION_REFUSED`)
2. `npm run dev` con `wait-on` + `-k` mataba todo si Mongo tardaba
3. Auth boot colgado → pantalla “Verificando sesión…”
4. Form login en `opacity-0` si el intro no disparaba `onComplete`

## Cómo arrancar (correcto)

```bash
npm run dev
```

Arranca **backend y frontend en paralelo** (sin wait-on).

Si hace falta por separado:
```bash
npm run dev:backend
npm run dev:frontend
```

## Credenciales demo

- Admin: `admin@canelacoach.com` + `SEED_ADMIN_PASSWORD` (default `CanelaAdmin2026!`)
- Coach: `entrenador@canelacoach.com` + `SEED_ENTRENADOR_PASSWORD`

## Vercel

| Pieza | Estado |
|-------|--------|
| Frontend SPA | ✅ Listo |
| Backend | ❌ Host Node separado + `VITE_API_BASE_URL` |
