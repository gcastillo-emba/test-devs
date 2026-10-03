# API Index

Source of truth for each endpoint lives in `backend-nest/docs/openapi.yaml`.

## App

- `GET /` — Root/health check (static greeting)

## Analitica

Read-only analytics. All values are pre-aggregated by the backend (no raw work records).
Query filters: `periodo` (`YYYY-MM`, optional, defaults to all history), `abogadoId`, `area`, `nivel`.
`400` on invalid `periodo`/`abogadoId` or unknown query params.

- `GET /api/analitica/dashboard` — Everything for the dashboard: `{resumen, horasPorAbogado, costosPorAbogado, distribucionTiempo, evolucionMensual}`
- `GET /api/analitica/resumen` — Summary cards (total hours, billable hours, %, total cost, cost per billable hour)
- `GET /api/analitica/horas-abogados` — Lawyer-hours bar chart (one entry per lawyer with work records)
- `GET /api/analitica/costos-abogados` — Lawyer-cost bar chart (cost per hour is `null` when the lawyer has no hours)
- `GET /api/analitica/distribucion-tiempo` — Billable vs non-billable donut chart
- `GET /api/analitica/evolucion` — Monthly evolution line chart; accepts `abogadoId` only (no `periodo`)
