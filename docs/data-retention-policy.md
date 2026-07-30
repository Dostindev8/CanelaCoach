# Política de retención de datos clínicos — Canela Coach®

## Alcance
Aplica a evaluaciones físicas, protocolos nutricionales, fotos de progreso y observaciones clínicas asociadas a clientes (incl. adultos jóvenes ≥18).

## Principios
1. **Sin borrado físico inmediato**: `DELETE` de evaluaciones es soft-delete (`activo: false`, `deletedAt`).
2. **Cifrado de campo**: presión arterial y antecedentes usan AES-256-GCM (`FIELD_ENCRYPTION_KEY`).
3. **Auditoría**: lecturas/escrituras de evaluaciones y exportaciones PDF quedan en `AuditLog` (cadena hash).
4. **Menores**: este producto está orientado a clientes ≥18. Datos de ejemplo (Estiven Matías, 19) se tratan como PHI/clínicos sensibles desde el día 1 — no hardcodear en producción.

## Retención sugerida
| Tipo | Retención activa | Tras soft-delete |
|------|------------------|------------------|
| Evaluaciones / protocolos | Mientras el coach mantenga la relación | 7 años (auditoría / defensa legal) o hasta solicitud de borrado del titular |
| PDFs en Cloudinary | Igual que la evaluación | Purga administrativa explícita |
| Fotos de progreso | Igual | Idem |

## Derechos del titular
- Portal paciente: descarga de reportes PDF propios.
- Solicitud de exportación/eliminación: canal soporte coach → admin (fase futura: autoservicio GDPR/LGPD formal).

## Responsable
Abraham Canela / operador de la plataforma Canela Coach®.
