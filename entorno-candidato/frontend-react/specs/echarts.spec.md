Install and configure ECharts for React using:

npm install echarts echarts-for-react

Use the existing default page as the dashboard. Do not create extra routes or screens yet.

Create reusable chart components under:

src/components/charts/

Required generic components:

BaseChart
BarChart
LineChart
DonutChart

BaseChart must wrap echarts-for-react and receive the ECharts option configuration through props.

BarChart must receive:

labels
values
title
seriesName

LineChart must receive:

labels
series
title

DonutChart must receive:

data
title

Do not make API requests directly inside chart components.

Create business-specific components under:

src/features/analitica/components/

Required components:

HorasAbogadosChart
CostosAbogadosChart
DistribucionTiempoChart
EvolucionAbogadoChart

HorasAbogadosChart must display billable hours per lawyer using a bar chart.

CostosAbogadosChart must display total cost per lawyer using a bar chart.

DistribucionTiempoChart must display billable vs non-billable hours using a donut chart.

EvolucionAbogadoChart must display monthly total hours and billable hours using a line chart.

For now, use mocked data directly in the default page.

The default page should render a simple dashboard layout with:

Top section:
- total lawyers
- total hours
- billable hours
- total cost

Charts section:
- HorasAbogadosChart
- CostosAbogadosChart
- DistribucionTiempoChart
- EvolucionAbogadoChart

Use responsive layout.

Charts must receive data through props.

Do not connect to backend yet.

Do not create complex state management.

Do not create Redux, Zustand, Context, or extra architecture unless already present in the project.

Keep the first implementation focused on visualizing mocked analytics data.

Use TypeScript types for chart data and lawyer analytics.

Suggested type:

RendimientoAbogado:
- abogadoId
- nombre
- nivel
- area
- horasTotales
- horasFacturables
- horasNoFacturables
- porcentajeFacturable
- costoTotal
- costoPorHora
- costoPorHoraFacturable

The implementation is complete when the default page displays the four charts correctly with mocked data and all generic chart components are reusable.

After this step, mocked data will be replaced by backend API responses.
