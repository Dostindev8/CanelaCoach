# Auditoría ISO — Canela Coach® (entrega)

Fecha: 2026-07-25 · Alcance: seguridad, integridad clínica, responsive, readiness de entrega.

## Metodología
- Revisión OWASP Top 10 + controles PHI (cifrado, auditoría, soft-delete, RBAC)
- Verificación build + tests automatizados
- EXTEND-NEVER-OVERWRITE: sin rediseño visual; solo hardening y gaps

---

## Remediado en esta pasada

| Severidad | Hallazgo | Fix |
|-----------|----------|-----|
| 🔴 Crítico | Credenciales demo prellenadas en `LoginPage` | Defaults vacíos |
| 🔴 Alto | Soft-delete bypass en GET/PUT/compare/PDF | Filtro `ACTIVA` + MFA gate clínico |
| 🟡 Medio | MFA obligatorio no bloqueaba rutas clínicas | `requireMfaIfMandatory` en evaluaciones/protocolos |
| 🟡 Medio | Historial PDF incluía evals borradas | `activo` en `reporteService` + portal |
| 🟡 Medio | Seed passwords demo en prod sin aviso | Warning en `assertCriticalEnv` |
| 🟢 Bajo | CSP incompleto | `objectSrc`, `frameAncestors`, `referrerPolicy` |

---

## Estado de entrega — checklist

### Listo para entregar ✅
- [x] Auth JWT RS256 + cookies HttpOnly + Argon2id
- [x] Rate limit global + auth + PDF + agente
- [x] Soft-delete clientes / planes / evaluaciones
- [x] Cifrado AES-256-GCM antecedentes + presión (enc)
- [x] Auditoría inmutable (hash chain)
- [x] Evaluaciones por cliente + PDF individual + envío
- [x] Protocolo versionado + catálogo suplementos + PDF
- [x] Portal paciente aislado por `clienteId`
- [x] Responsive panel (wizard sticky, grids 375+)
- [x] Build producción limpio + 19 unit tests verdes
- [x] Docs retención + módulo evaluación/protocolo

### Pendiente / fuera de alcance (documentar al cliente) ⏳

| Ítem | Prioridad | Notas |
|------|-----------|-------|
| MFA **obligatorio para todos** los coaches (hoy solo `mfaObligatorio` en admin) | Alta | Producto: decidir política |
| URLs Cloudinary firmadas (TTL) para PDFs/fotos | Alta | Hoy `secure_url` públicos si bucket lo permite |
| Cifrado de **todas** las medidas/peso (hoy BP + antecedentes) | Media | Trade-off con cálculos en server |
| Tests E2E Playwright (flujo completo) | Media | Solo unitarios hoy |
| Autoservicio borrado/export GDPR en portal | Media | Documentado; no UI aún |
| Pagos | Baja | Explicitamente TODO fase futura |
| IA de estancamiento | Baja | Hook documentado; no implementar |
| Refresh token path portal (`/api/auth` vs `/api/portal`) | Media | Sesión paciente ~15 min access |
| CI pipeline en GitHub Actions (si no existe remoto) | Media | Verificar repo remoto |
| Rotación trimestral dependencias PDF/Puppeteer | Baja | Backlog |

### Riesgos residuales aceptables (con mitigación)
1. **Demo seed passwords** — solo advertencia; override con `SEED_*` en prod.
2. **PHI parcial cifrado** — medidas en claro para motor de cálculos; acceso solo coach autenticado + audit.
3. **PDF rate limit** — 10/min; Puppeteer sigue siendo coste CPU.

---

## Comandos de verificación
```bash
npm test -w backend
npm run build
```

## Veredicto
**APTO PARA ENTREGA CONTROLADA (staging → prod)** tras:
1. Definir `FIELD_ENCRYPTION_KEY`, JWT keys, `MONGODB_URI`, Cloudinary, SMTP en prod
2. Cambiar `SEED_*_PASSWORD`
3. Confirmar MFA para cuentas admin
4. Smoke test: login → cliente → evaluación → PDF individual → protocolo → portal
