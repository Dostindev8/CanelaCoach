# Canela Coach® — Design System Canónico

> **Fuente de verdad:** pantallas **Clientes** (`ClientesPage.tsx`) y **Detalle de Cliente** (`ClienteDetailPage.tsx`).  
> Extraído del código real (`frontend/tailwind.config.cjs`, `frontend/src/index.css`).  
> Esas dos pantallas **no se modifican** para imponer este estándar; el resto del sistema se nivela hacia ellas.

---

## 1. Paleta (valores reales)

| Token | Valor | Uso |
|-------|--------|-----|
| Panel app bg | `#05070C` (`--cc-panel-bg-app`) | Fondo shell del panel |
| Surface / card | `#0B1220` / `rgba(11,18,32,0.78)` | Cards, inputs panel |
| Card gradient | `165deg, rgba(13,27,42,0.9) → rgba(11,18,32,0.82)` | `.card-panel` |
| Border panel | `rgba(79,156,255,0.22)` (`--cc-panel-border`) | Bordes card |
| Accent / brand blue | `#2E9BE6` (`accent`, `brand.blue`) | Links, rings activos |
| Accent bright | `#0C83F4` | Gradiente botón inicio |
| Accent deep | `#01469B` | Gradiente botón fin |
| Panel accent | `#4F9CFF` (`--cc-panel-accent`) | Focus inputs panel |
| Text primary | `#F1F5F9` / `#F4F3F1` | Títulos, body |
| Text muted | `#94A3B8` / `#9BA3AF` | Subtítulos, meta |
| Success / Activo | `#34D399` panel · `#3FA65B` token | Badges positivos |
| Warn / Pendiente | `#E0A72E` · amber-300 en badges | Pago pendiente / pausado |
| Danger | `#D64545` · `#F87171` panel | Eliminar / inactivo |

**Botón primario:** `linear-gradient(90deg, #0C83F4 → #01469B)` + glow `0 0 15px rgba(0,123,255,0.45)`.

---

## 2. Tipografía

| Rol | Familia | Clases / tamaño |
|-----|---------|-----------------|
| Display / títulos página | Oswald (`font-display`) | `text-fluid-xl` = `clamp(1.75rem, 4vw, 2.75rem)`, `tracking-wider`, often UPPERCASE |
| Body | DM Sans (`font-sans`) | base ~15–16px |
| Subtítulo / meta | DM Sans | `text-sm` + `.panel-muted` |
| KPI número | Oswald | `text-2xl`–`text-4xl` bold |
| Caption / badge | DM Sans | `text-xs`, medium |

Pesos: 400 body · 500 labels · 600 botones · 700 títulos display.

---

## 3. Radios, spacing, motion

| Elemento | Valor |
|----------|--------|
| Card / panel | `1rem` (16px) — `.card-panel` |
| Field / botón | `12px` (`rounded-field`) |
| Badge pill | `9999px` |
| Card padding | `1rem` mobile · `1.5rem` md+ |
| Gaps sección | `space-y-6` / `gap-3` |
| Touch target | `min-h-touch` = **44px** |
| Transiciones | `150ms ease-out` (`duration-micro`) |
| Focus visible | `2px solid #0C83F4` outline-offset 2px |

---

## 4. Iconografía

No hay `lucide-react` instalado. Iconos = **SVG inline** / emoji mínimos en UI legacy.  
Convención: acciones principales = **ícono + label**; nunca ícono solo en CTAs críticos.

---

## 5. Componentes CSS globales (ya existentes)

| Clase | Rol |
|-------|-----|
| `.btn-primary` | CTA azul gradiente + glow |
| `.btn-ghost` / `.btn-secondary` | Outline / secundario |
| `.card-panel` | Contenedor glass navy |
| `.input` / `.label` | Formulario |
| `.panel-text` / `.panel-muted` | Jerarquía de texto |
| `.panel-shell` | Shell app autenticada |

---

## 6. Componentes React base (`components/ui/`)

Consolidados para pantallas **no-referencia** (Clientes/Detalle siguen con markup propio):

- `StatCard`, `StatusBadge`, `ActionButton`, `PageHeader`, `SectionCard`
- `DataTable`, `SearchInput`, `Pagination`, `TabPill`, `EmptyState`

---

## 7. Auditoría vs pantallas de referencia

| Pantalla | Hallazgo | Severidad | Debe usar |
|----------|----------|-----------|-----------|
| Dashboard | Título "Dashboard" mixed-case vs UPPERCASE Oswald de CLIENTES; empty state sin CTA tipado | ALTO | `PageHeader` + `EmptyState` |
| Dashboard | Loading skeleton `bg-silver/20` sin borde card | MEDIO | skeleton `card-panel` |
| Planes | Filtros tipo como `btn-ghost` planos; empty sin CTA; botones destroy inconsistentes | ALTO | `TabPill` + `SectionCard` + `EmptyState` + `ActionButton` |
| Ejercicios | Header OK; empty/listado sin empty tipado; mensajes sin `panel-text` | MEDIO | `PageHeader` + `EmptyState` |
| Agenda | Empty lista sin CTA; cancelar sin variante destructive tipada | MEDIO | `EmptyState` + `ActionButton` |
| Portal cliente | Layout correcto pero tipografía/empty/reportes menos densos que panel coach | ALTO | mismos tokens + `PageHeader`/`SectionCard`/`EmptyState` |
| Agente IA | En mobile el panel flotante angosto pierde usabilidad | ALTO | modal/fullscreen `<md` |
| Login / Intro | Fuera de alcance panel — no tocar TechBackground/intro | — | — |
| Clientes / Detalle | **Referencia — no modificar** | — | — |

**Severidad resumen (pre-fix):** 0 CRÍTICO · 4 ALTO · 3 MEDIO · 0 BAJO prioritario.

---

## 8. Reglas para pantallas nuevas

1. Título: `font-display text-fluid-xl tracking-wider` UPPERCASE + subtítulo `panel-muted text-sm`.
2. Contenedores: solo `.card-panel` (no cards blancas / purple gradients).
3. CTA principal: `.btn-primary` o `<ActionButton variant="primary" />`.
4. Estados: `<StatusBadge />` con active/inactive/paused/cancelled.
5. Empty: ícono/mensaje + CTA, tono de “Sin evaluaciones…” del Detalle.
6. Responsive: KPIs 2-col → 4-col; tablas → cards `<md`; touch ≥44px; Agente fullscreen mobile.
