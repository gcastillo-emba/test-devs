# Entorno de la prueba técnica

## Para empezar

```bash
docker compose up -d
```

Eso levanta el registro de horas y una base de datos PostgreSQL vacía, por si quieres usarla.

## Lo que hay en esta carpeta

| Carpeta | Qué es |
| --- | --- |
| `datos/contabilidad.csv` | Export de contabilidad, una fila por abogado y mes |
| `servicios/` | El sistema de registro de horas. **Es un sistema externo**: se consume por su API, no se leen sus archivos internos |
| `frontend-react/` | Punto de partida vacío en React, TypeScript, Tailwind y Radix |
| `frontend-angular/` | Punto de partida vacío en Angular |
| `plataforma-existente/` | Una aplicación que ya usa la firma. La vas a necesitar en el paso 4b |

El backend del tablero lo creas tú, desde cero, en el stack que elegiste.

## Registro de horas

Base: `http://localhost:8000`

| Método | Ruta | Qué devuelve |
| --- | --- | --- |
| `GET` | `/salud` | Estado del servicio |
| `GET` | `/registros?pagina=1&tamano=100` | Registros de horas, paginados. `tamano` admite hasta 500 |

Cada respuesta de `/registros` trae `datos`, `pagina`, `tamano`, `total` y `siguiente`, que es la ruta de la página siguiente o `null` en la última.

## Base de datos

| Parámetro | Valor |
| --- | --- |
| Host | `localhost:5432` |
| Base | `tablero` |
| Usuario / contraseña | `prueba` / `prueba` |

## Frontends

```bash
cd frontend-react     # o frontend-angular
npm install
npm run dev           # en Angular: npm start
```

Ambos requieren Node.js 22 o superior.
