# Pipeline Full Stack de Minería de Datos — Airbnb CDMX

**Alumno:** Ángel Gabriel Martínez Castillo | **Matrícula:** 233381  
**Curso:** Minería de Datos · Ingeniería de Software · 9.º semestre · UPCh · 2026A  
**Profesor:** Ramsés Alejandro Camas Nájera, M.Sc.  
**Dataset:** Inside Airbnb — Ciudad de México (27,051 listados, septiembre 2025)

---

## Descripción

Sistema full stack de minería de datos con cuatro capas integradas:

1. **Warehouse (DuckDB)** — esquema estrella con `fact_listings` + 3 dimensiones
2. **EDA + Preprocesamiento** — notebook reproducible que justifica las decisiones de modelado
3. **Modelos ML** — regresión (Ridge) para precio + clasificación (LR vs DT) para Superhost
4. **Aplicación** — backend FastAPI + frontend React con inferencia en vivo y consultas OLAP

---

## Estructura del repositorio

```
proyecto_corte_1_233381_martinez_castillo_angel_gabriel/
├── data/
│   ├── listings.csv          ← dataset crudo (Inside Airbnb CDMX)
│   └── listings_clean.csv    ← generado por 01_eda.ipynb
├── notebooks/
│   ├── 01_eda.ipynb          ← EDA reproducible
│   └── 02_modeling.ipynb     ← entrenamiento y serialización de modelos
├── backend/
│   ├── main.py               ← FastAPI (endpoints OLAP + inferencia)
│   ├── warehouse.py          ← DuckDB — esquema estrella y consultas OLAP
│   ├── requirements.txt
│   └── models/               ← generado por 02_modeling.ipynb
│       ├── regressor.joblib
│       ├── classifier.joblib
│       └── *_meta.joblib
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── pages/
│       │   ├── Dashboard.jsx   ← consultas OLAP en vivo
│       │   └── Predictor.jsx   ← inferencia ML en vivo
│       └── components/
│           └── KpiCard.jsx
├── .gitignore
├── README.md
└── AI_USAGE.md
```

---

## Reproducción paso a paso

### Requisitos

- Python 3.10+
- Node.js 18+

### 1. Instalar dependencias del backend

```bash
cd backend
pip install -r requirements.txt
```

### 2. Ejecutar el notebook de EDA

```bash
cd notebooks
jupyter notebook 01_eda.ipynb
```

Ejecutar todas las celdas en orden. Genera `data/listings_clean.csv`.

### 3. Ejecutar el notebook de modelado

```bash
jupyter notebook 02_modeling.ipynb
```

Ejecutar todas las celdas en orden. Genera los archivos `.joblib` en `backend/models/`.

### 4. Construir el warehouse DuckDB (opcional — se construye automáticamente al arrancar el backend)

```bash
cd backend
python warehouse.py
```

### 5. Arrancar el backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

El backend queda disponible en `http://localhost:8000`.  
Documentación automática: `http://localhost:8000/docs`

### 6. Arrancar el frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

---

## Preguntas respondidas por el sistema

| Tarea | Pregunta | Modelo |
|-------|----------|--------|
| Regresión | ¿Cuánto debería costar por noche este listado en CDMX? | Ridge Regression (RidgeCV) |
| Clasificación | ¿Calificaría este anfitrión como Superhost? | Reg. Logística vs Árbol de Decisión |

---

## Consultas OLAP disponibles

- `GET /olap/kpis` — KPIs globales del mercado Airbnb CDMX
- `GET /olap/precio-por-barrio` — precio mediano por alcaldía
- `GET /olap/listados-por-tipo` — distribución por tipo de habitación
- `GET /olap/superhosts-por-barrio` — porcentaje de superhosts por zona
