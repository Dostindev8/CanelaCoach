# Canela Coach®

Plataforma MERN + TypeScript para entrenadores: evaluaciones físicas, reportes PDF de 12 páginas, seguridad de datos de salud, automatizaciones y agente IA (texto/voz).

**Logic Code Spot (LCS) Software Solutions · Julio 2026**

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + Tailwind + React Query |
| Backend | Node 22 + Express + TypeScript |
| DB | MongoDB + Mongoose (cifrado AES-256-GCM en antecedentes) |
| Cache | Redis/Upstash con fallback `Map()` |
| Auth | JWT RS256 HttpOnly + Argon2id + TOTP MFA |
| PDF | Puppeteer (12 secciones de marca) |
| IA | Claude API (Haiku→Sonnet) + Whisper STT |

## Requisitos

- Node.js **22+**
- MongoDB local o Atlas (`MONGODB_URI`)
- (Opcional) Redis, Cloudinary, SMTP, Anthropic, OpenAI

## Activación rápida (local)

```bash
# 1) Instalar
npm install

# 2) Claves JWT (si no existen)
# Ya generadas en backend/keys/*.pem — no subir a git

# 3) Variables de entorno
copy backend\.env.example backend\.env   # Windows
# Editar FIELD_ENCRYPTION_KEY (64 hex) y MONGODB_URI

# 4) Seed (1 admin + 1 entrenador + 3 clientes)
npm run seed

# 5) Levantar API + SPA
npm run dev
```

- Frontend: http://localhost:5173  
- API health: http://localhost:4000/api/health  

### Credenciales de desarrollo (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@canelacoach.com` | `CanelaAdmin2026!` |
| Entrenador | `entrenador@canelacoach.com` | `CanelaCoach2026!` |

> **Admin:** MFA TOTP es obligatorio. En el primer login serás redirigido a `/mfa-setup` para escanear el QR con Google Authenticator / Authy.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Backend + frontend |
| `npm run seed` | Datos de prueba |
| `npm run test` | Tests unitarios |
| `npm run build` | Build producción |
| `npm run worker:reportes -w backend` | Worker PDF standalone |
| `npm run worker:recordatorios -w backend` | Cron reevaluación >30 días |

## Estructura

```
backend/src/   → API, modelos, workers, plantilla PDF
frontend/src/  → SPA entrenador (dashboard, clientes, wizard, agente)
.github/workflows/ci.yml
scripts/load-k6.js
```

## Seguridad

- Aislamiento por `entrenadorId` en todas las queries
- Antecedentes médicos cifrados en reposo
- AuditLog append-only con hash-chain
- Rate limit login 5/min · agente 20 msg/min
- Lockout: 5 fallos → 5 min · 10 → 1 h
- Magic-byte check + strip EXIF en fotos
- `.env` y `*.pem` fuera de git

## Producción (checklist pendiente de infra)

1. MongoDB Atlas + backups 35 días  
2. Redis Upstash  
3. Cloudinary + SMTP + (opcional) WhatsApp  
4. `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`  
5. Vault (Doppler/Infisical) — rotar secretos  
6. Deploy: Vercel (frontend) + Render (backend)  
7. Sentry DSN + uptime checks  
8. Activar gitleaks en CI (ya en workflow)

## Licencia

Propietario — Logic Code Spot / Canela Coach®
