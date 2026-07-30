# Módulo Evaluación Física & Protocolo

## Extiende (no duplica)
- `Evaluacion` — smartScale, weightLb, soft-delete, bloodPressureEnc, attachments
- `Cliente` — sin cambio de colección
- PDF Puppeteer existente + plantillas nuevas

## Nuevo
- `Protocol` (versionado draft → active → archived)
- `SupplementCatalog`
- Rutas: `/api/clientes/:clienteId/protocols`, `/api/supplement-catalog`
- PDF: `GET /api/evaluaciones/:id/export.pdf`, `GET .../protocols/:id/export.pdf`
- UI: `/clientes/:id/protocolo`, botón **PDF individual** por evaluación

## Flujo PDF individual por cliente
1. Coach crea evaluación del cliente (wizard)
2. En ficha → **PDF individual** descarga plantilla tipo "Registro de Medición"
3. **Enviar al cliente** / WhatsApp usa `reporte.pdfUrl` de esa evaluación (no mezclar clientes)

## Versionado protocolo
Editar `active` → crea `draft` v+1. `publish` archiva el activo anterior.

## Tokens de marca
`backend/src/theme/canelaCoach.tokens.ts` y `frontend/src/theme/canelaCoach.tokens.ts` (misma paleta que `index.css`).
