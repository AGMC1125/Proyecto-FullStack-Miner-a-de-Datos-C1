# AI_USAGE.md — Declaración de uso de IA

**Proyecto:** Pipeline Full Stack de Minería de Datos — Airbnb CDMX  
**Alumno:** Ángel Gabriel Martínez Castillo | **Matrícula:** 233381  
**Curso:** Minería de Datos · Ingeniería de Software · 9°-D

---

## Herramienta utilizada

**Claude** (Anthropic, modelo claude-sonnet) — asistente durante el desarrollo del proyecto,
principalmente en la generación de código de infraestructura (frontend y backend) y como
consultor técnico durante el análisis y toma de decisiones metodológicas.

---

## Componente por componente

### Frontend — React + Vite
**Generado con IA.**  
Pedí a Claude que construyera la estructura completa del dashboard y predictor en React,
incluyendo el sistema de diseño, las gráficas con Recharts y la integración con el backend vía
proxy de Vite. El frontend es infraestructura de presentación; no es el núcleo evaluado de
minería de datos.

Prompt representativo:
> "Genera un dashboard React con dark theme profesional para visualizar datos OLAP de
> Airbnb CDMX. Debe tener una página de Dashboard con KPI cards y gráficas de barras
> (precio por barrio, % superhosts, distribución por tipo de habitación) usando Recharts,
> y una página de Predictor con un formulario que consuma los endpoints `/predict/precio`
> y `/predict/superhost` del backend. Usa Fira Code para títulos y una paleta oscura
> tipo financial dashboard."

### Backend — FastAPI
**Generado con IA (estructura base) + revisado y ajustado por mí.**  
Le pedí a Claude la estructura de `main.py` con los endpoints REST, validación Pydantic y
middleware CORS. Después revisé y ajusté los schemas de entrada para que coincidieran
exactamente con los features que decidí usar en los modelos (especialmente la exclusión de
variables con leakage en el endpoint `/predict/superhost`).

Prompt representativo:
> "Genera un backend FastAPI con endpoints para consultas OLAP a DuckDB e inferencia ML
> con joblib. Los endpoints OLAP deben llamar funciones de warehouse.py. Los endpoints de
> predicción deben recibir JSON, construir un DataFrame con las columnas exactas que espera
> el pipeline de scikit-learn y retornar la predicción con las métricas del modelo."

### Warehouse — DuckDB (warehouse.py)
**Diseño propio; sintaxis asistida por IA.**  
Definí yo las tablas de hechos y dimensiones, decidí qué columnas van en cada tabla y
justifiqué el esquema estrella. Usé a Claude para consultar sintaxis específica de DuckDB
que no conocía de memoria.

Prompt representativo:
> "¿Cómo implemento MEDIAN(), ROW_NUMBER() OVER y ROLLUP en DuckDB para calcular
> el precio mediano por barrio y ordenar los resultados?"

### EDA — notebook 01_eda.ipynb
**Trabajo propio; IA usada como consultor puntual.**  
El análisis exploratorio, las decisiones de limpieza y la construcción de `is_superhost` son
míos. Decidí yo: filtrar precios = $0, imputar `reviews_per_month` con 0 (no con la media),
construir `is_superhost` con umbrales `>= 10 reseñas, >= 1.0/mes, >= 60 días disponibles`,
y excluir el percentil superior de precios antes de modelar. Consulté a Claude para confirmar
si mis decisiones metodológicas tenían fundamento estadístico.

Prompt representativo:
> "Tengo una variable objetivo `price` con skewness = 52.125 y un máximo de $900,000.
> Estoy pensando en filtrar por percentil 1-99 antes de entrenar el modelo de regresión.
> ¿Es esto metodológicamente correcto? ¿Cómo lo justificaría en un reporte técnico?"

### Modelado — notebook 02_modeling.ipynb
**Trabajo propio; IA usada como guía metodológica y para detectar errores.**  
Los modelos elegidos (Ridge Regression, Regresión Logística, Árbol de Decisión), la
separación train/test, el uso de Pipeline de scikit-learn para evitar leakage, y la elección
de métricas (ROC-AUC y Recall sobre accuracy para datos casi-balanceados) son decisiones
mías. Claude me ayudó a identificar un problema de data leakage que yo no había notado:
las variables usadas para *definir* `is_superhost` (number_of_reviews, reviews_per_month,
availability_365) estaban también en el feature set del clasificador. Corregí esto
eliminándolas manualmente y entendí por qué era un problema antes de hacer el cambio.

Prompt representativo:
> "Mi Árbol de Decisión tiene accuracy = 100% y AUC = 0.9995. La variable objetivo
> `is_superhost` se definió con la regla: number_of_reviews >= 10 AND reviews_per_month
> >= 1.0 AND availability_365 >= 60. Esas tres variables están en el feature set.
> ¿Esto es data leakage? ¿Qué tan grave es y cómo lo corrijo?"

---

## Lo que desarrollé y entiendo completamente

- Elección del dataset: justifiqué por qué Airbnb CDMX permite ambas tareas de ML
- Diseño del warehouse: tablas de hechos vs dimensiones, justificación del esquema estrella
- Construcción heurística de `is_superhost` y justificación de umbrales
- Decisión de filtrar outliers de precio (p1-p99) y por qué no afecta la validez del modelo
- Elección de ROC-AUC como métrica principal para datos con desbalance moderado
- Comprensión del data leakage detectado y por qué el Árbol lo explotaba
- Interpretación de los coeficientes de Ridge (barrio y tipo de habitación dominan)
- Documentación honesta de la limitación de R² = 0.1525 y su causa (heteroscedasticidad)

## Lo que la IA generó y no domino en detalle

- Configuración interna del proxy de Vite (`server.proxy`) — sé que redirige `/api` al
  puerto 8000 pero no conozco todos sus parámetros internos
- Layout interno de Recharts con `layout="vertical"` — funcionó al probarlo pero no
  podría reproducir el cálculo de posiciones manualmente