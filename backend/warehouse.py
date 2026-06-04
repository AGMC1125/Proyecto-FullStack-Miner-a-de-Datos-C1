"""
warehouse.py — Capa de datos: DuckDB con esquema estrella
Dataset: Airbnb Ciudad de Mexico (Inside Airbnb, Sept 2025)

Esquema estrella:
  fact_listings (tabla de hechos)
  dim_barrio    (dimension geografica)
  dim_host      (dimension del anfitrion)
  dim_tipo_hab  (dimension tipo de habitacion)
  dim_tiempo    (dimension temporal basada en last_review)
"""

import duckdb
import pandas as pd
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "airbnb_warehouse.duckdb")
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "listings_clean.csv")


def build_warehouse():
    """Construye el warehouse desde el CSV limpio. Idempotente."""
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"No se encontro listings_clean.csv en: {DATA_PATH}\n"
            f"Ejecuta primero el notebook 01_eda.ipynb."
        )

    con = duckdb.connect(DB_PATH)
    df = pd.read_csv(DATA_PATH)

    # Registrar el DataFrame explicitamente para que DuckDB lo reconozca
    con.register("listings_df", df)

    # ── DIMENSION: barrio ─────────────────────────────────────────────────────
    con.execute("DROP TABLE IF EXISTS dim_barrio")
    con.execute("""
        CREATE TABLE dim_barrio AS
        SELECT
            ROW_NUMBER() OVER (ORDER BY neighbourhood) AS barrio_id,
            neighbourhood                               AS barrio_nombre,
            AVG(latitude)                               AS lat_centroide,
            AVG(longitude)                              AS lon_centroide,
            COUNT(*)                                    AS total_listados
        FROM listings_df
        WHERE neighbourhood IS NOT NULL
        GROUP BY neighbourhood
    """)

    # ── DIMENSION: host ───────────────────────────────────────────────────────
    con.execute("DROP TABLE IF EXISTS dim_host")
    con.execute("""
        CREATE TABLE dim_host AS
        SELECT DISTINCT
            host_id,
            calculated_host_listings_count AS num_propiedades,
            CASE WHEN calculated_host_listings_count >= 3 THEN 'Profesional'
                 WHEN calculated_host_listings_count = 2  THEN 'Multi'
                 ELSE 'Individual' END AS tipo_host
        FROM listings_df
    """)

    # ── DIMENSION: tipo de habitacion ─────────────────────────────────────────
    con.execute("DROP TABLE IF EXISTS dim_tipo_hab")
    con.execute("""
        CREATE TABLE dim_tipo_hab AS
        SELECT
            ROW_NUMBER() OVER (ORDER BY room_type) AS tipo_id,
            room_type                              AS tipo_nombre,
            COUNT(*)                               AS total_listados,
            ROUND(AVG(price), 2)                   AS precio_promedio
        FROM listings_df
        GROUP BY room_type
    """)

    # ── TABLA DE HECHOS ───────────────────────────────────────────────────────
    con.execute("DROP TABLE IF EXISTS fact_listings")
    con.execute("""
        CREATE TABLE fact_listings AS
        SELECT
            f.id                            AS listing_id,
            b.barrio_id,
            h.host_id,
            t.tipo_id,
            f.price                         AS precio_noche,
            f.minimum_nights,
            f.number_of_reviews,
            f.reviews_per_month,
            f.availability_365,
            f.number_of_reviews_ltm,
            f.is_superhost,
            f.latitude,
            f.longitude
        FROM listings_df f
        JOIN dim_barrio   b ON f.neighbourhood = b.barrio_nombre
        JOIN dim_host     h ON f.host_id       = h.host_id
        JOIN dim_tipo_hab t ON f.room_type     = t.tipo_nombre
    """)

    row_counts = {}
    for tbl in ["fact_listings", "dim_barrio", "dim_host", "dim_tipo_hab"]:
        n = con.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        row_counts[tbl] = n

    con.close()
    return row_counts


def get_connection():
    if not os.path.exists(DB_PATH):
        build_warehouse()
    return duckdb.connect(DB_PATH, read_only=True)


# ── CONSULTAS OLAP ────────────────────────────────────────────────────────────

def olap_precio_por_barrio(limit: int = 15):
    """Precio mediano por barrio, top N."""
    con = get_connection()
    result = con.execute(f"""
        SELECT
            b.barrio_nombre,
            ROUND(MEDIAN(f.precio_noche), 0)  AS precio_mediano,
            ROUND(AVG(f.precio_noche), 0)     AS precio_promedio,
            COUNT(*)                           AS total_listados,
            ROUND(AVG(f.availability_365), 0) AS disponibilidad_promedio
        FROM fact_listings f
        JOIN dim_barrio b ON f.barrio_id = b.barrio_id
        GROUP BY b.barrio_nombre
        ORDER BY precio_mediano DESC
        LIMIT {limit}
    """).df()
    con.close()
    return result.to_dict(orient="records")


def olap_listados_por_tipo():
    """Distribucion de listados y precio por tipo de habitacion."""
    con = get_connection()
    result = con.execute("""
        SELECT
            t.tipo_nombre,
            COUNT(*)                          AS total_listados,
            ROUND(MEDIAN(f.precio_noche), 0)  AS precio_mediano,
            ROUND(AVG(f.reviews_per_month), 2) AS resenas_por_mes_prom
        FROM fact_listings f
        JOIN dim_tipo_hab t ON f.tipo_id = t.tipo_id
        GROUP BY t.tipo_nombre
        ORDER BY total_listados DESC
    """).df()
    con.close()
    return result.to_dict(orient="records")


def olap_superhosts_por_barrio(limit: int = 10):
    """Porcentaje de superhosts por barrio, top N."""
    con = get_connection()
    result = con.execute(f"""
        SELECT
            b.barrio_nombre,
            COUNT(*)                                          AS total_listados,
            SUM(f.is_superhost)                               AS superhosts,
            ROUND(100.0 * SUM(f.is_superhost) / COUNT(*), 1) AS pct_superhost,
            ROUND(MEDIAN(f.precio_noche), 0)                  AS precio_mediano
        FROM fact_listings f
        JOIN dim_barrio b ON f.barrio_id = b.barrio_id
        GROUP BY b.barrio_nombre
        HAVING COUNT(*) >= 20
        ORDER BY pct_superhost DESC
        LIMIT {limit}
    """).df()
    con.close()
    return result.to_dict(orient="records")


def olap_kpis():
    """KPIs globales para tarjetas del dashboard."""
    con = get_connection()
    result = con.execute("""
        SELECT
            COUNT(*)                                          AS total_listados,
            ROUND(MEDIAN(precio_noche), 0)                    AS precio_mediano_global,
            ROUND(AVG(precio_noche), 0)                       AS precio_promedio_global,
            ROUND(100.0 * SUM(is_superhost) / COUNT(*), 1)   AS pct_superhosts,
            COUNT(DISTINCT barrio_id)                          AS total_barrios,
            ROUND(AVG(availability_365), 0)                   AS disponibilidad_promedio
        FROM fact_listings
    """).df()
    con.close()
    return result.to_dict(orient="records")[0]


if __name__ == "__main__":
    print("Construyendo warehouse...")
    counts = build_warehouse()
    for tbl, n in counts.items():
        print(f"  {tbl}: {n:,} filas")
    print("\nKPIs globales:")
    print(olap_kpis())
