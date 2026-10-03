# Spec — Base Entities backend

## Objective

Prepare the backend persistence layer to centralize all source data required for later analytics.

The backend uses NestJS and TypeORM.

This phase must only cover data modeling, persistence, migration, and initial data import.

No analytics, KPIs, dashboard logic, or frontend endpoints should be implemented yet.

---

## Scope

Create and persist only these entities:

- Abogado
- RegistroTrabajo
- CostoMensualAbogado

Keep the model intentionally simple because this is a time-limited technical test.

Do not normalize Cliente, Asunto, Área, Nivel, or Periodo into separate entities at this stage.

---

## Entity: Abogado

### Purpose

Represent each lawyer available in the source data.

### Required fields

- id
- nombre
- nivel
- area
- activo
- createdAt
- updatedAt

### Rules

- `id` must use the original source identifier.
- Example identifiers: `AB-001`, `AB-007`.
- `nombre` is required.
- `nivel` can be null because some source records do not provide it.
- `area` can be null.
- `activo` defaults to true.
- The entity must support multiple work records.
- The entity must support multiple monthly cost records.

---

## Entity: RegistroTrabajo

### Purpose

Represent each individual work-log entry performed by a lawyer.

### Required fields

- id
- abogadoId
- fechaTrabajo
- fechaCarga
- minutos
- facturable
- cliente
- asunto
- createdAt
- updatedAt

### Rules

- `id` must use the original source identifier.
- Example: `R-000001`.
- `abogadoId` must reference an existing Abogado.
- `fechaTrabajo` is required.
- `fechaCarga` is required.
- `minutos` must be greater than zero.
- `facturable` must indicate whether the work can be billed.
- `cliente` remains a text field.
- `asunto` remains a text field.

### Relationship

- One Abogado can have many RegistroTrabajo records.
- One RegistroTrabajo belongs to one Abogado.

### Index requirements

Create indexes for:

- abogadoId
- fechaTrabajo
- abogadoId + fechaTrabajo
- facturable

---

## Entity: CostoMensualAbogado

### Purpose

Represent the monthly cost associated with a lawyer.

### Required fields

- id
- abogadoId
- periodo
- sueldo
- cargasSociales
- gastosAsignados
- costoTotal
- horasFacturadasReportadas
- createdAt
- updatedAt

### Rules

- `id` can be generated internally.
- `abogadoId` must reference an existing Abogado.
- `periodo` must use `YYYY-MM`.
- `sueldo` must support decimal values.
- `cargasSociales` must support decimal values.
- `gastosAsignados` must support decimal values.
- `costoTotal` must support decimal values.
- `horasFacturadasReportadas` can be null.
- A lawyer can have only one cost record per period.

### Unique constraint

The combination below must be unique:

- abogadoId
- periodo

### Relationship

- One Abogado can have many CostoMensualAbogado records.
- One CostoMensualAbogado belongs to one Abogado.

### Index requirements

Create indexes for:

- abogadoId
- periodo

---

## Source mapping

The work-log source contains:

- id
- abogado_id
- fecha_trabajo
- fecha_carga
- minutos
- facturable
- cliente
- asunto

Map these fields into RegistroTrabajo.

The cost source contains:

- periodo
- abogado_id
- nombre
- nivel
- area
- sueldo
- cargas_sociales
- gastos_asignados
- costo_total
- horas_facturadas

Use this source to populate:

- Abogado
- CostoMensualAbogado

---

## Data import

Create a dedicated import component responsible for loading and centralizing source data.

Recommended name:

- ImportacionDatosService

### Responsibilities

The import process must:

- load source data;
- transform source field names into backend field names;
- convert numeric values correctly;
- validate required values;
- remove or avoid duplicates;
- persist data in the database;
- report invalid records without stopping the full import when possible.

---

## Import order

The import must run in this order:

1. Abogados
2. RegistrosTrabajo
3. CostosMensualesAbogado

This order is required because work records and monthly costs depend on existing lawyers.

---

## Idempotency

The import process must be safe to run multiple times.

Re-running the import must not create duplicate data.

Use these logical identifiers:

### Abogado

Unique by:

- id

### RegistroTrabajo

Unique by:

- id

### CostoMensualAbogado

Unique by:

- abogadoId + periodo

---

## Migration requirements

Create an initial TypeORM migration for the three entities.

The migration must include:

- tables;
- primary keys;
- foreign keys;
- indexes;
- unique constraints;
- nullable rules;
- default values;
- decimal precision.

Table creation order:

1. abogados
2. registros_trabajo
3. costos_mensuales_abogado

Rollback order must be reversed.

---

## TypeORM configuration

The final implementation must use migrations as the source of truth for the database schema.

Do not rely on automatic schema synchronization for the final submission.

---

## Out of scope

Do not create these entities yet:

- Cliente
- Asunto
- Area
- NivelAbogado
- Periodo
- Tarifa
- Factura

Keep the following as simple fields:

- cliente
- asunto
- area
- nivel

---

## Calculated data

Do not persist analytical values such as:

- horasTotales
- horasFacturables
- horasNoFacturables
- porcentajeFacturable
- costoPorHora
- costoPorHoraFacturable
- cantidadClientes
- cantidadAsuntos
- retrasoPromedioCarga

These values will be calculated later in the analytics layer.

---

## Expected backend structure

The backend should contain modules for:

- abogados
- registros-trabajo
- costos-mensuales

It should also contain:

- database migrations;
- import service;
- import execution command or script.

Controllers are not required during this phase unless required by the current project architecture.

---

## Expected execution flow

The backend must support this operational flow:

1. Run database migrations.
2. Run data import.
3. Start the application.
4. Verify imported data.
5. Re-run the import.
6. Confirm no duplicates are created.

---

## Acceptance criteria

The task is complete when:

- Abogado entity exists.
- RegistroTrabajo entity exists.
- CostoMensualAbogado entity exists.
- Entity relationships are configured.
- Required indexes are created.
- Unique abogadoId + periodo constraint exists.
- Initial migration exists.
- Database schema is migration-controlled.
- ImportacionDatosService exists.
- Source fields are mapped correctly.
- Import respects entity dependency order.
- Import is idempotent.
- Invalid records are handled safely.
- Imported data can be queried from the database.
- Running the import multiple times does not create duplicates.

---

## Final result

At the end of this phase, the backend must have a centralized database containing:

- lawyers;
- their work records;
- their monthly costs.

This persistence layer will later be used by the analytics module to calculate performance, utilization, cost, efficiency, and workload indicators.
