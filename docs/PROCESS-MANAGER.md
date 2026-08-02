# Proceso en staging / producción local (PM2)

No uses `tsx` ni una terminal abierta como proceso de proceso fuera de desarrollo.
Usa un gestor con reinicio automático y logs persistentes.

## Arranque (API compilada)

```bash
npm run build -w backend
cd backend
pm2 start dist/index.js --name canela-api --time
pm2 save
```

## Operación

```bash
pm2 restart canela-api
pm2 logs canela-api
pm2 status
```

## Worker de reportes (opcional, proceso separado)

```bash
pm2 start dist/workers/worker-reportes.js --name canela-worker-reportes --time
```

## Variables

Carga `.env` de producción (Render/Vercel/host) o usa `pm2 ecosystem` con `env_file`.
El puerto se toma de `PORT` (fallback 4000). Health: `GET /api/health`.

## Desarrollo local

`npm run dev` libera el puerto vía `predev` + `kill-port` antes de escuchar.
Si el puerto sigue ocupado: `npm run dev:clean` (raíz o `-w backend`).
