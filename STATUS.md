# Canela Coach® — Status (2026-07-31) MEGA-BUILD v1.0

## FASE 0 — Auditoría (completada)

| Severidad | Hallazgo | Fix en fases |
|-----------|----------|--------------|
| 🔴 | Listado ocultaba “inactivos” solo vía soft-delete `activo` — no había estado de pago | F1 membershipStatus |
| 🟡 | WhatsApp solo en envío de PDF; sin recordatorio de evaluación / membresía | F2 jobs + templates |
| 🟡 | Planes markdown sin video de ejercicios firmado | F3 Exercise/Routine |
| 🟡 | Portal paciente básico sin registro por invitación / rutina video / dieta dedicada | F4 |
| 🟢 | Sin cron in-process (solo worker CLI) | F1–F2 node-cron |
| ⚪ | Naming Client vs Cliente | EXTEND Cliente existente |

## Fases 1–7

| Fase | Estado | Entrega |
|------|--------|---------|
| 1 Membresía/pagos | ✅ | `membershipStatus`, historial pagos, cron 06:00 AST, badges UI |
| 2 WA evaluación | ✅ | `whatsappService` templates + cron 09:00 + AI composer |
| 3 Videos | ✅ | Exercise/Routine + firma Cloudinary + `/ejercicios` |
| 4 Portal | ✅ | register invite, `/me/evolution|routine|diet`, UI |
| 5 Anti-copy/hack | ✅ | `useContentProtection`, signed URLs 30m, scraping detector |
| 6 Responsive | ✅ | grids mobile-first, touch ≥44px en CTAs clave |
| 7 Verify | ✅ | `tsc` backend+frontend OK |

## Credenciales demo

| Rol | Email | Password |
|-----|--------|----------|
| Admin | admin@canelacoach.com | CanelaAdmin2026! |
| Coach | entrenador@canelacoach.com | CanelaCoach2026! |

**Código invitación portal (seed):** `CANELA26`

## Arranque

```bash
npm run dev
```

## Bloqueadores externos (ops)

- Plantillas Meta WhatsApp `evaluacion_recordatorio` / `membresia_vencida` deben aprobarse
- Cloudinary credentials para video real (stub en local)
- Atlas Network Access si `USE_MEMORY_MONGO=false`
