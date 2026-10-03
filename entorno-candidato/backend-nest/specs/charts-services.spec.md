Create an analytics module in NestJS responsible for preparing all data required by the frontend dashboard.

Use the existing entities:

Abogado  
RegistroTrabajo  
CostoMensualAbogado

Do not create new persistence entities for analytics.

Create:

src/modules/analitica/

With:

analitica.module.ts  
analitica.service.ts  
analitica.controller.ts  
dto/

The analytics service must aggregate data from RegistroTrabajo and CostoMensualAbogado.

Implement these service methods:

obtenerResumenGeneral(periodo?: string)

Return:

totalAbogados  
horasTotales  
horasFacturables  
horasNoFacturables  
porcentajeFacturable  
costoTotal  
costoPromedioHoraFacturable

Formula:

horasTotales = SUM(minutos) / 60

horasFacturables = SUM(minutos where facturable = true) / 60

horasNoFacturables = horasTotales - horasFacturables

porcentajeFacturable = horasFacturables / horasTotales * 100

costoTotal = SUM(costoTotal)

costoPromedioHoraFacturable = costoTotal / horasFacturables

If horasTotales or horasFacturables is zero, return 0 or null where appropriate.

Implement:

obtenerHorasPorAbogado(periodo?: string)

Return an array with:

abogadoId  
nombre  
nivel  
area  
horasTotales  
horasFacturables  
horasNoFacturables  
porcentajeFacturable

Group RegistroTrabajo by abogado.

Use fechaTrabajo to filter by periodo.

Implement:

obtenerCostosPorAbogado(periodo?: string)

Return:

abogadoId  
nombre  
nivel  
area  
costoTotal  
horasFacturables  
costoPorHora  
costoPorHoraFacturable

Formula:

costoPorHora = costoTotal / horasTotales

costoPorHoraFacturable = costoTotal / horasFacturables

Do not use horasFacturadasReportadas as the main analytical source if the work records can calculate billable hours.

Keep horasFacturadasReportadas available only for comparison or validation.

Implement:

obtenerDistribucionTiempo(periodo?: string)

Return:

horasFacturables  
horasNoFacturables  
porcentajeFacturable  
porcentajeNoFacturable

This endpoint feeds the frontend donut chart.

Implement:

obtenerEvolucionMensual(abogadoId?: string)

Return an array grouped by period:

periodo  
horasTotales  
horasFacturables  
horasNoFacturables  
porcentajeFacturable  
costoTotal  
costoPorHoraFacturable

If abogadoId is provided, return the evolution for that lawyer.

If abogadoId is not provided, return the global monthly evolution.

Implement:

obtenerDashboard(periodo?: string)

This is the primary frontend endpoint.

It must call the analytics methods and return:

{
  resumen,
  horasPorAbogado,
  costosPorAbogado,
  distribucionTiempo,
  evolucionMensual
}

Expose:

GET /api/analitica/dashboard

Optional query:

periodo=YYYY-MM

Example:

GET /api/analitica/dashboard?periodo=2025-01

Response structure:

{
  "resumen": {
    "totalAbogados": 40,
    "horasTotales": 0,
    "horasFacturables": 0,
    "horasNoFacturables": 0,
    "porcentajeFacturable": 0,
    "costoTotal": 0,
    "costoPromedioHoraFacturable": null
  },
  "horasPorAbogado": [],
  "costosPorAbogado": [],
  "distribucionTiempo": {
    "horasFacturables": 0,
    "horasNoFacturables": 0,
    "porcentajeFacturable": 0,
    "porcentajeNoFacturable": 0
  },
  "evolucionMensual": []
}

Also expose optional individual endpoints:

GET /api/analitica/resumen

GET /api/analitica/horas-abogados

GET /api/analitica/costos-abogados

GET /api/analitica/distribucion-tiempo

GET /api/analitica/evolucion

Support these query filters where applicable:

periodo  
abogadoId  
area  
nivel

Create DTOs for query filters and responses.

Use TypeORM QueryBuilder for aggregations.

Prefer calculating aggregates in SQL instead of loading all RegistroTrabajo rows into memory.

Use:

SUM  
COUNT  
COUNT DISTINCT  
GROUP BY  
CASE WHEN

For billable hours use a conditional SUM.

Example logic:

SUM(
  CASE
    WHEN facturable = true THEN minutos
    ELSE 0
  END
)

For unique clients and matters, prepare support for:

COUNT(DISTINCT cliente)

COUNT(DISTINCT asunto)

Even if they are not exposed yet.

The frontend must not receive raw RegistroTrabajo data for dashboard calculations.

The backend must return already aggregated values.

Use numeric conversion for TypeORM decimal values before calculations or returning responses.

Do not return string decimals.

Return numbers.

Keep business logic inside AnaliticaService.

Do not calculate analytics inside controllers.

Controllers should only:

receive query params  
validate DTOs  
call AnaliticaService  
return responses

Do not create CRUD operations in AnaliticaController.

The main goal is read-only analytics.

Required MVP endpoint:

GET /api/analitica/dashboard

The implementation is complete when this endpoint can provide all data required for:

summary cards  
lawyer-hours bar chart  
lawyer-cost bar chart  
billable vs non-billable donut chart  
monthly evolution line chart

Use the existing database as the single source for frontend analytics.
