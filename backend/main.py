"""
main.py — Backend FastAPI
Airbnb CDMX — Pipeline Full Stack de Mineria de Datos
Alumno: Angel Gabriel Martinez Castillo | Matricula: 233381

Endpoints:
  GET  /health                        — verificacion de estado
  GET  /olap/kpis                     — KPIs globales del dashboard
  GET  /olap/precio-por-barrio        — precio mediano por barrio (OLAP)
  GET  /olap/listados-por-tipo        — distribucion por tipo de habitacion (OLAP)
  GET  /olap/superhosts-por-barrio    — % superhosts por barrio (OLAP)
  POST /predict/precio                — inferencia de regresion en vivo
  POST /predict/superhost             — inferencia de clasificacion en vivo
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib, os, sys, traceback, pandas as pd

# Asegurar que el directorio backend esta en el path para imports
sys.path.insert(0, os.path.dirname(__file__))

# ── Inicializacion ────────────────────────────────────────────────────────────
app = FastAPI(
    title="Airbnb CDMX — Data Mining API",
    description="Pipeline full stack: warehouse OLAP + inferencia ML en vivo",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Carga lazy de modelos
_regressor = None
_regressor_meta = None
_classifier = None
_classifier_meta = None

def get_regressor():
    global _regressor, _regressor_meta
    if _regressor is None:
        path = os.path.join(MODELS_DIR, "regressor.joblib")
        if not os.path.exists(path):
            raise HTTPException(500, "Modelo de regresion no encontrado. Ejecuta 02_modeling.ipynb primero.")
        _regressor = joblib.load(path)
        _regressor_meta = joblib.load(os.path.join(MODELS_DIR, "regressor_meta.joblib"))
    return _regressor, _regressor_meta

def get_classifier():
    global _classifier, _classifier_meta
    if _classifier is None:
        path = os.path.join(MODELS_DIR, "classifier.joblib")
        if not os.path.exists(path):
            raise HTTPException(500, "Modelo de clasificacion no encontrado. Ejecuta 02_modeling.ipynb primero.")
        _classifier = joblib.load(path)
        _classifier_meta = joblib.load(os.path.join(MODELS_DIR, "classifier_meta.joblib"))
    return _classifier, _classifier_meta

# ── Schemas ───────────────────────────────────────────────────────────────────
class PrecioRequest(BaseModel):
    neighbourhood: str = Field(..., example="Cuauhtemoc")
    room_type: str = Field(..., example="Entire home/apt")
    minimum_nights: int = Field(1, ge=1, le=365)
    number_of_reviews: int = Field(10, ge=0)
    reviews_per_month: float = Field(1.0, ge=0)
    calculated_host_listings_count: int = Field(1, ge=1)
    availability_365: int = Field(180, ge=0, le=365)
    number_of_reviews_ltm: int = Field(5, ge=0)
    latitude: float = Field(19.42, ge=18.0, le=21.0)
    longitude: float = Field(-99.13, ge=-100.0, le=-98.0)

class SuperhostRequest(BaseModel):
    # NOTA: se excluyen number_of_reviews, reviews_per_month y availability_365
    # porque son exactamente las variables usadas para construir is_superhost
    # (leakage directo). El modelo usa features independientes de la definicion.
    price: float = Field(..., gt=0, example=1200.0)
    neighbourhood: str = Field(..., example="Cuauhtemoc")
    room_type: str = Field(..., example="Entire home/apt")
    minimum_nights: int = Field(1, ge=1)
    calculated_host_listings_count: int = Field(1, ge=1)
    number_of_reviews_ltm: int = Field(5, ge=0)

# ── Endpoints de salud ────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "dataset": "Airbnb CDMX", "version": "1.0.0"}

# ── Endpoints OLAP ────────────────────────────────────────────────────────────
@app.get("/olap/kpis")
def kpis():
    try:
        from warehouse import olap_kpis, build_warehouse, DB_PATH
        import os
        if not os.path.exists(DB_PATH):
            build_warehouse()
        return olap_kpis()
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}")

@app.get("/olap/precio-por-barrio")
def precio_por_barrio(limit: int = 15):
    try:
        from warehouse import olap_precio_por_barrio, build_warehouse, DB_PATH
        import os
        if not os.path.exists(DB_PATH):
            build_warehouse()
        return olap_precio_por_barrio(limit)
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}")

@app.get("/olap/listados-por-tipo")
def listados_por_tipo():
    try:
        from warehouse import olap_listados_por_tipo, build_warehouse, DB_PATH
        import os
        if not os.path.exists(DB_PATH):
            build_warehouse()
        return olap_listados_por_tipo()
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}")

@app.get("/olap/superhosts-por-barrio")
def superhosts_por_barrio(limit: int = 10):
    try:
        from warehouse import olap_superhosts_por_barrio, build_warehouse, DB_PATH
        import os
        if not os.path.exists(DB_PATH):
            build_warehouse()
        return olap_superhosts_por_barrio(limit)
    except Exception as e:
        raise HTTPException(500, f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}")

# ── Endpoints de inferencia ───────────────────────────────────────────────────
@app.post("/predict/precio")
def predict_precio(req: PrecioRequest):
    regressor, meta = get_regressor()
    row = pd.DataFrame([{
        "neighbourhood": req.neighbourhood,
        "room_type": req.room_type,
        "minimum_nights": req.minimum_nights,
        "number_of_reviews": req.number_of_reviews,
        "reviews_per_month": req.reviews_per_month,
        "calculated_host_listings_count": req.calculated_host_listings_count,
        "availability_365": req.availability_365,
        "number_of_reviews_ltm": req.number_of_reviews_ltm,
        "latitude": req.latitude,
        "longitude": req.longitude,
    }])
    precio_pred = float(regressor.predict(row)[0])
    return {
        "precio_predicho_mxn": round(max(precio_pred, 0), 2),
        "modelo": meta["model_type"],
        "r2_test": round(meta["r2"], 4),
        "rmse_test": round(meta["rmse"], 2),
    }

@app.post("/predict/superhost")
def predict_superhost(req: SuperhostRequest):
    classifier, meta = get_classifier()
    row = pd.DataFrame([{
        "price": req.price,
        "neighbourhood": req.neighbourhood,
        "room_type": req.room_type,
        "minimum_nights": req.minimum_nights,
        "calculated_host_listings_count": req.calculated_host_listings_count,
        "number_of_reviews_ltm": req.number_of_reviews_ltm,
    }])
    prob = float(classifier.predict_proba(row)[0][1])
    pred = int(classifier.predict(row)[0])
    return {
        "es_superhost": bool(pred),
        "probabilidad": round(prob, 4),
        "modelo": meta["best_model"],
        "auc_test": round(meta.get("auc_lr" if "LR" in meta["best_model"] or "Log" in meta["best_model"] else "auc_dt", 0), 4),
    }
