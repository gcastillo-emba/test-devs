# Paso 4b — Resolución

## Tarea 1 — Corrección de reportes

### Reporte 1: error al incluir socios

**Causa raíz:** P-01 y P-02 tienen costos pero no registros de horas. El cálculo dividía entre cero y terminaba en HTTP 500.

**Corrección:** se conservan los socios y sus costos; `costoHora` es `null` cuando no existen horas. El frontend muestra «No calculable: sin horas registradas».

**Verificación:** los tests de regresión confirman que incluir socios ya no produce HTTP 500.

### Reporte 2: discrepancia entre reporte y ficha

**Causa raíz:** el reporte usaba todas las horas registradas; la ficha usaba solo las facturables y duplicaba la fórmula.

**Regla existente:** costo total dividido por todas las horas registradas. Para Lucía Terrazas: Bs 31.500 / 90 horas = **Bs 350/h**, el valor correcto en esta aplicación. Bs 500/h correspondía a usar únicamente las 63 horas facturables.

**Corrección:** la ficha utiliza todas las horas y reutiliza `calcular_costo_hora`, eliminando la segunda interpretación de la regla.

**Verificación general:** `pytest`: 17 tests pasan; frontend build y lint: correctos; `git diff --check`: correcto.

## Tarea 2 — Arquitectura hexagonal

### Backend

| Hallazgo y evidencia actual | Problema | Corrección conceptual |
| --- | --- | --- |
| `app/dominio/modelos.py`: `Abogado.registros` importa e instancia `JsonRepositorioCostos`. | Dependencia dominio → infraestructura e I/O oculto. | El caso de uso obtiene registros mediante el puerto y entrega datos al dominio. |
| `app/aplicacion/reporte_costos.py` instancia `JsonRepositorioCostos`; el puerto `RepositorioCostos` no gobierna la dependencia. | Dependencia aplicación → infraestructura, sin inversión efectiva de dependencias. | Inyectar `RepositorioCostos` por constructor y componer el adaptador en `main.py` / `Depends`. |
| `app/entrada/http_abogados.py` importa el repositorio concreto y orquesta acceso y cálculo. | El endpoint de ficha se salta aplicación; la entrada conoce infraestructura y lógica de caso de uso. | Crear `ObtenerCostoHoraAbogado` en aplicación; el router solo traduce HTTP. |

### Frontend

| Hallazgo y evidencia actual | Problema | Corrección conceptual |
| --- | --- | --- |
| `Ficha.tsx` y `Reporte.tsx` usan `fetch` directamente. | Vistas acopladas al transporte y las URLs. | Definir un puerto y un adaptador HTTP fuera de los componentes. |
| `Reporte.tsx` calcula el promedio simple de `costoHora`, aunque el backend entrega `promedioFirma` ponderado. | Regla de negocio duplicada e inconsistente en la vista. | Usar el valor del backend o mover la regla a dominio/aplicación frontend. |
| Tipos, carga, errores y casos de uso viven dentro de los componentes. | No hay separación dominio/aplicación frontend; los componentes coordinan lógica además de presentar. | Separar tipos/modelos, adaptador HTTP y hooks/casos de uso de aplicación. |

Estos cambios de arquitectura son propuestas; no están implementados.

## Otros problemas encontrados

- Los logs exponen información sensible de cliente, asunto y detalle.
- El período no se usa al obtener costos/registros; con múltiples meses podría mezclar períodos.
- `next()` sin valor por defecto puede producir HTTP 500 si falta un costo.
- El promedio simple del frontend difiere del `promedioFirma` ponderado del backend. Se identificó, pero no se corrigió por estar fuera del alcance de los dos reportes.
