# Especificación — Tablero de costos por hora

Estado: Borrador de especificación para entrega técnica. Implementar únicamente lo descrito; no completar decisiones pendientes con reglas de negocio inventadas.

## 1. Objetivo y principio de producto

Permitir a los socios comparar cuánto cuesta una hora facturable por área y nivel, observar su evolución y analizar casos individuales. Costo por hora es la métrica principal. Mostrar costos, horas y limitaciones que permitan interpretar esa métrica. No inventar métricas adicionales de desempeño, metas, semáforos, rankings ni evaluaciones de abogados. Queremos que los socios puedan tomar decisiones de negocios en base a este Dashboard.

## 2. Usuarios y sensibilidad de la información

Los usuarios objetivo son los socios. Los costos y salarios son información sensible. En producción, esta información debería restringirse a usuarios autorizados. Autenticación, autorización y gestión de usuarios están FUERA DEL ALCANCE de esta entrega. No mostrar ni enviar al frontend `cliente` o `asunto`.

## 3. Fuentes de datos

- `datos/contabilidad.csv`: UTF-8, separado por comas, una fila por abogado y mes. Columnas: `periodo`, `abogado_id`, `nombre`, `nivel`, `area`, `sueldo`, `cargas_sociales`, `gastos_asignados`, `costo_total`, `horas_facturadas`. `periodo` tiene formato `YYYY-MM`; cantidades con punto decimal. La fuente no especifica explícitamente moneda. Usar Bolivianos (Bs.) como decisión de producto/implementación de esta entrega, no como un hecho inferido del CSV. No introducir conversiones de moneda.
- API externa: `http://localhost:8000`. Consumir exclusivamente sus rutas públicas documentadas: `GET /salud` y `GET /registros?pagina=1&tamano=500`. Recorrer `siguiente` hasta `null`; la respuesta contiene `datos`, `pagina`, `tamano`, `total`, `siguiente`. Los registros observados contienen `id`, `abogado_id`, `fecha_trabajo`, `fecha_carga`, `minutos`, `facturable`, `cliente`, `asunto`. Un valor válido de `minutos` es un entero > 0, aceptando su representación como string JSON; cualquier otro valor es incidencia. `facturable` debe ser booleano.
- Tratar `servicios/` como externo: no leer código, archivos de datos ni almacenamiento interno. No asumir un esquema de respuesta más estricto que el documentado y validado.
- `horas_facturadas` del CSV y horas facturables de la API son conceptos distintos. El primero no interviene en el denominador ni sustituye datos ausentes de la API.

## 4. Reglas de integración

1. Validar cada fuente y conservar las incidencias con origen e identificador o número de fila.
2. Derivar el período de horas del mes de `fecha_trabajo`. Es una decisión de implementación fundamentada en analizar cuándo ocurrió el trabajo; no se presenta como una respuesta literal del PO. `fecha_carga` no define el período.
3. Antes de filtrar por facturabilidad, abogado, área o nivel, determinar la cobertura mensual global de horas con la descarga completa de la API: un mes tiene cobertura si contiene al menos un registro con `fecha_trabajo` válida en ese mes, sea facturable o no. Si existen filas contables del mes y cero registros globales de trabajo, clasificar el mes como INCOMPLETO por falta de cobertura de horas; no interpretar sus horas como cero.
4. Seleccionar exclusivamente registros con `facturable = true`; agregar sus minutos por `(abogado_id, período)` y convertir la suma a horas dividiendo entre 60.
5. Cruzar ese agregado con contabilidad por `(abogado_id, periodo)`. Conservar la unión de claves de ambas fuentes; no usar un cruce que elimine silenciosamente las que carecen de contraparte.
6. Tomar `nombre`, `nivel` y `area` de la fila contable de ese mes. No aplicar la clasificación más reciente a toda la historia ni inferir atributos a partir del sueldo.
7. Determinar también la cobertura individual sobre TODA la API descargada, antes de aplicar filtros o seleccionar registros facturables. Si un abogado no tiene ningún registro, clasificarlo como SIN COBERTURA DE HORAS: sus horas no se sustituyen por cero y su costo/hora individual no se publica. La mera presencia de registros no elimina incidencias de validación que afecten la confiabilidad del cálculo.
8. Un abogado con registros en algún período de la API puede tener 0 horas facturables registradas en otro mes con cobertura global, incluso sin registros propios en ese mes, siempre que ninguna incidencia impida determinar sus horas. Conservar su costo y mostrar una observación de cero horas facturables registradas; esto no prueba ausencia de trabajo real. En un mes sin cobertura global, las horas permanecen ausentes. La ausencia de costos o los insumos inválidos tampoco se rellenan con cero.

## 5. Definición del costo por hora

Para abogado y período: `costo_total / horas_facturables`. Para cada grupo área + nivel: `SUM(costo_total) / SUM(horas_facturables)` sobre la misma población y períodos incluidos. No promediar ratios individuales ni ratios mensuales. No crear un costo/hora global de toda la firma que mezcle niveles profesionales.

Usar `costo_total` como costo del período y verificar su correspondencia con `sueldo + cargas_sociales + gastos_asignados`. No sumar nuevamente sus componentes al total. No aplicar tratamiento especial al nivel Socio ni redistribuir sus costos.

Para cada grupo área + nivel, considerar los miembros identificados en contabilidad para los períodos seleccionados, con su clasificación mensual. Si algunos tienen cobertura individual y otros no, calcular únicamente con la población con cobertura: excluir simétricamente costo y horas de miembros SIN COBERTURA DE HORAS, marcar PARCIAL y mostrar «N de M abogados con cobertura». Contar abogados distintos de esa población, sin duplicarlos por mes. Generar observación con miembros y costo excluido. Si ningún miembro tiene cobertura, el costo/hora es «No calculable: sin cobertura de horas de los miembros».

Con cobertura individual y mensual e insumos confiables, incluir también los costos de abogados con cero horas facturables registradas en el numerador del grupo. Si el denominador del grupo es positivo, el ratio grupal es calculable aunque algún ratio individual no lo sea. Si el denominador del resultado solicitado es cero, mostrar «No calculable: cero horas facturables registradas», conservando el costo conocido.

Un mes INCOMPLETO por ausencia global de registros de API muestra sus datos contables disponibles y costo por hora «No calculable», con motivo «Falta de cobertura de horas». No mostrar sus horas como cero. Si falta o es inválido otro insumo necesario y los datos de la población incluida no son confiables, excluir el período afectado del cálculo y explicar el motivo.

Para un rango, excluir un período solamente si falta cobertura mensual de la fuente de horas o existe un problema que haga no confiables sus datos para la población incluida. Excluir simétricamente costo y horas del período afectado. Un mes con cobertura e insumos confiables se incluye aunque sus horas facturables sean cero: su costo permanece en el numerador y aporta cero al denominador. La falta de ratio mensual por denominador cero no es motivo de exclusión del rango. Aplicar además las exclusiones de población sin cobertura individual descritas arriba.

Después de aplicar las reglas de cobertura y confiabilidad, calcular el cociente de sumas del rango; será «No calculable» solamente si `SUM(horas_facturables) = 0`, incluida la ausencia de población/períodos elegibles. Nunca reemplazar ese resultado por costo cero. Ejemplo explícito: Mes A, costo 100 y horas 1; Mes B con cobertura, costo 300 y horas 0. Resultado del rango: `(100 + 300) / (1 + 0) = 400`. No eliminar el costo del Mes B.

Mostrar cobertura temporal «N de M meses incluidos», contando también meses confiables de cero horas, y cobertura individual «N de M abogados con cobertura». Si se excluye al menos un período o miembro, marcar la cobertura del resultado como PARCIAL y listar exclusiones con motivos, incluso si el ratio termina siendo no calculable. Sin períodos elegibles, mostrar «0 de M meses incluidos». La columna de costo y las horas de cada resultado corresponden solamente a su población y períodos incluidos; el costo excluido puede mostrarse separado como contexto de calidad. No incorporar el costo de un mes sin cobertura con horas cero ni presentar el costo excluido como costo del cálculo.

Usar aritmética decimal y no redondear antes de agregar. Decisión de presentación: dos decimales, redondeo a la mitad hacia arriba; conservar precisión interna. Presentar costos y sueldos en Bs., y costo por hora en Bs./h, sin convertir valores.

## 6. Funcionalidad del dashboard

Una pantalla ejecutiva con:

- Vista principal como matriz/lista por área + nivel: costo de la población/períodos incluidos, horas facturables, costo por hora y estado de disponibilidad. No mostrar un ratio general de la firma que mezcle niveles.
- Gráfico comparativo de evolución mensual del costo por hora, con selección de las series de área + nivel a comparar.
- Exploración individual separada mediante selector de abogado y vista de su evolución mensual: costo total, sueldo, horas facturables y costo por hora. Mostrar valores y unidades separados; no superponer importes y horas sobre una escala común. Para abogados SIN COBERTURA DE HORAS, permitir consultar costos/sueldos conocidos sin publicar su ratio.
- Superficie visible de observaciones, con detalle desplegable. No depender únicamente de tooltips para comunicar limitaciones.
- Fecha y hora de última actualización exitosa, cobertura temporal y de abogados, control de actualización y estados de carga, error, vacío, PARCIAL y no calculable. Mostrar motivos y costos excluidos separados del costo incluido.

Priorizar tablas y gráficos que respondan a estas comparaciones. No añadir elementos decorativos ni gráficos sin propósito de negocio.

## 7. Filtros y comparativas

Filtrar por rango de meses inclusivo, área y nivel. Permitir seleccionar una o varias áreas/niveles y restablecer filtros. Aplicar los mismos filtros a resumen, tabla, series y observaciones contextualizadas. Mantener visibles las incidencias globales que impidan garantizar cobertura.

El rango inicial puede abarcar el rango disponible, mostrando su cobertura y exclusiones. No establecer un rango especial ni eliminar meses de la selección para ocultar períodos incompletos como `2025-10`. Determinar cobertura global e individual antes de aplicar filtros; mostrar los meses incluidos y los abogados con cobertura de cada resultado. Los filtros conservan filas separadas por área + nivel, sin fusionarlas en un ratio global.

Mostrar niveles ausentes como «Sin nivel informado», incluyendo sus datos y permitiendo seleccionarlos. Aplicar el mismo criterio a un área ausente. Los registros sin clasificación por falta de contabilidad permanecen visibles en observaciones globales.

El selector individual se limita a abogados presentes en la selección y conserva su identificador. Las clasificaciones se evalúan por mes: si un cambio de nivel o área deja meses fuera del filtro, mostrar esa limitación. No ofrecer ordenaciones o etiquetas que impliquen evaluación de desempeño.

## 8. Evolución temporal

Usar granularidad mensual. Calcular cada punto con los costos y minutos correspondientes a ese mes. Para el resumen de un rango, recalcular el cociente de sumas de los períodos confiables incluidos según la sección 5, conservando los de cero horas y mostrando cobertura temporal, cobertura individual y estado PARCIAL cuando corresponda.

Representar meses incompletos, sin datos o no calculables como huecos, sin interpolarlos ni dibujarlos como cero. No conectar la línea entre puntos a ambos lados de un hueco de forma que sugiera un dato existente. Los datos contables válidos de esos meses pueden seguir visibles en la tabla y en sus propias series. Mostrar la cobertura temporal de cada fuente y advertir cuando el rango solicitado exceda esa cobertura. La vista individual debe permitir identificar cambios mensuales de sueldo y costo sin atribuirles causas no contenidas en las fuentes.

## 9. Calidad de datos y observaciones

Cada observación debe indicar tipo, origen, alcance temporal/abogado cuando sea identificable y efecto sobre el cálculo. No mostrar `cliente` ni `asunto` en sus detalles.

| Caso | Comportamiento requerido |
| --- | --- |
| Nivel o área faltante | Clasificar como no informado; conservar valores válidos y advertir. |
| Fecha, identificador, booleano o cantidad inválida; nulos; valores no finitos | No convertirlos silenciosamente. Retener incidencia y excluir del cálculo los períodos afectados cuyos insumos no puedan establecerse de forma confiable. Para `minutos`, aceptar solo enteros > 0 o su representación textual de entero positivo; cero, negativos, fracciones, booleanos y valores no numéricos son incidencias. |
| Valor negativo o total contable distinto de sus componentes | Reportar incompatibilidad potencial. No corregir, redistribuir ni reinterpretar; dejar no calculable el resultado mensual afectado y excluir ese período del rango de esa población por falta de confiabilidad, conservando los demás períodos confiables. |
| Registro sin contraparte | Mostrar datos disponibles y procedencia; no completar costos ausentes ni horas sin cobertura con cero. Distinguir falta de cobertura individual en toda la API de cero registrado mensual para un abogado con cobertura en otro período. |
| Abogado sin ningún registro en toda la API | Mostrar SIN COBERTURA DE HORAS; no publicar ratio individual. Excluir simétricamente su costo y horas del grupo; observar miembros y costo excluido, y mostrar «N de M abogados con cobertura» y PARCIAL. |
| Cero horas registradas con cobertura individual y mensual | Mostrar observación correspondiente. Conservar su costo en el grupo y en los rangos; ratio mensual individual no calculable. No inferir falta de trabajo real. |
| Denominador cero | Mostrar no calculable y explicar el motivo; conservar costo y horas conocidos. No excluir por este motivo un período confiable de un rango. |
| Carga posterior al trabajo | Observación informativa, agregada por abogado/período si se muestra; informar cantidad de registros, retraso y cruces de mes sin generar una alerta por registro. Mantener imputación por trabajo, sin umbral de incumplimiento. Una carga anterior al trabajo es una anomalía de fechas. |
| Mes contable sin registros globales de API | Clasificar como INCOMPLETO; mostrar observación explícita «Falta de cobertura de horas», período y datos contables disponibles. Ratio mensual no calculable; excluir costos y horas de ese mes de los rangos y mostrar cobertura PARCIAL. |
| Cobertura incompleta | Informar rango/población afectada, cantidad de meses incluidos y abogados con cobertura, exclusiones y motivos. Mostrar costo excluido separado del incluido. No atribuir ausencias a altas o bajas sin confirmación. |
| Duplicado de `id` en API o de abogado + mes en CSV | Reportar; no sumar duplicados ni elegir arbitrariamente una fila. El agregado mensual afectado queda no calculable hasta resolver el duplicado; excluir ese período del rango de esa población por falta de confiabilidad, conservando los demás períodos confiables. |

Una `fecha_carga` ausente o inválida impide evaluar retraso, pero no invalida por sí sola horas con fecha de trabajo, minutos y facturabilidad válidos. Si un registro inválido no permite localizar su impacto, señalar cobertura no verificable y no publicar ratios cuya integridad no pueda garantizarse.

Casos de las fuentes que deben poder representarse: cinco filas sin nivel (`AB-034`, junio–agosto de 2026; `AB-038`, julio–agosto de 2026), cobertura parcial de algunos abogados y 120 filas de socios con horas facturadas contables en cero. Este último dato no determina las horas facturables de la API. Contabilidad tiene filas de `2025-10` y la API disponible no contiene registros globales de trabajo de ese mes: mostrarlo INCOMPLETO, sin convertirlo en cero horas ni invalidar los demás períodos confiables. Recalcular cobertura en cada actualización, sin exclusiones fijas por fecha.

## 10. Actualización de datos

Realizar carga inicial y ofrecer actualización explícita/manual. Cada ejecución relee el CSV, consume completamente la API y valida ambas fuentes antes de preparar un nuevo snapshot. Reemplazar el anterior de forma atómica únicamente cuando la ejecución termine correctamente. Recalcular también los meses históricos disponibles con los datos recibidos; esta entrega no implementa cierres contables ni congela períodos.

Incidencias de filas pueden producir un snapshot con observaciones y resultados no calculables según la sección 9. Fallos de transporte, CSV ilegible/estructura incompatible o paginación incompleta impiden publicar el nuevo snapshot. Usar timeouts, detectar páginas repetidas y discrepancias de recuento/paginación; no aceptar una descarga parcial como completa.

Si falla, conservar el último snapshot exitoso, su fecha y sus observaciones, mostrando el fallo del intento. Si aún no existe uno, mostrar estado sin datos y permitir reintentar. Impedir actualizaciones simultáneas y mantener disponible el snapshot anterior durante la operación. No incorporar scheduling periódico.

## 11. Arquitectura propuesta

- Backend nuevo en FastAPI: adaptadores de lectura CSV y HTTP, validación, integración, cálculo decimal y almacenamiento del snapshot en memoria. El backend es el único consumidor de las fuentes y dueño de las fórmulas.
- Frontend existente React + TypeScript + Vite, usando Tailwind/Radix disponibles. Consumir resultados y observaciones del backend; no descargar las fuentes ni recalcular ratios en el navegador.
- Contrato mínimo del backend: consulta por área + nivel con filtros, exploración individual separada, consulta del estado de actualización y operación manual de actualización. Responder con período aplicado, métricas de población/períodos incluidos, series mensuales, disponibilidad/motivos, observaciones, cobertura temporal y de abogados, exclusiones/costo excluido y última actualización exitosa. No devolver un ratio global de la firma. Un resultado no calculable usa valor nulo y motivo explícito; nunca infinito, `NaN` o cero de reemplazo.
- Memoria es suficiente para el MVP; tras reiniciar, efectuar nueva carga. No usar PostgreSQL ni agregar colas o infraestructura de scheduling: no aportan valor requerido en esta entrega.

## 12. Fuera de alcance

Autenticación, autorización y gestión de usuarios están FUERA DEL ALCANCE. También quedan fuera: despliegue productivo; persistencia e historial de snapshots; actualización periódica; edición o corrección de fuentes; cierres contables; redistribución de costos; facturación, ingresos o rentabilidad; costo/hora global de la firma; detalle por cliente/asunto; exportaciones; metas, semáforos, rankings y evaluaciones no solicitadas. No modificar el sistema externo ni la plataforma existente para construir este tablero.

## 13. Criterios de aceptación

1. Solo se usan el CSV y la API pública documentada para adquirir datos; no se accede a archivos internos de `servicios/`.
2. Un registro de 120 minutos facturables y otro de 60 no facturables del mismo abogado/mes producen 2 horas facturables. Cambiar únicamente `fecha_carga` no cambia el mes del cálculo. `120` y `"120"` son minutos válidos; `0`, negativos, fracciones, texto no numérico, nulos y booleanos generan incidencia, sin contarse como minutos válidos.
3. Mes completo: con cobertura global, cobertura individual de ambos miembros y datos válidos, para costos de 100 y 300 y horas de 2 y 3, el grupo muestra costo 400, horas 5 y costo por hora 80, no el promedio simple de 75; cobertura «1 de 1 meses incluidos» y «2 de 2 abogados con cobertura», sin PARCIAL. Para dos meses confiables con costo/horas 100/1 y 300/9, el rango muestra 40 y cobertura «2 de 2 meses incluidos», sin promediar ratios mensuales.
4. Cero individual con cobertura: con costos 100 y 300 y horas de 0 y 3 en un mes con cobertura global, y el primer abogado con registros en otro período de la API, el grupo muestra costo 400, horas 3 y ratio 400/3. El primer abogado muestra 0 horas facturables registradas, ratio mensual no calculable y observación; su costo no se excluye.
5. Una clave presente solo en una fuente genera observación y conserva valores disponibles. La ausencia de contabilidad o de cobertura mensual global no se convierte en cero. Un abogado ausente de toda la API respeta el criterio 15; la falta de horas facturables de un abogado con cobertura individual respeta el criterio 4.
6. Un abogado que cambia de nivel/área se clasifica en cada mes según su CSV; los filtros y las series respetan ese cambio. Las filas sin nivel aparecen como no informado.
7. La vista principal es una matriz/lista por área + nivel y el gráfico compara esas series; ambos responden al rango temporal y filtros sin publicar un ratio global que mezcle niveles. La exploración individual separada muestra evolución de las cuatro métricas solicitadas; los meses sin ratio son huecos.
8. Los casos de calidad de la sección 9 producen observaciones visibles y el estado de cálculo definido. Los duplicados no incrementan totales. Ningún dato del producto incluye cliente/asunto.
9. Una actualización exitosa reemplaza integralmente el snapshot y cambia su marca temporal. Un fallo a mitad de la API conserva íntegros datos y marca temporal anteriores; sin snapshot previo muestra error sin métricas inventadas.
10. Costos/sueldos se presentan en Bs. y costo por hora en Bs./h, con dos decimales, sin conversiones. Se documenta como decisión de esta entrega, sin atribuir la moneda al CSV. No se añaden métricas de desempeño, metas, semáforos, rankings o evaluaciones. Los cálculos conservan precisión antes de presentar y nunca devuelven infinito o `NaN`.
11. Mes sin cobertura: con filas contables para `2025-10` y cero registros globales de trabajo en la API para ese mes, se muestran estado INCOMPLETO, datos contables disponibles, horas ausentes y costo por hora «No calculable» por falta de cobertura de horas. Hay una observación visible y un hueco en la serie del ratio, sin punto cero ni línea que atraviese el hueco.
12. Rango parcial: para una población con cobertura individual y tres meses con costo/horas 100/1, 500/sin cobertura mensual y 300/9, la columna de costo del resultado muestra 400, horas 10 y costo por hora 40; PARCIAL, «2 de 3 meses incluidos» y período excluido con motivo. El costo 500 se muestra solo como contexto de calidad. Para veinte meses con diecinueve confiables y `2025-10` sin cobertura, se muestra «19 de 20 meses incluidos» sin ocultar octubre.
13. Rango sin períodos elegibles: con todos los meses excluidos por falta de cobertura o datos no confiables, el indicador muestra «No calculable», cobertura «0 de M meses incluidos» y exclusiones con motivos; no devuelve cero ni un ratio con costos excluidos. Un mes confiable de cero horas no se excluye por ese denominador.
14. Rango con cero real: Mes A con costo 100 y horas 1; Mes B con cobertura y costo 300 y horas 0, para una población con cobertura individual e insumos confiables. Resultado `(100 + 300) / (1 + 0) = 400`: costo incluido 400, horas 1, cobertura «2 de 2 meses incluidos», sin PARCIAL por el cero del Mes B. Su ratio mensual no calculable no elimina su costo del rango.
15. Abogado sin cobertura individual: con costo conocido y ningún registro en toda la API descargada, muestra SIN COBERTURA DE HORAS; horas ausentes, no cero, y ratio individual no calculable. Sus costos/sueldos siguen consultables como datos contables.
16. Grupo parcialmente cubierto: dos miembros del mismo área + nivel con costos 100 y 300; el primero con cobertura y 1 hora, el segundo sin ningún registro en toda la API. El resultado muestra costo incluido 100, horas 1, ratio 100, PARCIAL y «1 de 2 abogados con cobertura»; la observación identifica al segundo y costo excluido 300 separado.
17. Grupo sin cobertura individual: ningún miembro tiene registros en toda la API, aunque otro grupo aporte cobertura global al mes. Costo/hora «No calculable», «0 de M abogados con cobertura» y observación de miembros/costos excluidos; no publicar un ratio ni sustituir sus horas por cero.
18. Mes y rango con cero real: con cobertura global e individual, datos confiables y solo registros no facturables de minutos positivos, un mes muestra su costo conocido, 0 horas y ratio mensual no calculable. Si todos los meses del rango tienen ese caso, conservar sus costos y cobertura «M de M meses incluidos», sin PARCIAL por los ceros; el ratio del rango es no calculable porque la suma de horas es cero. Las cargas tardías se muestran, si se incluyen, como observaciones informativas agregadas por abogado/período, no una alerta por registro.

## 14. Supuestos y decisiones pendientes

- Decisiones de esta entrega: mes de `fecha_trabajo`, fecha de carga como señal de calidad, actualización manual completa, recálculo histórico, snapshot en memoria, costo total sin redistribución y reglas de disponibilidad descritas. La imputación no está pendiente.
- Moneda de presentación: Bolivianos (Bs.) como decisión de producto/implementación para esta entrega. La fuente no especifica explícitamente moneda; no atribuirle esa decisión ni introducir conversiones.
- La API no documenta consistencia de snapshot entre páginas. Detectar inconsistencias observables; no afirmar una garantía transaccional externa que no existe en el contrato.
- Los rangos de presencia no prueban altas/bajas. Aplicar exclusivamente las reglas explícitas de cobertura mensual e individual, cero registrado y exclusiones de las secciones 4 y 5; no inferir otras causas de ausencia.
- Base documental: `LEEME.md`, fuentes disponibles y enunciado/decisiones compartidos en la conversación.
