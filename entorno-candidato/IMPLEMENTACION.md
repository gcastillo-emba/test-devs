# Ejecución

La API externa debe estar disponible en http://localhost:8000. No se usa PostgreSQL.

```sh
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

En otra terminal:

```sh
cd frontend-react
npm install
npm run dev -- --host 127.0.0.1
```

Abrir http://localhost:5173. El proxy de Vite dirige `/api` al backend. Documentación del backend: http://localhost:8001/docs. `HOURS_API_URL` permite cambiar la URL pública de horas.

El backend carga al iniciar sin bloquear la pantalla de estado. La actualización manual relee el CSV y descarga páginas de 500 hasta el final; el snapshot anterior continúa disponible. Un fallo conserva los datos y la fecha anteriores. Se guarda en memoria, sin autenticación ni scheduling.

Endpoints: `GET /api/estado`, `POST /api/actualizar`, `GET /api/tablero`. La consulta acepta `inicio`, `fin`, múltiples `area` y `nivel`, y `abogado_id`. El backend calcula ratios y devuelve importes decimales como strings redondeados a dos decimales, mitad hacia arriba; datos ausentes son null. Los cálculos se hacen antes del redondeo. Se conserva por separado costo incluido, contable disponible y excluido. Los ratios individuales y grupales ausentes no se dibujan como cero ni se conectan sobre huecos.

Moneda Bs. como decisión de esta entrega, sin conversión ni inferencia del CSV. `horas_facturadas` no interviene en el denominador. No se envían cliente/asunto al frontend. Un dato inválido de alcance desconocido excluye los resultados cuyo impacto no puede determinarse.

Verificaciones:

```sh
backend/.venv/bin/python -m unittest discover -s backend -p 'test_*.py' -v
cd frontend-react
npm run build
npm run lint
```

Limitación externa: el contrato paginado no garantiza snapshot transaccional. Se detectan cambios de total, saltos, páginas repetidas, rutas inesperadas y discrepancias de recuento, sin afirmar consistencia transaccional de la fuente.

## Resultado de verificación

- 23 pruebas automatizadas aprobadas: matemática ponderada, cobertura global/individual, octubre sin cobertura, grupos parciales y sin cobertura, rangos parciales, ceros reales que conservan costo, insumos inválidos, duplicados, clasificación mensual, privacidad, paginación y actualización atómica/fallida/concurrente.
- `npm run build` y `npm run lint`: aprobados sin advertencias en la versión final.
- Fuentes reales: 51.812 registros obtenidos por la API pública, 20 meses seleccionados, 19 meses incluidos en los grupos con clasificación presente y cobertura; octubre de 2025 queda INCOMPLETO. Cinco filas sin nivel permanecen visibles. Los socios sin registros conservan sus costos y sueldos, sin horas ni ratio individual.
- El grupo con miembros parcialmente cubiertos y los ceros reales se comprobaron con fixtures; no se introdujeron cambios en las fuentes para fabricarlos.
- Navegador: tabla, filtros, selección individual y actualización manual verificados. Sin errores de navegador ni overlay de Vite. La actualización cambió la fecha exitosa. El SVG no dibuja punto en octubre ni líneas que atraviesen el hueco.

Comandos principales ejecutados: creación de venv e instalación de requirements, Uvicorn en puerto 8001, Vite en puerto 5173, unittest, build, lint, consultas HTTP con curl/urllib y comprobaciones con `npx --yes agent-browser`.
