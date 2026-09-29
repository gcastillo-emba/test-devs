# Aplicación de costos — Estudio Salinas Crespo

Aplicación interna que usa la asistente de gerencia para ver el costo por hora de cada abogado. Tiene un backend (en dos versiones equivalentes: Python y Java) y un frontend (en dos versiones equivalentes: React y Angular). Usa la versión del backend y del frontend que elegiste.

## Arquitectura declarada

El proyecto se diseñó con **arquitectura hexagonal** (puertos y adaptadores). Esto es lo que el equipo que la construyó dice que respeta:

| Capa | Responsabilidad | Puede depender de |
| --- | --- | --- |
| Dominio | Entidades y reglas de negocio | Nada |
| Aplicación | Casos de uso y puertos (interfaces) | Dominio |
| Infraestructura | Adaptadores que implementan los puertos: persistencia, archivos | Aplicación y dominio |
| Entrada | Adaptadores HTTP: reciben la petición y llaman a un caso de uso | Aplicación |

La regla central: **las dependencias apuntan hacia el dominio**, y cada capa depende de abstracciones, no de implementaciones concretas.

En el frontend, los componentes solo presentan. El acceso a la API y las reglas de negocio no viven en los componentes.

## Cómo levantarla

Todas las versiones del backend escuchan en el puerto **8001**. Los frontends redirigen `/api` a ese puerto.

| Versión | Instalar | Pruebas | Levantar |
| --- | --- | --- | --- |
| Python | `pip install -r requirements.txt` | `pytest` | `uvicorn app.main:app --port 8001 --reload` |
| Java | — | `./mvnw test` | `./mvnw spring-boot:run` |
| React | `npm install` | — | `npm run dev` |
| Angular | `npm install` | — | `npm start` |

Las pruebas pasan antes de que toques nada.
